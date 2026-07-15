// Generic, reusable sync engine.
//
// Ties three concerns together without knowing what it is syncing:
//   1. a SyncProvider   (where bytes live: Drive, Dropbox, ...)
//   2. an Encryptor     (so the cloud only ever sees ciphertext)
//   3. a ConflictResolver (what to do when local and remote both changed)
//
// The payload type T is a parameter, so other apps reuse this by supplying their
// own document shape. For this ledger, T is the array of transactions. Nothing
// here is React Native or browser specific.

import type { SyncProvider, RemoteFile } from "./provider";
import type { Encryptor, Encrypted } from "../backup/encrypt";

/** Current on the wire schema version for a synced document. */
export const SYNC_DOCUMENT_VERSION = 1 as const;

/** A versioned, timestamped wrapper around the app's data of type T. */
export interface SyncDocument<T> {
  readonly version: typeof SYNC_DOCUMENT_VERSION;
  /** ISO time the document was last written on some device. */
  readonly updatedAt: string;
  /** Stable id of the device that wrote it, for conflict attribution. */
  readonly deviceId: string;
  readonly data: T;
}

/**
 * Decide the winning document when local and remote diverge. Return a new
 * document (it may merge both). Defaults to last write wins by updatedAt.
 */
export type ConflictResolver<T> = (
  local: SyncDocument<T>,
  remote: SyncDocument<T>,
) => SyncDocument<T>;

/** Last write wins: the more recently updated document is kept whole. */
export function lastWriteWins<T>(): ConflictResolver<T> {
  return (local, remote) =>
    remote.updatedAt > local.updatedAt ? remote : local;
}

export interface SyncEngineOptions<T> {
  provider: SyncProvider;
  encryptor: Encryptor;
  /** File name used in the provider's scoped folder. */
  fileName?: string;
  /** How to reconcile divergence. Defaults to last write wins. */
  resolve?: ConflictResolver<T>;
}

/** The result of a sync pass, so the UI can report what happened. */
export type SyncOutcome<T> =
  | { readonly status: "pushed"; readonly document: SyncDocument<T>; readonly remote: RemoteFile }
  | { readonly status: "pulled"; readonly document: SyncDocument<T> }
  | { readonly status: "merged"; readonly document: SyncDocument<T>; readonly remote: RemoteFile }
  | { readonly status: "up-to-date"; readonly document: SyncDocument<T> };

const DEFAULT_FILE_NAME = "ledger.enc";

/**
 * Encrypted, provider agnostic sync for a single document of type T.
 *
 * The document is serialised to JSON, encrypted, and stored as an opaque string,
 * so the provider never sees plaintext. `sync` is the main entry point: it pulls
 * the remote copy, reconciles it against the local copy, writes the winner back
 * when needed, and returns what it did.
 */
export class SyncEngine<T> {
  private readonly provider: SyncProvider;
  private readonly encryptor: Encryptor;
  private readonly fileName: string;
  private readonly resolve: ConflictResolver<T>;

  constructor(options: SyncEngineOptions<T>) {
    this.provider = options.provider;
    this.encryptor = options.encryptor;
    this.fileName = options.fileName ?? DEFAULT_FILE_NAME;
    this.resolve = options.resolve ?? lastWriteWins<T>();
  }

  /** Serialise, encrypt, and upload a document, replacing any remote copy. */
  async push(document: SyncDocument<T>): Promise<RemoteFile> {
    const encrypted = await this.encryptor.encrypt(JSON.stringify(document));
    return this.provider.upload(this.fileName, JSON.stringify(encrypted));
  }

  /** Download, decrypt, and parse the remote document, or null when absent. */
  async pull(): Promise<SyncDocument<T> | null> {
    const remote = await this.provider.find(this.fileName);
    if (!remote) return null;
    const raw = await this.provider.download(remote.id);
    const encrypted = JSON.parse(raw) as Encrypted;
    const json = await this.encryptor.decrypt(encrypted);
    return this.parse(json);
  }

  /**
   * Reconcile the local document with the remote one and persist the result.
   *
   * - No remote copy: push local.
   * - Remote newer, local unchanged since: pull.
   * - Both diverged: resolve, then push the winner.
   */
  async sync(local: SyncDocument<T>): Promise<SyncOutcome<T>> {
    const remoteFile = await this.provider.find(this.fileName);
    if (!remoteFile) {
      const remote = await this.push(local);
      return { status: "pushed", document: local, remote };
    }

    const raw = await this.provider.download(remoteFile.id);
    const encrypted = JSON.parse(raw) as Encrypted;
    const remote = this.parse(await this.encryptor.decrypt(encrypted));

    if (remote.updatedAt === local.updatedAt && remote.deviceId === local.deviceId) {
      return { status: "up-to-date", document: local };
    }
    if (remote.updatedAt > local.updatedAt && remote.deviceId !== local.deviceId) {
      // Remote strictly newer from another device: adopt it locally.
      const merged = this.resolve(local, remote);
      if (merged === remote) return { status: "pulled", document: remote };
      const written = await this.push(merged);
      return { status: "merged", document: merged, remote: written };
    }

    const merged = this.resolve(local, remote);
    const written = await this.push(merged);
    return { status: "merged", document: merged, remote: written };
  }

  private parse(json: string): SyncDocument<T> {
    const data = JSON.parse(json) as Partial<SyncDocument<T>>;
    if (data.version !== SYNC_DOCUMENT_VERSION) {
      throw new Error(`Unsupported sync document version ${String(data.version)}`);
    }
    if (typeof data.updatedAt !== "string" || typeof data.deviceId !== "string") {
      throw new Error("Malformed sync document: missing metadata");
    }
    return {
      version: SYNC_DOCUMENT_VERSION,
      updatedAt: data.updatedAt,
      deviceId: data.deviceId,
      data: data.data as T,
    };
  }
}

/** Build a fresh document wrapper. `now` and `deviceId` come from the caller. */
export function makeDocument<T>(
  data: T,
  deviceId: string,
  now: string,
): SyncDocument<T> {
  return { version: SYNC_DOCUMENT_VERSION, updatedAt: now, deviceId, data };
}
