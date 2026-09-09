/**
 * Arabic narration for the walkthrough video, via edge-tts.
 *
 * The naturalness of a neural TTS voice depends far less on which voice you
 * pick than on how you feed it. Handing the model a whole paragraph makes it
 * rush the clause boundaries and run out of breath; the result is the flat,
 * hurried delivery people recognise as "robotic". So this script does three
 * things instead:
 *
 *   1. Splits the narration into sentences and synthesises each one alone, so
 *      every sentence gets its own intonation contour and a clean landing.
 *   2. Inserts a real silence between them, longer after a full stop than
 *      after a comma, which is what a person actually does.
 *   3. Slows the rate slightly. Explainer narration read at default speed
 *      sounds like an announcement; a little slower sounds like an explanation.
 *
 * Each scene becomes one .mp3 whose duration then drives the scene's length in
 * the finished video, so the picture follows the voice rather than the reverse.
 *
 * Note: edge-tts sends the narration text to Microsoft's servers to synthesise
 * it. The text here is the project's own explainer copy, nothing sensitive.
 *
 *   node tts.mjs                      all scenes, voice from scenes.json
 *   node tts.mjs --voice ar-JO-TaimNeural
 *   node tts.mjs --only 04-url        re-record one scene after an edit
 */

import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
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
const OUT = path.join(HERE, 'build', SPEC_NAME, 'audio')

/** Pause after a sentence, by the punctuation that ended it (seconds). */
const PAUSE = {
  '.': 0.42,
  '؟': 0.5,
  '!': 0.45,
  ':': 0.34,
  '،': 0.2,
  '؛': 0.3,
  default: 0.36,
}

/** Slightly under the default pace; see the note above. */
const RATE = '-8%'

/**
 * Split Arabic narration into speakable sentences, keeping the punctuation that
 * ended each one so the pause after it can be sized accordingly.
 *
 * Colons matter here: the script uses them to introduce lists, and the model
 * otherwise runs straight through without the small beat a reader expects.
 */
function sentences(text) {
  const out = []
  let buf = ''
  for (const ch of text.trim()) {
    buf += ch
    if ('.؟!:؛'.includes(ch)) {
      out.push({ text: buf.trim(), end: ch })
      buf = ''
    }
  }
  if (buf.trim()) out.push({ text: buf.trim(), end: 'default' })

  // A fragment too short to carry its own contour belongs with its neighbour.
  return out.reduce((acc, s) => {
    const prev = acc.at(-1)
    if (prev && s.text.length < 12) {
      prev.text += ' ' + s.text
      prev.end = s.end
      return acc
    }
    acc.push(s)
    return acc
  }, [])
}

async function speak(text, voice, file) {
  await run('python3', [
    '-m', 'edge_tts',
    '--voice', voice,
    // Joined with "=" on purpose: a negative rate as a separate argument is
    // taken for another flag by argparse.
    `--rate=${RATE}`,
    '--text', text,
    '--write-media', file,
  ])
}

async function silence(seconds, file) {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono`,
    '-t', String(seconds), '-c:a', 'libmp3lame', '-q:a', '4', file,
  ])
}

async function duration(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ])
  return Number(stdout.trim())
}

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}

const spec = JSON.parse(await readFile(path.join(HERE, SPEC_FILE), 'utf8'))
const voice = argOf('--voice') ?? spec.voice
const only = argOf('--only')

await mkdir(OUT, { recursive: true })
const parts = path.join(OUT, 'parts')
await rm(parts, { recursive: true, force: true })
await mkdir(parts, { recursive: true })

console.log(`voice: ${voice}   rate: ${RATE}`)

// Merge rather than replace: re-recording one scene with --only must not
// discard the timings of the others, which the build depends on.
const timingsFile = path.join(OUT, 'timings.json')
let timings = {}
try {
  timings = JSON.parse(await readFile(timingsFile, 'utf8'))
} catch {
  // First run.
}

for (const scene of spec.scenes) {
  if (only && scene.id !== only) continue

  const pieces = sentences(scene.narration)
  const list = []
  for (const [i, s] of pieces.entries()) {
    const speech = path.join(parts, `${scene.id}-${i}.mp3`)
    await speak(s.text, voice, speech)
    list.push(speech)

    const gap = PAUSE[s.end] ?? PAUSE.default
    // No trailing pause on the last sentence; the scene cut supplies it.
    if (i < pieces.length - 1) {
      const quiet = path.join(parts, `${scene.id}-${i}-gap.mp3`)
      await silence(gap, quiet)
      list.push(quiet)
    }
  }

  const manifest = path.join(parts, `${scene.id}.txt`)
  await writeFile(manifest, list.map((f) => `file '${f}'`).join('\n'))

  const out = path.join(OUT, `${scene.id}.mp3`)
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'concat', '-safe', '0', '-i', manifest,
    '-c:a', 'libmp3lame', '-q:a', '2', out,
  ])

  timings[scene.id] = Number((await duration(out)).toFixed(2))
  console.log(`  ${scene.id.padEnd(18)} ${pieces.length} sentence(s)  ${timings[scene.id]}s`)
}

// Keep the file in scene order so it reads as a running order.
const ordered = Object.fromEntries(
  spec.scenes.filter((s) => s.id in timings).map((s) => [s.id, timings[s.id]]),
)
await writeFile(timingsFile, JSON.stringify(ordered, null, 2) + '\n')
const total = Object.values(ordered).reduce((a, b) => a + b, 0)
console.log(`\nnarration total: ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}`)
