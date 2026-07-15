import { describe, it, expect } from "vitest";
import {
  SyncEngine,
  makeDocument,
  lastWriteWins,
  type SyncProvider,
  type RemoteFile,
} from "../src/sync";
import { GoogleDriveProvider } from "../src/sync/providers/googleDrive";
import { DropboxProvider } from "../src/sync/providers/dropbox";
import type { Encryptor, Encrypted } from "../src/backup/encrypt";
import type { HttpTransport, HttpRequest } from "../src/http";

/** Reversible XOR cipher, enough to prove encryption round trips. */
function fakeEncryptor(secret = "k"): Encryptor {
  const xor = (s: string) =>
    [...s].map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ secret.charCodeAt(i % secret.length))).join("");
  return {
    encrypt: async (p) => ({ ciphertext: xor(p) }),
    decrypt: async (e) => xor(e.ciphertext),
  };
}

/** In memory provider standing in for Drive or Dropbox. */
function memoryProvider(): SyncProvider & { store: Map<string, string> } {
  const store = new Map<string, string>();
  const meta = (name: string): RemoteFile => ({
    id: name,
    name,
    modifiedTime: "2026-06-28T00:00:00Z",
    size: store.get(name)?.length,
  });
  return {
    store,
    name: "memory",
    upload: async (name, content) => (store.set(name, content), meta(name)),
    download: async (id) => {
      const v = store.get(id);
      if (v === undefined) throw new Error("not found");
      return v;
    },
    find: async (name) => (store.has(name) ? meta(name) : null),
    list: async () => [...store.keys()].map(meta),
    remove: async (id) => void store.delete(id),
  };
}

describe("SyncEngine", () => {
  it("pushes when there is no remote copy, storing ciphertext only", async () => {
    const provider = memoryProvider();
    const engine = new SyncEngine<string[]>({ provider, encryptor: fakeEncryptor() });
    const doc = makeDocument(["a", "b"], "device-1", "2026-06-28T10:00:00Z");

    const outcome = await engine.sync(doc);
    expect(outcome.status).toBe("pushed");
    // The stored blob must not contain the plaintext payload.
    expect([...provider.store.values()][0]).not.toContain("device-1");
  });

  it("round trips a document through push then pull", async () => {
    const provider = memoryProvider();
    const engine = new SyncEngine<{ n: number }>({ provider, encryptor: fakeEncryptor() });
    const doc = makeDocument({ n: 42 }, "device-1", "2026-06-28T10:00:00Z");
    await engine.push(doc);

    const pulled = await engine.pull();
    expect(pulled?.data).toEqual({ n: 42 });
    expect(pulled?.deviceId).toBe("device-1");
  });

  it("adopts a newer remote from another device", async () => {
    const provider = memoryProvider();
    const engine = new SyncEngine<string>({ provider, encryptor: fakeEncryptor() });
    await engine.push(makeDocument("remote", "device-2", "2026-06-28T12:00:00Z"));

    const local = makeDocument("local", "device-1", "2026-06-28T09:00:00Z");
    const outcome = await engine.sync(local);
    expect(outcome.status).toBe("pulled");
    expect(outcome.document.data).toBe("remote");
  });

  it("reports up-to-date when nothing changed", async () => {
    const provider = memoryProvider();
    const engine = new SyncEngine<string>({ provider, encryptor: fakeEncryptor() });
    const doc = makeDocument("same", "device-1", "2026-06-28T10:00:00Z");
    await engine.push(doc);
    const outcome = await engine.sync(doc);
    expect(outcome.status).toBe("up-to-date");
  });

  it("last write wins keeps the most recent document", () => {
    const resolve = lastWriteWins<string>();
    const older = makeDocument("old", "d1", "2026-06-01T00:00:00Z");
    const newer = makeDocument("new", "d2", "2026-06-28T00:00:00Z");
    expect(resolve(older, newer).data).toBe("new");
    expect(resolve(newer, older).data).toBe("new");
  });
});

/** Transport that records calls and replies from a route table. */
function fakeTransport(
  routes: Array<{ match: string; status?: number; body?: unknown; text?: string }>,
): { transport: HttpTransport; calls: Array<{ url: string; init?: HttpRequest }> } {
  const calls: Array<{ url: string; init?: HttpRequest }> = [];
  const transport: HttpTransport = async (url, init) => {
    calls.push({ url, init });
    const route = routes.find((r) => url.includes(r.match));
    const status = route?.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => route?.body ?? {},
      text: async () => route?.text ?? JSON.stringify(route?.body ?? {}),
    };
  };
  return { transport, calls };
}

describe("GoogleDriveProvider", () => {
  it("creates a new file via multipart when none exists", async () => {
    const { transport, calls } = fakeTransport([
      { match: "spaces=appDataFolder&fields", body: { files: [] } },
      { match: "uploadType=multipart", body: { id: "f1", name: "ledger.enc", modifiedTime: "t" } },
    ]);
    const drive = new GoogleDriveProvider({ accessToken: "tok", transport });
    const file = await drive.upload("ledger.enc", '{"ciphertext":"x"}');
    expect(file.id).toBe("f1");
    expect(calls.some((c) => c.init?.method === "POST")).toBe(true);
  });

  it("downloads media as text", async () => {
    const { transport } = fakeTransport([
      { match: "alt=media", text: '{"ciphertext":"abc"}' },
    ]);
    const drive = new GoogleDriveProvider({ accessToken: "tok", transport });
    expect(await drive.download("f1")).toBe('{"ciphertext":"abc"}');
  });
});

describe("DropboxProvider", () => {
  it("treats a 409 metadata response as absent", async () => {
    const { transport } = fakeTransport([{ match: "get_metadata", status: 409 }]);
    const dropbox = new DropboxProvider({ accessToken: "tok", transport });
    expect(await dropbox.find("ledger.enc")).toBeNull();
  });

  it("uploads to the app folder path", async () => {
    const { transport, calls } = fakeTransport([
      { match: "files/upload", body: { name: "ledger.enc", path_lower: "/ledger.enc", server_modified: "t" } },
    ]);
    const dropbox = new DropboxProvider({ accessToken: "tok", transport });
    const file = await dropbox.upload("ledger.enc", "blob");
    expect(file.id).toBe("/ledger.enc");
    const arg = calls[0].init?.headers?.["Dropbox-API-Arg"];
    expect(arg).toContain("/ledger.enc");
  });
});
