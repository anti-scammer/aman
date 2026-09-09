/**
 * Assembles the finished Arabic walkthrough.
 *
 * Each scene is rendered to its own self-contained mp4 first, then the scenes
 * are concatenated. Building per scene rather than as one enormous filtergraph
 * means a scene can be re-recorded and only that scene has to be rebuilt, and a
 * failure names the scene that caused it.
 *
 * Scene length comes from the narration, never the other way round: whatever
 * the voice takes, the picture is stretched or held to match. Footage shorter
 * than its narration holds its last frame rather than being slowed, because a
 * slowed screen recording looks broken.
 *
 * Prerequisites, in order:
 *   node tts.mjs            narration + build/audio/timings.json
 *   node render-cards.mjs   full-frame cards and the mobile stage
 *   node render-subs.mjs    subtitle plates
 *   node capture-web.mjs    web footage
 *   ./capture-mobile.sh     emulator footage
 *
 *   node build.mjs                → build/aman-walkthrough.ar.mp4
 *   node build.mjs --no-subs      picture and voice only
 */

import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import path from 'node:path'

/** Which scene file to build, and where its artefacts go. */
function specArg() {
  const i = process.argv.indexOf('--spec')
  return i === -1 ? 'scenes.json' : process.argv[i + 1]
}
const SPEC_FILE = specArg()
// Strip the extension first: doing it the other way round leaves "scenes.json"
// as "json", which would send the default video to build/json.
const SPEC_NAME =
  SPEC_FILE.replace(/\.json$/, '').replace(/^scenes\.?/, '') || 'walkthrough'

const run = promisify(execFile)
const HERE = import.meta.dirname
const BUILD = path.join(HERE, 'build', SPEC_NAME)
const OUT = path.join(HERE, 'build', `aman-${SPEC_NAME}.ar.mp4`)

const spec = JSON.parse(await readFile(path.join(HERE, SPEC_FILE), 'utf8'))
const timings = JSON.parse(await readFile(path.join(BUILD, 'audio/timings.json'), 'utf8'))

const { width: W, height: H, fps: FPS } = spec
const withSubs = !process.argv.includes('--no-subs')

/** Height of the subtitle plate; must match render-subs.mjs. */
const BAND = 260
/** How far the plate sits above the bottom edge. */
const BAND_MARGIN = 56

const scenesDir = path.join(BUILD, 'scenes')
await mkdir(scenesDir, { recursive: true })

async function ffmpeg(args, label) {
  try {
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      maxBuffer: 1024 * 1024 * 64,
    })
  } catch (err) {
    throw new Error(`ffmpeg failed on ${label}:\n${err.stderr || err.message}`)
  }
}

/**
 * Inputs and the filter chain that turns this scene's visual source into a
 * full-frame 1920x1080 stream labelled [pic], before subtitles go on top.
 */
function picture(scene, seconds) {
  const footage = path.join(BUILD, 'footage')

  if (scene.source === 'card') {
    const card = path.join(BUILD, 'cards', `${scene.id}.png`)
    // Cards are held still on purpose.
    //
    // They used to get a slow push in via zoompan, and it shipped as a visible
    // shake. zoompan truncates its crop origin to whole *input* pixels, so a
    // gentle zoom moves that origin a fraction of a pixel per frame, ffmpeg
    // floors it, and the picture sits still for two or three frames then jumps
    // a whole pixel. Constant motion in, stair-steps out, and on large static
    // text the stepping is obvious. Measured frame-to-frame differences went
    // 0.04, 1.85, 3.61, 0.07, 1.83 on a card against a flat 0.0 on real footage.
    //
    // The standard cure is to upscale the still several times before zoompan so
    // each integer step lands well inside one output pixel, but at 4x that made
    // a twelve second card take minutes to encode, which is not a trade worth
    // making for a chapter divider. Geometry is what stutters; holding it still
    // cannot. The cross-scene fades below already keep cards from feeling
    // abrupt.
    //
    // If motion is wanted here later, animate it in the browser in card.html
    // and record it like any other footage. Do not reach for zoompan again.
    return {
      inputs: ['-loop', '1', '-framerate', String(FPS), '-t', String(seconds), '-i', card],
      chain: `[0:v]scale=${W}:${H},fps=${FPS},format=yuv420p[pic]`,
      next: 1,
    }
  }

  if (scene.source === 'mobile') {
    const stage = path.join(BUILD, 'cards', `${scene.id}-stage.png`)
    const clip = path.join(footage, `${scene.id}.mp4`)
    // render-cards measured where the stage leaves room. Guessing it here would
    // mean recomputing an RTL grid by hand, which is how the phone previously
    // ended up on top of the caption text.
    const slot = JSON.parse(readFileSync(path.join(BUILD, 'cards', `${scene.id}-stage.json`), 'utf8'))
    const phoneH = slot.h
    const phoneW = Math.round((phoneH * 720) / 1560)
    const x = Math.round(slot.x + (slot.w - phoneW) / 2)
    const y = Math.round(slot.y)
    return {
      inputs: [
        '-loop', '1', '-framerate', String(FPS), '-t', String(seconds), '-i', stage,
        '-i', clip,
      ],
      chain:
        `[0:v]scale=${W}:${H},fps=${FPS}[bg];` +
        // tpad holds the last frame if the recording is shorter than the voice.
        `[1:v]scale=-1:${phoneH},fps=${FPS},tpad=stop_mode=clone:stop_duration=600[ph];` +
        `[bg][ph]overlay=${x}:${y}:shortest=0,` +
        `trim=duration=${seconds},setpts=PTS-STARTPTS,format=yuv420p[pic]`,
      next: 2,
    }
  }

  // Web screencasts are already full-frame; pad only guards against a stray
  // odd dimension from the recorder.
  const clip = path.join(footage, `${scene.id}.webm`)
  return {
    inputs: ['-i', clip],
    chain:
      `[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x082916,` +
      `tpad=stop_mode=clone:stop_duration=600,` +
      `trim=duration=${seconds},setpts=PTS-STARTPTS,format=yuv420p[pic]`,
    next: 1,
  }
}

const built = []
let total = 0

for (const scene of spec.scenes) {
  const seconds = timings[scene.id]
  if (!seconds) throw new Error(`no narration timing for ${scene.id}; run tts.mjs first`)

  const { inputs, chain, next } = picture(scene, seconds)
  const audio = path.join(BUILD, 'audio', `${scene.id}.mp3`)

  const args = [...inputs]
  const parts = [chain]
  let idx = next
  let last = '[pic]'

  if (withSubs) {
    for (const [i, cue] of (scene.cues ?? []).entries()) {
      const png = path.join(BUILD, 'subs', `${scene.id}-${i}.png`)
      if (!existsSync(png)) continue

      const from = cue.at
      const to = Math.min(cue.at + cue.seconds, seconds)
      // Looped on purpose. A bare -i on a PNG yields a single frame at t=0, and
      // a one-frame stream through a 0.25s alpha fade comes out fully
      // transparent, which is why the captions were invisible.
      args.push('-loop', '1', '-framerate', String(FPS), '-t', String(to - from), '-i', png)
      const out = `[v${i}]`
      // A short fade in and out on the plate stops captions from snapping.
      parts.push(
        `[${idx}:v]format=rgba,` +
          `fade=t=in:st=0:d=0.25:alpha=1,` +
          `fade=t=out:st=${(to - from - 0.3).toFixed(2)}:d=0.3:alpha=1,` +
          `setpts=PTS-STARTPTS+${from}/TB[s${i}];` +
          `${last}[s${i}]overlay=(W-w)/2:${H - BAND - BAND_MARGIN}:` +
          `enable='between(t,${from},${to})'${out}`,
      )
      last = out
      idx++
    }
  }

  args.push('-i', audio)
  const audioIdx = idx

  // A short dip from and to black at the seams, so scenes do not hard-cut.
  parts.push(
    `${last}fade=t=in:st=0:d=0.35,fade=t=out:st=${(seconds - 0.35).toFixed(2)}:d=0.35[vout]`,
  )
  parts.push(`[${audioIdx}:a]afade=t=in:st=0:d=0.15,afade=t=out:st=${(seconds - 0.2).toFixed(2)}:d=0.2[aout]`)

  const file = path.join(scenesDir, `${scene.id}.mp4`)
  await ffmpeg(
    [
      ...args,
      '-filter_complex', parts.join(';'),
      '-map', '[vout]', '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
      '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-t', String(seconds),
      '-movflags', '+faststart',
      file,
    ],
    scene.id,
  )

  built.push(file)
  total += seconds
  console.log(`  ✓ ${scene.id.padEnd(18)} ${seconds.toFixed(1)}s`)
}

// Every scene was encoded with identical parameters, so a stream copy concat is
// safe and avoids a second generation of compression.
const manifest = path.join(scenesDir, 'concat.txt')
await writeFile(manifest, built.map((f) => `file '${f}'`).join('\n'))

// Chapter markers. A half-hour video nobody can navigate is a half-hour video
// nobody watches twice, so the chapter cards become real markers players can
// jump between, and a plain list for pasting into a description or a README.
// No byte order mark. ffmetadata is UTF-8 by definition, so a BOM buys nothing,
// and ffmpeg 8 requires the file to *begin* with the ;FFMETADATA1 signature:
// three bytes of BOM in front of it and the whole demuxer rejects the file as
// "Invalid data found when processing input", naming the file but not the cause.
const chapterLines = [';FFMETADATA1']
const plain = []
{
  let at = 0
  for (const scene of spec.scenes) {
    const seconds = timings[scene.id]
    const isChapter = scene.source === 'card' && scene.card?.kind !== 'stage'
    if (isChapter) {
      const c = scene.card
      const title = c.kind === 'chapter' ? `${c.number}. ${c.title}` : c.title
      chapterLines.push(
        '[CHAPTER]',
        'TIMEBASE=1/1000',
        `START=${Math.round(at * 1000)}`,
        // Closed at the next marker below; a placeholder keeps the block valid.
        `END=${Math.round((at + seconds) * 1000)}`,
        `title=${title.replace(/\n/g, ' ')}`,
      )
      const m = Math.floor(at / 60)
      const sec = Math.floor(at % 60)
      plain.push(`${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}  ${title}`)
    }
    at += seconds
  }
  // Extend each chapter's END to where the next one starts, so players show
  // continuous chapters rather than gaps between the cards.
  const starts = []
  for (let i = 0; i < chapterLines.length; i++) {
    if (chapterLines[i].startsWith('START=')) starts.push([i, Number(chapterLines[i].slice(6))])
  }
  for (let i = 0; i < starts.length; i++) {
    const endIdx = starts[i][0] + 1
    const next = i + 1 < starts.length ? starts[i + 1][1] : Math.round(at * 1000)
    chapterLines[endIdx] = `END=${next}`
  }
}
const meta = path.join(scenesDir, 'chapters.ffmeta')
await writeFile(meta, chapterLines.join('\n') + '\n')
await writeFile(path.join(BUILD, 'chapters.txt'), plain.join('\n') + '\n')

await ffmpeg(
  [
    '-f', 'concat', '-safe', '0', '-i', manifest,
    '-i', meta, '-map_metadata', '1',
    '-c', 'copy', '-movflags', '+faststart',
    OUT,
  ],
  'concat',
)
if (plain.length) console.log(`${plain.length} chapters → ${path.relative(process.cwd(), path.join(BUILD, 'chapters.txt'))}`)

const mins = Math.floor(total / 60)
const secs = Math.round(total % 60)
console.log(`\n${path.relative(process.cwd(), OUT)}  ${mins}:${String(secs).padStart(2, '0')}`)
