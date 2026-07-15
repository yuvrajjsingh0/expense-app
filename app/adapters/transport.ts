// A fetch backed HttpTransport for the engine's network clients (Gmail, Sheets,
// Account Aggregator, Drive, Dropbox). This is the single place the app crosses
// from the platform agnostic core to the real network.

import type { HttpTransport } from "../../src/http";

/** Build an HttpTransport over the global fetch. */
export function createTransport(): HttpTransport {
  return async (url, init) => {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.headers,
      body: init?.body,
    });
    return {
      ok: res.ok,
      status: res.status,
      json: () => res.json(),
      text: () => res.text(),
    };
  };
}
