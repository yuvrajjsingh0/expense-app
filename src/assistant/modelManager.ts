// On device model lifecycle: download, verify, cache, delete.
//
// The manager owns the state machine; the platform owns the primitives. On React
// Native the Downloader is backed by expo-file-system (with resume and progress),
// the Hasher by expo-crypto, and the FileStore by the document directory. Here
// those are interfaces, so the flow is pure and unit tested without a device.

import type { QwenModel } from "./models";

export type ModelStatus =
  | "absent"
  | "downloading"
  | "verifying"
  | "ready"
  | "error";

export interface DownloadProgress {
  readonly receivedBytes: number;
  readonly totalBytes: number;
  /** Fraction complete in [0, 1], or 0 when the total is unknown. */
  readonly fraction: number;
}

/** Downloads a URL to a local path, reporting progress. */
export interface Downloader {
  download(
    url: string,
    destPath: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void>;
}

/** Computes a file hash, hex encoded. */
export interface Hasher {
  sha256(path: string): Promise<string>;
}

/** Minimal file operations the manager needs. */
export interface FileStore {
  exists(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
  /** Absolute local path where a model id should live. */
  pathFor(modelId: string): string;
}

export interface ModelManagerDeps {
  downloader: Downloader;
  hasher: Hasher;
  store: FileStore;
}

/**
 * Manages the local copy of a model: reports whether it is present, downloads and
 * verifies it on demand, and deletes it. Verification runs only when the model
 * declares a sha256, so a registry without pinned hashes still works (with a
 * weaker guarantee).
 */
export class ModelManager {
  private readonly downloader: Downloader;
  private readonly hasher: Hasher;
  private readonly store: FileStore;

  constructor(deps: ModelManagerDeps) {
    this.downloader = deps.downloader;
    this.hasher = deps.hasher;
    this.store = deps.store;
  }

  /** Where the given model's file lives locally. */
  localPath(model: QwenModel): string {
    return this.store.pathFor(model.id);
  }

  /** "ready" when the file is present, else "absent". */
  async status(model: QwenModel): Promise<ModelStatus> {
    return (await this.store.exists(this.localPath(model))) ? "ready" : "absent";
  }

  /**
   * Ensure the model is present and valid, downloading it if needed, and return
   * its local path. Emits status transitions through `onStatus` and byte level
   * progress through `onProgress`. Throws when verification fails, after removing
   * the corrupt file.
   */
  async ensure(
    model: QwenModel,
    handlers: {
      onStatus?: (status: ModelStatus) => void;
      onProgress?: (progress: DownloadProgress) => void;
    } = {},
  ): Promise<string> {
    const path = this.localPath(model);
    const { onStatus, onProgress } = handlers;

    if (await this.store.exists(path)) {
      onStatus?.("ready");
      return path;
    }

    try {
      onStatus?.("downloading");
      await this.downloader.download(model.url, path, onProgress);

      if (model.sha256) {
        onStatus?.("verifying");
        const actual = (await this.hasher.sha256(path)).toLowerCase();
        if (actual !== model.sha256.toLowerCase()) {
          await this.store.remove(path);
          onStatus?.("error");
          throw new Error(
            `Checksum mismatch for ${model.id}: expected ${model.sha256}, got ${actual}`,
          );
        }
      }

      onStatus?.("ready");
      return path;
    } catch (error) {
      onStatus?.("error");
      throw error;
    }
  }

  /** Delete the local copy of a model, if present. */
  async remove(model: QwenModel): Promise<void> {
    const path = this.localPath(model);
    if (await this.store.exists(path)) await this.store.remove(path);
  }
}
