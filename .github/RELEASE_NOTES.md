First tagged release of أمان (Aman), the Palestinian anti-fraud platform.

## What is in it

Four checkers, each returning a verdict, a risk score out of 100, and the
reasons behind it in both Arabic and English:

- **URL checker.** Lookalikes of Palestinian brands (Jawwal, Ooredoo, Bank of
  Palestine, PalPay), punycode, IP hosts, suspicious TLDs, shorteners and
  missing HTTPS, combined with community reports.
- **Message analyzer.** A weighted Arabic and English scam-pattern engine
  covering prize, delivery, job, bank phishing, OTP theft and urgency, aware of
  who sent the message, with an optional local-LLM second opinion.
- **Social account checker.** Brand impersonation in handles, scam keywords and
  digit-suffix patterns.
- **Sender and caller checker.** A curated registry of official Palestinian
  senders against community-reported numbers, with explicit spoofing warnings.

Around them: moderated community reports, a bilingual awareness hub with a
quiz, and on-device call and SMS screening on Android with a warning overlay.

## Downloads

| File | What it is |
|---|---|
| `aman-<tag>.apk` | Android app |
| `aman-web-<tag>.zip` | Built web app, static files to serve behind any web server |
| `aman-backend-<tag>.zip` | Compiled API and seed script, needs Node 22 and `npm ci --omit=dev` |

The APK is signed with debug keys, which is the Flutter default and is
untouched here. It installs and runs, but it is not suitable for the Play
Store without a real signing key.

## Verified

151 tests pass on this commit: 85 for the API and its detection engines, 52 for
the web app, and 14 for the mobile app.

## A note on the results

Verdicts come from heuristics and pattern rules, not certainty. A safe result
means no known fraud indicator was found, not that something is trustworthy.
The interface says so in both languages.
