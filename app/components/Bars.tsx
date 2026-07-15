import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import type { MonthlyTotal } from "../../src/analytics";
import { colors } from "../theme/theme";
import { inr } from "../format";

interface BarsProps {
  months: readonly MonthlyTotal[];
}

/** Grouped monthly debit and credit bars as SVG. */
export function Bars({ months }: BarsProps) {
  if (months.length === 0) {
    return <Text style={styles.empty}>No dated transactions yet.</Text>;
  }

  const width = 320;
  const height = 190;
  const pad = { top: 12, right: 8, bottom: 26, left: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...months.flatMap((m) => [m.debit, m.credit]), 1);
  const groupW = plotW / months.length;
  const barW = Math.min(22, groupW / 3);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;

  return (
    <Animated.View entering={FadeIn}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map((f) => (
          <Line
            key={f}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + plotH * (1 - f)}
            y2={pad.top + plotH * (1 - f)}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        {[0, 0.5, 1].map((f) => (
          <SvgText key={`t${f}`} x={4} y={pad.top + plotH * (1 - f) + 4} fill={colors.textMuted} fontSize={9}>
            {inr(max * f)}
          </SvgText>
        ))}
        {months.map((m, i) => {
          const cx = pad.left + i * groupW + groupW / 2;
          return (
            <Rect
              key={`d${m.month}`}
              x={cx - barW - 2}
              y={y(m.debit)}
              width={barW}
              height={pad.top + plotH - y(m.debit)}
              rx={3}
              fill="#f97316"
            />
          );
        })}
        {months.map((m, i) => {
          const cx = pad.left + i * groupW + groupW / 2;
          return (
            <Rect
              key={`c${m.month}`}
              x={cx + 2}
              y={y(m.credit)}
              width={barW}
              height={pad.top + plotH - y(m.credit)}
              rx={3}
              fill="#22c55e"
            />
          );
        })}
        {months.map((m, i) => {
          const cx = pad.left + i * groupW + groupW / 2;
          return (
            <SvgText key={`l${m.month}`} x={cx} y={height - 8} fill={colors.textMuted} fontSize={9} textAnchor="middle">
              {m.month}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={[styles.swatch, { backgroundColor: "#f97316" }]} />
        <Text style={styles.legendText}>spent</Text>
        <View style={[styles.swatch, { backgroundColor: "#22c55e" }]} />
        <Text style={styles.legendText}>received</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 13 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: colors.textMuted, fontSize: 12, marginRight: 8 },
});
