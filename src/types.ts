// Shared types for the transaction parser. Platform agnostic so the same
// engine runs on Android (SMS), iOS (email and Account Aggregator), and in tests.

import type { ISODate } from "./date";
import type { Confidence } from "./confidence";

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
  /** How much the parser could pin down, in [0, 1]. See scoreConfidence. */
  confidence: Confidence;
}

/**
 * Why an alert was not turned into a transaction. A closed set so callers can
 * branch exhaustively and surface a precise reason instead of a bare null.
 */
export type RejectReason =
  | "empty" // blank or whitespace only
  | "rejected_keyword" // an OTP, promo, or other non transaction
  | "no_direction" // neither a debit nor a credit could be read
  | "no_amount" // no money figure present
  | "invalid_amount"; // a figure was present but not a positive number

/**
 * The outcome of parsing one alert, as a discriminated union (the Result
 * pattern). Narrow on `ok` to reach either the transaction or the reason.
 */
export type ParseResult =
  | { readonly ok: true; readonly transaction: Transaction }
  | { readonly ok: false; readonly reason: RejectReason };
