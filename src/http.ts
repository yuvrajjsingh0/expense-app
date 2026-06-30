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
}

export interface HttpTransport {
  (url: string, init?: HttpRequest): Promise<HttpResponse>;
}
