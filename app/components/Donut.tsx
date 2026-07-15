import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { CategorySlice } from "../../src/analytics";
import { categoryColors, colors, spacing } from "../theme/theme";
import { inr } from "../format";

const AnimatedG = Animated.createAnimatedComponent(G);
const TAU = Math.PI * 2;

interface DonutProps {
  slices: readonly CategorySlice[];
  size?: number;
}

function polar(fraction: number, r: number, c: number): [number, number] {
  const a = fraction * TAU - Math.PI / 2;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
}

function arc(start: number, end: number, r: number, inner: number, c: number): string {
  const [x0, y0] = polar(start, r, c);
  const [x1, y1] = polar(end, r, c);
  const [ix1, iy1] = polar(end, inner, c);
  const [ix0, iy0] = polar(start, inner, c);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${inner} ${inner} 0 ${large} 0 ${ix0} ${iy0} Z`;
}

/** SVG spend-by-category donut with a soft rotate-and-scale entrance. */
export function Donut({ slices, size = 200 }: DonutProps) {
  const c = size / 2;
  const r = size / 2 - 4;
  const inner = r * 0.62;
  const total = slices.reduce((s, x) => s + x.total, 0);

  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = 0;
    grow.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [slices, grow]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: grow.value,
    originX: c,
    originY: c,
    transform: [{ scale: 0.9 + 0.1 * grow.value }, { rotate: `${(1 - grow.value) * -18}deg` }],
  }));

  if (total <= 0) return <Text style={styles.empty}>No spending to chart yet.</Text>;

  let cursor = 0;
  const arcs = slices.map((s) => {
    const start = cursor;
    const end = cursor + s.share;
    cursor = end;
    return { d: arc(start, end, r, inner, c), color: categoryColors[s.category], key: s.category };
  });

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <AnimatedG animatedProps={animatedProps}>
            {arcs.map((a) => (
              <Path key={a.key} d={a.d} fill={a.color} stroke={colors.bg} strokeWidth={1.5} />
            ))}
          </AnimatedG>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.total}>{inr(total)}</Text>
          <Text style={styles.caption}>spent</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={s.category} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: categoryColors[s.category] }]} />
            <Text style={styles.legendName}>{s.category}</Text>
            <Text style={styles.legendValue}>{inr(s.total)}</Text>
            <Text style={styles.legendShare}>{Math.round(s.share * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: spacing.lg, flexWrap: "wrap" },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  total: { color: colors.text, fontSize: 18, fontWeight: "700" },
  caption: { color: colors.textMuted, fontSize: 11 },
  empty: { color: colors.textMuted, fontSize: 13 },
  legend: { flex: 1, minWidth: 150, gap: 4 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendName: { color: colors.text, flex: 1, fontSize: 13, textTransform: "capitalize" },
  legendValue: { color: colors.text, fontSize: 13 },
  legendShare: { color: colors.textMuted, fontSize: 13, width: 38, textAlign: "right" },
});
