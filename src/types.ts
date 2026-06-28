// Shared types for the transaction parser. Platform agnostic so the same
// engine runs on Android (SMS), iOS (email and Account Aggregator), and in tests.

import type { ISODate } from "./date";

export type Category =
  | "food"
  | "groceries"
  | "transport"
  | "shopping"
  | "bills"
  | "entertainment"
  | "health"
  | "others";

export type Channel = "UPI" | "CARD" | "NEFT" | "IMPS" | "BANK";

export type Direction = "debit" | "credit";

export interface Transaction {
  raw: string;
  direction: Direction;
  amount: number;
  channel: Channel;
  category: Category;
  /** Cleaned display name, brand name when recognised, else the raw counterparty. */
  merchant?: string;
  /** Recognised brand, only set when the merchant maps to a known brand. */
  brand?: string;
  /** Last digits of the account or card, if present. */
  account?: string;
  /** UPI VPA handle, if the payment was UPI to a handle. */
  vpa?: string;
  /** Bank reference number, if present. */
  ref?: string;
  /** Date string exactly as it appeared in the message, not normalised. */
  dateText?: string;
  /** Transaction date normalised to an ISO calendar date, when one was found. */
  date?: ISODate;
}
