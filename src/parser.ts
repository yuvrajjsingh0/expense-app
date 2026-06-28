import type { Transaction, Channel, Direction, ParseResult } from "./types";
import { categorise } from "./merchants";
import { normaliseDate } from "./date";
import { scoreConfidence, type Unscored } from "./confidence";

/** Options that tune how a single alert is parsed. */
export interface ParseOptions {
  /**
   * Reference point used to infer a missing year on a date. Defaults to now.
   * Pass a fixed value for deterministic parsing, for example in tests or when
   * replaying an archived inbox.
   */
  now?: Date;
}

// Messages that are codes or promos, never a settled transaction.
const REJECT = /\b(otp|one[\s-]?time\s?password|do not share|verification code|will expire|cvv)\b/i;

const DEBIT = /\b(debited|debit|spent|sent|paid|withdrawn|purchase)\b/i;
const CREDIT = /\b(credited|credit|received|deposited|refund(?:ed)?)\b/i;

// Amount. Prefer a currency prefixed figure, then fall back to "debited by N".
const AMOUNT_PREFIXED = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
const AMOUNT_BY = /(?:debited|credited|spent|sent|paid)\s*(?:by|for)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;

const ACCOUNT = /(?:a\/c|acct|account|\bac\b|card)[^0-9]*?[xX*]{1,6}\s?(\d{3,6})/i;
const VPA = /([a-z0-9][a-z0-9._-]+@[a-z]{2,})/i;
const REF = /(?:ref(?:no|erence)?|txn|utr)\s*[:.\s]?\s*(\w{6,})/i;
const DATE = /\b(\d{1,2}[-/ ]?[A-Za-z]{3}[-/ ]?\d{2,4}|\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?)\b/;

// Counterparty extraction, tried in order. First hit wins.
const COUNTERPARTY: RegExp[] = [
  /(?:trf to|transferred to|sent to|paid to|\bto)\s+([A-Za-z][A-Za-z0-9 &'._-]*?)\s+(?:on| on|ref|refno|upi|via|\d)/i,
  /\bat\s+([A-Za-z][A-Za-z0-9 &'._-]*?)\s+(?:on|ref|via|\d)/i,
  /(?:[;,]|to)\s*([A-Za-z][A-Za-z0-9 &'._-]*?)\s+credited/i,
  /\bfrom\s+([A-Za-z][A-Za-z0-9 &'._-]*?)(?:\s+on|\.|,|$)/i,
];

function num(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
}

function detectChannel(t: string): Channel {
  if (/\bupi\b/i.test(t)) return "UPI";
  if (/\bcard\b/i.test(t)) return "CARD";
  if (/\bneft\b/i.test(t)) return "NEFT";
  if (/\bimps\b/i.test(t)) return "IMPS";
  return "BANK";
}

/**
 * Parse a single bank or UPI alert, returning a typed result.
 *
 * On success the result holds a scored Transaction. On failure it holds a
 * {@link RejectReason} explaining why the text was not a settled debit or
 * credit, so callers can branch exhaustively instead of inspecting a bare null.
 */
export function parseResult(raw: string, options: ParseOptions = {}): ParseResult {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (REJECT.test(text)) return { ok: false, reason: "rejected_keyword" };

  let direction: Direction;
  if (DEBIT.test(text)) direction = "debit";
  else if (CREDIT.test(text)) direction = "credit";
  else return { ok: false, reason: "no_direction" };

  const amtMatch = text.match(AMOUNT_PREFIXED) ?? text.match(AMOUNT_BY);
  if (!amtMatch) return { ok: false, reason: "no_amount" };
  const amount = num(amtMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }

  const channel = detectChannel(text);
  const account = text.match(ACCOUNT)?.[1];
  const ref = text.match(REF)?.[1];
  const dateText = text.match(DATE)?.[0];
  const date = dateText ? normaliseDate(dateText, options.now) : undefined;

  // Counterparty: a UPI handle wins, otherwise the first phrase pattern.
  let merchant: string | undefined;
  let vpa: string | undefined;
  const vpaMatch = text.match(VPA);
  if (vpaMatch) {
    vpa = vpaMatch[1].toLowerCase();
    merchant = vpa.split("@")[0];
  }
  if (!merchant) {
    for (const re of COUNTERPARTY) {
      const m = text.match(re);
      if (m && m[1]) { merchant = clean(m[1]); break; }
    }
  }

  const source = merchant ?? "";
  const { brand, category } = categorise(source);

  const base: Unscored = {
    raw,
    direction,
    amount,
    channel,
    category,
    merchant: brand ?? (merchant ? clean(merchant) : undefined),
    brand,
    account,
    vpa,
    ref,
    dateText,
    date,
  };

  return { ok: true, transaction: { ...base, confidence: scoreConfidence(base) } };
}

/**
 * Parse a single bank or UPI alert into a Transaction.
 * Returns null when the text is not a settled debit or credit
 * (OTPs, promos, balance only messages). For the reason behind a rejection,
 * use {@link parseResult}.
 */
export function parse(raw: string, options: ParseOptions = {}): Transaction | null {
  const result = parseResult(raw, options);
  return result.ok ? result.transaction : null;
}

/** Parse many messages, dropping the ones that are not transactions. */
export function parseAll(messages: string[], options: ParseOptions = {}): Transaction[] {
  return messages
    .map((m) => parse(m, options))
    .filter((t): t is Transaction => t !== null);
}
