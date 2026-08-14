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

Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` with proper HTTP status.

## 5. Database Schema (Prisma)

- **Report**: id, type (`PHONE|URL|SOCIAL_ACCOUNT`), value, normalizedValue, description, scamCategory, reporterName?, status (`PENDING|APPROVED|REJECTED`), createdAt.
- **Article**: id, slug, titleAr/En, summaryAr/En, bodyAr/En, category, createdAt.
- **QuizQuestion**: id, questionAr/En, optionsJson, correctOptionId, explanationAr/En.
- **CheckLog** (analytics + flagged-links feed): id, kind (`URL|MESSAGE`), normalizedValue (the checked URL, for frequency counting), verdict, score, createdAt.

## 6. Scam Categories (shared enum)

`PRIZE_SCAM`, `DELIVERY_SCAM`, `JOB_SCAM`, `BANK_PHISHING`, `OTP_THEFT`, `FAKE_SHOP`, `CHARITY_SCAM`, `CRYPTO_SCAM`, `OTHER`

## 7. UI Requirements

- Arabic-first with RTL layout; language toggle (ar/en).
- Web: React + Vite + TypeScript, React Router. Pages: Home, URL Checker, Message Analyzer (with optional sender field), Social Account Checker, Sender/Caller Check, Search Reports, Submit Report, Flagged Links feed, Awareness (list + article + quiz).
- Mobile: Flutter with the same screens, bottom navigation, `dio`/`http` client to the same API.
- Verdicts color-coded: safe = green, suspicious = amber, dangerous = red.

## 8. Milestones

1. **Week 1–2:** Proposal + this plan; backend scaffold, DB schema, seed data.
2. **Week 3–4:** URL checker + message analyzer engines with tests.
3. **Week 5–6:** Reports API + web frontend (all pages).
4. **Week 7–8:** Flutter app.
5. **Week 9–10:** Moderation, polish, deployment (Docker + Postgres), documentation chapter drafts.
6. **Future work:** ML classifier trained on collected reports, browser extension, Safe Browsing API, admin dashboard.

## 9. Running the Project

```bash
# Backend
cd backend && npm install && npx prisma migrate dev && npm run seed && npm run dev   # :3000

# Web
cd web && npm install && npm run dev                                                # :5173

# Mobile
cd mobile && flutter pub get && flutter run
```
