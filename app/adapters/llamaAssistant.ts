// llama.rn backed assistant: runs Qwen 2.5 on device and satisfies the same
// AsyncAssistant interface the rule engine does, so the Ask tab swaps between
// them without change. The prompt is built by the shared, tested prompt module.

import { initLlama, type LlamaContext } from "llama.rn";
import type { Transaction } from "../../src/types";
import type { AsyncAssistant } from "../../src/assistant/assistant";
import type { Answer } from "../../src/assistant/query";
import { buildPrompt } from "../../src/assistant/prompt";
import type { QwenModel } from "../../src/assistant/models";

/** Stop sequences that keep the model from rambling past its answer. */
const STOP = ["</s>", "<|im_end|>", "\nQUESTION:", "\nDATA:"];

/**
 * Load a model into a llama context. Call once after ModelManager.ensure has put
 * the file on disk. Reuse the returned context across questions; release it when
 * the user turns the assistant off.
 */
export async function loadLlama(
  modelPath: string,
  model: QwenModel,
): Promise<LlamaContext> {
  return initLlama({
    model: modelPath,
    n_ctx: Math.min(4096, model.contextLength),
    n_gpu_layers: 99, // offload to the GPU where the device allows
  });
}

/**
 * Wrap a loaded context as an AsyncAssistant. `getTransactions` is read at ask
 * time, so answers always reflect the current ledger. Tokens stream through the
 * optional callback for a live typing effect.
 */
export function createLlamaAssistant(
  context: LlamaContext,
  model: QwenModel,
  getTransactions: () => readonly Transaction[],
): AsyncAssistant {
  return {
    backend: model.id,
    ask: async (question, onToken): Promise<Answer> => {
      const messages = buildPrompt(question, getTransactions());
      const result = await context.completion(
        {
          messages,
          n_predict: 256,
          temperature: 0.3,
          stop: STOP,
        },
        (data) => {
          if (data.token) onToken?.(data.token);
        },
      );
      return { text: result.text.trim() };
    },
  };
}

/** Free native resources held by a context. */
export async function releaseLlama(context: LlamaContext): Promise<void> {
  await context.release();
}
