// Model file adapters backed by Expo: where models live, how they download, and
// how they are hashed. These satisfy the FileStore, Downloader, and Hasher
// interfaces the platform agnostic ModelManager depends on.

import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";
import type {
  FileStore,
  Downloader,
  Hasher,
} from "../../src/assistant/modelManager";

const MODELS_DIR = `${FileSystem.documentDirectory ?? ""}models/`;

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/** Stores model files under the app document directory. */
export function createFileStore(): FileStore {
  return {
    pathFor: (id) => `${MODELS_DIR}${id}.gguf`,
    exists: async (path) => (await FileSystem.getInfoAsync(path)).exists,
    remove: async (path) => {
      await FileSystem.deleteAsync(path, { idempotent: true });
    },
  };
}

/**
 * Downloads with resume support and byte level progress. expo-file-system's
 * resumable download keeps partial data on failure, so a dropped connection does
 * not restart a multi gigabyte model from zero.
 */
export function createDownloader(): Downloader {
  return {
    download: async (url, destPath, onProgress) => {
      await ensureDir(MODELS_DIR);
      const resumable = FileSystem.createDownloadResumable(
        url,
        destPath,
        {},
        (progress) => {
          const total = progress.totalBytesExpectedToWrite;
          onProgress?.({
            receivedBytes: progress.totalBytesWritten,
            totalBytes: total,
            fraction: total > 0 ? progress.totalBytesWritten / total : 0,
          });
        },
      );
      const result = await resumable.downloadAsync();
      if (!result) throw new Error(`Download did not complete for ${url}`);
    },
  };
}

/**
 * Hashes a file with SHA-256. Reads the file as base64 and digests it; adequate
 * for the app's needs but memory heavy for multi gigabyte files, so production
 * builds that pin large model checksums should swap in a native streaming hash.
 * The ModelManager only calls this when a model declares a sha256.
 */
export function createHasher(): Hasher {
  return {
    sha256: async (path) => {
      const base64 = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64, {
        encoding: Crypto.CryptoEncoding.HEX,
      });
    },
  };
}
