// PDF bank statement import.
//
// Extracting text from the PDF binary needs a platform library (pdf.js on a
// phone or in the browser, pdf-parse in Node), so that step lives in the
// runtime adapter, not here. This module takes the already extracted text and
// turns the tabular rows into transactions, reusing the shared categorise,
// date, and confidence logic. It is therefore pure and testable.

import type { Transaction, Direction, Channel } from "../types";
import { categorise } from "../merchants";
import { normaliseDate } from "../date";
import { scoreConfidence, type Unscored } from "../confidence";

export interface PdfImportOptions {
  /** Reference date for inferring a missing year. Defaults to now. */
  now?: Date;
  /**
   * How to read direction when a row has a single amount. Most statements put
   * the running balance last and mark debits with "Dr". Defaults to treating a
   * trailing "cr" as credit and everything else as debit.
   */
  creditMarker?: RegExp;
}

// A statement row starts with a date and ends with one or more money figures.
const ROW = /^(\d{1,2}[-/ ]?[A-Za-z]{3}[-/ ]?\d{2,4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(.*)$/;
const MONEY = /(?:rs\.?|inr|₹)?\s*([\d,]+\.\d{2})/gi;
const DEFAULT_CREDIT = /\bcr\b/i;

function num(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

function detectChannel(text: string): Channel {
  if (/\bupi\b/i.test(text)) return "UPI";
  if (/\bneft\b/i.test(text)) return "NEFT";
  if (/\bimps\b/i.test(text)) return "IMPS";
  if (/\bcard\b|\bpos\b/i.test(text)) return "CARD";
  return "BANK";
}

/**
 * Parse the extracted text of a PDF statement into transactions.
 *
 * Each line that begins with a date and contains at least one money figure is
 * treated as a row. The first money figure on the row is taken as the
 * transaction amount; a trailing balance figure, if any, is ignored. Lines that
 * do not look like rows (headers, footers, summaries) are skipped.
 */
export function parsePdfStatement(
  text: string,
  options: PdfImportOptions = {},
): Transaction[] {
  const creditMarker = options.creditMarker ?? DEFAULT_CREDIT;
  const transactions: Transaction[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const row = ROW.exec(line);
    if (!row) continue;

    const dateText = row[1];
    const rest = row[2];

    const amounts = [...rest.matchAll(MONEY)].map((m) => num(m[1]));
    if (amounts.length === 0) continue;
    const amount = amounts[0];
    if (!Number.isFinite(amount) || amount <= 0) continue;

    // Description is everything before the first money figure.
    const firstMoneyAt = rest.search(/(?:rs\.?|inr|₹)?\s*[\d,]+\.\d{2}/i);
    const description = (firstMoneyAt > 0 ? rest.slice(0, firstMoneyAt) : rest).trim();

    const direction: Direction = creditMarker.test(rest) ? "credit" : "debit";
    const { brand, category } = categorise(description);

    const base: Unscored = {
      raw: line,
      direction,
      amount,
      channel: detectChannel(rest),
      category,
      merchant: brand ?? (description ? description : undefined),
      brand,
      dateText,
      date: normaliseDate(dateText, options.now),
    };
    transactions.push({ ...base, confidence: scoreConfidence(base) });
  }

  return transactions;
}
