# Platform adapters

The engine in `src/` is platform agnostic by design: no React Native, browser,
or Node specific APIs. Every piece that must touch a device, a network, or the
cloud is expressed as a small TypeScript interface, and the real binding is
supplied at the edge. This file lists each seam and how to wire it on a real
target.

The interfaces below now have concrete React Native implementations in
`app/adapters`, each type checked against the real Expo and llama.rn types and
included in the verified Metro bundle. What still needs a device is the final
build and run step, plus real OAuth and model files at runtime.

## What runs and is verified today

- `npm test` runs the full engine: parser, dates, confidence, recurring,
  analytics, assistant, prompt, model manager, ingestion, integrations, backup,
  and the reusable sync engine. All pure and deterministic.
- `npm run typecheck` and `npm run typecheck:app` type check the engine and the
  RN app.
- `npx expo export` bundles the whole app (engine plus every adapter) with Metro,
  proving imports, babel, and the reanimated plugin resolve.
- `npx expo run:android` builds and runs it on a device or emulator.

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
