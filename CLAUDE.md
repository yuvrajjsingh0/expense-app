# CLAUDE.md

Persistent instructions for Claude Code working in this repo. Read this at the start
of every session.

## What this project is

An India first expense tracker. Bank and UPI alerts are parsed locally into structured
transactions, categorised, and surfaced through charts and an on device assistant.
See README.md for the full architecture.

## Conventions

- TypeScript, strict mode. No `any` unless justified in a comment.
- Keep the parser core platform agnostic. No React Native or browser APIs in `src/`.
- Every new bank format or merchant rule ships with a test in `test/`.
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
- In all prose, code comments, commit messages, and docs, do not use em dashes or en dashes.

## Definition of done for any unit of work

1. Code written and types pass: `npm run typecheck`.
2. Tests written and green: `npm test`.
3. One focused conventional commit.
4. Update the roadmap below, checking off what is done.
5. Push.

If a change cannot be made test green, stop and open an issue describing the blocker
rather than committing broken code.

## Roadmap

Parser core
- [x] Amount, direction, channel, account, merchant, category extraction
- [x] Merchant to category dictionary, specific before general
- [x] Test suite across HDFC, ICICI, SBI, Axis, Kotak, plus OTP and promo rejection
- [x] Add Yes Bank, PNB, BoB, IDFC First, and RuPay credit card formats
- [x] Parse and normalise the transaction date into an ISO string
- [x] Detect subscriptions and recurring merchants
- [x] Confidence score per parse, with a review queue for low confidence

Email ingestion (iOS and Android)
- [x] Gmail API client, label filter for bank senders
- [x] HTML email to plain text, then reuse the parser core
- [x] PDF and CSV statement import

Mobile app
- [x] React Native shell, bare workflow (Expo prebuild plus dev client; bundle verified with expo export)
- [x] Android SMS reader wired into the parser (syncSms pipeline; native READ_SMS bridge is the SmsReader adapter)
- [x] Dashboard: category donut, recent transactions, month total and delta
- [x] Trends: monthly bars, daily flow, top merchants
- [x] On device Qwen via llama.rn, the Ask tab (ModelManager plus LlamaAssistant; rule engine is the fallback)

Integrations
- [x] Google Sheets append on each new transaction
- [x] Account Aggregator (Finvu or Setu) consent flow and fetch
- [x] Encrypted backup to iCloud and Drive (AES-GCM Encryptor plus provider adapters)

Sync (reusable module)
- [x] Provider agnostic encrypted SyncEngine with Google Drive and Dropbox providers

## Notes for the agent

- The reference UI for the dashboard and Ask tab already exists as a web prototype.
  Port its layout and interactions, do not redesign from scratch.
- Brand logos: do not commit trademarked logo files. Use Simple Icons or a logo API
  at runtime, keyed on the merchant string the parser returns.
