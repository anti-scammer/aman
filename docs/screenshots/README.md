# Screenshots

Captured from the running application on 2026-08-14 against seeded data.

| Source | How |
|---|---|
| `web-*.png` | Headless Chrome at 1440×900 @2x, driven with puppeteer-core against the Vite dev server and a live backend |
| `mobile-*.png` | Pixel 7 Pro emulator (Android 14), `adb exec-out screencap` |

Everything shown is real output — verdicts, scores, reasons, and the moderation
queue all come from the actual API, not mockups.

`web-admin-gate` / `web-admin-queue` show the moderation console added in
milestone 5. `mobile-call-overlay` is the native Android warning card.

Note: capturing the emulator requires software rendering — start it with
`emulator -avd <name> -gpu swiftshader_indirect`, otherwise `screencap`
returns blank frames because Flutter's surface is composited on the host GPU.

Optimized JPEG copies for the demo site live in `../demo/img/`.
