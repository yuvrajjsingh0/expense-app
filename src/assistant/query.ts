// On device assistant query engine.
//
// The roadmap calls for an on device Qwen model answering questions on the Ask
// tab. The model weights and llama.rn binding are device specific and cannot run
// in this engine, so this module is the deterministic, offline fallback that
// runs everywhere: it interprets a small set of money questions with rules and
// answers straight from the transactions. The Ask tab uses this when no model is
// loaded, and it doubles as the test harness for the natural language surface.
//
// The interface is intentionally model shaped (question in, answer out) so a
// real LLM backend can be swapped in behind the same Assistant type without the
// UI changing.

import type { Transaction, Category } from "../types";
import { MERCHANTS } from "../merchants";
import {
  categoryBreakdown,
  topMerchants,
  monthSummary,
  latestMonth,
} from "../analytics";
import { detectRecurring } from "../recurring";

/** A structured answer. `text` is always present; `value` and `data` are extras. */
export interface Answer {
  readonly text: string;
  /** A single number when the question has one, for example a total. */
  readonly value?: number;
  /** Supporting rows, for example the merchants behind a "top spend" answer. */
  readonly data?: ReadonlyArray<Record<string, string | number>>;
}

/** Anything that can answer a question over a fixed set of transactions. */
export interface Assistant {
  ask(question: string): Answer;
}

const CATEGORIES: readonly Category[] = [
  "food",
  "groceries",
  "transport",
  "shopping",
  "bills",
  "entertainment",
  "health",
  "others",
];

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

function inr(amount: number): string {
  // Indian grouping: last three digits, then pairs. Keeps the assistant local.
  const fixed = Math.round(amount).toString();
  const last3 = fixed.slice(-3);
  const rest = fixed.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `₹${rest ? `${grouped},${last3}` : last3}`;
}

/** Find a YYYY-MM in the question, written as a month name, else undefined. */
function monthIn(question: string, transactions: readonly Transaction[]): string | undefined {
  const found = MONTH_NAMES.findIndex((name) => question.includes(name));
  if (found === -1) return undefined;
  // Pick the year from the most recent transaction that lands in that month.
  const monthNum = found + 1;
  const candidates = transactions
    .map((t) => t.date)
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .filter((d) => Number(d.slice(5, 7)) === monthNum)
    .sort();
  const latest = candidates[candidates.length - 1];
  return latest?.slice(0, 7);
}

function categoryIn(question: string): Category | undefined {
  return CATEGORIES.find((c) => question.includes(c));
}

function merchantIn(question: string): string | undefined {
  const rule = MERCHANTS.find((m) => question.includes(m.match));
  return rule?.brand;
}

function sumSpend(
  transactions: readonly Transaction[],
  predicate: (t: Transaction) => boolean,
): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.direction === "debit" && predicate(t)) {
      total += t.amount;
      count += 1;
    }
  }
  return { total, count };
}

/**
 * Answer a money question over a fixed set of transactions, with rules only.
 *
 * Understood intents: total spend (optionally scoped to a month, category, or
 * merchant), top merchants, top categories, subscriptions and recurring
 * charges, biggest single spend, and a count of transactions.
 */
export function answer(
  question: string,
  transactions: readonly Transaction[],
): Answer {
  const q = question.toLowerCase().trim();

  if (transactions.length === 0) {
    return { text: "There are no transactions yet. Import some to get started." };
  }

  // Subscriptions and recurring charges.
  if (/subscription|recurring|renew/.test(q)) {
    const recurring = detectRecurring(transactions);
    if (recurring.length === 0) {
      return { text: "I did not find any recurring charges or subscriptions." };
    }
    const total = recurring.reduce((s, r) => s + r.averageAmount, 0);
    return {
      text: `You have ${recurring.length} recurring charge${
        recurring.length === 1 ? "" : "s"
      } totalling about ${inr(total)} per cycle: ${recurring
        .map((r) => `${r.key} (${inr(r.averageAmount)})`)
        .join(", ")}.`,
      value: Math.round(total),
      data: recurring.map((r) => ({
        merchant: r.key,
        average: r.averageAmount,
        occurrences: r.occurrences,
        cadence: r.cadence,
      })),
    };
  }

  // Biggest single transaction.
  if (/biggest|largest|highest|most expensive/.test(q)) {
    const debits = transactions.filter((t) => t.direction === "debit");
    if (debits.length === 0) return { text: "No spending found." };
    const max = debits.reduce((a, b) => (b.amount > a.amount ? b : a));
    return {
      text: `Your biggest spend was ${inr(max.amount)} at ${
        max.brand ?? max.merchant ?? "an unknown merchant"
      }${max.date ? ` on ${max.date}` : ""}.`,
      value: max.amount,
    };
  }

  // Top merchants or categories.
  if (/top|most/.test(q) && /merchant|spend|spent|where/.test(q)) {
    const top = topMerchants(transactions, 5);
    return {
      text: `Top merchants by spend: ${top
        .map((m) => `${m.merchant} (${inr(m.total)})`)
        .join(", ")}.`,
      data: top.map((m) => ({ merchant: m.merchant, total: m.total, count: m.count })),
    };
  }
  if (/top|most/.test(q) && /categor/.test(q)) {
    const slices = categoryBreakdown(transactions).slice(0, 5);
    return {
      text: `Top categories: ${slices
        .map((s) => `${s.category} (${inr(s.total)})`)
        .join(", ")}.`,
      data: slices.map((s) => ({ category: s.category, total: s.total })),
    };
  }

  // Count of transactions.
  if (/how many|number of|count/.test(q)) {
    return {
      text: `There are ${transactions.length} transactions.`,
      value: transactions.length,
    };
  }

  // Total spend, optionally scoped by month, category, or merchant.
  if (/how much|total|spend|spent/.test(q)) {
    const month = monthIn(q, transactions);
    const category = categoryIn(q);
    const merchant = merchantIn(q);

    const { total, count } = sumSpend(transactions, (t) => {
      if (month && t.date?.slice(0, 7) !== month) return false;
      if (category && t.category !== category) return false;
      if (merchant && t.brand !== merchant) return false;
      return true;
    });

    const scope = [
      merchant ? `at ${merchant}` : category ? `on ${category}` : "",
      month ? `in ${month}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      text: `You spent ${inr(total)} across ${count} transaction${
        count === 1 ? "" : "s"
      }${scope ? ` ${scope}` : ""}.`,
      value: Math.round(total),
    };
  }

  // Fallback: a summary of the latest month.
  const month = latestMonth(transactions);
  if (month) {
    const summary = monthSummary(transactions, month);
    const delta =
      summary.deltaPct === null
        ? ""
        : ` That is ${Math.abs(summary.deltaPct)}% ${
            summary.deltaPct >= 0 ? "more" : "less"
          } than the month before.`;
    return {
      text: `In ${month} you spent ${inr(summary.spent)} across ${
        summary.txnCount
      } transactions.${delta} Try asking about a category, a merchant, or your subscriptions.`,
      value: Math.round(summary.spent),
    };
  }
  return {
    text: "Ask me about your total spend, top merchants, a category, or your subscriptions.",
  };
}

/** Build an {@link Assistant} bound to a fixed set of transactions. */
export function createAssistant(transactions: readonly Transaction[]): Assistant {
  return { ask: (question: string) => answer(question, transactions) };
}
