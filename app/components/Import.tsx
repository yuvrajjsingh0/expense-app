import { useState } from "react";
import type { Transaction } from "../../src/types";
import { parseAll } from "../../src/parser";
import { parseCsvStatement } from "../../src/ingest/csv";
import { htmlToLines } from "../../src/ingest/html";
import { triage } from "../../src/confidence";
import { TransactionList } from "./TransactionList";

interface ImportProps {
  onImport(transactions: Transaction[]): void;
}

type Mode = "sms" | "csv" | "html";

const PLACEHOLDERS: Record<Mode, string> = {
  sms: "Paste one bank or UPI SMS per line...",
  csv: "Paste CSV statement text, including the header row...",
  html: "Paste the HTML body of a bank email...",
};

export function Import({ onImport }: ImportProps) {
  const [mode, setMode] = useState<Mode>("sms");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Transaction[] | null>(null);

  function run() {
    let parsed: Transaction[] = [];
    if (mode === "csv") parsed = parseCsvStatement(text);
    else if (mode === "html") parsed = parseAll(htmlToLines(text));
    else parsed = parseAll(text.split("\n"));
    setPreview(parsed);
  }

  function commit() {
    if (preview && preview.length > 0) {
      onImport(preview);
      setPreview(null);
      setText("");
    }
  }

  const queue = preview ? triage(preview) : null;

  return (
    <div className="import">
      <section className="card">
        <h3>Import transactions</h3>
        <div className="tabs small">
          {(["sms", "csv", "html"] as Mode[]).map((m) => (
            <button
              key={m}
              className={m === mode ? "active" : ""}
              onClick={() => setMode(m)}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDERS[mode]}
          rows={8}
        />
        <div className="actions">
          <button className="primary" onClick={run} disabled={!text.trim()}>
            Parse
          </button>
          {preview && preview.length > 0 && (
            <button className="primary" onClick={commit}>
              Add {preview.length} to ledger
            </button>
          )}
        </div>
      </section>

      {queue && (
        <section className="card">
          <h3>
            Parsed {preview!.length} transaction{preview!.length === 1 ? "" : "s"}
          </h3>
          {preview!.length === 0 ? (
            <p className="muted">
              Nothing recognised. Check the format, or that these are settled
              debits or credits and not OTPs.
            </p>
          ) : (
            <>
              <p className="muted">
                {queue.accepted.length} accepted, {queue.review.length} need review
                (low confidence).
              </p>
              <TransactionList transactions={preview!} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
