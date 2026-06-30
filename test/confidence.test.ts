import { describe, it, expect } from "vitest";
import { parse, parseResult } from "../src/parser";
import { needsReview, triage, REVIEW_THRESHOLD } from "../src/confidence";

const REF = new Date("2026-06-28T00:00:00Z");

describe("parseResult: typed outcomes", () => {
  it("returns ok with a transaction for a real alert", () => {
    const r = parseResult(
      "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412345678901 UPI",
      { now: REF },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.transaction.amount).toBe(419);
  });

  it("reports rejected_keyword for an OTP", () => {
    const r = parseResult("123456 is your OTP. Do not share with anyone.");
    expect(r).toEqual({ ok: false, reason: "rejected_keyword" });
  });

  it("reports empty for a blank message", () => {
    expect(parseResult("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("reports no_direction for a balance only message", () => {
    const r = parseResult("Your HDFC Bank A/C XX1234 balance is Rs.10000.00");
    expect(r).toEqual({ ok: false, reason: "no_direction" });
  });

  it("reports no_amount when a debit has no figure", () => {
    const r = parseResult("Your card was debited at SWIGGY today");
    expect(r).toEqual({ ok: false, reason: "no_amount" });
  });
});

describe("confidence scoring", () => {
  it("scores a fully resolved UPI debit high", () => {
    const t = parse(
      "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412345678901 UPI",
      { now: REF },
    )!;
    // base 0.4 + brand 0.25 + account 0.1 + date 0.1 + ref 0.05 + channel 0.05
    expect(t.confidence).toBeCloseTo(0.95, 5);
    expect(needsReview(t)).toBe(false);
  });

  it("scores a bare unbranded transfer low enough to review", () => {
    const t = parse("Rs.200.00 debited", { now: REF })!;
    // base 0.4 only, channel is BANK so no bonus
    expect(t.confidence).toBeCloseTo(0.4, 5);
    expect(t.confidence).toBeLessThan(REVIEW_THRESHOLD);
    expect(needsReview(t)).toBe(true);
  });

  it("never exceeds 1", () => {
    const t = parse(
      "Sent Rs.89.00 from Kotak Bank AC X1234 to rapido@axis on 20-06-26. UPI Ref 412341",
      { now: REF },
    )!;
    expect(t.confidence).toBeLessThanOrEqual(1);
  });
});

describe("triage: the review queue", () => {
  it("splits transactions by the confidence threshold", () => {
    const inbox = [
      "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412345678901 UPI",
      "Rs.200.00 debited",
    ];
    const txns = inbox.map((m) => parse(m, { now: REF })!);
    const { accepted, review } = triage(txns);
    expect(accepted).toHaveLength(1);
    expect(review).toHaveLength(1);
    expect(accepted[0].brand).toBe("Swiggy");
    expect(review[0].amount).toBe(200);
  });

  it("does not mutate the input array", () => {
    const txns = [parse("Rs.200.00 debited", { now: REF })!];
    const before = [...txns];
    triage(txns);
    expect(txns).toEqual(before);
  });
});
