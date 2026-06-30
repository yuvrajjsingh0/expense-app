import { describe, it, expect } from "vitest";
import { parseAll } from "../src/parser";
import { createAssistant, answer } from "../src/assistant/query";

const REF = new Date("2026-06-28T00:00:00Z");

const INBOX = [
  "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-05-26",
  "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-06-26",
  "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 10-06-26 Ref 1 UPI",
  "Sent Rs.581.00 From HDFC Bank A/C x1234 To ZOMATO On 20-06-26 Ref 2 UPI",
  "Spent Rs.2499.00 On HDFC Bank Card x5678 At AMAZON on 21-06-26",
];

const TXNS = parseAll(INBOX, { now: REF });
const assistant = createAssistant(TXNS);

describe("assistant: totals", () => {
  it("answers total spend across everything", () => {
    const a = assistant.ask("how much did I spend in total?");
    expect(a.value).toBe(649 + 649 + 419 + 581 + 2499);
  });

  it("scopes total to a category", () => {
    const a = assistant.ask("how much did I spend on food?");
    expect(a.value).toBe(419 + 581);
  });

  it("scopes total to a merchant", () => {
    const a = assistant.ask("how much at netflix?");
    expect(a.value).toBe(649 + 649);
  });

  it("scopes total to a month", () => {
    const a = answer("what did I spend in may?", TXNS);
    expect(a.value).toBe(649);
  });
});

describe("assistant: rankings and recurring", () => {
  it("names the biggest spend", () => {
    const a = assistant.ask("what was my biggest transaction?");
    expect(a.value).toBe(2499);
    expect(a.text).toContain("Amazon");
  });

  it("lists top merchants", () => {
    const a = assistant.ask("top merchants?");
    expect(a.data?.[0]).toMatchObject({ merchant: "Amazon" });
  });

  it("detects subscriptions", () => {
    const a = assistant.ask("what are my subscriptions?");
    expect(a.text.toLowerCase()).toContain("netflix");
  });

  it("counts transactions", () => {
    const a = assistant.ask("how many transactions do I have?");
    expect(a.value).toBe(TXNS.length);
  });
});

describe("assistant: empty and fallback", () => {
  it("handles no transactions", () => {
    expect(answer("total?", []).text).toContain("no transactions");
  });
});
