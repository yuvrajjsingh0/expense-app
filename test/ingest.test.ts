import { describe, it, expect } from "vitest";
import { htmlToText, htmlToLines } from "../src/ingest/html";
import { parseCsvStatement } from "../src/ingest/csv";
import {
  GmailClient,
  bankSenderQuery,
  type HttpTransport,
} from "../src/ingest/gmail";
import { parse, parseAll } from "../src/parser";

const REF = new Date("2026-06-28T00:00:00Z");

describe("htmlToText", () => {
  it("flattens a bank alert email into parseable text", () => {
    const html = `
      <html><head><style>.a{color:red}</style></head><body>
      <table><tr><td>Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412 UPI</td></tr></table>
      <script>track()</script>
      </body></html>`;
    const text = htmlToText(html);
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("track()");
    const t = parse(text, { now: REF });
    expect(t!.brand).toBe("Swiggy");
    expect(t!.amount).toBe(419);
  });

  it("decodes entities including the rupee sign", () => {
    expect(htmlToText("Paid &#8377;250 &amp; done")).toBe("Paid ₹250 & done");
  });

  it("splits multiple alerts into separate lines", () => {
    const html =
      "<p>Spent Rs.100 At AMAZON</p><p>Sent Rs.50 To SWIGGY</p>";
    expect(htmlToLines(html)).toEqual([
      "Spent Rs.100 At AMAZON",
      "Sent Rs.50 To SWIGGY",
    ]);
  });
});

describe("parseCsvStatement", () => {
  it("imports a debit and credit row with separate columns", () => {
    const csv = [
      "Date,Narration,Withdrawal,Deposit",
      "27-06-26,UPI-SWIGGY-food,419.00,",
      "25-06-26,NEFT FROM ACME,,5000.00",
      "26-06-26,Opening Balance,,",
    ].join("\n");
    const txns = parseCsvStatement(csv, { now: REF });
    expect(txns).toHaveLength(2);
    expect(txns[0]).toMatchObject({
      direction: "debit",
      amount: 419,
      brand: "Swiggy",
      category: "food",
      date: "2026-06-27",
    });
    expect(txns[1]).toMatchObject({ direction: "credit", amount: 5000 });
  });

  it("handles a single signed amount column", () => {
    const csv = ["Txn Date,Description,Amount", '20/06/26,"AMAZON, Order",-2499.00'].join(
      "\n",
    );
    const txns = parseCsvStatement(csv, { now: REF });
    expect(txns[0].direction).toBe("debit");
    expect(txns[0].amount).toBe(2499);
    expect(txns[0].brand).toBe("Amazon");
  });

  it("returns empty when required columns are missing", () => {
    expect(parseCsvStatement("Foo,Bar\n1,2")).toEqual([]);
  });
});

describe("bankSenderQuery", () => {
  it("builds a from filter across senders", () => {
    const q = bankSenderQuery(["a@bank.com", "b@bank.com"]);
    expect(q).toContain("from:a@bank.com OR from:b@bank.com");
  });
});

describe("GmailClient with a fake transport", () => {
  function fakeTransport(routes: Record<string, unknown>): HttpTransport {
    return async (url) => {
      const key = Object.keys(routes).find((k) => url.includes(k));
      if (!key) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => routes[key] };
    };
  }

  it("lists ids then decodes a base64url html body", async () => {
    // "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-06-26" as base64url.
    const body =
      "U3BlbnQgUnMuNjQ5LjAwIE9uIEhERkMgQ2FyZCB4NTY3OCBBdCBORVRGTElYIG9uIDI1LTA2LTI2";
    const transport = fakeTransport({
      "/messages?q=": { messages: [{ id: "m1" }] },
      "/messages/m1": {
        id: "m1",
        payload: { mimeType: "text/plain", body: { data: body } },
      },
    });
    const client = new GmailClient({ accessToken: "tok", transport });
    const messages = await client.fetchBankMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain("NETFLIX");

    const txns = parseAll(messages.map((m) => m.text), { now: REF });
    expect(txns[0].brand).toBe("Netflix");
  });

  it("throws on a non ok response", async () => {
    const client = new GmailClient({
      accessToken: "tok",
      transport: async () => ({ ok: false, status: 401, json: async () => ({}) }),
    });
    await expect(client.listMessageIds("q")).rejects.toThrow("401");
  });
});
