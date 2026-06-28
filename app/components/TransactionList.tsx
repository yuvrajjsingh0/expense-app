import type { Transaction } from "../../src/types";
import { CATEGORY_COLOURS, inr } from "../format";
import { MerchantLogo } from "./MerchantLogo";

interface TransactionListProps {
  transactions: readonly Transaction[];
  limit?: number;
}

/** A compact, scrollable list of transactions, newest first when dated. */
export function TransactionList({ transactions, limit }: TransactionListProps) {
  const ordered = [...transactions].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  );
  const shown = limit ? ordered.slice(0, limit) : ordered;

  if (shown.length === 0) return <p className="muted">No transactions.</p>;

  return (
    <ul className="txn-list">
      {shown.map((t, i) => (
        <li key={`${t.ref ?? t.raw}-${i}`} className="txn">
          <MerchantLogo brand={t.brand} merchant={t.merchant} />
          <div className="txn-main">
            <span className="txn-name">{t.brand ?? t.merchant ?? "Unknown"}</span>
            <span className="txn-sub">
              <span
                className="tag"
                style={{ background: CATEGORY_COLOURS[t.category] }}
              >
                {t.category}
              </span>
              <span className="muted">{t.channel}</span>
              {t.date && <span className="muted">{t.date}</span>}
            </span>
          </div>
          <span className={t.direction === "debit" ? "amount-debit" : "amount-credit"}>
            {t.direction === "debit" ? "-" : "+"}
            {inr(t.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
