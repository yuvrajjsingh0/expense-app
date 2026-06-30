import { describe, it, expect } from "vitest";
import { parseAll } from "../src/parser";
import {
  categoryBreakdown,
  monthlyTotals,
  topMerchants,
  monthSummary,
  previousMonth,
  latestMonth,
} from "../src/analytics";

const REF = new Date("2026-06-28T00:00:00Z");

const INBOX = [
  "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-05-26",
  "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 10-06-26 Ref 1 UPI",
  "Sent Rs.581.00 From HDFC Bank A/C x1234 To ZOMATO On 20-06-26 Ref 2 UPI",
  "Spent Rs.2499.00 On HDFC Bank Card x5678 At AMAZON on 21-06-26",
  "Rs.5000.00 credited to A/C XX1234 on 22-06-26 by NEFT from ACME PVT LTD on account",
];

const TXNS = parseAll(INBOX, { now: REF });

describe("categoryBreakdown", () => {
  it("sums debits by category with shares that total one", () => {
    const slices = categoryBreakdown(TXNS);
    const food = slices.find((s) => s.category === "food");
    expect(food!.total).toBe(1000); // 419 + 581
    expect(food!.count).toBe(2);
    const shareSum = slices.reduce((s, x) => s + x.share, 0);
    expect(shareSum).toBeCloseTo(1, 1);
    // Credits are excluded from spend.
    expect(slices.every((s) => s.category !== "others" || s.total > 0)).toBe(true);
  });
});

describe("monthlyTotals", () => {
  it("groups debit and credit by month ascending", () => {
    const months = monthlyTotals(TXNS);
    expect(months.map((m) => m.month)).toEqual(["2026-05", "2026-06"]);
    expect(months[0].debit).toBe(649);
    const june = months[1];
    expect(june.debit).toBe(419 + 581 + 2499);
    expect(june.credit).toBe(5000);
  });
});

describe("topMerchants", () => {
  it("ranks merchants by spend", () => {
    const top = topMerchants(TXNS, 3);
    expect(top[0].merchant).toBe("Amazon");
    expect(top[0].total).toBe(2499);
  });
});

describe("monthSummary and helpers", () => {
  it("computes spend and a delta versus the prior month", () => {
    const summary = monthSummary(TXNS, "2026-06");
    expect(summary.spent).toBe(419 + 581 + 2499);
    expect(summary.received).toBe(5000);
    expect(summary.previousSpent).toBe(649);
    expect(summary.deltaPct).not.toBeNull();
  });

  it("previousMonth rolls over a year boundary", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
  });

  it("latestMonth finds the most recent dated month", () => {
    expect(latestMonth(TXNS)).toBe("2026-06");
  });
});
