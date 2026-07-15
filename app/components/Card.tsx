import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, radius, spacing, typography } from "../theme/theme";

interface CardProps {
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
  /** Stagger index for the entrance animation. */
  index?: number;
  right?: ReactNode;
}

/** The standard surface: a rounded, bordered card with a soft entrance. */
export function Card({ title, children, style, index = 0, right }: CardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      style={[styles.card, style]}
    >
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.text },
});
