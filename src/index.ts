export { parse, parseResult, parseAll } from "./parser";
export type { ParseOptions } from "./parser";
export { categorise, MERCHANTS } from "./merchants";
export { normaliseDate } from "./date";
export type { ISODate } from "./date";
export {
  scoreConfidence,
  needsReview,
  triage,
  REVIEW_THRESHOLD,
} from "./confidence";
export type { Confidence, ReviewQueue, Unscored } from "./confidence";
export { detectRecurring, SUBSCRIPTION_BRANDS } from "./recurring";
export type { RecurringMerchant, RecurringOptions, Cadence } from "./recurring";

// Ingestion: email and statement imports that feed the parser core.
export { htmlToText, htmlToLines } from "./ingest/html";
export { parseCsvStatement } from "./ingest/csv";
export type { CsvImportOptions } from "./ingest/csv";
export { parsePdfStatement } from "./ingest/pdf";
export type { PdfImportOptions } from "./ingest/pdf";
export {
  GmailClient,
  BANK_SENDERS,
  bankSenderQuery,
} from "./ingest/gmail";
export type {
  GmailClientOptions,
  HttpTransport,
  DecodedMessage,
} from "./ingest/gmail";
export type {
  Transaction,
  Category,
  Channel,
  Direction,
  ParseResult,
  RejectReason,
} from "./types";
