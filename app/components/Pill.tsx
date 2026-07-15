import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme/theme";

interface PillProps {
  label: string;
  /** Solid background colour; when set the text goes dark for contrast. */
  color?: string;
}

/** A small rounded label used for categories, channels, and cadences. */
export function Pill({ label, color }: PillProps) {
  return (
    <View
      style={[
        styles.pill,
        color ? { backgroundColor: color } : styles.neutral,
      ]}
    >
      <Text style={[styles.text, color ? styles.onColor : styles.neutralText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
  neutral: {
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  onColor: { color: "#0b1020" },
  neutralText: { color: colors.textMuted },
});
