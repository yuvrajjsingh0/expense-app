import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { categoryBreakdown, monthSummary, latestMonth } from "../../src/analytics";
import { useLedger } from "../store/useLedger";
import { ScreenContainer } from "../components/ScreenContainer";
import { Card } from "../components/Card";
import { Donut } from "../components/Donut";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { TransactionRow } from "../components/TransactionRow";
import { colors, radius, spacing, typography } from "../theme/theme";
import { inr } from "../format";

export function DashboardScreen() {
  const transactions = useLedger((s) => s.transactions);
  const month = useMemo(() => latestMonth(transactions), [transactions]);
  const summary = useMemo(
    () => (month ? monthSummary(transactions, month) : null),
    [transactions, month],
  );
  const slices = useMemo(() => {
    const scoped = month
      ? transactions.filter((t) => t.date?.slice(0, 7) === month)
      : transactions;
    return categoryBreakdown(scoped);
  }, [transactions, month]);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .slice(0, 8),
    [transactions],
  );

  const delta = summary?.deltaPct ?? null;

  return (
    <ScreenContainer title="Dashboard" subtitle="India first, on device">
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <LinearGradient
          colors={["#1e1b4b", "#131a2e"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroLabel}>{month ? `Spent in ${month}` : "Total spent"}</Text>
          <AnimatedNumber value={summary?.spent ?? 0} style={styles.heroValue} />
          {delta !== null ? (
            <View style={styles.deltaRow}>
              <Text style={[styles.delta, { color: delta >= 0 ? colors.debit : colors.credit }]}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
              </Text>
              <Text style={styles.deltaCaption}>vs last month</Text>
            </View>
          ) : null}
          <View style={styles.heroStats}>
            <View>
              <Text style={styles.heroStatLabel}>Received</Text>
              <Text style={[styles.heroStatValue, { color: colors.credit }]}>
                {inr(summary?.received ?? 0)}
              </Text>
            </View>
            <View>
              <Text style={styles.heroStatLabel}>Transactions</Text>
              <Text style={styles.heroStatValue}>{summary?.txnCount ?? transactions.length}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Card title="By category" index={1}>
        <Donut slices={slices} />
      </Card>

      <Card title="Recent" index={2}>
        {recent.map((t, i) => (
          <TransactionRow key={`${t.ref ?? t.raw}-${i}`} transaction={t} index={i} />
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroLabel: { color: colors.textMuted, ...typography.h3 },
  heroValue: { color: colors.text, fontSize: 40, fontWeight: "800", padding: 0, marginTop: 2 },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  delta: { fontSize: 13, fontWeight: "700" },
  deltaCaption: { color: colors.textMuted, fontSize: 12 },
  heroStats: { flexDirection: "row", gap: spacing.xxl, marginTop: spacing.lg },
  heroStatLabel: { color: colors.textMuted, fontSize: 12 },
  heroStatValue: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 2 },
});
