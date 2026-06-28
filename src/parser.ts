import type { Transaction, Channel, Direction } from "./types";
import { categorise } from "./merchants";

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
 * Parse a single bank or UPI alert into a Transaction.
 * Returns null when the text is not a settled debit or credit
 * (OTPs, promos, balance only messages).
 */
export function parse(raw: string): Transaction | null {
  const text = raw.trim();
  if (!text || REJECT.test(text)) return null;

  let direction: Direction;
  if (DEBIT.test(text)) direction = "debit";
  else if (CREDIT.test(text)) direction = "credit";
  else return null;

  const amtMatch = text.match(AMOUNT_PREFIXED) ?? text.match(AMOUNT_BY);
  if (!amtMatch) return null;
  const amount = num(amtMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const channel = detectChannel(text);
  const account = text.match(ACCOUNT)?.[1];
  const ref = text.match(REF)?.[1];
  const dateText = text.match(DATE)?.[0];

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

  return {
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
  };
}

/** Parse many messages, dropping the ones that are not transactions. */
export function parseAll(messages: string[]): Transaction[] {
  return messages.map(parse).filter((t): t is Transaction => t !== null);
}
