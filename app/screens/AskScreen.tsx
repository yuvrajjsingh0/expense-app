import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAssistant } from "../services/assistant";
import { useSettings } from "../store/useSettings";
import { colors, radius, spacing, typography } from "../theme/theme";

interface Turn {
  question: string;
  answer: string;
  streaming: boolean;
}

const SUGGESTIONS = [
  "How much did I spend in total?",
  "What did I spend on food?",
  "Top merchants?",
  "What are my subscriptions?",
  "My biggest transaction?",
];

export function AskScreen() {
  const assistant = useAssistant();
  const assistantEnabled = useSettings((s) => s.assistantEnabled);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setDraft("");
    setBusy(true);
    const index = turns.length;
    setTurns((prev) => [...prev, { question: q, answer: "", streaming: true }]);

    try {
      const answer = await assistant.ask(q, (token) => {
        setTurns((prev) => {
          const next = [...prev];
          if (next[index]) next[index] = { ...next[index], answer: next[index].answer + token };
          return next;
        });
      });
      setTurns((prev) => {
        const next = [...prev];
        next[index] = { question: q, answer: answer.text, streaming: false };
        return next;
      });
    } catch {
      setTurns((prev) => {
        const next = [...prev];
        next[index] = { question: q, answer: "Sorry, I could not answer that.", streaming: false };
        return next;
      });
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.bottom + 8}
    >
      <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Ask</Text>
        <Text style={styles.subtitle}>
          {assistant.backend === "rules"
            ? "Answered on device by the built in engine."
            : `Answered on device by ${assistant.backend}.`}
        </Text>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.conversation}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>

          {turns.map((t, i) => (
            <Animated.View key={i} entering={FadeInUp} style={styles.turn}>
              <Text style={styles.q}>{t.question}</Text>
              <View style={styles.answer}>
                {t.answer.length === 0 && t.streaming ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={styles.a}>{t.answer}</Text>
                )}
              </View>
            </Animated.View>
          ))}
          {!assistantEnabled ? (
            <Text style={styles.hint}>
              Turn on the on device model in Settings for free form answers.
            </Text>
          ) : null}
        </ScrollView>

        <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about your spending..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => send(draft)}
            returnKeyType="send"
            editable={!busy}
          />
          <Pressable style={styles.send} onPress={() => send(draft)} disabled={busy}>
            <Text style={styles.sendText}>Ask</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md },
  conversation: { gap: spacing.md, paddingBottom: spacing.lg },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    backgroundColor: colors.card2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: colors.text, fontSize: 13 },
  turn: { gap: 6 },
  q: { color: colors.text, fontWeight: "700", fontSize: 14 },
  answer: { backgroundColor: colors.card2, borderRadius: radius.md, padding: spacing.md },
  a: { color: colors.text, fontSize: 14, lineHeight: 21 },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: spacing.md },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingTop: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.card2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
  },
  sendText: { color: "white", fontWeight: "700" },
});
