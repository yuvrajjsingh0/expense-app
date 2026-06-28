// Confidence scoring and the low confidence review queue.
//
// Every parsed transaction carries a confidence in [0, 1] derived from how many
// independent signals the parser could pin down. A bare debit with only an
// amount scores low; one with a recognised brand, an account tail, a date, and
// a reference scores high. Downstream, low confidence parses are routed to a
// review queue rather than trusted silently.

import type { Transaction } from "./types";

/**
 * A parse confidence in the closed interval [0, 1], rounded to two decimals.
 *
 * Branded so a raw number cannot stand in for a scored value. Construct one
 * only through {@link scoreConfidence} or the {@link REVIEW_THRESHOLD} constant.
 */
export type Confidence = number & { readonly __brand: "Confidence" };

/** A transaction before its confidence has been scored. */
export type Unscored = Omit<Transaction, "confidence">;

/**
 * Weight each signal contributes to the score. The base covers the two fields
 * every transaction has by construction, direction and amount. The optional
 * signals add evidence on top. The weights are chosen so a fully resolved
 * transaction reaches 1.0 and a bare one sits near the base.
 */
const WEIGHTS = {
  base: 0.4,
  brand: 0.25,
  merchant: 0.1,
  account: 0.1,
  date: 0.1,
  ref: 0.05,
  vpa: 0.05,
  channel: 0.05,
} as const;

/** Clamp to [0, 1] and round to two decimals, then brand. */
function toConfidence(raw: number): Confidence {
  const clamped = Math.min(1, Math.max(0, raw));
  return (Math.round(clamped * 100) / 100) as Confidence;
}

/**
 * Below this confidence a transaction is sent to the review queue rather than
 * accepted automatically.
 */
export const REVIEW_THRESHOLD = 0.6 as Confidence;

/**
 * Score how much the parser could pin down about a transaction.
 *
 * A recognised brand and a bare merchant are mutually exclusive contributions:
 * a brand already implies a merchant, so it is not counted twice.
 */
export function scoreConfidence(t: Unscored): Confidence {
  let score = WEIGHTS.base;
  if (t.brand) score += WEIGHTS.brand;
  else if (t.merchant) score += WEIGHTS.merchant;
  if (t.account) score += WEIGHTS.account;
  if (t.date) score += WEIGHTS.date;
  if (t.ref) score += WEIGHTS.ref;
  if (t.vpa) score += WEIGHTS.vpa;
  if (t.channel !== "BANK") score += WEIGHTS.channel;
  return toConfidence(score);
}

/** True when a transaction should be reviewed rather than trusted outright. */
export function needsReview(
  t: Transaction,
  threshold: Confidence = REVIEW_THRESHOLD,
): boolean {
  return t.confidence < threshold;
}

/** A set of transactions split by whether they cleared the review threshold. */
export interface ReviewQueue {
  /** Transactions at or above the threshold, safe to use directly. */
  readonly accepted: readonly Transaction[];
  /** Transactions below the threshold, needing a human or a second pass. */
  readonly review: readonly Transaction[];
}

/**
 * Partition transactions into accepted and to review by confidence.
 * Pure: the inputs are not mutated and order within each bucket is preserved.
 */
export function triage(
  transactions: readonly Transaction[],
  threshold: Confidence = REVIEW_THRESHOLD,
): ReviewQueue {
  const accepted: Transaction[] = [];
  const review: Transaction[] = [];
  for (const t of transactions) {
    (needsReview(t, threshold) ? review : accepted).push(t);
  }
  return { accepted, review };
}
