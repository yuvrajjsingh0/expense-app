// Analytics over a set of transactions.
//
// Pure aggregation that powers the dashboard and trends views: category
// breakdown for the donut, monthly and daily flow for the bars, top merchants,
// and a month summary with a delta against the previous month. No formatting or
// charting here, only numbers, so the same functions serve the web app, the
// mobile app, and tests.

import type { Transaction, Category } from "./types";
import type { ISODate } from "./date";

export interface CategorySlice {
  readonly category: Category;
  readonly total: number;
  readonly count: number;
  /** Fraction of total spend in [0, 1]. */
  readonly share: number;
}

export interface MonthlyTotal {
  /** Calendar month as YYYY-MM. */
  readonly month: string;
  readonly debit: number;
  readonly credit: number;
  /** credit minus debit. */
  readonly net: number;
}

export interface DailyFlow {
  readonly date: ISODate;
  readonly debit: number;
  readonly credit: number;
}

export interface MerchantTotal {
  readonly merchant: string;
  readonly total: number;
  readonly count: number;
}

export interface MonthSummary {
  readonly month: string;
  readonly spent: number;
  readonly received: number;
  readonly txnCount: number;
  readonly previousSpent: number;
  /** Percent change in spend versus the previous month, or null when no prior. */
  readonly deltaPct: number | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** YYYY-MM-DD to YYYY-MM. */
function monthOf(date: ISODate): string {
  return date.slice(0, 7);
}

const isDebit = (t: Transaction): boolean => t.direction === "debit";

/** Display label for a transaction: brand, then merchant, then "Unknown". */
function label(t: Transaction): string {
  return t.brand ?? t.merchant ?? "Unknown";
}

/**
 * Spend by category, for the dashboard donut. Only debits are counted. Sorted
 * by total spend descending; shares sum to 1 when there is any spend.
 */
export function categoryBreakdown(
  transactions: readonly Transaction[],
): CategorySlice[] {
  const totals = new Map<Category, { total: number; count: number }>();
  let grandTotal = 0;
  for (const t of transactions) {
    if (!isDebit(t)) continue;
    const entry = totals.get(t.category) ?? { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    totals.set(t.category, entry);
    grandTotal += t.amount;
  }

  return [...totals.entries()]
    .map(([category, { total, count }]) => ({
      category,
      total: round2(total),
      count,
      share: grandTotal > 0 ? round2(total / grandTotal) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Debit, credit, and net per calendar month, ascending by month. Transactions
 * without a normalised date are skipped, since they cannot be placed in time.
 */
export function monthlyTotals(
  transactions: readonly Transaction[],
): MonthlyTotal[] {
  const months = new Map<string, { debit: number; credit: number }>();
  for (const t of transactions) {
    if (!t.date) continue;
    const key = monthOf(t.date);
    const entry = months.get(key) ?? { debit: 0, credit: 0 };
    if (isDebit(t)) entry.debit += t.amount;
    else entry.credit += t.amount;
    months.set(key, entry);
  }

  return [...months.entries()]
    .map(([month, { debit, credit }]) => ({
      month,
      debit: round2(debit),
      credit: round2(credit),
      net: round2(credit - debit),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Debit and credit per day, ascending by date. Undated rows are skipped. */
export function dailyFlow(transactions: readonly Transaction[]): DailyFlow[] {
  const days = new Map<ISODate, { debit: number; credit: number }>();
  for (const t of transactions) {
    if (!t.date) continue;
    const entry = days.get(t.date) ?? { debit: 0, credit: 0 };
    if (isDebit(t)) entry.debit += t.amount;
    else entry.credit += t.amount;
    days.set(t.date, entry);
  }

  return [...days.entries()]
    .map(([date, { debit, credit }]) => ({
      date,
      debit: round2(debit),
      credit: round2(credit),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Top merchants by spend. Only debits count. Returns at most `limit` entries,
 * sorted by total descending then count descending.
 */
export function topMerchants(
  transactions: readonly Transaction[],
  limit = 5,
): MerchantTotal[] {
  const merchants = new Map<string, { total: number; count: number }>();
  for (const t of transactions) {
    if (!isDebit(t)) continue;
    const key = label(t);
    const entry = merchants.get(key) ?? { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    merchants.set(key, entry);
  }

  return [...merchants.entries()]
    .map(([merchant, { total, count }]) => ({
      merchant,
      total: round2(total),
      count,
    }))
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, limit);
}

/**
 * Summary for one month with a delta against the prior calendar month.
 * `month` is YYYY-MM. deltaPct is null when there was no spend the month before.
 */
export function monthSummary(
  transactions: readonly Transaction[],
  month: string,
): MonthSummary {
  const previous = previousMonth(month);
  let spent = 0;
  let received = 0;
  let txnCount = 0;
  let previousSpent = 0;

  for (const t of transactions) {
    if (!t.date) continue;
    const m = monthOf(t.date);
    if (m === month) {
      if (isDebit(t)) spent += t.amount;
      else received += t.amount;
      txnCount += 1;
    } else if (m === previous && isDebit(t)) {
      previousSpent += t.amount;
    }
  }

  const deltaPct =
    previousSpent > 0 ? round2(((spent - previousSpent) / previousSpent) * 100) : null;

  return {
    month,
    spent: round2(spent),
    received: round2(received),
    txnCount,
    previousSpent: round2(previousSpent),
    deltaPct,
  };
}

/** The calendar month before a YYYY-MM string. */
export function previousMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return `${y}-${m < 10 ? `0${m}` : m}`;
}

/** The most recent month present in the data, or undefined when none is dated. */
export function latestMonth(
  transactions: readonly Transaction[],
): string | undefined {
  let latest: string | undefined;
  for (const t of transactions) {
    if (!t.date) continue;
    const m = monthOf(t.date);
    if (latest === undefined || m > latest) latest = m;
  }
  return latest;
}
