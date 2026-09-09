/**
 * Fails the build if any recorded scene sits on a frozen frame.
 *
 * This exists because of a bug that shipped past every other check. The capture
 * script reported each scene as a success: right duration, right content, right
 * file size. What it could not see was that the frame never moved. Several
 * chapters were eighty seconds of a single motionless screenshot, because the
 * choreography asked to scroll to the same element repeatedly and every request
 * resolved to the same scroll position.
 *
 * Duration and content correctness say nothing about motion, so motion is
 * measured directly: sample frames across each clip, compare consecutive ones,
 * and complain about any stretch that never changes.
 *
 *   node verify.mjs --spec scenes.deepdive.json
 *
 * Exits non-zero on a problem, so it can gate a build.
 */

import { execFile } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import path from 'node:path'

const run = promisify(execFile)
const HERE = import.meta.dirname

function specArg() {
  const i = process.argv.indexOf('--spec')
  return i === -1 ? 'scenes.json' : process.argv[i + 1]
}
const SPEC_FILE = specArg()
const SPEC_NAME = SPEC_FILE.replace(/\.json$/, '').replace(/^scenes\.?/, '') || 'walkthrough'

/** Seconds between sampled frames. */
const STEP = 6
/**
 * Mean per-pixel difference below which two frames count as the same picture.
 * Compression noise on a static screen recording lands around 1; any real
 * scroll is an order of magnitude above that.
 */
const SAME = 2.5
/** Longest stretch of unchanging picture a scene may contain, in seconds. */
const MAX_FROZEN = 34

const spec = JSON.parse(await readFile(path.join(HERE, SPEC_FILE), 'utf8'))
const footage = path.join(HERE, 'build', SPEC_NAME, 'footage')

let files = []
try {
  files = await readdir(footage)
} catch {
  console.error(`no footage in ${path.relative(process.cwd(), footage)}; run capture first`)
  process.exit(1)
}

const work = await mkdtemp(path.join(tmpdir(), 'aman-verify-'))
const problems = []

for (const scene of spec.scenes) {
  const file = files.find((f) => f.startsWith(scene.id + '.'))
  if (!file) {
    if (scene.source !== 'card') problems.push(`${scene.id}: no footage recorded`)
    continue
  }

  const clip = path.join(footage, file)
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-count_packets',
    '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets,r_frame_rate',
    '-of', 'default=nw=1:nk=1', clip,
  ])
  const [rate, packets] = stdout.trim().split('\n')
  const fps = Number(rate.split('/')[0]) / Number(rate.split('/')[1] || 1)
  const seconds = Number(packets) / fps

  // Downscale hard: this is looking for "did anything move", not for detail.
  const pattern = path.join(work, `${scene.id}-%03d.png`)
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', clip,
    '-vf', `fps=1/${STEP},scale=96:54`, pattern,
  ])

  const frames = (await readdir(work)).filter((f) => f.startsWith(scene.id + '-')).sort()
  const pixels = []
  for (const f of frames) {
    // Read the PNG back as raw grey bytes; no image library needed.
    const { stdout: raw } = await run(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-i', path.join(work, f),
       '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
      { encoding: 'buffer', maxBuffer: 1024 * 1024 },
    )
    pixels.push(raw)
  }

  let frozenRun = 0
  let worst = 0
  for (let i = 1; i < pixels.length; i++) {
    const a = pixels[i - 1]
    const b = pixels[i]
    let sum = 0
    for (let k = 0; k < a.length; k++) sum += Math.abs(a[k] - b[k])
    const diff = sum / a.length
    if (diff < SAME) {
      frozenRun += STEP
      worst = Math.max(worst, frozenRun)
    } else {
      frozenRun = 0
    }
  }

  const flag = worst > MAX_FROZEN
  if (flag) problems.push(`${scene.id}: ${worst}s of frozen frame (limit ${MAX_FROZEN}s)`)
  console.log(
    `  ${flag ? '✗' : '✓'} ${scene.id.padEnd(18)} ${seconds.toFixed(0).padStart(4)}s   ` +
      `longest still: ${String(worst).padStart(3)}s`,
  )
}

// Card scenes must be perfectly still.
//
// A slow zoompan push-in on the cards shipped in the first cut as a visible
// shake: the filter floors its crop origin to whole input pixels, so a gentle
// zoom stutters instead of glides. The cards are deliberately static now, and
// this asserts it, so re-introducing motion is a conscious decision rather than
// something that quietly reaches a viewer again.
const sceneDir = path.join(HERE, 'build', SPEC_NAME, 'scenes')
let builtScenes = []
try {
  builtScenes = await readdir(sceneDir)
} catch {
  // Not built yet; nothing to assert.
}

for (const scene of spec.scenes) {
  if (scene.source !== 'card') continue
  const file = builtScenes.find((f) => f === `${scene.id}.mp4`)
  if (!file) continue

  const out = path.join(work, `card-${scene.id}-%02d.png`)
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', '1', '-i', path.join(sceneDir, file),
    '-frames:v', '6', '-vf', 'crop=800:200:560:420', out,
  ])
  const shots = (await readdir(work)).filter((f) => f.startsWith(`card-${scene.id}-`)).sort()
  let moved = 0
  let prev = null
  for (const f of shots) {
    const { stdout: raw } = await run(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-i', path.join(work, f),
       '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
      { encoding: 'buffer', maxBuffer: 1024 * 1024 * 8 },
    )
    if (prev) {
      let sum = 0
      for (let k = 0; k < raw.length; k++) sum += Math.abs(raw[k] - prev[k])
      moved = Math.max(moved, sum / raw.length)
    }
    prev = raw
  }
  if (moved > 0.02) {
    problems.push(
      `${scene.id}: card is not static (frame diff ${moved.toFixed(2)}). ` +
        'Geometric animation on a still stutters; see the note in build.mjs.',
    )
  }
}

await rm(work, { recursive: true, force: true })

if (problems.length) {
  console.error('\nfrozen footage:')
  for (const p of problems) console.error('  ' + p)
  console.error('\nGive the scene more distinct anchors, or a `by` walk between them.')
  process.exit(1)
}
console.log('\nall scenes move')
