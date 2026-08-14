# Aman — Web Frontend | أمان — واجهة الويب

Web frontend for the **Palestinian User Protection Platform from Digital Fraud**
(منصة حماية المستخدم الفلسطيني من الاحتيال الرقمي) — a graduation project.

Built with **Vite + React + TypeScript** (no UI framework, plain CSS).

## Features / Pages

| Route | Page |
|---|---|
| `/` | Home — hero, platform stats (`GET /reports/stats`), quick links |
| `/check-url` | URL Checker (`POST /check-url`) with color-coded verdict card |
| `/analyze-message` | Message Analyzer (`POST /analyze-message`) with categories + extracted URLs |
| `/reports` | Search community reports (`GET /reports`) with type filter + pagination |
| `/report` | Submit a new scam report (`POST /reports`) |
| `/flagged` | Flagged links feed (`GET /flagged-urls`) — "active scams right now" |
| `/awareness` | Awareness hub — article list (`GET /articles`) |
| `/awareness/:slug` | Article page — renders markdown body (`GET /articles/:slug`) |
| `/quiz` | Interactive quiz (`GET /quiz`) with per-question feedback + final score |

- **Arabic-first with full RTL layout** and an ar/en language toggle in the
  header. Switching language flips `dir`/`lang` on `<html>` and swaps every UI
  string. The choice is persisted in `localStorage`.
- Verdicts are color-coded: **safe = green, suspicious = amber, dangerous = red**,
  with a 0–100 risk-score gauge and localized reasons (`message` in Arabic,
  `messageEn` in English).
- Every API call handles loading and error states — if the backend is offline
  a friendly localized error with a retry button is shown.

## Requirements

- Node.js 20+ (and npm)
- The backend API running on `http://localhost:3000` (see `../backend`)

## Setup & Run

```bash
cd web
npm install
npm run dev        # dev server on http://localhost:5173
```

The app expects the API at `http://localhost:3000/api` by default. To point it
elsewhere, create a `.env` file (see `.env.example`):

```bash
VITE_API_URL=http://localhost:3000/api
```

## Build & Preview

```bash
npm run build      # type-check (tsc) + production build into dist/
npm run preview    # serve the production build locally
```

## Project Structure

```
src/
  api/client.ts          # Typed API client (contract: PROJECT_PLAN.md §4)
  i18n/strings.ts        # ar/en UI string dictionary
  i18n/LanguageContext.tsx  # Language context: t(), pick(), dir, toggle
  hooks/useFetch.ts      # Loading/error/retry data-fetching hook
  utils/markdown.ts      # Minimal, escaping markdown -> HTML for articles
  components/            # Layout (header/footer), VerdictCard, feedback
  pages/                 # One component per route
  index.css              # Global stylesheet (RTL-first, logical properties)
```
