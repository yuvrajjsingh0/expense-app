// Date normalisation for Indian bank and UPI alerts.
//
// Alerts carry dates in many shapes and often omit the year:
//   28-06            27-06-26        27-Jun-26
//   23Jun26          20/06/26        16-06
//
// This module turns that raw text into a normalised ISO calendar date
// (YYYY-MM-DD). It is platform agnostic: no Date formatting locale is used,
// only arithmetic, so the result is identical on every device.

/**
 * A calendar date in strict ISO 8601 form, YYYY-MM-DD.
 *
 * Branded so an arbitrary string cannot be assigned where a validated date is
 * expected. Construct one only through {@link normaliseDate}.
 */
export type ISODate = string & { readonly __brand: "ISODate" };

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// DD<sep?>Mon<sep?>YY(YY)?  for example 27-Jun-26, 23Jun26, 16 Jun.
const ALPHA = /^(\d{1,2})[-/ ]?([A-Za-z]{3})[A-Za-z]*[-/ ]?(\d{2,4})?$/;
// DD<sep>MM(<sep>YY(YY)?)?  for example 20/06/26, 27-06-26, 28-06.
const NUMERIC = /^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?$/;

/** One day in milliseconds, used for the future date tolerance. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Expand a written year into a four digit one.
 * Two digit years are read as 2000+, matching how banks abbreviate.
 */
function expandYear(raw: string): number {
  const n = Number(raw);
  return raw.length <= 2 ? 2000 + n : n;
}

/**
 * Build a validated ISODate from day, month, and an optional year.
 *
 * When the year is absent it is inferred from `reference`: the most recent
 * occurrence of that day and month that is not in the future. This matches the
 * real world case where a yearless alert always describes a date that has just
 * happened, never one to come.
 *
 * Returns undefined when the components do not form a real calendar date, for
 * example 31 February or month 13.
 */
function build(
  day: number,
  month: number,
  yearRaw: string | undefined,
  reference: Date,
): ISODate | undefined {
  if (!Number.isInteger(day) || !Number.isInteger(month)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  let year: number;
  if (yearRaw !== undefined) {
    year = expandYear(yearRaw);
  } else {
    year = reference.getUTCFullYear();
    // If this year's occurrence is still in the future, the alert must refer
    // to last year. A one day tolerance absorbs timezone skew at year end.
    const candidate = Date.UTC(year, month - 1, day);
    if (candidate - reference.getTime() > ONE_DAY_MS) year -= 1;
  }

  // Round trip through UTC to reject impossible dates such as 31 April. If any
  // component shifted, the input was not a real date.
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return undefined;
  }

  return `${year}-${pad(month)}-${pad(day)}` as ISODate;
}

/**
 * Normalise a raw date string from an alert into an {@link ISODate}.
 *
 * @param raw       The date text exactly as it appeared, for example "27-Jun-26".
 * @param reference The point in time used to infer a missing year. Defaults to
 *                  now. Pass an explicit value for deterministic results.
 * @returns The ISO date, or undefined when the text is not a recognisable date.
 */
export function normaliseDate(
  raw: string,
  reference: Date = new Date(),
): ISODate | undefined {
  const text = raw.trim();
  if (!text) return undefined;

  const alpha = ALPHA.exec(text);
  if (alpha) {
    const month = MONTHS[alpha[2].toLowerCase()];
    if (month === undefined) return undefined;
    return build(Number(alpha[1]), month, alpha[3], reference);
  }

  const numeric = NUMERIC.exec(text);
  if (numeric) {
    return build(Number(numeric[1]), Number(numeric[2]), numeric[3], reference);
  }

  return undefined;
}
