/**
 * Records the web-app scenes by driving the real running app, not a mockup.
 *
 * Each scene is a small choreography: type, submit, wait for the verdict, let
 * the viewer read it, scroll. The pacing is deliberately slower than a person
 * would click, because a screen recording that moves at working speed is
 * unreadable in a video.
 *
 * Every scene records for as long as its narration runs (build/audio/timings.json),
 * so picture and voice stay aligned without trimming later.
 *
 * Needs the dev server and API up:
 *   web  → http://127.0.0.1:5173
 *   api  → http://127.0.0.1:3000
 *
 *   node capture-web.mjs             all web scenes
 *   node capture-web.mjs 04-url      just one, after tweaking its choreography
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
const OUT = path.join(HERE, 'build', SPEC_NAME, 'footage')
const BASE = 'http://127.0.0.1:5173'
/** Where docs/ is served for the document scenes. */
const DOCS = 'http://127.0.0.1:8080'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN_TOKEN = 'demo-admin-token-0123456789'

const spec = JSON.parse(await readFile(path.join(HERE, SPEC_FILE), 'utf8'))
let narration = {}
try {
  narration = JSON.parse(await readFile(path.join(HERE, 'build', SPEC_NAME, 'audio/timings.json'), 'utf8'))
} catch {
  console.log('note: no narration timings yet, falling back to scenes.json durations')
}

/**
 * Optional single scene to re-record, as `--only 11-mod` or a trailing id.
 *
 * This read argv[2] directly, which worked for `capture-web.mjs 11-mod` and
 * silently did the wrong thing for `capture-web.mjs --spec scenes.deepdive.json
 * 11-mod`: argv[2] is then "--spec", so the filter was dropped and every scene
 * was re-recorded. A thirty minute capture in place of a two minute one, with
 * no error to say so, and the form the README recommends.
 */
function onlyArg() {
  const i = process.argv.indexOf('--only')
  if (i !== -1) return process.argv[i + 1]
  for (let k = 2; k < process.argv.length; k++) {
    const a = process.argv[k]
    if (a === '--spec') k++ // a flag that carries a value; skip both
    else if (!a.startsWith('--')) return a
  }
  return undefined
}
const only = onlyArg()
await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  timeout: 60000,
  userDataDir: '/tmp/shotter/chrome-profile',
  // 1280x720 CSS at 1.5x still yields 1920x1080 frames, but renders the app
  // half again as large as life so it is readable on video. 1280 also matters
  // on its own: the layout switches to its mobile arrangement at 960px, and a
  // narrower capture would have filmed the hamburger menu instead of the nav.
  defaultViewport: {
    width: Math.round(spec.width / 1.5),
    height: Math.round(spec.height / 1.5),
    deviceScaleFactor: 1.5,
  },
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${Math.round(spec.width / 1.5)},${Math.round(spec.height / 1.5)}`,
  ],
})

const page = await browser.newPage()
page.setDefaultTimeout(30000)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Arabic is the product default; make sure a stale profile cannot override it. */
async function forceArabic() {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.setItem('antiscammer-lang', 'ar'))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(600)
}

/** Scenes may set their own origin; the documentation lives on the docs server. */
let origin = BASE

async function go(url) {
  await page.goto(`${origin}${url}`, { waitUntil: 'networkidle0' })
  await wait(700)
}

/** Type at a readable pace, so the viewer can follow what is being entered. */
async function type(selector, text, delay = 45) {
  await page.waitForSelector(selector, { visible: true })
  await page.click(selector)
  await page.type(selector, text, { delay })
}

/**
 * Ease down to what a selector resolves to.
 *
 * `at` positions the view *within* the element, 0 for its top and 1 for its
 * bottom. It only bites when the element is taller than the frame, which is
 * exactly the case that matters: the signal catalog is several screens tall, so
 * centring it hides both the first and last rows while the narration is
 * describing them. Two shots at the same selector with different `at` values
 * pan down it; two shots without would sit on the identical frame and produce a
 * long freeze.
 */
async function elementY(selector, nth = 0, at = 0.5) {
  const y = await page.evaluate(
    (sel, i, frac) => {
      const el = document.querySelectorAll(sel)[i]
      if (!el) return null
      const r = el.getBoundingClientRect()
      const top = window.scrollY + r.top
      const overflow = r.height - window.innerHeight
      // Taller than the frame: slide through it. Shorter: centre it.
      return Math.max(0, overflow > 0 ? top + overflow * frac : top - (window.innerHeight - r.height) / 2)
    },
    selector,
    nth,
    at,
  )
  if (y === null) throw new Error(`nothing matched ${selector}[${nth}]`)
  return y
}

async function glideToEl(selector, nth = 0, ms = 1800, at = 0.5) {
  await glideTo(await elementY(selector, nth, at), ms)
}

/** Put the page somewhere with no animation, for use before the camera runs. */
async function jumpTo(y) {
  await page.evaluate((target) => window.scrollTo(0, target), y)
}

/** Scroll on by a fraction of the frame height, for walking through prose. */
async function glideBy(fraction, ms = 1800) {
  const y = await page.evaluate((f) => window.scrollY + window.innerHeight * f, fraction)
  await glideTo(y, ms)
}

/** Ease the page down instead of jumping, which is jarring on video. */
async function glideTo(y, ms = 1400) {
  await page.evaluate(
    (target, duration) =>
      new Promise((done) => {
        const from = window.scrollY
        const delta = target - from
        const t0 = performance.now()
        const step = (now) => {
          const p = Math.min(1, (now - t0) / duration)
          // easeInOutCubic
          const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
          window.scrollTo(0, from + delta * e)
          if (p < 1) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      }),
    y,
    ms,
  )
}

/**
 * Each choreography is `async (seconds) => {}` and should fill roughly that
 * many seconds. It does not have to be exact: the recorder stops on the clock,
 * and a scene that finishes early simply holds its last frame.
 */
/**
 * A `doc` scene needs no bespoke code. It declares what to look at:
 *
 *   "shots": [ { "sel": "table", "nth": 1, "hold": 6 }, ... ]
 *
 * and this walks them, easing to each in turn and holding while the narration
 * talks about it. Writing choreography as data keeps a twenty-chapter video
 * from becoming twenty near-identical functions.
 */
/**
 * Everything a doc scene needs before recording starts: load the page, wait for
 * the diagrams, and park on the first shot.
 *
 * This runs off camera on purpose. It used to be the opening of playDoc, with
 * the recorder already rolling, so every chapter began with the top of the
 * document and a two second scroll down to the section being discussed. Across
 * eighteen chapters that reads as a tic, and it wastes the opening seconds of
 * narration on travel. Starting already in the right place also hides the page
 * load, and gives each scene its settle time back.
 */
async function prepareDoc(scene) {
  await go(scene.url ?? '/how-it-works.html')
  // Mermaid renders client side; wait for the diagrams, not a timer.
  await page.waitForFunction(() => document.querySelectorAll('pre.mermaid svg').length > 3, {
    timeout: 40000,
  })
  await wait(1200)

  const first = (scene.shots ?? [])[0]
  if (!first) return
  // Jump, never glide: any easing here would be the very thing being removed.
  if (first.by !== undefined) {
    await jumpTo(await page.evaluate((f) => window.innerHeight * f, first.by))
  } else {
    await jumpTo(await elementY(first.sel, first.nth ?? 0, first.at ?? 0.5))
  }
  // Let the browser finish painting at the new position before the camera runs,
  // otherwise the first frames catch the scroll still settling.
  await wait(400)
}

async function playDoc(scene, seconds) {
  const shots = scene.shots ?? []
  if (!shots.length) return

  // `hold` is a weight, not a fixed number of seconds. The scene has to last
  // exactly as long as its narration, so the available time is shared out in
  // proportion. Treating holds as absolute is how a three-minute chapter ends
  // up as thirty seconds of movement and two and a half minutes of frozen frame.
  //
  // The first shot is already on screen courtesy of prepareDoc, so it costs no
  // glide time and its hold starts immediately.
  const glide = shots.reduce((t, sh, i) => t + (i === 0 ? 0 : (sh.glide ?? 1800) / 1000), 0)
  const spare = Math.max(0, seconds - glide - 0.5)
  const weight = shots.reduce((t, sh) => t + (sh.hold ?? 4), 0)

  for (const [i, shot] of shots.entries()) {
    if (i > 0) {
      if (shot.by !== undefined) {
        await glideBy(shot.by, shot.glide ?? 1800)
      } else {
        await glideToEl(shot.sel, shot.nth ?? 0, shot.glide ?? 1800, shot.at ?? 0.5)
      }
    }
    await wait((spare * ((shot.hold ?? 4) / weight)) * 1000)
  }
}

const scenes = {
  '03-idea': async () => {
    await go('/')
    await wait(2500)
    await glideTo(620, 2200)
    await wait(2200)
    await glideTo(1500, 2400)
    await wait(2600)
    await glideTo(2400, 2400)
    await wait(3000)
  },

  '04-url': async () => {
    await go('/check-url')
    await wait(1800)
    await type('input[type="text"], .field-input', 'https://jawwal-prize.win/claim-now')
    await wait(1200)
    await page.click('button[type="submit"]')
    await page.waitForSelector('.verdict-card', { visible: true })
    await wait(3000)
    await glideTo(300, 1600)
    await wait(4000)
    await glideTo(650, 1600)
    await wait(6000)
  },

  '05-message': async () => {
    await go('/analyze-message')
    await wait(1500)
    await type(
      'textarea',
      'مبروك! ربحت 10000 شيكل من جوال. لاستلام الجائزة ادفع رسوم التوصيل عبر الرابط: bit.ly/jwl-prize ثم أرسل رمز التحقق',
      18,
    )
    await wait(900)
    const sender = await page.$('input[type="text"]')
    if (sender) {
      await sender.click()
      await sender.type('JAWWAL', { delay: 120 })
    }
    await wait(1200)
    await page.click('button[type="submit"]')
    await page.waitForSelector('.verdict-card', { visible: true })
    await wait(3500)
    await glideTo(520, 1800)
    await wait(6000)
  },

  '06-social-sender': async () => {
    await go('/check-social')
    await wait(1200)
    await type('input[type="text"], .field-input', 'facebook.com/jawwal.prizes2026')
    await wait(800)
    await page.click('button[type="submit"]')
    await page.waitForSelector('.verdict-card', { visible: true })
    await wait(4500)

    await go('/check-sender')
    await wait(1000)
    await type('input[type="text"], .field-input', 'JAWWAL')
    await wait(700)
    await page.click('button[type="submit"]')
    await wait(5500)
  },

  '07-reports': async () => {
    await go('/report')
    await wait(1800)
    await type('input[type="text"], .field-input', '+970599123456')
    await wait(700)
    const notes = await page.$('textarea')
    if (notes) {
      await notes.click()
      await notes.type('اتصل وادّعى أنه من جوال وطلب رمز التحقق.', { delay: 22 })
    }
    await wait(2500)

    await go('/reports')
    await page.click('button[type="submit"]')
    await wait(3500)
    await glideTo(420, 1600)
    await wait(3000)

    await go('/flagged')
    await wait(4500)
  },

  // The methodology document, served from docs/ rather than the app.
  '11-docs': async () => {
    await go('/how-it-works.html')
    // Mermaid renders the diagrams client side; wait for them, not a timer.
    await page.waitForFunction(() => document.querySelectorAll('pre.mermaid svg').length > 3, {
      timeout: 30000,
    })
    await wait(2200)
    await glideToEl('nav.toc', 0, 2000)      // contents
    await wait(2600)
    await glideToEl('pre.mermaid', 2, 3000)  // architecture diagram
    await wait(3400)
    await glideToEl('table', 1, 3000)        // signal catalog
    await wait(3600)
    await glideToEl('.band', 0, 2400)        // scoring formula + verdict band
    await wait(4000)
  },

  '08-moderation': async () => {
    // The token gate first, so the video shows that moderation is guarded.
    await page.evaluate(() => sessionStorage.removeItem('aman.adminToken'))
    await go('/admin')
    await wait(5000)

    await page.evaluate((t) => sessionStorage.setItem('aman.adminToken', t), ADMIN_TOKEN)
    await go('/admin')
    await page.waitForSelector('.report-card', { visible: true })
    await wait(4500)
    await glideTo(400, 1600)
    await wait(4000)
    await glideTo(0, 1200)
    await wait(4000)
  },
}

for (const scene of spec.scenes) {
  if (scene.source !== 'web' && scene.source !== 'doc') continue
  if (only && scene.id !== only) continue

  const seconds = narration[scene.id] ?? scene.seconds
  const file = path.join(OUT, `${scene.id}.webm`)

  origin = scene.base ?? (scene.source === 'doc' ? DOCS : BASE)
  // Only the app has a language setting to pin.
  if (origin === BASE) await forceArabic()
  // Load and position before the camera runs, so the scene opens on its subject
  // rather than on the page load and the scroll down to it.
  if (scene.source === 'doc') await prepareDoc(scene)
  const recorder = await page.screencast({ path: file, fps: spec.fps })

  const started = Date.now()
  if (scene.source === 'doc') {
    await playDoc(scene, seconds)
  } else {
    const choreography = scenes[scene.id]
    if (!choreography) throw new Error(`no choreography for ${scene.id}`)
    await choreography(seconds)
  }

  // Hold the final frame until the narration for this scene has run out.
  const remaining = seconds * 1000 - (Date.now() - started)
  if (remaining > 0) await wait(remaining)

  await recorder.stop()
  console.log(`  ✓ ${scene.id.padEnd(18)} ${seconds.toFixed(1)}s`)
}

await browser.close()
console.log('web footage done')
