// The assistant seam the UI depends on.
//
// The Ask tab should not care whether an answer came from the instant rule
// engine or from Qwen running on device. Both satisfy AsyncAssistant, so the UI
// awaits one interface and can stream tokens when the backend supports it. The
// rule based Assistant is adapted to this shape here; the llama.rn backend
// implements it directly in the app layer.

import type { Transaction } from "../types";
import type { Answer, Assistant } from "./query";
import { createAssistant } from "./query";

/** A backend that answers questions, optionally streaming tokens as they arrive. */
export interface AsyncAssistant {
  /** Stable id for display, for example "rules" or a model id. */
  readonly backend: string;
  ask(question: string, onToken?: (token: string) => void): Promise<Answer>;
}

/** Adapt the synchronous rule based Assistant to the async interface. */
export function toAsyncAssistant(
  assistant: Assistant,
  backend = "rules",
): AsyncAssistant {
  return {
    backend,
    ask: async (question) => assistant.ask(question),
  };
}

/** Convenience: a rule based AsyncAssistant bound to a set of transactions. */
export function createRuleAssistant(
  transactions: readonly Transaction[],
): AsyncAssistant {
  return toAsyncAssistant(createAssistant(transactions), "rules");
}
