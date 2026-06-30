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
export type { GmailClientOptions, DecodedMessage } from "./ingest/gmail";

// Analytics for the dashboard and trends views.
export {
  categoryBreakdown,
  monthlyTotals,
  dailyFlow,
  topMerchants,
  monthSummary,
  previousMonth,
  latestMonth,
} from "./analytics";
export type {
  CategorySlice,
  MonthlyTotal,
  DailyFlow,
  MerchantTotal,
  MonthSummary,
} from "./analytics";

// On device assistant (rule based fallback for the Ask tab).
export { answer, createAssistant } from "./assistant/query";
export type { Answer, Assistant } from "./assistant/query";

// Shared HTTP transport for the network clients.
export type { HttpTransport, HttpRequest, HttpResponse } from "./http";

// Integrations.
export {
  SheetsAppender,
  SHEET_HEADER,
  transactionToRow,
} from "./integrations/sheets";
export type { SheetsAppenderOptions } from "./integrations/sheets";
export {
  AccountAggregatorClient,
  fiToTransaction,
} from "./integrations/accountAggregator";
export type {
  AccountAggregatorOptions,
  ConsentHandle,
  ConsentStatus,
  DataSessionHandle,
} from "./integrations/accountAggregator";

// Encrypted backup.
export {
  buildEnvelope,
  parseEnvelope,
  createBackup,
  restoreBackup,
  BACKUP_VERSION,
} from "./backup/encrypt";
export type {
  BackupEnvelope,
  Encrypted,
  Encryptor,
  StorageAdapter,
} from "./backup/encrypt";

// Mobile: Android SMS ingestion.
export { syncSms, isBankSender, BANK_SENDER_HEADER } from "./mobile/sms";
export type { SmsMessage, SmsReader, SmsSyncOptions } from "./mobile/sms";
export type {
  Transaction,
  Category,
  Channel,
  Direction,
  ParseResult,
  RejectReason,
} from "./types";
