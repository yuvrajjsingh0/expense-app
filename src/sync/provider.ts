// Remote sync provider abstraction.
//
// This is the seam that every cloud backend implements: Google Drive, Dropbox,
// iCloud, an S3 bucket, or a plain HTTP store. The sync engine talks only to
// this interface, so a new provider is a self contained adapter and the rest of
// the app never changes. Kept domain agnostic on purpose: it moves opaque
// strings, so the same module is reused across apps, not just this ledger.

/** A file as a provider reports it. */
export interface RemoteFile {
  /** Provider specific id used to download or delete. */
  readonly id: string;
  /** Human readable name, the key the app chose. */
  readonly name: string;
  /** Last modified time as an ISO 8601 string. */
  readonly modifiedTime: string;
  /** Size in bytes, when the provider reports it. */
  readonly size?: number;
}

/**
 * A cloud storage backend. Implementations move opaque string content, so the
 * caller owns serialisation and encryption. All methods reject on transport or
 * auth failure; the engine decides how to recover.
 */
export interface SyncProvider {
  /** Stable identifier, for example "google-drive" or "dropbox". */
  readonly name: string;

  /** Create or overwrite a file by name, returning its remote metadata. */
  upload(name: string, content: string): Promise<RemoteFile>;

  /** Fetch a file's content by its provider id. */
  download(fileId: string): Promise<string>;

  /** Find a file by the name the app gave it, or null when absent. */
  find(name: string): Promise<RemoteFile | null>;

  /** List files this app owns in the provider's scoped folder. */
  list(): Promise<RemoteFile[]>;

  /** Delete a file by its provider id. Idempotent where the provider allows. */
  remove(fileId: string): Promise<void>;
}
