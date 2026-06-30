// CSV bank statement import.
//
// Downloaded statements are columnar, not sentences, so they take a different
// path from SMS: read the header, find the date, narration, and amount columns,
// then build a Transaction per row reusing the shared categorise, date, and
// confidence logic. Column names vary by bank, so matching is fuzzy and order
// independent.

import type { Transaction, Direction, Channel } from "../types";
import { categorise } from "../merchants";
import { normaliseDate } from "../date";
import { scoreConfidence, type Unscored } from "../confidence";

/** Header synonyms, lowercased, matched as substrings. Order is priority. */
const COLUMNS = {
  date: ["transaction date", "txn date", "value date", "date"],
  description: ["narration", "description", "particulars", "details", "remarks"],
  debit: ["withdrawal", "debit", "dr"],
  credit: ["deposit", "credit", "cr"],
  amount: ["amount", "amt"],
} as const;

export interface CsvImportOptions {
  /** Reference date for inferring a missing year. Defaults to now. */
  now?: Date;
}

/** Split one CSV line, honouring double quoted fields with embedded commas. */
function splitRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields.map((f) => f.trim());
}

/** Find the index of the first header cell matching any synonym. */
function findColumn(header: readonly string[], synonyms: readonly string[]): number {
  const lower = header.map((h) => h.toLowerCase());
  for (const synonym of synonyms) {
    const idx = lower.findIndex((h) => h.includes(synonym));
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Parse a money cell to a positive number, or null when blank or not a number. */
function parseAmount(cell: string | undefined): number | null {
  if (!cell) return null;
  const cleaned = cell.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function detectChannel(text: string): Channel {
  if (/\bupi\b/i.test(text)) return "UPI";
  if (/\bneft\b/i.test(text)) return "NEFT";
  if (/\bimps\b/i.test(text)) return "IMPS";
  if (/\bcard\b|\bpos\b/i.test(text)) return "CARD";
  return "BANK";
}

/**
 * Parse a CSV bank statement into transactions.
 *
 * The first non empty line is treated as the header. Rows that carry neither a
 * debit nor a credit amount are skipped. Returns an empty array when the
 * required columns (a date, a description, and at least one amount column) are
 * not present.
 */
export function parseCsvStatement(
  csv: string,
  options: CsvImportOptions = {},
): Transaction[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const header = splitRow(lines[0]);
  const dateCol = findColumn(header, COLUMNS.date);
  const descCol = findColumn(header, COLUMNS.description);
  const debitCol = findColumn(header, COLUMNS.debit);
  const creditCol = findColumn(header, COLUMNS.credit);
  const amountCol = findColumn(header, COLUMNS.amount);

  const hasAmount = debitCol !== -1 || creditCol !== -1 || amountCol !== -1;
  if (dateCol === -1 || descCol === -1 || !hasAmount) return [];

  const transactions: Transaction[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitRow(line);
    const description = cells[descCol] ?? "";

    const debit = parseAmount(cells[debitCol]);
    const credit = parseAmount(cells[creditCol]);
    const generic = parseAmount(cells[amountCol]);

    let direction: Direction;
    let amount: number;
    if (debit !== null) {
      direction = "debit";
      amount = debit;
    } else if (credit !== null) {
      direction = "credit";
      amount = credit;
    } else if (generic !== null) {
      // A single amount column: negative means money out.
      const signed = cells[amountCol] ?? "";
      direction = signed.trim().startsWith("-") ? "debit" : "credit";
      amount = generic;
    } else {
      continue; // a balance row or separator, no movement
    }

    const { brand, category } = categorise(description);
    const dateText = cells[dateCol];
    const base: Unscored = {
      raw: line,
      direction,
      amount,
      channel: detectChannel(description),
      category,
      merchant: brand ?? (description ? description : undefined),
      brand,
      dateText,
      date: dateText ? normaliseDate(dateText, options.now) : undefined,
    };
    transactions.push({ ...base, confidence: scoreConfidence(base) });
  }

  return transactions;
}
