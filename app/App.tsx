import { useMemo, useState } from "react";
import type { Transaction } from "../src/types";
import { parseAll } from "../src/parser";
import { SAMPLE_ALERTS } from "./sampleData";
import { Dashboard } from "./components/Dashboard";
import { Trends } from "./components/Trends";
import { Ask } from "./components/Ask";
import { Import } from "./components/Import";

type Tab = "dashboard" | "trends" | "ask" | "import";

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "trends", label: "Trends" },
  { id: "ask", label: "Ask" },
  { id: "import", label: "Import" },
];

export function App() {
  // Year inference is fixed so the sample data reads consistently.
  const reference = useMemo(() => new Date("2026-06-28T00:00:00Z"), []);
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    parseAll(SAMPLE_ALERTS, { now: reference }),
  );
  const [tab, setTab] = useState<Tab>("dashboard");

  function addTransactions(incoming: Transaction[]) {
    setTransactions((prev) => [...prev, ...incoming]);
    setTab("dashboard");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo-mark">₹</span>
          <div>
            <h1>ledger</h1>
            <p className="muted">India first, on device expense tracker</p>
          </div>
        </div>
        <span className="count">{transactions.length} transactions</span>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "dashboard" && <Dashboard transactions={transactions} />}
        {tab === "trends" && <Trends transactions={transactions} />}
        {tab === "ask" && <Ask transactions={transactions} />}
        {tab === "import" && <Import onImport={addTransactions} />}
      </main>

      <footer className="muted">
        Parsing runs locally. Nothing leaves the device. Built on the ledger-core
        parser.
      </footer>
    </div>
  );
}
