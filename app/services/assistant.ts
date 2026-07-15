// Wires the on device assistant together. Exposes a single hook the Ask screen
// uses: it returns the llama backed assistant when the user has enabled it and
// the model is downloaded and loaded, and the instant rule based assistant
// otherwise. The model file lifecycle lives in the shared modelManager.

import { useEffect, useMemo, useRef, useState } from "react";
import type { LlamaContext } from "llama.rn";
import type { AsyncAssistant } from "../../src/assistant/assistant";
import { createRuleAssistant } from "../../src/assistant/assistant";
import { ModelManager } from "../../src/assistant/modelManager";
import { findModel } from "../../src/assistant/models";
import type { Transaction } from "../../src/types";
import { createFileStore, createDownloader, createHasher } from "../adapters/modelFiles";
import { loadLlama, createLlamaAssistant, releaseLlama } from "../adapters/llamaAssistant";
import { useLedger } from "../store/useLedger";
import { useSettings } from "../store/useSettings";

/** Shared singleton so every screen sees one model download state. */
export const modelManager = new ModelManager({
  downloader: createDownloader(),
  hasher: createHasher(),
  store: createFileStore(),
});

/**
 * The active assistant. Rule based by default; upgrades to the on device model
 * once it is enabled, downloaded, and loaded, and downgrades cleanly when turned
 * off. Answers always reflect the current ledger.
 */
export function useAssistant(): AsyncAssistant {
  const transactions = useLedger((s) => s.transactions);
  const assistantEnabled = useSettings((s) => s.assistantEnabled);
  const modelId = useSettings((s) => s.modelId);

  const [llama, setLlama] = useState<AsyncAssistant | null>(null);
  const contextRef = useRef<LlamaContext | null>(null);
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!assistantEnabled) {
        setLlama(null);
        return;
      }
      const model = findModel(modelId);
      if (!model) return;
      if ((await modelManager.status(model)) !== "ready") return; // not downloaded yet

      const context = await loadLlama(modelManager.localPath(model), model);
      if (cancelled) {
        await releaseLlama(context);
        return;
      }
      contextRef.current = context;
      setLlama(createLlamaAssistant(context, model, () => transactionsRef.current));
    }

    void boot();
    return () => {
      cancelled = true;
      if (contextRef.current) {
        void releaseLlama(contextRef.current);
        contextRef.current = null;
      }
      setLlama(null);
    };
  }, [assistantEnabled, modelId]);

  const rules = useMemo(() => createRuleAssistant(transactions), [transactions]);
  return llama ?? rules;
}

/** Convenience selector for the current transactions as a plain array. */
export function useTransactions(): Transaction[] {
  return useLedger((s) => s.transactions);
}
