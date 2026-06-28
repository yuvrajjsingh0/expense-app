// Google Sheets append.
//
// Appends each new transaction as a row to a user owned spreadsheet via the
// Sheets API. Transport injectable, so it is testable and platform agnostic.
// Only what the user enables is ever sent, in line with the project's on device
// privacy stance.

import type { Transaction } from "../types";
import type { HttpTransport } from "../http";

export interface SheetsAppenderOptions {
  /** OAuth2 bearer token with spreadsheets scope. */
  accessToken: string;
  /** Target spreadsheet id. */
  spreadsheetId: string;
  /** A1 range whose first cell anchors the append, for example "Sheet1!A1". */
  range?: string;
  transport: HttpTransport;
  baseUrl?: string;
}

const DEFAULT_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/** The header row written once, matching {@link transactionToRow}. */
export const SHEET_HEADER: readonly string[] = [
  "Date",
  "Direction",
  "Amount",
  "Channel",
  "Category",
  "Merchant",
  "Account",
  "Reference",
  "Confidence",
];

/** Flatten a transaction into a spreadsheet row, column order per SHEET_HEADER. */
export function transactionToRow(t: Transaction): Array<string | number> {
  return [
    t.date ?? t.dateText ?? "",
    t.direction,
    t.amount,
    t.channel,
    t.category,
    t.brand ?? t.merchant ?? "",
    t.account ?? "",
    t.ref ?? "",
    t.confidence,
  ];
}

export class SheetsAppender {
  private readonly options: Required<Omit<SheetsAppenderOptions, "baseUrl">> & {
    baseUrl: string;
  };

  constructor(options: SheetsAppenderOptions) {
    this.options = {
      accessToken: options.accessToken,
      spreadsheetId: options.spreadsheetId,
      range: options.range ?? "Sheet1!A1",
      transport: options.transport,
      baseUrl: options.baseUrl ?? DEFAULT_BASE,
    };
  }

  /**
   * Append transactions as rows. Returns the number of rows sent. A no op for an
   * empty batch, so callers can pass new transactions unconditionally.
   */
  async append(transactions: readonly Transaction[]): Promise<number> {
    if (transactions.length === 0) return 0;
    const { baseUrl, spreadsheetId, range, accessToken, transport } = this.options;
    const url =
      `${baseUrl}/${spreadsheetId}/values/${encodeURIComponent(range)}` +
      `:append?valueInputOption=USER_ENTERED`;

    const res = await transport(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: transactions.map(transactionToRow) }),
    });
    if (!res.ok) {
      throw new Error(`Sheets append failed with status ${res.status}`);
    }
    return transactions.length;
  }

  /** Write the header row once, for a fresh sheet. */
  async writeHeader(): Promise<void> {
    const { baseUrl, spreadsheetId, range, accessToken, transport } = this.options;
    const url =
      `${baseUrl}/${spreadsheetId}/values/${encodeURIComponent(range)}` +
      `:append?valueInputOption=USER_ENTERED`;
    const res = await transport(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [SHEET_HEADER] }),
    });
    if (!res.ok) throw new Error(`Sheets header write failed ${res.status}`);
  }
}
