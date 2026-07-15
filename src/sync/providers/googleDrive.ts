// Google Drive sync provider.
//
// Stores files in the appDataFolder, a hidden per app folder the user cannot see
// in their Drive and other apps cannot read. That keeps the encrypted ledger out
// of the way while still living in the user's own account. Transport injectable,
// so it is testable without the network.

import type { SyncProvider, RemoteFile } from "../provider";
import type { HttpTransport } from "../../http";
import { readText } from "../../http";

export interface GoogleDriveProviderOptions {
  /** OAuth2 token with the drive.appdata scope. */
  accessToken: string;
  transport: HttpTransport;
  apiBase?: string;
  uploadBase?: string;
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

interface DriveList {
  files?: DriveFile[];
}

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const BOUNDARY = "ledgercore-boundary-7f3a";

function toRemote(file: DriveFile): RemoteFile {
  return {
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime ?? "",
    size: file.size ? Number(file.size) : undefined,
  };
}

export class GoogleDriveProvider implements SyncProvider {
  readonly name = "google-drive";
  private readonly token: string;
  private readonly transport: HttpTransport;
  private readonly api: string;
  private readonly uploadBase: string;

  constructor(options: GoogleDriveProviderOptions) {
    this.token = options.accessToken;
    this.transport = options.transport;
    this.api = options.apiBase ?? API;
    this.uploadBase = options.uploadBase ?? UPLOAD;
  }

  private authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }

  async find(name: string): Promise<RemoteFile | null> {
    const q = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}'`);
    const url =
      `${this.api}/files?spaces=appDataFolder&fields=files(id,name,modifiedTime,size)` +
      `&q=${q}`;
    const res = await this.transport(url, { headers: this.authHeader() });
    if (!res.ok) throw new Error(`Drive find failed ${res.status}`);
    const body = (await res.json()) as DriveList;
    const file = body.files?.[0];
    return file ? toRemote(file) : null;
  }

  async upload(name: string, content: string): Promise<RemoteFile> {
    const existing = await this.find(name);
    if (existing) {
      // Update media of the existing file in place.
      const url = `${this.uploadBase}/files/${existing.id}?uploadType=media&fields=id,name,modifiedTime,size`;
      const res = await this.transport(url, {
        method: "PUT",
        headers: { ...this.authHeader(), "Content-Type": "application/json" },
        body: content,
      });
      if (!res.ok) throw new Error(`Drive update failed ${res.status}`);
      return toRemote((await res.json()) as DriveFile);
    }

    // Multipart create: metadata part then media part.
    const metadata = JSON.stringify({ name, parents: ["appDataFolder"] });
    const multipart =
      `--${BOUNDARY}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${metadata}\r\n` +
      `--${BOUNDARY}\r\n` +
      "Content-Type: application/json\r\n\r\n" +
      `${content}\r\n` +
      `--${BOUNDARY}--`;
    const url = `${this.uploadBase}/files?uploadType=multipart&fields=id,name,modifiedTime,size`;
    const res = await this.transport(url, {
      method: "POST",
      headers: {
        ...this.authHeader(),
        "Content-Type": `multipart/related; boundary=${BOUNDARY}`,
      },
      body: multipart,
    });
    if (!res.ok) throw new Error(`Drive create failed ${res.status}`);
    return toRemote((await res.json()) as DriveFile);
  }

  async download(fileId: string): Promise<string> {
    const url = `${this.api}/files/${fileId}?alt=media`;
    const res = await this.transport(url, { headers: this.authHeader() });
    if (!res.ok) throw new Error(`Drive download failed ${res.status}`);
    return readText(res);
  }

  async list(): Promise<RemoteFile[]> {
    const url = `${this.api}/files?spaces=appDataFolder&fields=files(id,name,modifiedTime,size)`;
    const res = await this.transport(url, { headers: this.authHeader() });
    if (!res.ok) throw new Error(`Drive list failed ${res.status}`);
    const body = (await res.json()) as DriveList;
    return (body.files ?? []).map(toRemote);
  }

  async remove(fileId: string): Promise<void> {
    const url = `${this.api}/files/${fileId}`;
    const res = await this.transport(url, {
      method: "DELETE",
      headers: this.authHeader(),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Drive delete failed ${res.status}`);
    }
  }
}
