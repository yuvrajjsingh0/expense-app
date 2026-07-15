import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { monthlyTotals, topMerchants, dailyFlow } from "../../src/analytics";
import { detectRecurring } from "../../src/recurring";
import { useLedger } from "../store/useLedger";
import { ScreenContainer } from "../components/ScreenContainer";
import { Card } from "../components/Card";
import { Bars } from "../components/Bars";
import { MerchantLogo } from "../components/MerchantLogo";
import { Pill } from "../components/Pill";
import { colors } from "../theme/theme";
import { inr } from "../format";

export function TrendsScreen() {
  const transactions = useLedger((s) => s.transactions);
  const months = useMemo(() => monthlyTotals(transactions), [transactions]);
  const merchants = useMemo(() => topMerchants(transactions, 6), [transactions]);
  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);
  const days = useMemo(() => dailyFlow(transactions), [transactions]);
  const maxDay = Math.max(...days.map((d) => d.debit), 1);
  const topSpend = merchants[0]?.total ?? 1;

  return (
    <ScreenContainer title="Trends" subtitle="Where your money goes">
      <Card title="Monthly flow" index={0}>
        <Bars months={months} />
      </Card>

      <Card title="Top merchants" index={1}>
        {merchants.map((m, i) => (
          <View key={m.merchant} style={styles.rankRow}>
            <Text style={styles.rankNum}>{i + 1}</Text>
            <MerchantLogo merchant={m.merchant} brand={m.merchant} size={28} />
            <Text style={styles.rankName}>{m.merchant}</Text>
            <View style={styles.rankBar}>
              <View style={[styles.rankFill, { width: `${(m.total / topSpend) * 100}%` }]} />
            </View>
            <Text style={styles.rankValue}>{inr(m.total)}</Text>
          </View>
        ))}
      </Card>

      <Card title="Subscriptions and recurring" index={2}>
        {recurring.length === 0 ? (
          <Text style={styles.muted}>None detected yet.</Text>
        ) : (
          recurring.map((r) => (
            <View key={r.key} style={styles.rankRow}>
              <MerchantLogo brand={r.brand} merchant={r.key} size={28} />
              <Text style={styles.rankName}>{r.brand ?? r.key}</Text>
              <Pill label={r.cadence} />
              <Text style={styles.rankValue}>{inr(r.averageAmount)}</Text>
            </View>
          ))
        )}
      </Card>

      <Card title="Daily spend" index={3}>
        <View style={styles.daily}>
          {days.map((d) => (
            <View
              key={d.date}
              style={[styles.dailyBar, { height: `${Math.max(6, (d.debit / maxDay) * 100)}%` }]}
            />
          ))}
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  rankNum: { color: colors.textMuted, width: 14, fontSize: 13 },
  rankName: { color: colors.text, flex: 1, fontSize: 13 },
  rankBar: { width: 70, height: 6, backgroundColor: colors.card2, borderRadius: 4, overflow: "hidden" },
  rankFill: { height: "100%", backgroundColor: colors.accent },
  rankValue: { color: colors.text, fontSize: 13, width: 66, textAlign: "right", fontVariant: ["tabular-nums"] },
  muted: { color: colors.textMuted, fontSize: 13 },
  daily: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 90 },
  dailyBar: { flex: 1, backgroundColor: colors.accent, borderRadius: 3, minHeight: 6 },
});
