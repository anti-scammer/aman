/**
 * Renders the video's title and statement cards to 1920x1080 PNGs.
 *
 * Chrome does the typesetting rather than ffmpeg, for one decisive reason:
 * this ffmpeg build has no libass, freetype or fontconfig, so its drawtext and
 * subtitles filters do not exist. Even where they do exist they shape Arabic
 * poorly. Chrome shapes Arabic correctly, applies the project's own font, and
 * lets the cards reuse the product's stylesheet, so ffmpeg only has to
 * composite finished images.
 *
 *   node render-cards.mjs
 */

import puppeteer from 'puppeteer-core'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
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

const HERE = import.meta.dirname
const REPO = path.resolve(HERE, '..', '..')
const OUT = path.join(HERE, 'build', SPEC_NAME, 'cards')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const FONT_DIR = path.join(REPO, 'web/node_modules/@fontsource/ibm-plex-sans-arabic/files')
const WEIGHTS = [400, 500, 600, 700]

const spec = JSON.parse(await readFile(path.join(HERE, SPEC_FILE), 'utf8'))
await mkdir(OUT, { recursive: true })

// Inline the font and the logo so the page renders identically with no network
// and no local font installation.
const faces = await Promise.all(
  WEIGHTS.map(async (w) => {
    const file = path.join(FONT_DIR, `ibm-plex-sans-arabic-arabic-${w}-normal.woff2`)
    const b64 = (await readFile(file)).toString('base64')
    return `@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:${w};` +
      `src:url(data:font/woff2;base64,${b64}) format('woff2');font-display:block;}`
  }),
)
const markSvg = await readFile(path.join(REPO, 'assets/logo/aman-mark-on-dark.svg'), 'utf8')
const html = await readFile(path.join(HERE, 'card.html'), 'utf8')

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  timeout: 60000,
  userDataDir: '/tmp/shotter/chrome-profile',
  defaultViewport: { width: spec.width, height: spec.height, deviceScaleFactor: 1 },
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
})

const page = await browser.newPage()
page.setDefaultTimeout(30000)

// Card scenes render a full frame; a scene with a `stage` renders a backdrop
// that footage is later composited onto.
const jobs = spec.scenes.flatMap((s) => [
  ...(s.source === 'card' ? [{ id: s.id, card: s.card }] : []),
  ...(s.stage ? [{ id: `${s.id}-stage`, card: s.stage }] : []),
])

for (const scene of jobs) {
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: faces.join('\n') })
  await page.evaluate((card, mark) => window.renderCard(card, mark), scene.card, markSvg)
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1')
  // The font is inlined, but it still has to finish decoding before the shot.
  await page.evaluate(() => document.fonts.ready)

  const file = path.join(OUT, `${scene.id}.png`)
  await page.screenshot({ path: file })

  // A stage leaves a slot for footage. Its position depends on RTL grid
  // resolution, so measure it here rather than recomputing it in build.mjs.
  const slot = await page.evaluate(() => {
    const el = document.querySelector('.slot')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  if (slot) {
    await writeFile(file.replace(/\.png$/, '.json'), JSON.stringify(slot, null, 2) + '\n')
  }

  console.log(`  ✓ ${scene.id}${slot ? `  slot ${slot.w}x${slot.h} @ ${slot.x},${slot.y}` : ''}`)
}

await browser.close()
await writeFile(path.join(OUT, '.rendered'), new Date(0).toISOString())
console.log('cards done')
