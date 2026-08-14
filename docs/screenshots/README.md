# Screenshots — أمان (Aman) Platform

Captured 2026-07-03 from the running system (web: Chrome 1440px; mobile: Pixel 7 Pro emulator, Android 14, Arabic RTL locale).

## Web application (React)

| File | Page |
|---|---|
| `web-home.png` | Home — hero, live report statistics, feature cards, recently-flagged strip |
| `web-check-url.png` | URL Checker — live result for `jawwal-prize.win/claim`: **dangerous 100/100** with explained reasons |
| `web-check-social.png` | Social Account Checker |
| `web-check-sender.png` | Sender / Caller Check |
| `web-flagged.png` | Flagged-links public feed |
| `web-reports.png` | Community reports search |
| `web-awareness.png` | Awareness hub (articles) |
| `web-quiz.png` | Interactive quiz |

## Mobile application (Flutter, Android)

| File | Screen |
|---|---|
| `mobile-home.png` | Home — report statistics and shortcuts |
| `mobile-check.png` | Check tab (URL / Message / Social / Sender) |
| `mobile-reports.png` | Reports tab (search / submit / flagged feed) |
| `mobile-learn.png` | Awareness tab |
| `mobile-protection.png` | **Real-time Protection** tab — consent card, call-screening / overlay / SMS permissions enabled, synced blocklist (5 numbers) |
| `mobile-call-overlay.png` | **Live warning overlay** during a simulated incoming call from a community-reported number (`adb emu gsm call +970599123456`) — shows report count and scam category, call not blocked |

Regenerate the overlay shot: with the app installed and permissions granted, run
`adb emu gsm call +970599123456` (see `mobile/README.md` for the full demo).
