import { useMemo } from "react";
import type { Transaction } from "../../src/types";
import {
  monthlyTotals,
  topMerchants,
  dailyFlow,
} from "../../src/analytics";
import { detectRecurring } from "../../src/recurring";
import { inr } from "../format";
import { Bars } from "./Bars";
import { MerchantLogo } from "./MerchantLogo";

interface TrendsProps {
  transactions: readonly Transaction[];
}

export function Trends({ transactions }: TrendsProps) {
  const months = useMemo(() => monthlyTotals(transactions), [transactions]);
  const merchants = useMemo(() => topMerchants(transactions, 6), [transactions]);
  const days = useMemo(() => dailyFlow(transactions), [transactions]);
  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);

  const maxDay = Math.max(...days.map((d) => d.debit), 1);

  return (
    <div className="grid">
      <section className="card span-2">
        <h3>Monthly flow</h3>
        <Bars months={months} />
        <p className="muted legend-inline">
          <span className="swatch" style={{ background: "#f97316" }} /> spent
          <span className="swatch" style={{ background: "#22c55e" }} /> received
        </p>
      </section>

      <section className="card">
        <h3>Top merchants</h3>
        <ul className="rank">
          {merchants.map((m, i) => (
            <li key={m.merchant}>
              <span className="rank-num">{i + 1}</span>
              <MerchantLogo merchant={m.merchant} brand={m.merchant} />
              <span className="rank-name">{m.merchant}</span>
              <span className="rank-bar">
                <span
                  style={{
                    width: `${(m.total / (merchants[0]?.total || 1)) * 100}%`,
                  }}
                />
              </span>
              <span className="rank-value">{inr(m.total)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Subscriptions and recurring</h3>
        {recurring.length === 0 ? (
          <p className="muted">None detected yet.</p>
        ) : (
          <ul className="rank">
            {recurring.map((r) => (
              <li key={r.key}>
                <MerchantLogo brand={r.brand} merchant={r.key} />
                <span className="rank-name">{r.brand ?? r.key}</span>
                <span className="pill">{r.cadence}</span>
                <span className="rank-value">{inr(r.averageAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card span-2">
        <h3>Daily spend</h3>
        <div className="daily">
          {days.map((d) => (
            <span
              key={d.date}
              className="daily-bar"
              style={{ height: `${Math.max(4, (d.debit / maxDay) * 100)}%` }}
              title={`${d.date}: ${inr(d.debit)}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
