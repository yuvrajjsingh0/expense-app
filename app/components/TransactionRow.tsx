import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { Transaction } from "../../src/types";
import { categoryColors, colors, spacing } from "../theme/theme";
import { inr } from "../format";
import { MerchantLogo } from "./MerchantLogo";
import { Pill } from "./Pill";

interface TransactionRowProps {
  transaction: Transaction;
  index?: number;
}

/** One transaction line: logo, name, category and channel, signed amount. */
export function TransactionRow({ transaction: t, index = 0 }: TransactionRowProps) {
  return (
    <Animated.View entering={FadeIn.delay(index * 40)} style={styles.row}>
      <MerchantLogo brand={t.brand} merchant={t.merchant} />
      <View style={styles.main}>
        <Text style={styles.name}>{t.brand ?? t.merchant ?? "Unknown"}</Text>
        <View style={styles.sub}>
          <Pill label={t.category} color={categoryColors[t.category]} />
          <Text style={styles.meta}>{t.channel}</Text>
          {t.date ? <Text style={styles.meta}>{t.date}</Text> : null}
        </View>
      </View>
      <Text style={t.direction === "debit" ? styles.debit : styles.credit}>
        {t.direction === "debit" ? "-" : "+"}
        {inr(t.amount)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, gap: 4 },
  name: { color: colors.text, fontWeight: "600", fontSize: 14 },
  sub: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { color: colors.textMuted, fontSize: 12 },
  debit: { color: colors.debit, fontWeight: "700", fontSize: 15 },
  credit: { color: colors.credit, fontWeight: "700", fontSize: 15 },
});
