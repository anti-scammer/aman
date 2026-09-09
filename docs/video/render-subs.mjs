/**
 * Renders each Arabic subtitle cue to a transparent PNG that ffmpeg overlays
 * onto the footage.
 *
 * ffmpeg would normally burn subtitles itself, but this build ships without
 * libass, freetype and fontconfig, so its subtitles and drawtext filters do not
 * exist. Rendering in Chrome is the better answer anyway: it shapes and orders
 * Arabic correctly, uses the product's own typeface, and lets the caption bar
 * match the app's glass surfaces instead of looking like a player overlay.
 *
 *   node render-subs.mjs
 */

import puppeteer from 'puppeteer-core'
import { mkdir, readFile } from 'node:fs/promises'
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
const OUT = path.join(HERE, 'build', SPEC_NAME, 'subs')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** Caption strip height. The overlay is anchored to the bottom of the frame. */
const BAND = 260

const FONT_DIR = path.join(REPO, 'web/node_modules/@fontsource/ibm-plex-sans-arabic/files')

const spec = JSON.parse(await readFile(path.join(HERE, SPEC_FILE), 'utf8'))
await mkdir(OUT, { recursive: true })

const faces = await Promise.all(
  [400, 600].map(async (w) => {
    const b64 = (await readFile(
      path.join(FONT_DIR, `ibm-plex-sans-arabic-arabic-${w}-normal.woff2`),
    )).toString('base64')
    return `@font-face{font-family:'IBM Plex Sans Arabic';font-weight:${w};font-style:normal;` +
      `src:url(data:font/woff2;base64,${b64}) format('woff2');font-display:block;}`
  }),
)

const page$ = `
<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
  ${faces.join('\n')}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${spec.width}px; height: ${BAND}px; background: transparent; }
  body {
    font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center;
  }
  /* A rounded glass plate rather than a full-width black bar: it keeps the
     footage visible either side and matches the product's surfaces. */
  .cue {
    max-width: 1500px;
    background: linear-gradient(158deg, rgba(8,41,22,.80), rgba(8,41,22,.66));
    border: 1px solid rgba(255,255,255,.18);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.24), 0 24px 60px -30px rgba(0,0,0,.9);
    border-radius: 26px;
    padding: 26px 46px;
    text-align: center;
  }
  p {
    font-size: 44px; font-weight: 600; line-height: 1.45; color: #fff;
    /* A soft shadow keeps the text legible if a light frame shows through. */
    text-shadow: 0 2px 10px rgba(0,0,0,.55);
  }
  p + p { margin-top: 4px; }
</style></head><body><div class="cue" id="cue"></div></body></html>`

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  timeout: 60000,
  userDataDir: '/tmp/shotter/chrome-profile',
  defaultViewport: { width: spec.width, height: BAND, deviceScaleFactor: 1 },
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
})
const page = await browser.newPage()
await page.setContent(page$, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => document.fonts.ready)

let n = 0
for (const scene of spec.scenes) {
  for (const [i, cue] of (scene.cues ?? []).entries()) {
    await page.evaluate((lines) => {
      document.getElementById('cue').innerHTML = lines
        .map((l) => `<p>${l.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</p>`)
        .join('')
    }, cue.lines)

    await page.screenshot({
      path: path.join(OUT, `${scene.id}-${i}.png`),
      omitBackground: true,
    })
    n++
  }
}

await browser.close()
console.log(`rendered ${n} subtitle cues (band ${BAND}px)`)
