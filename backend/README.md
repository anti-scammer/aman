# Anti-Scammer Backend

Backend API for the **Palestinian User Protection Platform from Digital Fraud**
(منصة حماية المستخدم الفلسطيني من الاحتيال الرقمي).

Node.js + Express + TypeScript, Prisma ORM on SQLite (dev). See
[`../PROJECT_PLAN.md`](../PROJECT_PLAN.md) for the full spec.

## Setup

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db and generates the client
npm run seed             # articles, quiz questions, sample reports
npm run dev              # http://localhost:3000/api (tsx watch)
```

Other scripts:

| Script          | What it does                          |
|-----------------|---------------------------------------|
| `npm run dev`   | Dev server with reload (tsx watch)    |
| `npm run build` | Compile TypeScript to `dist/`         |
| `npm start`     | Run the compiled server               |
| `npm run seed`  | (Re)seed the database (idempotent)    |
| `npm test`      | Vitest unit tests                     |

Set `PORT` to override the default `3000`.

## Environment variables

All optional — see [`.env.example`](./.env.example). Note the app reads them
from the process environment (there is no dotenv loader), e.g.
`OLLAMA_MODEL=qwen2.5:3b npm run dev`.

| Variable       | Default                  | Meaning                                   |
|----------------|--------------------------|-------------------------------------------|
| `PORT`         | `3000`                   | HTTP port                                 |
| `OLLAMA_URL`   | `http://localhost:11434` | Ollama base URL for the LLM layer         |
| `OLLAMA_MODEL` | `llama3.2`               | Model for the LLM second opinion          |
| `LLM_ENABLED`  | `auto`                   | `auto` \| `true` \| `false` (see below)   |

### Optional local-LLM analysis layer

`POST /analyze-message` is rules-first: the weighted pattern engine always
produces the base score. When a local [Ollama](https://ollama.com) is
available, the message is also sent to the LLM as a bounded **second
opinion**: the score shifts by `round(±confidence × 25)` (never more), an
`AI_ANALYSIS` reason (bilingual) is appended, the LLM's category is added if
new, and the response gains `llm: { used, model, isScam, confidence }`. The
LLM can never push a message the rules scored ≥60 below `suspicious` (the
adjusted score is clamped to ≥35 in that case). If Ollama is unreachable,
times out (12s) or returns garbage, the analysis silently falls back to
rule-only and the `llm` key is omitted.

- `LLM_ENABLED=auto` (default) probes `{OLLAMA_URL}/api/tags` with a ~1s
  timeout and caches the result for 60s; `true`/`false` force it.
- Better Arabic: `llama3.2` works but `qwen2.5:3b` is noticeably stronger on
  Arabic. Switch with:

  ```bash
  ollama pull qwen2.5:3b
  OLLAMA_MODEL=qwen2.5:3b npm run dev
  ```

- `GET /api/llm-status` → `{ enabled, reachable, model }` for UI/debugging.
- Tests never require a live Ollama (`LLM_ENABLED=false` in
  `vitest.config.ts`; the LLM tests mock `fetch`).

## API Endpoints

Base URL: `http://localhost:3000/api`. All errors return
`{ "error": { "code", "message" } }` with an appropriate HTTP status.

### Detection

- `POST /check-url` — body `{ "url": "..." }`. Heuristic risk analysis
  (brand lookalikes of Palestinian brands, punycode, IP hosts, suspicious
  TLDs, shorteners, missing HTTPS, scam keywords, `@` tricks, excessive
  subdomains) + community-report and check-frequency signals. Returns
  `{ url, verdict, score, reasons[], communityReports }` where verdict is
  `safe` (<30), `suspicious` (30–59) or `dangerous` (>=60). Reasons are
  bilingual (`message` Arabic, `messageEn` English).
- `POST /analyze-message` — body `{ "text": "...", "sender": "JAWWAL"? }`.
  Weighted Arabic/English scam-pattern engine; URLs found in the text are run
  through the URL checker. With the optional `sender` (§4.2c) the sender is
  checked too: `official` → −25 (`OFFICIAL_SENDER`) unless the message asks
  for OTP/credentials or carries a dangerous link (then `SPOOFING_WARNING`
  and no reduction); `reported` → +40 (`REPORTED_SENDER`). Score clamped
  0–100. When the local LLM layer is available (see below) an `AI_ANALYSIS`
  reason and an `llm` object are added. Returns
  `{ verdict, score, categories[], reasons[], extractedUrls[], sender?, llm? }`.
- `POST /check-social` — body `{ "input": "facebook.com/jawwal.prizes2026" }`
  (profile URL or bare `@handle`). Detects the platform
  (`FACEBOOK|INSTAGRAM|TIKTOK|TELEGRAM|X|WHATSAPP|UNKNOWN`), extracts the
  handle, and scores brand impersonation (shared Palestinian brand list +
  Levenshtein), scam keywords in the handle (prize/وكيل/official…),
  digit-suffix pattern (`…2026`), approved `SOCIAL_ACCOUNT` reports and
  check frequency. Returns
  `{ input, platform, handle, verdict, score, reasons[], communityReports }`.
- `GET /check-sender?value=<phone-or-senderId>` — classifies the value as
  `PHONE` (normalized to `+970…`) or `SENDER_ID`, then resolves trust:
  `official` (curated registry: JAWWAL, OOREDOO, PALTEL, Bank of Palestine,
  PalPay, Jawwal Pay, Reflect, banks/gov IDs — verdict `safe`), `reported`
  (approved PHONE reports — verdict `dangerous`) or `unknown` (score 0,
  verdict `safe`, `UNKNOWN_SENDER` reason). Returns
  `{ value, normalizedValue, type, trust, verdict, score, communityReports, reasons[] }`.

### Community reports

- `GET /reports?query=&type=PHONE|URL|SOCIAL_ACCOUNT&page=1` — search
  APPROVED reports. Phone queries are normalized (`0599...`, `00970...`,
  `+970 599-...` all match).
- `POST /reports` — body `{ type, value, description, scamCategory, reporterName? }`.
  New reports start `PENDING` (moderation).
- `GET /reports/stats` — `{ total, byType, byCategory }` (approved only).
- `GET /flagged-urls?page=1` — "active scams" feed merging flagged URL checks
  and approved URL reports:
  `{ url, verdict, score, timesChecked, lastSeenAt, source: "check"|"report" }`.
- `GET /blocklist/phones?since=<iso>` — public sync feed for on-device call
  screening. Aggregates APPROVED `PHONE` reports by normalized number:
  `{ updatedAt, count, totalCount, entries: [{ number, reports, category }] }`
  (category = most frequent for that number; entries sorted by `reports`
  desc). With `since`, only numbers whose latest report is newer are returned
  (`reports` still counts all approved reports); `totalCount` always reflects
  the full list so clients can detect drift and re-sync.

### Awareness hub

- `GET /articles` — bilingual article list (metadata only).
- `GET /articles/:slug` — full article with markdown `bodyAr` / `bodyEn`.
- `GET /quiz` — bilingual quiz questions with options, correct answer and
  explanations.

### Misc

- `GET /health` — `{ status: "ok", uptime, timestamp }`.
- `GET /llm-status` — `{ enabled, reachable, model }` for the optional
  local-LLM layer.

## Project layout

```
prisma/schema.prisma        # Report, Article, QuizQuestion, CheckLog
prisma/seed.ts              # bilingual seed content
src/index.ts                # entry point
src/app.ts                  # express app wiring (CORS, /api router)
src/services/urlChecker.ts  # URL heuristic engine
src/services/messageAnalyzer.ts  # message rule engine (sender-aware)
src/services/llmAnalyzer.ts      # optional Ollama second-opinion layer
src/services/socialChecker.ts    # social-account impersonation checker
src/services/senderChecker.ts    # sender/caller trust resolution
src/routes/                 # check, reports, flagged-urls, articles, quiz
src/lib/normalize.ts        # phone/URL/account normalization
src/lib/brands.ts           # shared Palestinian brand list + impersonation match
src/middleware/errorHandler.ts   # { error: { code, message } }
tests/                      # vitest unit tests
```

## Scam categories

`PRIZE_SCAM`, `DELIVERY_SCAM`, `JOB_SCAM`, `BANK_PHISHING`, `OTP_THEFT`,
`FAKE_SHOP`, `CHARITY_SCAM`, `CRYPTO_SCAM`, `OTHER`
