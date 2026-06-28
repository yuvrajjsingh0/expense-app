// Recurring merchant and subscription detection.
//
// Works over a batch of already parsed transactions and groups the debits by
// counterparty. A group is flagged as recurring when either it is a known
// subscription biller (even from a single charge) or it repeats often enough on
// a regular weekly or monthly cadence. This drives the "your subscriptions"
// view and helps spot silent renewals.

import type { Transaction, Category } from "./types";
import type { ISODate } from "./date";

/** The rhythm of a group of charges, inferred from the gaps between dates. */
export type Cadence = "weekly" | "monthly" | "irregular" | "unknown";

/**
 * Brands that are billed on a subscription, matched against Transaction.brand
 * exactly as merchants.ts emits it. A single charge to any of these is enough
 * to flag the merchant as recurring.
 */
export const SUBSCRIPTION_BRANDS: ReadonlySet<string> = new Set([
  "Netflix",
  "Spotify",
  "Hotstar",
  "Prime Video",
  "Cult.fit",
  "ACT Fibernet",
  "Jio",
  "Airtel",
]);

/** A merchant the engine believes is charging the user on a repeating basis. */
export interface RecurringMerchant {
  /** Grouping key: the brand when known, else the lowercased merchant name. */
  readonly key: string;
  /** Recognised brand, when the merchant mapped to one. */
  readonly brand?: string;
  readonly category: Category;
  /** Number of charges seen in the input batch. */
  readonly occurrences: number;
  /** Sum of the charge amounts, rounded to two decimals. */
  readonly total: number;
  /** Mean charge amount, rounded to two decimals. */
  readonly averageAmount: number;
  readonly cadence: Cadence;
  /** True when the brand is a known subscription biller. */
  readonly isSubscription: boolean;
  /** The charges that make up this group, in input order. */
  readonly transactions: readonly Transaction[];
}

/** Tuning for {@link detectRecurring}. */
export interface RecurringOptions {
  /**
   * Minimum charges for an otherwise unknown merchant to count as recurring.
   * Known subscription brands bypass this. Defaults to 3.
   */
  minOccurrences?: number;
}

const DEFAULT_MIN_OCCURRENCES = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Convert an ISO calendar date to a whole day count for gap arithmetic. */
function toEpochDay(iso: ISODate): number {
  return Date.parse(`${iso}T00:00:00Z`) / MS_PER_DAY;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Infer cadence from the median gap between dated charges. Charges without a
 * normalised date are ignored. Fewer than two dated charges is "unknown".
 */
function inferCadence(transactions: readonly Transaction[]): Cadence {
  const days = transactions
    .map((t) => t.date)
    .filter((d): d is ISODate => d !== undefined)
    .map(toEpochDay)
    .sort((a, b) => a - b);

  if (days.length < 2) return "unknown";

  const gaps: number[] = [];
  for (let i = 1; i < days.length; i++) gaps.push(days[i] - days[i - 1]);

  const gap = median(gaps);
  if (gap >= 5 && gap <= 10) return "weekly";
  if (gap >= 24 && gap <= 37) return "monthly";
  return "irregular";
}

/**
 * Find recurring merchants and subscriptions in a batch of transactions.
 *
 * Only debits are considered. Transactions with no merchant or brand cannot be
 * grouped and are skipped. The result is sorted by occurrences then total spend,
 * both descending, so the most significant recurring charges come first.
 */
export function detectRecurring(
  transactions: readonly Transaction[],
  options: RecurringOptions = {},
): RecurringMerchant[] {
  const minOccurrences = options.minOccurrences ?? DEFAULT_MIN_OCCURRENCES;

  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.direction !== "debit") continue;
    const key = (t.brand ?? t.merchant)?.toLowerCase();
    if (!key) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(t);
    else groups.set(key, [t]);
  }

  const result: RecurringMerchant[] = [];
  for (const [key, charges] of groups) {
    const brand = charges.find((t) => t.brand !== undefined)?.brand;
    const isSubscription = brand !== undefined && SUBSCRIPTION_BRANDS.has(brand);
    const cadence = inferCadence(charges);
    const isRegular = cadence === "weekly" || cadence === "monthly";

    if (!isSubscription && !(charges.length >= minOccurrences && isRegular)) {
      continue;
    }

    const total = charges.reduce((sum, t) => sum + t.amount, 0);
    result.push({
      key,
      brand,
      category: charges[0].category,
      occurrences: charges.length,
      total: round2(total),
      averageAmount: round2(total / charges.length),
      cadence,
      isSubscription,
      transactions: charges,
    });
  }

  return result.sort(
    (a, b) => b.occurrences - a.occurrences || b.total - a.total,
  );
}
