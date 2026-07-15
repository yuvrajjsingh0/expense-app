// Encryption adapter for backup and sync.
//
// The symmetric key is generated once with a secure RNG and kept in the device
// keychain via expo-secure-store; it never leaves the device and never enters
// the platform agnostic core. Encryption uses WebCrypto AES-GCM. Expo apps
// reach WebCrypto through a polyfill (for example react-native-quick-crypto or
// react-native-webview-crypto); when it is absent the adapter fails loudly
// rather than silently downgrading.

import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import type { Encryptor, Encrypted } from "../../src/backup/encrypt";

const KEY_ALIAS = "ledger.backup.key.v1";

// Minimal typed view of the WebCrypto surface we use, so we need no DOM lib.
interface SubtleCryptoLike {
  importKey(
    format: "raw",
    keyData: ArrayBuffer,
    algorithm: { name: string },
    extractable: boolean,
    usages: string[],
  ): Promise<unknown>;
  encrypt(
    algorithm: { name: string; iv: Uint8Array },
    key: unknown,
    data: ArrayBuffer,
  ): Promise<ArrayBuffer>;
  decrypt(
    algorithm: { name: string; iv: Uint8Array },
    key: unknown,
    data: ArrayBuffer,
  ): Promise<ArrayBuffer>;
}

function subtle(): SubtleCryptoLike {
  const globalCrypto = (globalThis as { crypto?: { subtle?: SubtleCryptoLike } })
    .crypto;
  if (!globalCrypto?.subtle) {
    throw new Error(
      "WebCrypto subtle is unavailable. Install a crypto polyfill to enable backup encryption.",
    );
  }
  return globalCrypto.subtle;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64[b2 & 63];
  }
  return out;
}

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    buffer = (buffer << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

function utf8ToBytes(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
  }
  return Uint8Array.from(out);
}

function bytesToUtf8(bytes: Uint8Array): string {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 0x80) result += String.fromCodePoint(b0);
    else if (b0 < 0xe0) result += String.fromCodePoint(((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b0 < 0xf0)
      result += String.fromCodePoint(
        ((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f),
      );
    else
      result += String.fromCodePoint(
        ((b0 & 0x07) << 18) |
          ((bytes[i++] & 0x3f) << 12) |
          ((bytes[i++] & 0x3f) << 6) |
          (bytes[i++] & 0x3f),
      );
  }
  return result;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Load the backup key, generating and storing one on first use. */
export async function getOrCreateKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(KEY_ALIAS);
  if (existing) return base64ToBytes(existing);
  const key = await Crypto.getRandomBytesAsync(32); // AES-256
  await SecureStore.setItemAsync(KEY_ALIAS, bytesToBase64(key));
  return key;
}

/** An AES-GCM Encryptor bound to the device key. */
export async function createEncryptor(): Promise<Encryptor> {
  const rawKey = await getOrCreateKey();
  const key = await subtle().importKey("raw", toArrayBuffer(rawKey), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);

  return {
    encrypt: async (plaintext) => {
      const iv = await Crypto.getRandomBytesAsync(12);
      const cipher = await subtle().encrypt(
        { name: "AES-GCM", iv },
        key,
        toArrayBuffer(utf8ToBytes(plaintext)),
      );
      return {
        ciphertext: bytesToBase64(new Uint8Array(cipher)),
        iv: bytesToBase64(iv),
      };
    },
    decrypt: async (payload: Encrypted) => {
      if (!payload.iv) throw new Error("Missing IV on encrypted payload");
      const plain = await subtle().decrypt(
        { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
        key,
        toArrayBuffer(base64ToBytes(payload.ciphertext)),
      );
      return bytesToUtf8(new Uint8Array(plain));
    },
  };
}
