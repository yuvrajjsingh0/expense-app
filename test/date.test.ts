import { describe, it, expect } from "vitest";
import { normaliseDate } from "../src/date";
import { parse } from "../src/parser";

// A fixed reference so year inference is deterministic, late in the year so
// most months resolve to the same year and a few resolve to the previous one.
const REF = new Date("2026-06-28T00:00:00Z");

describe("normaliseDate: format coverage", () => {
  it("DD-MM-YY numeric with hyphens", () => {
    expect(normaliseDate("27-06-26", REF)).toBe("2026-06-27");
  });

  it("DD/MM/YY numeric with slashes", () => {
    expect(normaliseDate("20/06/26", REF)).toBe("2026-06-20");
  });

  it("DD-Mon-YY with month name", () => {
    expect(normaliseDate("27-Jun-26", REF)).toBe("2026-06-27");
  });

  it("DDMonYY with no separators", () => {
    expect(normaliseDate("23Jun26", REF)).toBe("2026-06-23");
  });

  it("four digit year is kept verbatim", () => {
    expect(normaliseDate("05-01-2025", REF)).toBe("2025-01-05");
  });

  it("zero pads single digit day and month", () => {
    expect(normaliseDate("5-1-26", REF)).toBe("2026-01-05");
  });
});

describe("normaliseDate: year inference when omitted", () => {
  it("uses the reference year for a date already past this year", () => {
    expect(normaliseDate("28-06", REF)).toBe("2026-06-28");
  });

  it("rolls back a year for a date still in the future this year", () => {
    // December has not happened yet on 28 June, so it must be last year.
    expect(normaliseDate("25-12", REF)).toBe("2025-12-25");
  });
});

describe("normaliseDate: rejects non dates", () => {
  it("returns undefined for an impossible calendar date", () => {
    expect(normaliseDate("31-02-26", REF)).toBeUndefined();
  });

  it("returns undefined for a month out of range", () => {
    expect(normaliseDate("10-13-26", REF)).toBeUndefined();
  });

  it("returns undefined for an unknown month name", () => {
    expect(normaliseDate("10-Zzz-26", REF)).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(normaliseDate("", REF)).toBeUndefined();
  });
});

describe("parse: surfaces the normalised date", () => {
  it("attaches an ISO date built from the alert and reference year", () => {
    const t = parse(
      "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412345678901 UPI",
      { now: REF },
    );
    expect(t!.dateText).toBe("28-06");
    expect(t!.date).toBe("2026-06-28");
  });

  it("normalises a month name date from an ICICI alert", () => {
    const t = parse(
      "ICICI Bank Acct XX567 debited for Rs 642.00 on 27-Jun-26; Blinkit credited. UPI:412345",
      { now: REF },
    );
    expect(t!.date).toBe("2026-06-27");
  });
});
