// The design system: colours, spacing, radii, and type scale.
//
// Ported from the established ledger visual language (dark, indigo accent, one
// colour per spending category). Centralised here so every screen and component
// reads from one source and the look stays consistent. Swap these values to
// re-skin the whole app.

import type { Category } from "../../src/types";

export const colors = {
  bg: "#0b1020",
  bgElevated: "#131a2e",
  card: "#131a2e",
  card2: "#1a2238",
  border: "#222c46",
  text: "#e8edf7",
  textMuted: "#8b97b0",
  accent: "#6366f1",
  accentSoft: "#8b5cf6",
  debit: "#fb7185",
  credit: "#34d399",
  overlay: "rgba(6, 10, 22, 0.7)",
} as const;

export const categoryColors: Readonly<Record<Category, string>> = {
  food: "#f97316",
  groceries: "#22c55e",
  transport: "#3b82f6",
  shopping: "#a855f7",
  bills: "#eab308",
  entertainment: "#ec4899",
  health: "#14b8a6",
  others: "#94a3b8",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: "700" as const },
  h2: { fontSize: 20, fontWeight: "700" as const },
  h3: { fontSize: 15, fontWeight: "600" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  small: { fontSize: 12, fontWeight: "400" as const },
  big: { fontSize: 34, fontWeight: "700" as const },
} as const;

export const theme = { colors, categoryColors, spacing, radius, typography } as const;
export type Theme = typeof theme;
