import { describe, it, expect } from "vitest";
import { syncSms, isBankSender, type SmsReader, type SmsMessage } from "../src/mobile/sms";

const REF = new Date("2026-06-28T00:00:00Z");

function fakeReader(messages: SmsMessage[]): SmsReader {
  return { readInbox: async () => messages };
}

describe("isBankSender", () => {
  it("accepts DLT bank headers and rejects personal numbers", () => {
    expect(isBankSender("VM-HDFCBK")).toBe(true);
    expect(isBankSender("AD-ICICIB")).toBe(true);
    expect(isBankSender("+919999999999")).toBe(false);
    expect(isBankSender("MOM")).toBe(false);
  });
});

describe("syncSms", () => {
  it("parses bank alerts and skips personal and OTP messages", async () => {
    const reader = fakeReader([
      { address: "VM-HDFCBK", body: "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412 UPI" },
      { address: "AD-HDFCBK", body: "123456 is your OTP. Do not share." },
      { address: "+919812345678", body: "Sent Rs.50 To SWIGGY are you free?" },
    ]);
    const txns = await syncSms(reader, { now: REF });
    expect(txns).toHaveLength(1);
    expect(txns[0].brand).toBe("Swiggy");
  });

  it("uses the message timestamp to infer a missing year", async () => {
    const may = new Date("2026-05-15T00:00:00Z").getTime();
    const reader = fakeReader([
      { address: "VM-HDFCBK", body: "Sent Rs.100.00 From HDFC Bank A/C x1234 To ZOMATO On 12-05 Ref 1 UPI", date: may },
    ]);
    const txns = await syncSms(reader);
    expect(txns[0].date).toBe("2026-05-12");
  });

  it("can include all senders when asked", async () => {
    const reader = fakeReader([
      { address: "RANDOM", body: "Spent Rs.99.00 On HDFC Card x5678 At AMAZON on 20-06-26" },
    ]);
    expect(await syncSms(reader, { now: REF, bankSendersOnly: false })).toHaveLength(1);
    expect(await syncSms(reader, { now: REF })).toHaveLength(0);
  });
});
