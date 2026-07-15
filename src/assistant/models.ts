// On device model registry.
//
// The Ask tab can run Qwen 2.5 locally through llama.rn. The weights are too
// large to ship in the app, so they are downloaded on first use and cached. This
// registry names the supported models, where to fetch each GGUF, and roughly how
// big it is, so the UI can let the user choose and show a real size before
// committing to a download.
//
// sha256 is optional: when set, the ModelManager verifies the download against
// it; pin it to the exact release asset hash in production. Sizes are the
// approximate on disk size of the Q4_K_M quantisation.

export type Quantisation = "Q4_K_M" | "Q5_K_M" | "Q8_0";

export interface QwenModel {
  /** Stable id used as the cache key and in settings. */
  readonly id: string;
  /** Human label for the picker. */
  readonly name: string;
  /** Parameter count label, for example "1.5B". */
  readonly params: string;
  readonly quant: Quantisation;
  /** Direct URL to the GGUF file. */
  readonly url: string;
  /** Approximate download size in bytes. */
  readonly sizeBytes: number;
  /** Model context window in tokens. */
  readonly contextLength: number;
  /** Optional expected SHA-256 of the file, hex encoded. Verified when present. */
  readonly sha256?: string;
}

const GB = 1024 * 1024 * 1024;

/**
 * Supported models, smallest first. The 1.5B is the sensible default: it fits
 * comfortably in memory on a mid range phone and answers the app's questions
 * well. The 0.5B is for low end devices; the 3B for flagships.
 */
export const QWEN_MODELS: readonly QwenModel[] = [
  {
    id: "qwen2.5-0.5b-instruct-q4_k_m",
    name: "Qwen2.5 0.5B Instruct",
    params: "0.5B",
    quant: "Q4_K_M",
    url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
    sizeBytes: Math.round(0.4 * GB),
    contextLength: 32768,
  },
  {
    id: "qwen2.5-1.5b-instruct-q4_k_m",
    name: "Qwen2.5 1.5B Instruct",
    params: "1.5B",
    quant: "Q4_K_M",
    url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
    sizeBytes: Math.round(1.0 * GB),
    contextLength: 32768,
  },
  {
    id: "qwen2.5-3b-instruct-q4_k_m",
    name: "Qwen2.5 3B Instruct",
    params: "3B",
    quant: "Q4_K_M",
    url: "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf",
    sizeBytes: Math.round(1.9 * GB),
    contextLength: 32768,
  },
];

/** The model chosen by default when the user turns on the on device assistant. */
export const DEFAULT_MODEL_ID = "qwen2.5-1.5b-instruct-q4_k_m";

/** Look up a model by id. */
export function findModel(id: string): QwenModel | undefined {
  return QWEN_MODELS.find((m) => m.id === id);
}

/** Format a byte count as a short human string, for example "1.0 GB". */
export function formatSize(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}
