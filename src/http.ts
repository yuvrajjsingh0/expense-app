// A tiny HTTP abstraction shared by the network clients (Gmail, Sheets, Account
// Aggregator). Clients depend on this interface, not on a concrete fetch, so the
// core stays platform agnostic and every client is testable with a fake
// transport. In a real runtime, pass an adapter over globalThis.fetch.

export interface HttpRequest {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  /** Raw body as text, for downloading file content. Optional for older fakes. */
  text?: () => Promise<string>;
}

/** Read a response body as text, falling back to re-stringifying its JSON. */
export async function readText(res: HttpResponse): Promise<string> {
  if (res.text) return res.text();
  return JSON.stringify(await res.json());
}

export interface HttpTransport {
  (url: string, init?: HttpRequest): Promise<HttpResponse>;
}
