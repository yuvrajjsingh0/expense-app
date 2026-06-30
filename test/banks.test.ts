import { describe, it, expect } from "vitest";
import { parse } from "../src/parser";

// Year inference reference, so date assertions are stable.
const REF = new Date("2026-06-28T00:00:00Z");

describe("parse: additional bank and card formats", () => {
  it("Yes Bank credit card spend", () => {
    const t = parse(
      "INR 899.00 spent on YES BANK Credit Card xx4321 at MYNTRA on 28-06-26",
      { now: REF },
    );
    expect(t).not.toBeNull();
    expect(t!.direction).toBe("debit");
    expect(t!.amount).toBe(899);
    expect(t!.channel).toBe("CARD");
    expect(t!.account).toBe("4321");
    expect(t!.brand).toBe("Myntra");
    expect(t!.category).toBe("shopping");
    expect(t!.date).toBe("2026-06-28");
  });

  it("PNB UPI debit, trf to merchant", () => {
    const t = parse(
      "Dear Customer Rs.150.00 debited from PNB A/c XX5678 on 27-06-26 trf to ZEPTO Refno 412345678901 UPI",
      { now: REF },
    );
    expect(t!.direction).toBe("debit");
    expect(t!.amount).toBe(150);
    expect(t!.channel).toBe("UPI");
    expect(t!.account).toBe("5678");
    expect(t!.brand).toBe("Zepto");
    expect(t!.category).toBe("groceries");
  });

  it("Bank of Baroda IMPS credit", () => {
    const t = parse(
      "Rs.5000.00 Credited to BOB A/c XX9012 on 26-06-26 by IMPS from RAVI KUMAR",
      { now: REF },
    );
    expect(t!.direction).toBe("credit");
    expect(t!.amount).toBe(5000);
    expect(t!.channel).toBe("IMPS");
    expect(t!.account).toBe("9012");
  });

  it("IDFC First credit card spend", () => {
    const t = parse(
      "INR 1199.00 spent on IDFC FIRST Bank Credit Card XX3344 at NYKAA on 25-06-26",
      { now: REF },
    );
    expect(t!.amount).toBe(1199);
    expect(t!.channel).toBe("CARD");
    expect(t!.account).toBe("3344");
    expect(t!.brand).toBe("Nykaa");
    expect(t!.category).toBe("shopping");
  });

  it("RuPay credit card spend", () => {
    const t = parse(
      "Rs.640.00 spent on your RuPay Credit Card xx7788 at BIGBASKET on 24-06-26",
      { now: REF },
    );
    expect(t!.amount).toBe(640);
    expect(t!.channel).toBe("CARD");
    expect(t!.account).toBe("7788");
    expect(t!.brand).toBe("BigBasket");
    expect(t!.category).toBe("groceries");
  });
});
