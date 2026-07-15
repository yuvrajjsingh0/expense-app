// Prompt construction for the on device model.
//
// A small local model answers well only when the question is grounded in
// compact, relevant data. This module turns the ledger into that grounding: a
// short computed summary (this month, top categories, top merchants, recurring)
// plus a bounded list of recent transactions, wrapped in a strict system prompt.
// The same messages feed any backend, so the llama.rn Assistant and a future
// remote one share one context format. Pure and testable.

import type { Transaction } from "../types";
import {
  categoryBreakdown,
  topMerchants,
  monthSummary,
  latestMonth,
} from "../analytics";
import { detectRecurring } from "../recurring";

export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface PromptOptions {
  /** Cap on how many recent transactions to inline. Defaults to 40. */
  maxTransactions?: number;
}

const SYSTEM = [
  "You are a personal finance assistant inside an India first expense tracker.",
  "Answer only from the DATA block. Do not invent numbers.",
  "All amounts are Indian rupees (INR). Be concise and specific.",
  "If the data does not contain the answer, say so plainly.",
].join(" ");

function inr(amount: number): string {
  return `INR ${Math.round(amount)}`;
}

/** A compact, model friendly summary of the ledger. */
export function buildContext(
  transactions: readonly Transaction[],
  options: PromptOptions = {},
): string {
  if (transactions.length === 0) return "No transactions on record.";

  const max = options.maxTransactions ?? 40;
  const month = latestMonth(transactions);
  const lines: string[] = [];

  if (month) {
    const summary = monthSummary(transactions, month);
    const delta =
      summary.deltaPct === null ? "" : ` (${summary.deltaPct}% vs previous month)`;
    lines.push(
      `This month ${month}: spent ${inr(summary.spent)}, received ${inr(
        summary.received,
      )}, ${summary.txnCount} transactions${delta}.`,
    );
  }

  const categories = categoryBreakdown(transactions).slice(0, 5);
  if (categories.length) {
    lines.push(
      "Top categories: " +
        categories.map((c) => `${c.category} ${inr(c.total)}`).join(", ") +
        ".",
    );
  }

  const merchants = topMerchants(transactions, 5);
  if (merchants.length) {
    lines.push(
      "Top merchants: " +
        merchants.map((m) => `${m.merchant} ${inr(m.total)}`).join(", ") +
        ".",
    );
  }

  const recurring = detectRecurring(transactions);
  if (recurring.length) {
    lines.push(
      "Recurring: " +
        recurring.map((r) => `${r.brand ?? r.key} ${inr(r.averageAmount)}/${r.cadence}`).join(", ") +
        ".",
    );
  }

  const recent = [...transactions]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, max)
    .map((t) => {
      const who = t.brand ?? t.merchant ?? "unknown";
      const when = t.date ?? t.dateText ?? "";
      return `- ${when} ${t.direction} ${inr(t.amount)} ${who} [${t.category}]`;
    });
  lines.push(`Recent transactions (${recent.length}):`, ...recent);

  return lines.join("\n");
}

/**
 * Build the chat messages for a question. The context is embedded in the user
 * turn so the model sees the data adjacent to the question it must answer.
 */
export function buildPrompt(
  question: string,
  transactions: readonly Transaction[],
  options: PromptOptions = {},
): ChatMessage[] {
  const context = buildContext(transactions, options);
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `DATA:\n${context}\n\nQUESTION: ${question.trim()}`,
    },
  ];
}
