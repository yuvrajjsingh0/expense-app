import { describe, it, expect } from "vitest";
import type { HttpTransport, HttpRequest } from "../src/http";
import { parseAll } from "../src/parser";
import { SheetsAppender, transactionToRow } from "../src/integrations/sheets";
import {
  AccountAggregatorClient,
  fiToTransaction,
} from "../src/integrations/accountAggregator";

const REF = new Date("2026-06-28T00:00:00Z");

/** A transport that records calls and returns scripted responses. */
function recordingTransport(
  handler: (url: string, init?: HttpRequest) => unknown,
): { transport: HttpTransport; calls: Array<{ url: string; init?: HttpRequest }> } {
  const calls: Array<{ url: string; init?: HttpRequest }> = [];
  const transport: HttpTransport = async (url, init) => {
    calls.push({ url, init });
    const body = handler(url, init);
    return { ok: true, status: 200, json: async () => body };
  };
  return { transport, calls };
}

describe("SheetsAppender", () => {
  it("posts transaction rows to the append endpoint", async () => {
    const { transport, calls } = recordingTransport(() => ({}));
    const appender = new SheetsAppender({
      accessToken: "tok",
      spreadsheetId: "sheet1",
      transport,
    });
    const txns = parseAll(
      ["Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412 UPI"],
      { now: REF },
    );
    const count = await appender.append(txns);
    expect(count).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/sheet1/values/");
    expect(calls[0].url).toContain(":append");
    const sent = JSON.parse(calls[0].init!.body!);
    expect(sent.values[0]).toEqual(transactionToRow(txns[0]));
  });

  it("is a no op for an empty batch", async () => {
    const { transport, calls } = recordingTransport(() => ({}));
    const appender = new SheetsAppender({
      accessToken: "tok",
      spreadsheetId: "s",
      transport,
    });
    expect(await appender.append([])).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("throws on a failed append", async () => {
    const transport: HttpTransport = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
    });
    const appender = new SheetsAppender({
      accessToken: "tok",
      spreadsheetId: "s",
      transport,
    });
    const txns = parseAll(["Rs.10.00 debited"], { now: REF });
    await expect(appender.append(txns)).rejects.toThrow("403");
  });
});

describe("AccountAggregator", () => {
  it("maps an FI transaction onto the shared type", () => {
    const t = fiToTransaction({
      type: "DEBIT",
      amount: "642.00",
      narration: "UPI Blinkit groceries",
      transactionTimestamp: "2026-06-27T10:15:00Z",
      txnId: "T123",
      mode: "UPI",
    });
    expect(t).toMatchObject({
      direction: "debit",
      amount: 642,
      channel: "UPI",
      brand: "Blinkit",
      category: "groceries",
      date: "2026-06-27",
      ref: "T123",
    });
  });

  it("runs the consent then session then fetch flow", async () => {
    const { transport, calls } = recordingTransport((url) => {
      if (url.endsWith("/consents")) return { id: "c1", status: "PENDING", url: "https://aa/approve" };
      if (url.includes("/consents/c1")) return { status: "ACTIVE" };
      if (url.endsWith("/sessions")) return { id: "s1", status: "READY" };
      if (url.includes("/sessions/s1/data"))
        return {
          transactions: [
            { type: "CREDIT", amount: 5000, narration: "NEFT salary", mode: "NEFT", transactionTimestamp: "2026-06-25T00:00:00Z" },
          ],
        };
      return {};
    });
    const aa = new AccountAggregatorClient({
      apiKey: "k",
      transport,
      baseUrl: "https://aa.example.com",
    });

    const consent = await aa.createConsent("9999999999");
    expect(consent.status).toBe("PENDING");
    expect(consent.redirectUrl).toBe("https://aa/approve");
    expect(await aa.getConsentStatus("c1")).toBe("ACTIVE");
    const session = await aa.createDataSession("c1");
    expect(session.status).toBe("READY");
    const txns = await aa.fetchTransactions("s1");
    expect(txns[0]).toMatchObject({ direction: "credit", amount: 5000, channel: "NEFT" });

    expect(calls[0].init?.method).toBe("POST");
  });
});
