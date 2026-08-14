# Palestinian User Protection Platform from Digital Fraud
# منصة حماية المستخدم الفلسطيني من الاحتيال الرقمي

Graduation project — July 2026

## 1. Problem Statement

Palestinian internet users are increasingly targeted by digital fraud tailored to the local context:

- **Phishing links** impersonating local banks and wallets (Bank of Palestine, PalPay, Jawwal Pay, Reflect) and telecom operators (Jawwal, Ooredoo).
- **Scam messages** over SMS/WhatsApp: fake prize draws ("ربحت جائزة من جوال"), fake delivery fees, fake job offers abroad, currency-exchange scams.
- **Fraudulent social accounts** selling non-existent goods or collecting "donation" money.

There is no local, Arabic-first platform where users can (a) check a suspicious link or message before acting on it, (b) search whether a phone number/page was already reported as a scam, and (c) learn how to recognize fraud.

## 2. Solution

A web + mobile platform with four features:

| # | Feature | Description |
|---|---------|-------------|
| 1 | **URL Checker** | Paste a link → heuristic + blocklist analysis → risk verdict (safe / suspicious / dangerous) with explained reasons in Arabic. |
| 2 | **Message Analyzer** | Paste an SMS/WhatsApp message (Arabic or English) → pattern-based scam detection → verdict + which scam category it matches. |
| 3 | **Community Reports** | Users report scam phone numbers, URLs, and social accounts. Anyone can search the database before trusting a contact. Moderation via report status. |
| 4 | **Awareness Hub** | Articles and a quiz about common scams targeting Palestinians; localized, Arabic-first. |

## 3. Architecture

```
┌─────────────┐     ┌──────────────┐
│  Web (React) │     │ Mobile       │
│  Vite + TS   │     │ (Flutter)    │
└──────┬───────┘     └──────┬───────┘
       │    REST / JSON     │
       └─────────┬──────────┘
                 ▼
        ┌─────────────────┐
        │  Backend (Node) │
        │  Express + TS   │
        │  Prisma ORM     │
        └────────┬────────┘
                 ▼
        ┌─────────────────┐
        │ SQLite (dev)    │
        │ → PostgreSQL    │
        │   (production)  │
        └─────────────────┘
```

- **Monorepo layout:** `backend/`, `web/`, `mobile/`.
- **URL analysis:** local heuristics (lookalike domains of Palestinian brands, punycode, suspicious TLDs, IP-literal URLs, URL shorteners, keyword stuffing, **missing/invalid HTTPS**) + community blocklist from the reports DB + **check-frequency signal** (a URL being checked unusually often indicates an active scam campaign). Optional Google Safe Browsing integration via env var (future).
- **Message analysis:** rule engine with weighted Arabic/English scam patterns (prize, delivery, job, bank-credentials, urgency, OTP requests). Optional LLM second opinion via env var (future).

## 4. API Contract (v1)

Base URL: `http://localhost:3000/api`

### 4.1 URL Checker
`POST /check-url`
```json
{ "url": "https://jawwal-prize.win/claim" }
```
Response `200`:
```json
{
  "url": "https://jawwal-prize.win/claim",
  "verdict": "dangerous",          // "safe" | "suspicious" | "dangerous"
  "score": 82,                      // 0–100 risk score
  "reasons": [
    { "code": "BRAND_LOOKALIKE", "message": "يشبه اسم علامة تجارية فلسطينية (جوال)", "messageEn": "Resembles a Palestinian brand (Jawwal)" }
  ],
  "communityReports": 3             // matching reports in DB
}
```

### 4.2 Message Analyzer
`POST /analyze-message`
```json
{ "text": "مبروك! ربحت 10000 شيكل من جوال. ادفع رسوم التوصيل هنا: bit.ly/xy" }
```
Response `200`:
```json
{
  "verdict": "dangerous",
  "score": 90,
  "categories": ["PRIZE_SCAM", "PAYMENT_REQUEST"],
  "reasons": [ { "code": "...", "message": "...", "messageEn": "..." } ],
  "extractedUrls": ["bit.ly/xy"]
}
```

### 4.2b Social Account Checker
`POST /check-social`
```json
{ "input": "facebook.com/jawwal.prizes2026" }   // profile URL or bare @handle
```
Response `200`:
```json
{
  "input": "facebook.com/jawwal.prizes2026",
  "platform": "FACEBOOK",            // FACEBOOK | INSTAGRAM | TIKTOK | TELEGRAM | X | WHATSAPP | UNKNOWN
  "handle": "jawwal.prizes2026",
  "verdict": "dangerous",
  "score": 75,
  "reasons": [ { "code": "...", "message": "...", "messageEn": "..." } ],
  "communityReports": 2
}
```
Signals: brand impersonation in handle (Palestinian brands, Levenshtein/substring), scam keywords in handle (prize/جائزة/وكيل/official…), digit-suffix impersonation pattern (`jawwal.prizes2026`), matching APPROVED `SOCIAL_ACCOUNT` reports, plus check-frequency. Logged to CheckLog (kind `SOCIAL`).

### 4.2c Sender / Caller Checker
`GET /check-sender?value=<phone-or-senderId>`
```json
{
  "value": "+970599000000",
  "normalizedValue": "+970599000000",
  "type": "PHONE",                    // PHONE | SENDER_ID
  "trust": "reported",                // official | reported | unknown
  "verdict": "dangerous",             // official→safe, reported→dangerous, unknown→suspicious-neutral (score 0, verdict safe with UNKNOWN_SENDER reason)
  "score": 80,
  "communityReports": 3,
  "reasons": [ ... ]
}
```
An **official sender registry** (curated list: JAWWAL, OOREDOO, PALTEL, BOP, Bank of Palestine, PALPAY, Reflect, JawwalPay, banks/gov IDs) → `trust: "official"`. Matching APPROVED PHONE reports → `trust: "reported"`.

**Sender-aware message analysis:** `POST /analyze-message` now accepts optional `"sender"`:
```json
{ "text": "...", "sender": "JAWWAL" }
```
Response gains a `"sender"` object (same shape as check-sender result). Scoring rules:
- `trust: official` → score −25 with reason `OFFICIAL_SENDER` — **but** the reduction is skipped (and a `SPOOFING_WARNING` reason added) when the message contains OTP/credential requests or a dangerous URL, since sender IDs can be spoofed and real institutions never ask for codes.
- `trust: reported` → score +40 with reason `REPORTED_SENDER`.
- Phone senders are normalized like report values (+970 canonical form).

### 4.3 Community Reports
- `GET /reports?query=<phone|url|account>&type=<PHONE|URL|SOCIAL_ACCOUNT>&page=1` — search (only `APPROVED` are public).
- `POST /reports` — `{ "type": "PHONE", "value": "+970599000000", "description": "...", "scamCategory": "PRIZE_SCAM", "reporterName": "optional" }`. New reports start as `PENDING`.
- `GET /reports/stats` — `{ "total": n, "byType": {...}, "byCategory": {...} }`.

### 4.3b Flagged Links Feed
- `GET /flagged-urls?page=1` — public feed of recently discovered suspicious/dangerous URLs, merged from (a) URL checks that scored `suspicious`/`dangerous` and (b) approved URL reports. Each item: `{ url, verdict, score, timesChecked, lastSeenAt, source: "check" | "report" }`. This is the "active scams right now" page.

### 4.4 Awareness Hub
- `GET /articles` — list `{ id, slug, titleAr, titleEn, summaryAr, summaryEn, category, createdAt }`.
- `GET /articles/:slug` — full article with `bodyAr`, `bodyEn` (markdown).
- `GET /quiz` — quiz questions `{ id, questionAr, questionEn, options: [{id, textAr, textEn}], correctOptionId, explanationAr, explanationEn }`.

### 4.5 Moderation (admin)

Community reports are submitted as `PENDING` and only `APPROVED` ones are public, so an approval path is what makes the feature work at all. Every route below sits behind a shared secret sent as the `x-admin-token` header and matched against the server's `ADMIN_TOKEN` (timing-safe). The guard **fails closed**: when `ADMIN_TOKEN` is unset or shorter than 16 characters the routes answer `503 ADMIN_DISABLED` rather than opening up.

- `GET /admin/reports?status=PENDING&type=&page=1` — moderation queue. Unlike the public search this returns any status and includes `description`, `reporterName`, `normalizedValue`, and `status`. Ordered oldest-first so the queue is FIFO and nothing starves.
- `GET /admin/stats` — `{ byStatus: { PENDING, APPROVED, REJECTED }, pendingByType: { PHONE, URL, SOCIAL_ACCOUNT }, total }`. Every key is always present so the UI never renders `undefined`.
- `PATCH /admin/reports/:id` — `{ "status": "APPROVED" | "REJECTED" }`. The only path that can make a report publicly visible. Responds with the updated report plus `previousStatus`. Setting any other status is a validation error; an unknown id is `404 NOT_FOUND`.

Approving a `PHONE` report also makes it appear in `GET /blocklist/phones`, which is what the mobile app syncs for offline call/SMS screening.

**Web UI:** `/admin`, deliberately absent from the site navigation — a moderator reaches it by URL. The token is held in `sessionStorage` (it dies with the tab) and only promoted to `localStorage` when "remember" is ticked. A `401` clears the stored token so a bad secret cannot trap the page in a retry loop.

Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` with proper HTTP status. Codes in use: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `NOT_FOUND` (404), `ADMIN_DISABLED` (503), `INTERNAL_ERROR` (500).

## 5. Database Schema (Prisma)

- **Report**: id, type (`PHONE|URL|SOCIAL_ACCOUNT`), value, normalizedValue, description, scamCategory, reporterName?, status (`PENDING|APPROVED|REJECTED`), createdAt.
- **Article**: id, slug, titleAr/En, summaryAr/En, bodyAr/En, category, createdAt.
- **QuizQuestion**: id, questionAr/En, optionsJson, correctOptionId, explanationAr/En.
- **CheckLog** (analytics + flagged-links feed): id, kind (`URL|MESSAGE`), normalizedValue (the checked URL, for frequency counting), verdict, score, createdAt.

Two schema files exist because Prisma does not allow the datasource `provider` to come from an environment variable:

| File | Provider | Used by |
|---|---|---|
| `backend/prisma/schema.prisma` | SQLite | development, tests (`prisma/dev.db`) |
| `backend/prisma/postgres/schema.prisma` | PostgreSQL | Docker / production |

The models must be kept in sync; the SQLite file is the source of truth. The Postgres migration in `prisma/postgres/migrations/0_init/` was generated with `prisma migrate diff` and is applied by the container on start.

## 6. Scam Categories (shared enum)

`PRIZE_SCAM`, `DELIVERY_SCAM`, `JOB_SCAM`, `BANK_PHISHING`, `OTP_THEFT`, `FAKE_SHOP`, `CHARITY_SCAM`, `CRYPTO_SCAM`, `OTHER`

## 7. UI Requirements

- Arabic-first with RTL layout; language toggle (ar/en).
- Web: React + Vite + TypeScript, React Router. Pages: Home, URL Checker, Message Analyzer (with optional sender field), Social Account Checker, Sender/Caller Check, Search Reports, Submit Report, Flagged Links feed, Awareness (list + article + quiz).
- Mobile: Flutter with the same screens, bottom navigation, `dio`/`http` client to the same API.
- Verdicts color-coded: safe = green, suspicious = amber, dangerous = red.
- Moderator-only: `/admin` (§4.5), not linked from the navigation.

## 7b. Real-time protection: Android only (platform limitation)

The mobile app screens incoming SMS and calls against the synced blocklist and shows a warning overlay. **This exists on Android only, and that is a permanent iOS platform restriction rather than unfinished work.** iOS gives no app the ability to:

- read the contents of incoming SMS (there is no equivalent of `RECEIVE_SMS`; `ILMessageFilterExtension` can only classify messages from unknown senders into fixed folders, without returning the text to the app or letting it call a server per message);
- draw a system-wide overlay on top of other apps (no `SYSTEM_ALERT_WINDOW` equivalent);
- inspect an incoming call beyond matching it against a pre-supplied `CallKit` blocklist, which the system reads directly — the app never learns that a call happened.

What is portable to iOS is the `CallKit`/`ILMessageFilter` extension pattern: publish the approved-phone blocklist to the system and let iOS block matches silently. That gives blocking without explanation — no reasons, no score, no overlay — so the analysis features stay in-app there.

Accordingly the Flutter `ProtectionService` returns `false` on any non-Android platform without touching the MethodChannel, and the protection tab renders an explanation instead of a broken screen. Implementation lives in `mobile/android/app/src/main/kotlin/ps/antiscammer/antiscammer/` (`ScamCallScreeningService`, `SmsReceiver`, `ScamOverlayService`, `BlocklistStore`).

## 8. Milestones

1. **Week 1–2:** Proposal + this plan; backend scaffold, DB schema, seed data.
2. **Week 3–4:** URL checker + message analyzer engines with tests.
3. **Week 5–6:** Reports API + web frontend (all pages).
4. **Week 7–8:** Flutter app.
5. **Week 9–10:** Moderation ✅, deployment (Docker + Postgres) ✅, test coverage across all three tiers ✅, documentation chapter drafts.
6. **Future work:** ML classifier trained on collected reports, browser extension, Safe Browsing API, iOS `CallKit`/`ILMessageFilter` blocklist extension (§7b).

## 9. Running the Project

### Development

```bash
# Backend — SQLite, no external services needed
cd backend && npm install && npx prisma migrate dev && npm run seed && npm run dev   # :3000

# Web
cd web && npm install && npm run dev                                                # :5173

# Mobile
cd mobile && flutter pub get && flutter run
```

To use the moderation console in development, start the backend with a token:

```bash
ADMIN_TOKEN=$(openssl rand -hex 24) npm run dev     # then open http://localhost:5173/admin
```

### Tests

```bash
cd backend && npm test     # 85 tests — analyzers, normalization, blocklist, moderation
cd web     && npm test     # 52 tests — API client, i18n, verdict rendering, admin flow
cd mobile  && flutter test # 14 tests — screens, models, protection tab (incl. the iOS state)
```

151 tests across the three tiers.

### Production (Docker + PostgreSQL)

```bash
cp .env.docker.example .env     # set POSTGRES_PASSWORD and ADMIN_TOKEN
docker compose up --build
```

- Web: `http://localhost:8080` · API: `http://localhost:8080/api/health` · Moderation: `http://localhost:8080/admin`
- nginx serves the SPA and proxies `/api` to the backend, so the browser makes no cross-origin request and the app is not tied to a hostname.
- The backend applies migrations before accepting traffic, and seeds when `SEED_ON_START=true`. Turn seeding off once the database holds real data — it is not idempotent for reports.
- Leaving `ADMIN_TOKEN` unset boots a stack where community reports can never be approved; the entrypoint warns about this on start.
