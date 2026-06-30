import type { Category } from "../src/types";

/** Format a number as Indian rupees with lakh and crore grouping. */
export function inr(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString();
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}₹${rest ? `${grouped},${last3}` : last3}`;
}

/** A stable colour per category, used across the donut and legends. */
export const CATEGORY_COLOURS: Readonly<Record<Category, string>> = {
  food: "#f97316",
  groceries: "#22c55e",
  transport: "#3b82f6",
  shopping: "#a855f7",
  bills: "#eab308",
  entertainment: "#ec4899",
  health: "#14b8a6",
  others: "#94a3b8",
};

/**
 * Map a brand string to a Simple Icons slug so a logo can be fetched at runtime.
 * Per the project rules, no logo files are committed; the URL is keyed on the
 * merchant the parser returns. Returns null when there is no obvious slug.
 */
export function brandIconUrl(brand: string | undefined): string | null {
  if (!brand) return null;
  const slug = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) return null;
  return `https://cdn.simpleicons.org/${slug}`;
}

/** First letter for a fallback avatar when no logo loads. */
export function initial(text: string | undefined): string {
  return (text ?? "?").trim().charAt(0).toUpperCase() || "?";
}
