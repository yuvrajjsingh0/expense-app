import { describe, it, expect } from "vitest";
import { parse, parseAll } from "../src/parser";

describe("parse: debit alerts across banks", () => {
  it("HDFC UPI sent", () => {
    const t = parse("Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412345678901 UPI");
    expect(t).not.toBeNull();
    expect(t!.direction).toBe("debit");
    expect(t!.amount).toBe(419);
    expect(t!.channel).toBe("UPI");
    expect(t!.account).toBe("1234");
    expect(t!.brand).toBe("Swiggy");
    expect(t!.category).toBe("food");
  });

  it("HDFC card spent", () => {
    const t = parse("Spent Rs.2499.00 On HDFC Bank Card x5678 At AMAZON on 27-06-26. Avl Lmt Rs.50000");
    expect(t!.amount).toBe(2499);
    expect(t!.channel).toBe("CARD");
    expect(t!.account).toBe("5678");
    expect(t!.brand).toBe("Amazon");
    expect(t!.category).toBe("shopping");
  });

  it("ICICI UPI debited, payee credited form", () => {
    const t = parse("ICICI Bank Acct XX567 debited for Rs 642.00 on 27-Jun-26; Blinkit credited. UPI:412345");
    expect(t!.direction).toBe("debit");
    expect(t!.amount).toBe(642);
    expect(t!.account).toBe("567");
    expect(t!.brand).toBe("Blinkit");
    expect(t!.category).toBe("groceries");
  });

  it("SBI UPI debited by, no currency prefix", () => {
    const t = parse("Dear UPI user A/C X1234 debited by 538.0 on date 23Jun26 trf to ZOMATO Refno 412349");
    expect(t!.amount).toBe(538);
    expect(t!.channel).toBe("UPI");
    expect(t!.brand).toBe("Zomato");
    expect(t!.category).toBe("food");
  });

  it("Axis card spent at merchant", () => {
    const t = parse("INR 1299.00 spent on AXIS BANK Credit Card XX1234 at FLIPKART on 20/06/26");
    expect(t!.amount).toBe(1299);
    expect(t!.channel).toBe("CARD");
    expect(t!.account).toBe("1234");
    expect(t!.brand).toBe("Flipkart");
  });

  it("Kotak UPI to a VPA handle", () => {
    const t = parse("Sent Rs.89.00 from Kotak Bank AC X1234 to rapido@axis on 20-06-26. UPI Ref 412341");
    expect(t!.amount).toBe(89);
    expect(t!.vpa).toBe("rapido@axis");
    expect(t!.brand).toBe("Rapido");
    expect(t!.category).toBe("transport");
  });

  it("resolves Instamart to groceries, not Swiggy food", () => {
    const t = parse("Sent Rs.472.00 From HDFC Bank A/C x1234 To Swiggy Instamart On 16-06 Ref 412 UPI");
    expect(t!.category).toBe("groceries");
    expect(t!.brand).toBe("Instamart");
  });
});

describe("parse: credits and non transactions", () => {
  it("NEFT credit is tagged as credit", () => {
    const t = parse("Rs.5000.00 credited to A/C XX1234 on 25-06-26 by NEFT from ACME PVT LTD on account");
    expect(t!.direction).toBe("credit");
    expect(t!.amount).toBe(5000);
    expect(t!.channel).toBe("NEFT");
  });

  it("rejects an OTP message even with amount and merchant", () => {
    const t = parse("123456 is your OTP for a txn of Rs.500 at Amazon. Do not share with anyone.");
    expect(t).toBeNull();
  });

  it("rejects a promotional message with no debit or credit", () => {
    const t = parse("Get 10% cashback on your next UPI payment with HDFC Bank. T&C apply.");
    expect(t).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parse("")).toBeNull();
  });
});

describe("parseAll", () => {
  it("keeps only the real transactions in a mixed inbox", () => {
    const inbox = [
      "Sent Rs.330.00 From HDFC Bank A/C x1234 To Third Wave Coffee On 26-06 Ref 1 UPI",
      "998877 is your OTP. Do not share.",
      "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-06-26",
      "Flat 50% off this weekend, shop now",
    ];
    const out = parseAll(inbox);
    expect(out).toHaveLength(2);
    expect(out.map((t) => t.category).sort()).toEqual(["entertainment", "food"]);
  });
});
