// HTML email to plain text.
//
// Bank alert emails wrap the same sentence an SMS would carry in nested tables
// and inline styles. This module flattens that HTML into the plain text the
// parser core expects, so one engine serves both SMS and email. It is
// deliberately small and dependency free: no DOM, so it runs unchanged on a
// phone, in Node, and in tests.

/** Tags whose entire content is noise and must be dropped, not flattened. */
const DROP_CONTENT = /<(script|style|head)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Block level tags that should become a line break when removed. */
const BLOCK = /<\/?(p|div|tr|table|br|li|ul|ol|h[1-6]|header|footer|section)\b[^>]*>/gi;

/** Any remaining tag. */
const TAG = /<[^>]+>/g;

/** The handful of named entities that actually show up in bank mail. */
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rupee: "₹",
  inr: "INR",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const codePoint =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : whole;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? whole;
  });
}

/**
 * Convert an HTML email body into plain text suitable for {@link parse}.
 *
 * Script, style, and head content is discarded; block tags collapse to single
 * newlines; entities are decoded; runs of whitespace are squeezed. The result
 * keeps line structure so multiple alerts in one email stay on separate lines.
 */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(DROP_CONTENT, " ")
    .replace(BLOCK, "\n")
    .replace(TAG, " ");

  return decodeEntities(withBreaks)
    .replace(/[ \t\f\v]+/g, " ") // collapse horizontal whitespace
    .replace(/ *\n */g, "\n") // trim around line breaks
    .replace(/\n{2,}/g, "\n") // collapse blank lines
    .trim();
}

/**
 * Split a flattened email into candidate alert lines.
 * Useful when a single statement email lists several transactions.
 */
export function htmlToLines(html: string): string[] {
  return htmlToText(html)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
