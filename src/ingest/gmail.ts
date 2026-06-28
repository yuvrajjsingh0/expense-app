// Gmail API client for bank alert emails.
//
// The client is transport agnostic: it depends on an injected HttpTransport
// rather than a real fetch, so the same code runs on a phone, in Node, and in
// tests with a fake transport. It knows how to query for bank senders, page
// through message ids, and decode a message body to plain text. Turning that
// text into transactions is left to the parser core, keeping this file focused
// on Gmail.

import { htmlToText } from "./html";

/** A minimal HTTP surface, satisfied by fetch or any equivalent. */
export interface HttpTransport {
  (url: string, init?: { headers?: Record<string, string> }): Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }>;
}

export interface GmailClientOptions {
  /** OAuth2 bearer token with at least gmail.readonly scope. */
  accessToken: string;
  /** Injected transport. Pass globalThis.fetch in a real runtime. */
  transport: HttpTransport;
  /** API base, overridable for testing. */
  baseUrl?: string;
}

/** Senders that typically carry Indian bank and card alerts. */
export const BANK_SENDERS: readonly string[] = [
  "alerts@hdfcbank.net",
  "alerts@icicibank.com",
  "alerts@axisbank.com",
  "noreply@sbi.co.in",
  "alerts@kotak.com",
  "noreply@yesbank.in",
  "alerts@idfcfirstbank.com",
];

/** A decoded Gmail message reduced to what the parser needs. */
export interface DecodedMessage {
  id: string;
  /** Plain text body, HTML already flattened. */
  text: string;
}

interface GmailListResponse {
  messages?: Array<{ id: string }>;
  nextPageToken?: string;
}

interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

interface GmailMessageResponse {
  id: string;
  payload?: GmailMessagePart;
}

const DEFAULT_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Decode a base64url string to raw bytes. Pure: no atob or Buffer, so it stays
 * platform agnostic. Missing padding is tolerated, as Gmail strips it.
 */
function base64UrlToBytes(input: string): number[] {
  const clean = input.replace(/-/g, "+").replace(/_/g, "/");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const value = B64.indexOf(ch);
    if (value === -1) continue; // skip padding and whitespace
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

/** Decode a UTF-8 byte array to a string without TextDecoder. */
function utf8Decode(bytes: readonly number[]): string {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      result += String.fromCodePoint(b0);
    } else if (b0 >= 0xc0 && b0 < 0xe0) {
      const b1 = bytes[i++] & 0x3f;
      result += String.fromCodePoint(((b0 & 0x1f) << 6) | b1);
    } else if (b0 >= 0xe0 && b0 < 0xf0) {
      const b1 = bytes[i++] & 0x3f;
      const b2 = bytes[i++] & 0x3f;
      result += String.fromCodePoint(((b0 & 0x0f) << 12) | (b1 << 6) | b2);
    } else {
      const b1 = bytes[i++] & 0x3f;
      const b2 = bytes[i++] & 0x3f;
      const b3 = bytes[i++] & 0x3f;
      result += String.fromCodePoint(
        ((b0 & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3,
      );
    }
  }
  return result;
}

/** Decode Gmail base64url body data to a UTF-8 string. */
function decodeBody(data: string): string {
  return utf8Decode(base64UrlToBytes(data));
}

/** Walk the MIME tree, preferring text/plain, then flattening text/html. */
function extractText(part: GmailMessagePart | undefined): string {
  if (!part) return "";
  if (part.body?.data) {
    const decoded = decodeBody(part.body.data);
    return part.mimeType === "text/html" ? htmlToText(decoded) : decoded;
  }
  if (part.parts) {
    const plain = part.parts.find((p) => p.mimeType === "text/plain");
    if (plain?.body?.data) return decodeBody(plain.body.data);
    return part.parts.map(extractText).filter(Boolean).join("\n");
  }
  return "";
}

/** Build a Gmail search query that matches the given senders. */
export function bankSenderQuery(
  senders: readonly string[] = BANK_SENDERS,
): string {
  const from = senders.map((s) => `from:${s}`).join(" OR ");
  return `(${from}) newer_than:90d`;
}

/**
 * A small, typed Gmail client scoped to reading bank alert emails.
 */
export class GmailClient {
  private readonly accessToken: string;
  private readonly transport: HttpTransport;
  private readonly baseUrl: string;

  constructor(options: GmailClientOptions) {
    this.accessToken = options.accessToken;
    this.transport = options.transport;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.transport(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Gmail API error ${res.status} for ${path}`);
    }
    return (await res.json()) as T;
  }

  /** List message ids matching a Gmail search query, following pagination. */
  async listMessageIds(query: string, max = 100): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const q = `q=${encodeURIComponent(query)}`;
      const page = pageToken
        ? await this.get<GmailListResponse>(
            `/messages?${q}&pageToken=${encodeURIComponent(pageToken)}`,
          )
        : await this.get<GmailListResponse>(`/messages?${q}`);
      for (const m of page.messages ?? []) {
        ids.push(m.id);
        if (ids.length >= max) return ids;
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
    return ids;
  }

  /** Fetch and decode a single message to plain text. */
  async getMessage(id: string): Promise<DecodedMessage> {
    const msg = await this.get<GmailMessageResponse>(`/messages/${id}?format=full`);
    return { id: msg.id, text: extractText(msg.payload).trim() };
  }

  /**
   * Fetch decoded bank alert messages in one call. Convenience over
   * listMessageIds + getMessage for the common case.
   */
  async fetchBankMessages(
    senders: readonly string[] = BANK_SENDERS,
    max = 100,
  ): Promise<DecodedMessage[]> {
    const ids = await this.listMessageIds(bankSenderQuery(senders), max);
    return Promise.all(ids.map((id) => this.getMessage(id)));
  }
}
