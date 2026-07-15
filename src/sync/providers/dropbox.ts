// Dropbox sync provider.
//
// Uses a scoped app folder (the token is an app folder token), so the app only
// ever sees its own files. Dropbox splits content and metadata across two hosts,
// which this adapter hides behind the common SyncProvider surface. Transport
// injectable and therefore testable.

import type { SyncProvider, RemoteFile } from "../provider";
import type { HttpTransport } from "../../http";
import { readText } from "../../http";

export interface DropboxProviderOptions {
  /** OAuth2 token for a scoped app folder. */
  accessToken: string;
  transport: HttpTransport;
  /** Folder path prefix inside the app folder, defaults to root. */
  folder?: string;
  contentBase?: string;
  apiBase?: string;
}

interface DropboxMetadata {
  id?: string;
  name?: string;
  path_lower?: string;
  server_modified?: string;
  size?: number;
  ".tag"?: string;
}

interface DropboxList {
  entries?: DropboxMetadata[];
}

const CONTENT = "https://content.dropboxapi.com/2";
const API = "https://api.dropboxapi.com/2";

export class DropboxProvider implements SyncProvider {
  readonly name = "dropbox";
  private readonly token: string;
  private readonly transport: HttpTransport;
  private readonly folder: string;
  private readonly content: string;
  private readonly api: string;

  constructor(options: DropboxProviderOptions) {
    this.token = options.accessToken;
    this.transport = options.transport;
    this.folder = (options.folder ?? "").replace(/\/$/, "");
    this.content = options.contentBase ?? CONTENT;
    this.api = options.apiBase ?? API;
  }

  private pathFor(name: string): string {
    return `${this.folder}/${name}`;
  }

  private toRemote(meta: DropboxMetadata, fallbackName: string): RemoteFile {
    return {
      id: meta.path_lower ?? this.pathFor(fallbackName),
      name: meta.name ?? fallbackName,
      modifiedTime: meta.server_modified ?? "",
      size: meta.size,
    };
  }

  async upload(name: string, content: string): Promise<RemoteFile> {
    const arg = JSON.stringify({
      path: this.pathFor(name),
      mode: "overwrite",
      mute: true,
    });
    const res = await this.transport(`${this.content}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": arg,
      },
      body: content,
    });
    if (!res.ok) throw new Error(`Dropbox upload failed ${res.status}`);
    return this.toRemote((await res.json()) as DropboxMetadata, name);
  }

  async download(fileId: string): Promise<string> {
    const arg = JSON.stringify({ path: fileId });
    const res = await this.transport(`${this.content}/files/download`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Dropbox-API-Arg": arg,
      },
    });
    if (!res.ok) throw new Error(`Dropbox download failed ${res.status}`);
    return readText(res);
  }

  async find(name: string): Promise<RemoteFile | null> {
    const res = await this.transport(`${this.api}/files/get_metadata`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: this.pathFor(name) }),
    });
    if (res.status === 409) return null; // path not found
    if (!res.ok) throw new Error(`Dropbox metadata failed ${res.status}`);
    return this.toRemote((await res.json()) as DropboxMetadata, name);
  }

  async list(): Promise<RemoteFile[]> {
    const res = await this.transport(`${this.api}/files/list_folder`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: this.folder || "" }),
    });
    if (!res.ok) throw new Error(`Dropbox list failed ${res.status}`);
    const body = (await res.json()) as DropboxList;
    return (body.entries ?? [])
      .filter((e) => e[".tag"] !== "folder")
      .map((e) => this.toRemote(e, e.name ?? ""));
  }

  async remove(fileId: string): Promise<void> {
    const res = await this.transport(`${this.api}/files/delete_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: fileId }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Dropbox delete failed ${res.status}`);
    }
  }
}
