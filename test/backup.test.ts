import { describe, it, expect } from "vitest";
import { parseAll } from "../src/parser";
import {
  buildEnvelope,
  parseEnvelope,
  createBackup,
  restoreBackup,
  BACKUP_VERSION,
  type Encryptor,
  type StorageAdapter,
  type Encrypted,
} from "../src/backup/encrypt";

const REF = new Date("2026-06-28T00:00:00Z");
const TXNS = parseAll(
  [
    "Sent Rs.419.00 From HDFC Bank A/C x1234 To SWIGGY On 28-06 Ref 412 UPI",
    "Spent Rs.649.00 On HDFC Card x5678 At NETFLIX on 25-06-26",
  ],
  { now: REF },
);

/** A reversible XOR cipher, enough to prove the round trip without real crypto. */
function fakeEncryptor(secret = "key"): Encryptor {
  const xor = (s: string) =>
    [...s].map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ secret.charCodeAt(i % secret.length))).join("");
  return {
    encrypt: async (plaintext) => ({ ciphertext: xor(plaintext), iv: "iv" }),
    decrypt: async (payload) => xor(payload.ciphertext),
  };
}

/** An in memory store standing in for iCloud or Drive. */
function memoryStorage(): StorageAdapter & { dump: Map<string, Encrypted> } {
  const dump = new Map<string, Encrypted>();
  return {
    dump,
    put: async (key, value) => void dump.set(key, value),
    get: async (key) => dump.get(key) ?? null,
  };
}

describe("backup envelope", () => {
  it("builds and parses a versioned envelope", () => {
    const envelope = buildEnvelope(TXNS, "2026-06-28T00:00:00Z");
    expect(envelope.version).toBe(BACKUP_VERSION);
    const round = parseEnvelope(JSON.stringify(envelope));
    expect(round.transactions).toHaveLength(2);
    expect(round.createdAt).toBe("2026-06-28T00:00:00Z");
  });

  it("rejects an unknown version", () => {
    expect(() => parseEnvelope(JSON.stringify({ version: 99, transactions: [] }))).toThrow(
      "Unsupported backup version",
    );
  });
});

describe("createBackup and restoreBackup", () => {
  it("encrypts, stores, then restores the same transactions", async () => {
    const encryptor = fakeEncryptor();
    const storage = memoryStorage();

    const stored = await createBackup(TXNS, "2026-06-28T00:00:00Z", encryptor, storage);
    // What lands in storage is ciphertext, not the plain ledger.
    expect(stored.ciphertext).not.toContain("SWIGGY");

    const restored = await restoreBackup(encryptor, storage);
    expect(restored).not.toBeNull();
    expect(restored!.transactions.map((t) => t.amount)).toEqual([419, 649]);
  });

  it("returns null when nothing is stored", async () => {
    expect(await restoreBackup(fakeEncryptor(), memoryStorage())).toBeNull();
  });
});
