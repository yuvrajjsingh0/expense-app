import { describe, it, expect } from "vitest";
import { parseAll } from "../src/parser";
import { buildPrompt, buildContext } from "../src/assistant/prompt";
import { findModel, formatSize, DEFAULT_MODEL_ID, QWEN_MODELS } from "../src/assistant/models";
import {
  ModelManager,
  type Downloader,
  type Hasher,
  type FileStore,
  type ModelStatus,
} from "../src/assistant/modelManager";
import { createRuleAssistant } from "../src/assistant/assistant";

const REF = new Date("2026-06-28T00:00:00Z");
const TXNS = parseAll(
  [
    "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-06-26",
    "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 10-06-26 Ref 1 UPI",
  ],
  { now: REF },
);

describe("prompt building", () => {
  it("grounds the question in a compact data block", () => {
    const messages = buildPrompt("How much on food?", TXNS);
    expect(messages[0].role).toBe("system");
    expect(messages[1].content).toContain("DATA:");
    expect(messages[1].content).toContain("QUESTION: How much on food?");
    expect(messages[1].content).toContain("Netflix");
  });

  it("handles an empty ledger", () => {
    expect(buildContext([])).toContain("No transactions");
  });

  it("caps the number of inlined transactions", () => {
    const many = parseAll(
      Array.from({ length: 60 }, (_, i) =>
        `Spent Rs.10.00 On HDFC Card x5678 At AMAZON on ${String((i % 28) + 1).padStart(2, "0")}-06-26`,
      ),
      { now: REF },
    );
    const context = buildContext(many, { maxTransactions: 5 });
    const lines = context.split("\n").filter((l) => l.startsWith("- "));
    expect(lines.length).toBe(5);
  });
});

describe("model registry", () => {
  it("has a resolvable default model", () => {
    expect(findModel(DEFAULT_MODEL_ID)).toBeDefined();
  });

  it("formats sizes", () => {
    expect(formatSize(QWEN_MODELS[1].sizeBytes)).toMatch(/GB$/);
    expect(formatSize(400 * 1024 * 1024)).toBe("400 MB");
  });
});

describe("ModelManager", () => {
  function fakeStore(present = new Set<string>()): FileStore {
    return {
      pathFor: (id) => `/models/${id}.gguf`,
      exists: async (p) => present.has(p),
      remove: async (p) => void present.delete(p),
    };
  }

  it("returns the cached path without downloading when present", async () => {
    const present = new Set(["/models/qwen2.5-1.5b-instruct-q4_k_m.gguf"]);
    let downloaded = false;
    const downloader: Downloader = { download: async () => void (downloaded = true) };
    const hasher: Hasher = { sha256: async () => "" };
    const manager = new ModelManager({ downloader, hasher, store: fakeStore(present) });

    const model = findModel(DEFAULT_MODEL_ID)!;
    const path = await manager.ensure(model);
    expect(path).toBe("/models/qwen2.5-1.5b-instruct-q4_k_m.gguf");
    expect(downloaded).toBe(false);
  });

  it("downloads then verifies a matching checksum", async () => {
    const present = new Set<string>();
    const statuses: ModelStatus[] = [];
    const downloader: Downloader = {
      download: async (_url, dest, onProgress) => {
        onProgress?.({ receivedBytes: 5, totalBytes: 10, fraction: 0.5 });
        present.add(dest);
      },
    };
    const hasher: Hasher = { sha256: async () => "ABC123" };
    const manager = new ModelManager({ downloader, hasher, store: fakeStore(present) });

    const model = { ...findModel(DEFAULT_MODEL_ID)!, sha256: "abc123" };
    const path = await manager.ensure(model, { onStatus: (s) => statuses.push(s) });
    expect(path).toContain(".gguf");
    expect(statuses).toEqual(["downloading", "verifying", "ready"]);
  });

  it("removes the file and throws on a checksum mismatch", async () => {
    const present = new Set<string>();
    const downloader: Downloader = { download: async (_u, dest) => void present.add(dest) };
    const hasher: Hasher = { sha256: async () => "deadbeef" };
    const store = fakeStore(present);
    const manager = new ModelManager({ downloader, hasher, store });

    const model = { ...findModel(DEFAULT_MODEL_ID)!, sha256: "cafe" };
    await expect(manager.ensure(model)).rejects.toThrow("Checksum mismatch");
    expect(await store.exists(store.pathFor(model.id))).toBe(false);
  });
});

describe("AsyncAssistant", () => {
  it("adapts the rule engine to the async interface", async () => {
    const assistant = createRuleAssistant(TXNS);
    expect(assistant.backend).toBe("rules");
    const a = await assistant.ask("how much on food?");
    expect(a.value).toBe(419);
  });
});
