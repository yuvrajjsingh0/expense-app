// Android SMS reader adapter.
//
// Reading the SMS inbox is Android only and needs a native module plus the
// READ_SMS permission (granted by being the default SMS app or by the user).
// This adapter bridges to that native module and satisfies the SmsReader
// interface the pure syncSms pipeline consumes. On iOS, or when the native
// module is not linked, it reports unavailability instead of pretending.

import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import type { SmsReader, SmsMessage } from "../../src/mobile/sms";

/** Shape of the native module we expect the prebuild to provide. */
interface NativeSmsModule {
  getInbox(sinceEpochMs: number): Promise<Array<{ address: string; body: string; date: number }>>;
}

function nativeModule(): NativeSmsModule | null {
  const mod = (NativeModules as Record<string, unknown>).SmsReader;
  return (mod as NativeSmsModule | undefined) ?? null;
}

/** True when SMS ingestion is possible on this device and build. */
export function isSmsSupported(): boolean {
  return Platform.OS === "android" && nativeModule() !== null;
}

/** Request the READ_SMS permission. Returns whether it was granted. */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: "Read transaction SMS",
      message: "Ledger reads bank alert SMS locally to build your ledger. Messages never leave the device.",
      buttonPositive: "Allow",
      buttonNegative: "Deny",
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Build an SmsReader over the native module. Throws when unsupported, so callers
 * should gate on isSmsSupported first and fall back to email or import.
 */
export function createSmsReader(): SmsReader {
  const mod = nativeModule();
  if (!mod) {
    throw new Error("Native SMS module unavailable. SMS sync needs an Android dev build.");
  }
  return {
    readInbox: async (sinceEpochMs = 0): Promise<SmsMessage[]> => {
      const rows = await mod.getInbox(sinceEpochMs);
      return rows.map((r) => ({ address: r.address, body: r.body, date: r.date }));
    },
  };
}
