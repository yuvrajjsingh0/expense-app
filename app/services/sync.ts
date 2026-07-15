// Cloud sync service: connects a provider, then pushes and pulls the encrypted
// ledger through the reusable SyncEngine. Access tokens live in the device
// keychain; the device id is generated once. This is the app specific glue over
// the domain agnostic src/sync module.

import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import type { Transaction } from "../../src/types";
import { SyncEngine, makeDocument, type SyncProvider } from "../../src/sync";
import { GoogleDriveProvider } from "../../src/sync/providers/googleDrive";
import { DropboxProvider } from "../../src/sync/providers/dropbox";
import { createTransport } from "../adapters/transport";
import { createEncryptor } from "../adapters/crypto";
import { authorizeGoogleDrive, authorizeDropbox } from "../adapters/oauth";
import type { SyncProviderId } from "../store/useSettings";

const tokenKey = (provider: SyncProviderId) => `sync.token.${provider}`;
const DEVICE_KEY = "sync.deviceId";

async function deviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_KEY, id);
  return id;
}

/** Run the OAuth flow for a provider and persist its token. */
export async function connectProvider(provider: SyncProviderId): Promise<void> {
  if (provider === "none") return;
  const result =
    provider === "google-drive"
      ? await authorizeGoogleDrive()
      : await authorizeDropbox();
  await SecureStore.setItemAsync(tokenKey(provider), result.accessToken);
}

/** Forget a provider's stored token. */
export async function disconnectProvider(provider: SyncProviderId): Promise<void> {
  if (provider === "none") return;
  await SecureStore.deleteItemAsync(tokenKey(provider));
}

async function buildProvider(provider: SyncProviderId): Promise<SyncProvider | null> {
  if (provider === "none") return null;
  const token = await SecureStore.getItemAsync(tokenKey(provider));
  if (!token) return null;
  const transport = createTransport();
  return provider === "google-drive"
    ? new GoogleDriveProvider({ accessToken: token, transport })
    : new DropboxProvider({ accessToken: token, transport });
}

export interface SyncResult {
  status: "pushed" | "pulled" | "merged" | "up-to-date";
  transactions: Transaction[];
  syncedAt: string;
}

/**
 * Sync the ledger with the connected provider. Returns the reconciled
 * transactions (which the caller writes back into the store) and the time.
 * Throws when no provider is connected.
 */
export async function syncNow(
  provider: SyncProviderId,
  transactions: readonly Transaction[],
): Promise<SyncResult> {
  const remote = await buildProvider(provider);
  if (!remote) throw new Error("No sync provider is connected.");

  const engine = new SyncEngine<Transaction[]>({
    provider: remote,
    encryptor: await createEncryptor(),
  });

  const now = new Date().toISOString();
  const local = makeDocument([...transactions], await deviceId(), now);
  const outcome = await engine.sync(local);

  return {
    status: outcome.status,
    transactions: [...outcome.document.data],
    syncedAt: now,
  };
}
