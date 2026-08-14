# Antiscammer — حماية من الاحتيال (Mobile)

Flutter app for the Palestinian User Protection Platform from Digital Fraud
(graduation project). See `../PROJECT_PLAN.md` for the full spec and API
contract.

## Features

- **Home** — intro, community report statistics (`GET /api/reports/stats`), and shortcuts.
- **Check** — four sub-tabs: URL checker (`POST /api/check-url`), message analyzer (`POST /api/analyze-message`, with an optional sender field and a sender trust badge incl. spoofing warnings), social account checker (`POST /api/check-social`, platform + handle), and sender/caller checker (`GET /api/check-sender`, trust badge: official / reported / unknown). Color-coded verdict cards (safe = green, suspicious = amber, dangerous = red), risk score, and localized reasons.
- **Reports** — search community reports (`GET /api/reports`), submit a report (`POST /api/reports`), and the flagged links feed (`GET /api/flagged-urls`).
- **Learn** — awareness articles (markdown) and an interactive quiz with a final score.
- **Protection** (Android only) — real-time protection against scam calls and SMS; see the section below. On iOS the tab shows a graceful "not supported" explanation.
- Arabic-first UI with full RTL layout and an in-app **ar / en** toggle (app bar button).
- All network calls degrade gracefully: if the backend is offline you get a retry button, never a crash.

## Real-time Protection (Android only)

The **الحماية / Protection** tab adds on-device screening of incoming calls
and SMS against the community blocklist (`GET /api/blocklist/phones`).
Everything is matched **on the device** — calls/messages are never uploaded,
and calls are **never blocked**, only warned about.

Architecture:

- **Dart** — `lib/services/protection_service.dart` wraps the
  `ps.antiscammer/protection` MethodChannel: permission/role queries and
  requests, `syncBlocklist()` (fetches the blocklist via `ApiClient` and hands
  the JSON to native), and the `onSuspiciousSms` callback that runs the full
  `POST /analyze-message` when the app is alive. `lib/screens/protection_screen.dart`
  is the 5th bottom-nav tab (consent card, permission status cards, sync +
  demo-overlay buttons).
- **Kotlin** (`android/app/src/main/kotlin/ps/antiscammer/antiscammer/`):
  - `BlocklistStore` — the synced blocklist as a JSON file in the app files
    dir (`scam_blocklist.json`), written after sync and read natively even
    when the Flutter engine is dead. Matching is digits-only with a
    last-9-digits fallback so `0599...` matches `+970599...`.
  - `ScamCallScreeningService` — `CallScreeningService` bound after the user
    grants `RoleManager.ROLE_CALL_SCREENING` (API 29+). Always responds with
    "allow"; a blocklist hit triggers the warning overlay.
  - `SmsReceiver` — assembles multipart SMS and runs a two-tier check:
    native-lite (blocklist match + small hardcoded ar/en scam-keyword list)
    always, and a full backend analysis via the MethodChannel when the engine
    is running. *Deliberate tradeoff:* no headless background Dart isolate —
    when the app is dead, the native check + heads-up notification covers it.
  - `ScamOverlayService` — red RTL-aware warning card via
    `WindowManager`/`TYPE_APPLICATION_OVERLAY` (number, report count,
    category, dismiss button, 12 s auto-dismiss). Falls back to a heads-up
    notification (`scam_warnings` channel) when `SYSTEM_ALERT_WINDOW` is
    missing or the service can't start from the background.

Permissions added to the Android manifest: `RECEIVE_SMS`,
`SYSTEM_ALERT_WINDOW`, `POST_NOTIFICATIONS`, `READ_PHONE_STATE` (the
notification permission is requested together with the SMS permission on
Android 13+).

### Demo on the Android emulator

1. Run the backend and the app, open **الحماية / Protection**, grant the
   three toggles, then tap **مزامنة الآن / Sync now**.
2. Pre-grant the overlay permission from the shell (or grant it in Settings):

   ```bash
   adb shell appops set ps.antiscammer.antiscammer SYSTEM_ALERT_WINDOW allow
   ```

3. Simulate an incoming call from a blocklisted number:

   ```bash
   adb emu gsm call +970599123456
   ```

   The phone rings normally and the red "⚠ مكالمة مشبوهة / Suspected scam
   call" card appears with the report count and category.

4. Simulate an incoming scam SMS:

   ```bash
   adb emu sms send +970599123456 "مبروك ربحت جائزة"
   ```

   With the app open you get the full backend analysis warning; with the app
   killed you still get the native blocklist/keyword warning (overlay or
   heads-up notification).

5. The **عرض تحذير تجريبي / Show demo warning** button on the Protection tab
   shows the same overlay with sample data at any time.

> `adb emu` commands need the emulator console auth token on some setups:
> `adb emu` reads `~/.emulator_console_auth_token` automatically; if the
> command is ignored, run it from the emulator console (`telnet localhost 5554`).

## Requirements

- Flutter 3.x (developed against 3.46.0 master channel)
- The backend running locally on port 3000 (see `../backend`):
  `cd ../backend && npm install && npx prisma migrate dev && npm run seed && npm run dev`

## Dependencies

- `http` — REST client
- `flutter_markdown` — renders article bodies
- `flutter_svg` (`^2.3.0`) — renders the on-brand SVG illustration set

## Assets

On-brand SVG illustrations (line-art, dark-green palette `#14532d`/`#1a6b3c`/`#2f9e5f`
with red `#ce1126` tatreez-diamond accents), shared with the web frontend, live in
`assets/illustrations/` (declared under `flutter: assets:` in `pubspec.yaml`). They are
loaded consistently through `lib/widgets/app_illustration.dart` (`AppIllustration` +
`AppIllustrationAsset`), which pins them to LTR so the direction-agnostic artwork never
mirrors under the Arabic (RTL) layout. Placements: `hero` on Home, per-feature `spot-*`
on Home shortcuts and the Check tabs' pre-result states, `empty-search` on empty
Reports search / flagged feed, `spot-awareness` on Learn, and `protection` on the
Protection consent card.

## Setup & run

```bash
cd mobile
flutter pub get
flutter run
```

Run the tests / analyzer:

```bash
flutter analyze
flutter test
```

## API base URL

The client (`lib/api/api_client.dart`) picks its base URL automatically:

| Platform | Default base URL |
|---|---|
| iOS simulator, desktop, web | `http://localhost:3000/api` |
| **Android emulator** | `http://10.0.2.2:3000/api` (the emulator's alias for the host machine's `localhost`) |

To point at another host (e.g. a physical phone talking to your laptop on the
same Wi-Fi network), override it at build time:

```bash
flutter run --dart-define=API_URL=http://192.168.1.10:3000/api
```

Note: the app allows cleartext (plain `http`) traffic to support local
development (`android:usesCleartextTraffic="true"` on Android, an ATS
localhost exception on iOS). Restrict this before any production release.

## Project structure

```
lib/
  main.dart              # app root, theme (Material 3, dark-green seed), bottom navigation shell
  api/
    api_client.dart      # typed REST client (http package), ApiException, base-URL logic
    api_scope.dart       # InheritedWidget so tests can inject a mock client
  l10n/
    strings.dart         # ar/en strings map + LocaleProvider (default: Arabic)
  models/                # Verdict, Reason, UrlCheckResult, MessageAnalysisResult,
                         # SocialCheckResult, SenderCheckResult (trust: official/reported/unknown),
                         # Report, ReportStats, FlaggedUrl, Article, QuizQuestion,
                         # BlocklistEntry/PhoneBlocklist (GET /blocklist/phones)
  services/
    protection_service.dart  # MethodChannel wrapper + blocklist sync (Android only)
  screens/               # home, check (URL / message / social / sender tabs),
                         # reports (search/submit/flagged), learn, article detail (markdown),
                         # quiz, protection (real-time protection tab)
  widgets/               # verdict card/chip, sender trust badge, retry-able error state,
                         # app_illustration.dart (shared SVG illustration wrapper)
assets/
  illustrations/         # on-brand SVG set shared with the web frontend
test/
  screens_test.dart      # widget tests with a mocked (and a failing) API client,
                         # incl. a mocked protection MethodChannel (supported + iOS states)
android/app/src/main/kotlin/ps/antiscammer/antiscammer/
  MainActivity.kt            # MethodChannel "ps.antiscammer/protection"
  BlocklistStore.kt          # on-device blocklist JSON (read natively, written after sync)
  ScamCallScreeningService.kt / SmsReceiver.kt / ScamOverlayService.kt
  NotificationHelper.kt / ProtectionBridge.kt
```
