// The ledger store: the single source of truth for transactions.
//
// Persisted to AsyncStorage so data survives restarts. Seeded with sample data
// on first launch so the app is never empty. New transactions from any source
// (SMS sync, import, Account Aggregator) funnel through addTransactions, which
// deduplicates so re-syncing the same inbox does not create duplicates.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Transaction } from "../../src/types";
import { parseAll } from "../../src/parser";
import { SAMPLE_ALERTS, SAMPLE_REFERENCE } from "../sampleData";

/** Stable identity for a transaction, used to deduplicate on insert. */
function keyOf(t: Transaction): string {
  return t.ref ? `ref:${t.ref}` : `raw:${t.raw}`;
}

export interface LedgerState {
  transactions: Transaction[];
  /** True once the persisted state has loaded. */
  hydrated: boolean;
  addTransactions: (incoming: readonly Transaction[]) => number;
  replaceAll: (next: readonly Transaction[]) => void;
  clear: () => void;
  resetToSample: () => void;
}

const sample = (): Transaction[] =>
  parseAll(SAMPLE_ALERTS, { now: SAMPLE_REFERENCE });

export const useLedger = create<LedgerState>()(
  persist(
    (set, get) => ({
      transactions: sample(),
      hydrated: false,

      addTransactions: (incoming) => {
        const existing = new Set(get().transactions.map(keyOf));
        const fresh = incoming.filter((t) => !existing.has(keyOf(t)));
        if (fresh.length > 0) {
          set({ transactions: [...get().transactions, ...fresh] });
        }
        return fresh.length;
      },

      replaceAll: (next) => set({ transactions: [...next] }),
      clear: () => set({ transactions: [] }),
      resetToSample: () => set({ transactions: sample() }),
    }),
    {
      name: "ledger-transactions",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ transactions: state.transactions }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
