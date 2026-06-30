# Platform adapters

The engine in `src/` is platform agnostic by design: no React Native, browser,
or Node specific APIs. Every piece that must touch a device, a network, or the
cloud is expressed as a small TypeScript interface, and the real binding is
supplied at the edge. This file lists each seam and how to wire it on a real
target.

This is also an honest map of what is and is not runnable in a pure JavaScript
sandbox. The web app (`npm run dev`) is fully runnable here. The native and
cloud bindings below require a device build or real credentials, so they ship as
interfaces with pure, tested logic behind them rather than as something that
pretends to run offline.

## What runs today

- `npm test` runs the full engine: parser, dates, confidence, recurring,
  analytics, assistant, ingestion (HTML, CSV, PDF text, Gmail with a fake
  transport), integrations, backup, and SMS sync. All pure, all deterministic.
- `npm run dev` runs the web app: Dashboard, Trends, Ask, and Import, driven by
  the same engine, with sample data and paste your own import.

## Adapter seams

### Android SMS reader

- Interface: `SmsReader` in `src/mobile/sms.ts`.
- Pure side: `syncSms` filters DLT bank senders and parses each message.
- Binding: a React Native native module that reads the SMS content provider
  (requires being the default SMS app, `READ_SMS`). Implement `readInbox` to
  return `{ address, body, date }` rows.

### Gmail (iOS and Android email ingestion)

- Interface: `HttpTransport` in `src/http.ts`, passed to `GmailClient`.
- Binding: an adapter over `fetch` that adds a real OAuth2 access token from the
  Google sign in flow. The client only needs `gmail.readonly`.

### Google Sheets

- Interface: `HttpTransport`, passed to `SheetsAppender`.
- Binding: same `fetch` adapter with a token carrying the `spreadsheets` scope.
  Call `append` whenever new transactions are added.

### Account Aggregator (Setu or Finvu)

- Interface: `HttpTransport`, passed to `AccountAggregatorClient`.
- Binding: a `fetch` adapter pointed at the provider host with request signing as
  the provider requires. The consent, session, and fetch methods are already
  shaped to the Setu and Finvu flow.

### Encrypted backup (iCloud and Drive)

- Interfaces: `Encryptor` and `StorageAdapter` in `src/backup/encrypt.ts`.
- Pure side: `buildEnvelope`, `createBackup`, `restoreBackup` own the versioned
  envelope and round trip.
- Bindings:
  - `Encryptor` over Web Crypto `AES-GCM`, with the key in the device keychain or
    keystore. The key never enters `src/`.
  - `StorageAdapter` over the iCloud key value store or the Drive app data
    folder.

### On device assistant (Qwen)

- Interface: `Assistant` in `src/assistant/query.ts`.
- Pure side: `createAssistant` returns a deterministic rule based assistant that
  answers from the transactions, used by the Ask tab and in tests.
- Binding: a `llama.rn` backed `Assistant` whose `ask` runs Qwen 2.5 on device.
  The Ask tab uses the rule based one until a model is loaded, then swaps in the
  model backed one behind the same interface, no UI change.

### React Native shell

- The web app in `app/` is the reference UI and the runnable demo. The bare
  workflow RN shell reuses the same engine and the adapters above. Components map
  one to one: `Dashboard`, `Trends`, `Ask`, `Import`. Charts are plain SVG, so
  they port to `react-native-svg` with minimal change.
