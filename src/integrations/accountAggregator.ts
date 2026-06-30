// Account Aggregator (RBI AA) client.
//
// Models the consent and fetch flow used by Setu and Finvu: request a consent,
// poll until the user approves it in their AA app, open a data session, then
// fetch financial information. The fetched bank transactions are mapped onto the
// shared Transaction type so the rest of the engine treats them identically to
// SMS and email. Transport injectable and therefore testable; the real OAuth and
// signing are supplied by the runtime adapter.

import type { Transaction, Direction } from "../types";
import type { HttpTransport } from "../http";
import type { ISODate } from "../date";
import { categorise } from "../merchants";
import { scoreConfidence, type Unscored } from "../confidence";

export interface AccountAggregatorOptions {
  /** Provider API key or bearer token. */
  apiKey: string;
  transport: HttpTransport;
  /** Provider base URL, for example a Setu or Finvu sandbox host. */
  baseUrl: string;
}

export type ConsentStatus = "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED";

export interface ConsentHandle {
  id: string;
  status: ConsentStatus;
  /** URL the user opens in their AA app to approve, when the provider returns one. */
  redirectUrl?: string;
}

export interface DataSessionHandle {
  id: string;
  status: "PENDING" | "READY" | "FAILED";
}

/** A financial transaction as AA providers return it, before normalisation. */
interface FiTransaction {
  type?: string;
  amount?: string | number;
  narration?: string;
  transactionTimestamp?: string;
  txnId?: string;
  mode?: string;
}

interface ConsentResponse {
  id?: string;
  consentId?: string;
  status?: string;
  url?: string;
  redirectUrl?: string;
}

interface SessionResponse {
  id?: string;
  sessionId?: string;
  status?: string;
}

interface FiDataResponse {
  transactions?: FiTransaction[];
}

function normaliseStatus(raw: string | undefined): ConsentStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "ACTIVE":
    case "APPROVED":
      return "ACTIVE";
    case "REJECTED":
    case "DENIED":
      return "REJECTED";
    case "EXPIRED":
    case "PAUSED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

/** AA timestamps are ISO 8601; take the date portion as our ISODate. */
function isoDateOf(timestamp: string | undefined): ISODate | undefined {
  if (!timestamp) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(timestamp);
  return match ? (`${match[1]}-${match[2]}-${match[3]}` as ISODate) : undefined;
}

function toNumber(value: string | number | undefined): number {
  return typeof value === "number" ? value : Number(value ?? NaN);
}

function channelOf(mode: string | undefined): Transaction["channel"] {
  switch ((mode ?? "").toUpperCase()) {
    case "UPI":
      return "UPI";
    case "CARD":
    case "POS":
      return "CARD";
    case "NEFT":
      return "NEFT";
    case "IMPS":
      return "IMPS";
    default:
      return "BANK";
  }
}

/** Map one AA financial transaction onto the shared Transaction type. */
export function fiToTransaction(fi: FiTransaction): Transaction | null {
  const amount = toNumber(fi.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const direction: Direction =
    (fi.type ?? "").toUpperCase() === "CREDIT" ? "credit" : "debit";
  const narration = fi.narration ?? "";
  const { brand, category } = categorise(narration);

  const base: Unscored = {
    raw: JSON.stringify(fi),
    direction,
    amount,
    channel: channelOf(fi.mode),
    category,
    merchant: brand ?? (narration || undefined),
    brand,
    ref: fi.txnId,
    dateText: fi.transactionTimestamp,
    date: isoDateOf(fi.transactionTimestamp),
  };
  return { ...base, confidence: scoreConfidence(base) };
}

export class AccountAggregatorClient {
  private readonly apiKey: string;
  private readonly transport: HttpTransport;
  private readonly baseUrl: string;

  constructor(options: AccountAggregatorOptions) {
    this.apiKey = options.apiKey;
    this.transport = options.transport;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown }): Promise<T> {
    const res = await this.transport(`${this.baseUrl}${path}`, {
      method: init?.method ?? "GET",
      headers: this.headers(),
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) throw new Error(`AA request ${path} failed ${res.status}`);
    return (await res.json()) as T;
  }

  /** Start a consent request for the given mobile number. */
  async createConsent(customerMobile: string): Promise<ConsentHandle> {
    const data = await this.request<ConsentResponse>("/consents", {
      method: "POST",
      body: { customerMobile },
    });
    const id = data.id ?? data.consentId;
    if (!id) throw new Error("AA consent response missing an id");
    return {
      id,
      status: normaliseStatus(data.status),
      redirectUrl: data.redirectUrl ?? data.url,
    };
  }

  /** Poll a consent's current status. */
  async getConsentStatus(consentId: string): Promise<ConsentStatus> {
    const data = await this.request<ConsentResponse>(`/consents/${consentId}`);
    return normaliseStatus(data.status);
  }

  /** Open a data session for an active consent. */
  async createDataSession(consentId: string): Promise<DataSessionHandle> {
    const data = await this.request<SessionResponse>("/sessions", {
      method: "POST",
      body: { consentId },
    });
    const id = data.id ?? data.sessionId;
    if (!id) throw new Error("AA session response missing an id");
    const status = (data.status ?? "PENDING").toUpperCase();
    return {
      id,
      status: status === "READY" || status === "COMPLETED" ? "READY" : status === "FAILED" ? "FAILED" : "PENDING",
    };
  }

  /** Fetch and normalise transactions for a ready session. */
  async fetchTransactions(sessionId: string): Promise<Transaction[]> {
    const data = await this.request<FiDataResponse>(`/sessions/${sessionId}/data`);
    return (data.transactions ?? [])
      .map(fiToTransaction)
      .filter((t): t is Transaction => t !== null);
  }
}
