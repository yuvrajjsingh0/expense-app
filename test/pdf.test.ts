import { describe, it, expect } from "vitest";
import { parsePdfStatement } from "../src/ingest/pdf";

const REF = new Date("2026-06-28T00:00:00Z");

describe("parsePdfStatement", () => {
  it("parses tabular rows from extracted statement text", () => {
    const text = [
      "HDFC BANK STATEMENT",
      "Date        Narration                 Amount      Balance",
      "27-06-26    UPI-SWIGGY-food           419.00      12,345.00",
      "25-06-26    NEFT FROM ACME Cr       5,000.00      17,345.00",
      "Closing Balance                                  17,345.00",
    ].join("\n");

    const txns = parsePdfStatement(text, { now: REF });
    expect(txns).toHaveLength(2);
    expect(txns[0]).toMatchObject({
      direction: "debit",
      amount: 419,
      brand: "Swiggy",
      date: "2026-06-27",
    });
    expect(txns[1]).toMatchObject({ direction: "credit", amount: 5000 });
  });

  it("ignores header and summary lines without a leading date", () => {
    const text = "Statement Period: Jun 2026\nTotal Spent 999.00\n";
    expect(parsePdfStatement(text, { now: REF })).toEqual([]);
  });
});
