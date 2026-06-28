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
- [ ] Detect subscriptions and recurring merchants
- [x] Confidence score per parse, with a review queue for low confidence

Email ingestion (iOS and Android)
- [ ] Gmail API client, label filter for bank senders
- [ ] HTML email to plain text, then reuse the parser core
- [ ] PDF and CSV statement import

Mobile app
- [ ] React Native shell, bare workflow (native modules needed, Expo Go will not work)
- [ ] Android SMS reader wired into the parser
- [ ] Dashboard: category donut, recent transactions, month total and delta
- [ ] Trends: monthly bars, daily flow, top merchants
- [ ] On device Qwen via llama.rn, the Ask tab

Integrations
- [ ] Google Sheets append on each new transaction
- [ ] Account Aggregator (Finvu or Setu) consent flow and fetch
- [ ] Encrypted backup to iCloud and Drive

## Notes for the agent

- The reference UI for the dashboard and Ask tab already exists as a web prototype.
  Port its layout and interactions, do not redesign from scratch.
- Brand logos: do not commit trademarked logo files. Use Simple Icons or a logo API
  at runtime, keyed on the merchant string the parser returns.
