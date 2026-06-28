import { useMemo } from "react";
import type { Transaction } from "../../src/types";
import {
  categoryBreakdown,
  monthSummary,
  latestMonth,
} from "../../src/analytics";
import { inr } from "../format";
import { Donut } from "./Donut";
import { TransactionList } from "./TransactionList";

interface DashboardProps {
  transactions: readonly Transaction[];
}

export function Dashboard({ transactions }: DashboardProps) {
  const month = useMemo(() => latestMonth(transactions), [transactions]);
  const summary = useMemo(
    () => (month ? monthSummary(transactions, month) : null),
    [transactions, month],
  );
  const slices = useMemo(() => {
    if (!month) return categoryBreakdown(transactions);
    const inMonth = transactions.filter((t) => t.date?.slice(0, 7) === month);
    return categoryBreakdown(inMonth);
  }, [transactions, month]);

  return (
    <div className="grid">
      <section className="card stat">
        <h3>{month ? `Spent in ${month}` : "Total spent"}</h3>
        <p className="big">{inr(summary?.spent ?? 0)}</p>
        {summary?.deltaPct !== null && summary !== null && (
          <p className={summary.deltaPct! >= 0 ? "delta up" : "delta down"}>
            {summary.deltaPct! >= 0 ? "▲" : "▼"} {Math.abs(summary.deltaPct!)}% vs last
            month
          </p>
        )}
        <div className="stat-row">
          <span>
            <span className="muted">Received</span>
            <b className="amount-credit">{inr(summary?.received ?? 0)}</b>
          </span>
          <span>
            <span className="muted">Transactions</span>
            <b>{summary?.txnCount ?? transactions.length}</b>
          </span>
        </div>
      </section>

      <section className="card">
        <h3>By category</h3>
        <Donut slices={slices} />
      </section>

      <section className="card span-2">
        <h3>Recent transactions</h3>
        <TransactionList transactions={transactions} limit={8} />
      </section>
    </div>
  );
}
