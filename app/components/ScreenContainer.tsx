import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../theme/theme";

interface ScreenContainerProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}

/** Shared screen chrome: safe-area padding, a header, and an optional scroll. */
export function ScreenContainer({
  title,
  subtitle,
  right,
  children,
  scroll = true,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );

  if (!scroll) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
        {header}
        <View style={styles.body}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      {header}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  body: { gap: spacing.lg },
});
