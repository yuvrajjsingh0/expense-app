// Android SMS ingestion.
//
// On Android the app is the default SMS handler and reads the inbox through a
// native module. That native call is the only platform specific part; it is
// expressed here as the SmsReader interface. Everything else, filtering bank
// senders and running each message through the parser core, is pure and tested.
// iOS has no SMS access and uses email and Account Aggregator instead.

import type { Transaction } from "../types";
import type { ParseOptions } from "../parser";
import { parse } from "../parser";

/** One SMS as the Android content provider exposes it. */
export interface SmsMessage {
  /** Sender header, for example "VK-HDFCBK" or a phone number. */
  address: string;
  body: string;
  /** Epoch milliseconds the message was received, when available. */
  date?: number;
}

/** The native bridge: reads the device inbox. Implemented per platform. */
export interface SmsReader {
  /** Return inbox messages, optionally only those after `sinceEpochMs`. */
  readInbox(sinceEpochMs?: number): Promise<SmsMessage[]>;
}

/**
 * Indian bank and card alert senders use a six character header in the form
 * XX-YYYYYY (DLT sender ids), for example "VM-HDFCBK" or "AD-ICICIB". This
 * matches that shape so we skip personal messages cheaply before parsing.
 */
export const BANK_SENDER_HEADER = /^[A-Z]{2}-[A-Z]{4,6}$/;

export interface SmsSyncOptions extends ParseOptions {
  /** Only read messages newer than this epoch ms. */
  sinceEpochMs?: number;
  /** Skip senders that do not look like a bank DLT header. Defaults to true. */
  bankSendersOnly?: boolean;
}

/** True when a sender looks like a bank or card alert header. */
export function isBankSender(address: string): boolean {
  return BANK_SENDER_HEADER.test(address.trim().toUpperCase());
}

/**
 * Read the inbox and parse bank alerts into transactions.
 *
 * Non transactional messages (OTPs, promos, personal SMS) are dropped by the
 * parser returning null. When `bankSendersOnly` is set, messages from senders
 * that do not match the bank header are skipped before parsing.
 */
export async function syncSms(
  reader: SmsReader,
  options: SmsSyncOptions = {},
): Promise<Transaction[]> {
  const { sinceEpochMs, bankSendersOnly = true, ...parseOptions } = options;
  const messages = await reader.readInbox(sinceEpochMs);

  const transactions: Transaction[] = [];
  for (const message of messages) {
    if (bankSendersOnly && !isBankSender(message.address)) continue;
    const opts: ParseOptions =
      parseOptions.now === undefined && message.date !== undefined
        ? { now: new Date(message.date) }
        : parseOptions;
    const txn = parse(message.body, opts);
    if (txn) transactions.push(txn);
  }
  return transactions;
}
