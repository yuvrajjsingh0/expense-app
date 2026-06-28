# ledger-core

An India first personal finance engine. It reads bank and UPI transaction alerts,
turns them into clean structured transactions, categorises them, and feeds an
on device assistant. No bank login. Parsing runs locally on the phone.

This repository is the starting point. The parser core is built and tested. The
mobile shells and integrations are on the roadmap below.

## Why this exists

Indian spending is UPI dominant: dozens of small payments a week, across many banks
and apps, each one firing an SMS because RBI requires a transaction alert. That SMS
stream is a reliable, login free source of truth. The job of this project is to parse
it well, categorise it, and make it queryable in plain language.

## Architecture

Ingestion is split by platform because the operating systems differ:

- Android reads the SMS inbox directly (READ_SMS, granted by being the default SMS app).
- iOS cannot read SMS at all. It uses bank emails (Gmail API), imported PDF or CSV
  statements, and the RBI Account Aggregator feed instead.

Both platforms share one engine:

```
raw alert  ->  parser core (this repo)  ->  Transaction  ->  UI + on device LLM
```

The on device assistant is Qwen 2.5 (1.5B or 3B, 4 bit) running through llama.cpp or
MLC LLM. Everything stays on the device. Integrations push only what the user enables.

## The parser

`src/parser.ts` extracts amount, direction, channel, account tail, merchant,
category, a normalised ISO date, and a confidence score from a single alert. It
returns `null` for anything that is not a settled debit or credit, such as OTPs
and promos.

```ts
import { parse } from "ledger-core";

parse("Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412 UPI");
// {
//   direction: "debit", amount: 419, channel: "UPI",
//   account: "1234", brand: "Swiggy", category: "food",
//   date: "2026-06-28", confidence: 0.95, ...
// }
```

Merchant to category mapping lives in `src/merchants.ts`, ordered most specific first
so "swiggy instamart" resolves to groceries before the bare "swiggy" food rule.

### Typed results and the review queue

`parse` returns `Transaction | null` for the common case. For the reason behind a
rejection, `parseResult` returns a discriminated union (the Result pattern):
either `{ ok: true, transaction }` or `{ ok: false, reason }`, where `reason` is a
closed set such as `"rejected_keyword"` or `"no_amount"`.

Every transaction carries a `confidence` in `[0, 1]` derived from how many signals
the parser pinned down. `triage` splits a batch into `accepted` and `review`
buckets so low confidence parses can be checked rather than trusted silently.

### Dates and recurring merchants

`normaliseDate` turns the many Indian date formats into a branded `ISODate`
(`YYYY-MM-DD`), inferring a missing year from a reference point. Building on that,
`detectRecurring` groups debits by counterparty and flags subscriptions and other
charges that repeat on a regular weekly or monthly cadence.

## Run the tests

```bash
npm install
npm test
```

## Continuous, agentic development

This repo is set up so Claude Code can carry the work forward, either on your machine
or unattended in CI.

On your machine, run `claude` in the repo root and ask it to take the next roadmap item.
It builds, runs `npm test`, commits, and pushes using your own git credentials.

In GitHub Actions, `.github/workflows/claude.yml` runs the official
`anthropics/claude-code-action`. It responds to `@claude` mentions on issues and PRs,
and it can be triggered manually with a prompt. To enable it:

1. Run `/install-github-app` inside the Claude Code terminal, or install the app at
   github.com/apps/claude manually.
2. Add `ANTHROPIC_API_KEY` to repository secrets.

For a true hands off loop, add a `schedule` cron trigger that asks Claude to implement
the next unchecked roadmap item and open a PR. Keep guardrails on: scope `contents: write`,
add a test before commit gate, and make sure the workflow does not re-trigger itself.

## Roadmap

See `CLAUDE.md` for the working checklist that drives each session.
