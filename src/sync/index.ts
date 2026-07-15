// The reusable sync module. Domain agnostic and provider agnostic: give it a
// SyncProvider and an Encryptor and it keeps an encrypted document in sync across
// devices. Other apps depend on this folder alone.

export type { SyncProvider, RemoteFile } from "./provider";
export {
  SyncEngine,
  makeDocument,
  lastWriteWins,
  SYNC_DOCUMENT_VERSION,
} from "./engine";
export type {
  SyncDocument,
  SyncEngineOptions,
  SyncOutcome,
  ConflictResolver,
} from "./engine";
export { GoogleDriveProvider } from "./providers/googleDrive";
export type { GoogleDriveProviderOptions } from "./providers/googleDrive";
export { DropboxProvider } from "./providers/dropbox";
export type { DropboxProviderOptions } from "./providers/dropbox";
