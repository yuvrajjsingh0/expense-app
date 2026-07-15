// Display formatting shared across screens.

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

/**
 * Simple Icons logo URL keyed on the brand, per the project rule of never
 * committing logo files. Returns null when there is no plausible slug.
 */
export function brandIconUrl(brand: string | undefined): string | null {
  if (!brand) return null;
  const slug = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  return slug ? `https://cdn.simpleicons.org/${slug}` : null;
}

/** First letter for a fallback avatar. */
export function initial(text: string | undefined): string {
  return (text ?? "?").trim().charAt(0).toUpperCase() || "?";
}
