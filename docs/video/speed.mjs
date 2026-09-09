/**
 * Produces a faster cut of a finished video.
 *
 * A thirty two minute technical read is a lot to ask of a teammate who wants
 * the gist, so this makes a sped up copy without re-running the whole pipeline.
 *
 * Two things make this more than a one line ffmpeg call:
 *
 *   1. Pitch. Playing video faster by dropping timestamps would raise the voice
 *      into a chipmunk register. atempo resamples instead, so the narrator keeps
 *      their pitch and only the pace changes.
 *   2. Chapters. Speeding the picture up does not move the chapter markers with
 *      it, so a straight re-encode leaves fifteen markers pointing at whatever
 *      happens to be on screen later. Every timestamp is rescaled here.
 *
 *   node speed.mjs                            walkthrough at 1.5x
 *   node speed.mjs --spec scenes.deepdive.json
 *   node speed.mjs --rate 1.25
 */

import { execFile } from 'node:child_process'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { promisify } from 'node:util'
import path from 'node:path'

const run = promisify(execFile)
const HERE = import.meta.dirname

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag)
  return i === -1 ? fallback : process.argv[i + 1]
}

const SPEC_FILE = arg('--spec', 'scenes.json')
// Strip the extension first: doing it the other way round leaves "scenes.json"
// as "json", which would look for the default video under build/json.
const SPEC_NAME =
  SPEC_FILE.replace(/\.json$/, '').replace(/^scenes\.?/, '') || 'walkthrough'

const RATE = Number(arg('--rate', '1.5'))
if (!(RATE > 0.5 && RATE <= 4)) {
  console.error(`--rate must be between 0.5 and 4; got ${RATE}`)
  process.exit(1)
}

const BUILD = path.join(HERE, 'build')
const SRC = path.join(BUILD, `aman-${SPEC_NAME}.ar.mp4`)
// 1.5 in a filename rather than 1_5: it reads as a speed, which is the point.
const TAG = String(RATE).replace(/\.0$/, '')
const OUT = path.join(BUILD, `aman-${SPEC_NAME}.ar.${TAG}x.mp4`)

if (!existsSync(SRC)) {
  console.error(`no master at ${path.relative(process.cwd(), SRC)}; run build.mjs first`)
  process.exit(1)
}

/**
 * Rescale the chapter markers to the new timeline.
 *
 * Returns the path to a rewritten ffmetadata file, or null when the video has
 * no chapters, in which case there is simply nothing to carry across.
 */
async function rescaleChapters() {
  const src = path.join(BUILD, SPEC_NAME, 'scenes', 'chapters.ffmeta')
  if (!existsSync(src)) return null

  const lines = (await readFile(src, 'utf8')).split('\n')
  const scaled = lines.map((line) => {
    const m = /^(START|END)=(\d+)$/.exec(line.trim())
    if (!m) return line
    return `${m[1]}=${Math.round(Number(m[2]) / RATE)}`
  })

  // No byte order mark, for the same reason build.mjs omits one: ffmpeg 8
  // requires the file to begin with the ;FFMETADATA1 signature and rejects the
  // whole file if anything precedes it.
  const out = path.join(BUILD, SPEC_NAME, 'scenes', `chapters.${TAG}x.ffmeta`)
  await writeFile(out, scaled.join('\n'))
  return out
}

const meta = await rescaleChapters()

const args = [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-i', SRC,
]
if (meta) args.push('-i', meta, '-map_metadata', '1')

// Take chapters from the rescaled file, or from nowhere, but never from the
// master. ffmpeg copies chapters from the first input by default, and MP4
// stores them as a text track, so without this the old unscaled chapter track
// is written alongside the new one. It spans the original timeline, which
// leaves the file reporting the pre-speedup duration: a 3:41 video that every
// player calls 4:52, with the markers pointing at the wrong content. That is
// the exact failure rescaling was meant to avoid.
args.push('-map_chapters', meta ? '1' : '-1')
// Drop any other data or subtitle tracks rather than carry them at the old rate.
args.push('-dn', '-sn')

args.push(
  // setpts scales the picture; atempo scales the audio while holding pitch.
  // Both read from the same rate, so the two stay in sync by construction.
  //
  // Deliberately -vf/-af rather than one -filter_complex. Expressing the same
  // two filters as a filter_complex silently inserted a 71 second silent gap in
  // the audio, landing on a scene boundary, while the samples either side stayed
  // correct: the file then held 220s of audio spread across a 292s timeline, so
  // every player reported a 3:41 video as 4:52 and the second half drifted out
  // of sync. Audio-only atempo was clean, so it only appears when both branches
  // run in one graph. These simple per-stream forms do not trigger it.
  '-vf', `setpts=PTS/${RATE}`,
  '-af', `atempo=${RATE}`,
  // Matching build.mjs, so the fast cut is not visibly softer than the master.
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart',
  OUT,
)

console.log(`${path.basename(SRC)} at ${TAG}x ...`)
try {
  await run('ffmpeg', args, { maxBuffer: 1024 * 1024 * 64 })
} catch (err) {
  console.error(`ffmpeg failed:\n${err.stderr || err.message}`)
  process.exit(1)
}
if (meta) await unlink(meta)

const { stdout } = await run('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size',
  '-of', 'default=nw=1:nk=1', OUT,
])
const [dur, size] = stdout.trim().split('\n').map(Number)

// Check the result rather than trusting it.
//
// The failure this guards against was invisible from the outside: ffmpeg exited
// 0, the picture was correct, and the audio samples were correct. Only the
// timeline was wrong. A length that does not match the requested rate, or a hole
// in the audio timestamps, both show up here immediately.
{
  const { stdout: srcOut } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', SRC,
  ])
  const expected = Number(srcOut.trim()) / RATE
  const problems = []
  if (Math.abs(dur - expected) > 1) {
    problems.push(
      `length is ${dur.toFixed(1)}s, expected ${expected.toFixed(1)}s at ${TAG}x`,
    )
  }

  const { stdout: pts } = await run(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'packet=pts_time',
     '-of', 'csv=p=0', OUT],
    { maxBuffer: 1024 * 1024 * 64 },
  )
  let prev = null
  let worst = 0
  let worstAt = 0
  for (const line of pts.split('\n')) {
    const t = Number(line)
    if (!Number.isFinite(t)) continue
    if (prev !== null && t - prev > worst) {
      worst = t - prev
      worstAt = prev
    }
    prev = t
  }
  // Normal AAC packets are ~21ms apart; anything near a second is a real hole.
  if (worst > 0.5) {
    problems.push(`${worst.toFixed(1)}s silent gap in the audio at ${worstAt.toFixed(1)}s`)
  }

  if (problems.length) {
    console.error('\nthe sped up file is not sound:')
    for (const p of problems) console.error('  ' + p)
    process.exit(1)
  }
}
const m = Math.floor(dur / 60)
const s = Math.round(dur % 60)
console.log(
  `${path.relative(process.cwd(), OUT)}  ${m}:${String(s).padStart(2, '0')}  ` +
    `${(size / 1e6).toFixed(0)} MB`,
)
