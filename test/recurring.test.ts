import { describe, it, expect } from "vitest";
import { parse } from "../src/parser";
import { detectRecurring } from "../src/recurring";

const REF = new Date("2026-06-28T00:00:00Z");

/** Parse a batch with deterministic year inference. */
function batch(messages: string[]) {
  return messages.map((m) => parse(m, { now: REF })!);
}

describe("detectRecurring: known subscriptions", () => {
  it("flags a known subscription brand from a single charge", () => {
    const txns = batch([
      "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-06-26",
    ]);
    const recurring = detectRecurring(txns);
    expect(recurring).toHaveLength(1);
    expect(recurring[0].brand).toBe("Netflix");
    expect(recurring[0].isSubscription).toBe(true);
    expect(recurring[0].cadence).toBe("unknown");
    expect(recurring[0].occurrences).toBe(1);
  });
});

describe("detectRecurring: cadence from repetition", () => {
  it("flags an unknown merchant charged monthly three times", () => {
    const txns = batch([
      "Sent Rs.999.00 From HDFC Bank A/C x1234 To Acme Rentals On 28-04-26 Ref 1 UPI",
      "Sent Rs.999.00 From HDFC Bank A/C x1234 To Acme Rentals On 28-05-26 Ref 2 UPI",
      "Sent Rs.999.00 From HDFC Bank A/C x1234 To Acme Rentals On 28-06-26 Ref 3 UPI",
    ]);
    const recurring = detectRecurring(txns);
    expect(recurring).toHaveLength(1);
    const r = recurring[0];
    expect(r.key).toBe("acme rentals");
    expect(r.isSubscription).toBe(false);
    expect(r.cadence).toBe("monthly");
    expect(r.occurrences).toBe(3);
    expect(r.total).toBe(2997);
    expect(r.averageAmount).toBe(999);
  });

  it("does not flag a one off unknown merchant", () => {
    const txns = batch([
      "Sent Rs.250.00 From HDFC Bank A/C x1234 To Acme Rentals On 28-06-26 Ref 1 UPI",
    ]);
    expect(detectRecurring(txns)).toHaveLength(0);
  });

  it("respects a custom minOccurrences", () => {
    const txns = batch([
      "Sent Rs.100.00 From HDFC Bank A/C x1234 To Acme Rentals On 14-06-26 Ref 1 UPI",
      "Sent Rs.100.00 From HDFC Bank A/C x1234 To Acme Rentals On 21-06-26 Ref 2 UPI",
    ]);
    expect(detectRecurring(txns, { minOccurrences: 2 })).toHaveLength(1);
    expect(detectRecurring(txns, { minOccurrences: 2 })[0].cadence).toBe("weekly");
  });
});

describe("detectRecurring: filtering and ordering", () => {
  it("ignores credits and sorts by occurrences then total", () => {
    const txns = batch([
      "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-04-26",
      "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-05-26",
      "Spent Rs.119.00 On HDFC Card x5678 At SPOTIFY on 25-06-26",
      "Rs.5000.00 credited to A/C XX1234 on 25-06-26 by NEFT from ACME PVT LTD on account",
    ]);
    const recurring = detectRecurring(txns);
    expect(recurring.map((r) => r.brand)).toEqual(["Netflix", "Spotify"]);
    expect(recurring.every((r) => r.isSubscription)).toBe(true);
  });
});
