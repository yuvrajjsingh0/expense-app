// Encrypted backup.
//
// Serialises the ledger into a versioned envelope, encrypts it through an
// injected Encryptor, and hands the ciphertext to an injected storage adapter
// (iCloud, Drive, or a file). The crypto primitive and the cloud SDK are
// platform specific, so they are interfaces here; this module owns only the pure
// envelope logic, which is fully testable. Nothing is encrypted with a key this
// module invents: the key lives in the adapter, on device.

import type { Transaction } from "../types";

/** Current envelope schema version, bumped on any breaking shape change. */
export const BACKUP_VERSION = 1 as const;

export interface BackupEnvelope {
  readonly version: typeof BACKUP_VERSION;
  /** ISO timestamp set by the caller, kept out of this pure module. */
  readonly createdAt: string;
  readonly transactions: readonly Transaction[];
}

/** Opaque ciphertext plus whatever the Encryptor needs to reverse it. */
export interface Encrypted {
  readonly ciphertext: string;
  /** Base64 nonce or IV, when the cipher uses one. */
  readonly iv?: string;
}

/** A symmetric encryptor, satisfied by Web Crypto AES-GCM in the adapter layer. */
export interface Encryptor {
  encrypt(plaintext: string): Promise<Encrypted>;
  decrypt(payload: Encrypted): Promise<string>;
}

/** A place to put and get a backup blob: iCloud, Drive, or local storage. */
export interface StorageAdapter {
  put(key: string, value: Encrypted): Promise<void>;
  get(key: string): Promise<Encrypted | null>;
}

/** Build the envelope for a set of transactions. Pure and deterministic. */
export function buildEnvelope(
  transactions: readonly Transaction[],
  createdAt: string,
): BackupEnvelope {
  return { version: BACKUP_VERSION, createdAt, transactions };
}

/** Validate and parse a decrypted envelope string, throwing on a bad shape. */
export function parseEnvelope(json: string): BackupEnvelope {
  const data = JSON.parse(json) as Partial<BackupEnvelope>;
  if (data.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version ${String(data.version)}`);
  }
  if (!Array.isArray(data.transactions)) {
    throw new Error("Backup envelope is missing its transactions");
  }
  return {
    version: BACKUP_VERSION,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    transactions: data.transactions,
  };
}

/** Serialise, encrypt, and store a backup. Returns the stored ciphertext. */
export async function createBackup(
  transactions: readonly Transaction[],
  createdAt: string,
  encryptor: Encryptor,
  storage: StorageAdapter,
  key = "ledger-backup",
): Promise<Encrypted> {
  const envelope = buildEnvelope(transactions, createdAt);
  const encrypted = await encryptor.encrypt(JSON.stringify(envelope));
  await storage.put(key, encrypted);
  return encrypted;
}

/** Load, decrypt, and parse a backup. Returns null when nothing is stored. */
export async function restoreBackup(
  encryptor: Encryptor,
  storage: StorageAdapter,
  key = "ledger-backup",
): Promise<BackupEnvelope | null> {
  const stored = await storage.get(key);
  if (!stored) return null;
  const json = await encryptor.decrypt(stored);
  return parseEnvelope(json);
}
