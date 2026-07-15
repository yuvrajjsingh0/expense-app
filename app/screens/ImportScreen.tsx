import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Transaction } from "../../src/types";
import { parseAll } from "../../src/parser";
import { parseCsvStatement } from "../../src/ingest/csv";
import { htmlToLines } from "../../src/ingest/html";
import { triage } from "../../src/confidence";
import { useLedger } from "../store/useLedger";
import { ScreenContainer } from "../components/ScreenContainer";
import { Card } from "../components/Card";
import { TransactionRow } from "../components/TransactionRow";
import { colors, radius, spacing } from "../theme/theme";

type Mode = "sms" | "csv" | "html";

const MODES: ReadonlyArray<{ id: Mode; label: string; placeholder: string }> = [
  { id: "sms", label: "SMS", placeholder: "Paste one bank or UPI SMS per line..." },
  { id: "csv", label: "CSV", placeholder: "Paste CSV statement text, header row first..." },
  { id: "html", label: "Email", placeholder: "Paste the HTML body of a bank email..." },
];

export function ImportScreen() {
  const addTransactions = useLedger((s) => s.addTransactions);
  const [mode, setMode] = useState<Mode>("sms");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Transaction[] | null>(null);

  const active = MODES.find((m) => m.id === mode)!;

  function run() {
    let parsed: Transaction[] = [];
    if (mode === "csv") parsed = parseCsvStatement(text);
    else if (mode === "html") parsed = parseAll(htmlToLines(text));
    else parsed = parseAll(text.split("\n"));
    setPreview(parsed);
  }

  function commit() {
    if (preview && preview.length > 0) {
      const added = addTransactions(preview);
      setPreview(null);
      setText("");
      // A tiny inline confirmation via the preview slot.
      setPreview(added > 0 ? null : preview);
    }
  }

  const queue = preview ? triage(preview) : null;

  return (
    <ScreenContainer title="Import" subtitle="Add transactions from any source">
      <Card index={0}>
        <View style={styles.segment}>
          {MODES.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setMode(m.id)}
              style={[styles.segItem, m.id === mode && styles.segItemActive]}
            >
              <Text style={[styles.segText, m.id === mode && styles.segTextActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={active.placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, !text.trim() && styles.buttonDisabled]}
            onPress={run}
            disabled={!text.trim()}
          >
            <Text style={styles.buttonText}>Parse</Text>
          </Pressable>
          {preview && preview.length > 0 ? (
            <Pressable style={styles.button} onPress={commit}>
              <Text style={styles.buttonText}>Add {preview.length} to ledger</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      {queue ? (
        <Card title={`Parsed ${preview!.length}`} index={1}>
          {preview!.length === 0 ? (
            <Text style={styles.muted}>
              Nothing recognised. Check the format, or that these are settled debits
              or credits and not OTPs.
            </Text>
          ) : (
            <>
              <Text style={styles.muted}>
                {queue.accepted.length} accepted, {queue.review.length} need review.
              </Text>
              {preview!.map((t, i) => (
                <TransactionRow key={`${t.ref ?? t.raw}-${i}`} transaction={t} index={i} />
              ))}
            </>
          )}
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center" },
  segItemActive: { backgroundColor: colors.accent },
  segText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  segTextActive: { color: "white" },
  input: {
    minHeight: 130,
    backgroundColor: colors.card2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
    fontSize: 13,
  },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
});
