import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { QWEN_MODELS, findModel, formatSize } from "../../src/assistant/models";
import type { ModelStatus, DownloadProgress } from "../../src/assistant/modelManager";
import { useLedger } from "../store/useLedger";
import { useSettings, type SyncProviderId } from "../store/useSettings";
import { modelManager } from "../services/assistant";
import { connectProvider, disconnectProvider, syncNow } from "../services/sync";
import { ScreenContainer } from "../components/ScreenContainer";
import { Card } from "../components/Card";
import { colors, radius, spacing } from "../theme/theme";

const PROVIDERS: ReadonlyArray<{ id: SyncProviderId; label: string }> = [
  { id: "google-drive", label: "Google Drive" },
  { id: "dropbox", label: "Dropbox" },
];

export function SettingsScreen() {
  const { modelId, assistantEnabled, syncProvider, lastSyncedAt } = useSettings();
  const setModelId = useSettings((s) => s.setModelId);
  const setAssistantEnabled = useSettings((s) => s.setAssistantEnabled);
  const setSyncProvider = useSettings((s) => s.setSyncProvider);
  const setLastSyncedAt = useSettings((s) => s.setLastSyncedAt);

  const transactions = useLedger((s) => s.transactions);
  const replaceAll = useLedger((s) => s.replaceAll);
  const resetToSample = useLedger((s) => s.resetToSample);

  const [status, setStatus] = useState<ModelStatus>("absent");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [syncing, setSyncing] = useState(false);

  const model = findModel(modelId) ?? QWEN_MODELS[0];

  useEffect(() => {
    void modelManager.status(model).then(setStatus);
  }, [model]);

  async function download() {
    try {
      await modelManager.ensure(model, {
        onStatus: setStatus,
        onProgress: setProgress,
      });
      setProgress(null);
    } catch (e) {
      setProgress(null);
      Alert.alert("Download failed", e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function connect(provider: SyncProviderId) {
    try {
      await connectProvider(provider);
      setSyncProvider(provider);
    } catch (e) {
      Alert.alert("Could not connect", e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function runSync() {
    setSyncing(true);
    try {
      const result = await syncNow(syncProvider, transactions);
      replaceAll(result.transactions);
      setLastSyncedAt(result.syncedAt);
      Alert.alert("Sync complete", `Status: ${result.status}`);
    } catch (e) {
      Alert.alert("Sync failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <ScreenContainer title="Settings">
      <Card title="On device assistant" index={0}>
        <View style={styles.row}>
          <Text style={styles.label}>Use Qwen on device</Text>
          <Switch
            value={assistantEnabled}
            onValueChange={setAssistantEnabled}
            trackColor={{ true: colors.accent, false: colors.card2 }}
          />
        </View>
        <Text style={styles.muted}>
          {model.name} · {formatSize(model.sizeBytes)} · {status}
        </Text>
        <View style={styles.modelRow}>
          {QWEN_MODELS.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setModelId(m.id)}
              style={[styles.modelChip, m.id === modelId && styles.modelChipActive]}
            >
              <Text style={[styles.modelChipText, m.id === modelId && styles.modelChipTextActive]}>
                {m.params}
              </Text>
            </Pressable>
          ))}
        </View>
        {progress ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress.fraction * 100)}%` }]} />
          </View>
        ) : status !== "ready" ? (
          <Pressable style={styles.button} onPress={download}>
            <Text style={styles.buttonText}>Download {formatSize(model.sizeBytes)}</Text>
          </Pressable>
        ) : (
          <Text style={styles.ready}>Model ready</Text>
        )}
      </Card>

      <Card title="Cloud backup and sync" index={1}>
        <Text style={styles.muted}>End to end encrypted. The cloud only sees ciphertext.</Text>
        <View style={styles.providerRow}>
          {PROVIDERS.map((p) => {
            const connected = syncProvider === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  connected ? (disconnectProvider(p.id), setSyncProvider("none")) : connect(p.id)
                }
                style={[styles.provider, connected && styles.providerActive]}
              >
                <Text style={[styles.providerText, connected && styles.providerTextActive]}>
                  {connected ? `${p.label} ✓` : p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={[styles.button, (syncProvider === "none" || syncing) && styles.buttonDisabled]}
          onPress={runSync}
          disabled={syncProvider === "none" || syncing}
        >
          <Text style={styles.buttonText}>{syncing ? "Syncing..." : "Sync now"}</Text>
        </Pressable>
        {lastSyncedAt ? (
          <Text style={styles.muted}>Last synced {new Date(lastSyncedAt).toLocaleString()}</Text>
        ) : null}
      </Card>

      <Card title="Data" index={2}>
        <Pressable style={styles.button} onPress={resetToSample}>
          <Text style={styles.buttonText}>Reset to sample data</Text>
        </Pressable>
        <Text style={styles.muted}>{transactions.length} transactions on device.</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: colors.text, fontSize: 14, fontWeight: "600" },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  modelRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  modelChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  modelChipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  modelChipTextActive: { color: "white" },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 14 },
  ready: { color: colors.credit, fontWeight: "700", marginTop: spacing.md },
  progressTrack: {
    height: 8,
    backgroundColor: colors.card2,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressFill: { height: "100%", backgroundColor: colors.accent },
  providerRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  provider: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  providerActive: { borderColor: colors.accent },
  providerText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  providerTextActive: { color: colors.accent },
});
