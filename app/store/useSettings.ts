// User settings: which on device model is selected, whether the assistant is
// enabled, and which sync provider is connected. Persisted, small, and separate
// from the ledger so changing a preference never touches transaction data.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_MODEL_ID } from "../../src/assistant/models";

export type SyncProviderId = "none" | "google-drive" | "dropbox";

export interface SettingsState {
  /** Selected Qwen model id from the registry. */
  modelId: string;
  /** Whether the on device model backs the Ask tab (vs the rule engine). */
  assistantEnabled: boolean;
  /** Connected cloud sync provider. */
  syncProvider: SyncProviderId;
  /** Last successful sync time, ISO, or null. */
  lastSyncedAt: string | null;
  setModelId: (id: string) => void;
  setAssistantEnabled: (on: boolean) => void;
  setSyncProvider: (provider: SyncProviderId) => void;
  setLastSyncedAt: (iso: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      modelId: DEFAULT_MODEL_ID,
      assistantEnabled: false,
      syncProvider: "none",
      lastSyncedAt: null,
      setModelId: (modelId) => set({ modelId }),
      setAssistantEnabled: (assistantEnabled) => set({ assistantEnabled }),
      setSyncProvider: (syncProvider) => set({ syncProvider }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
    }),
    {
      name: "ledger-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
