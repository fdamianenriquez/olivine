/**
 * Calendar-date helpers shared by Calendar and the date pickers. Dates are local `Date` objects
 * at midnight; every name, week start and format comes from `Intl`, with no runtime dependency.
 */

/** Day of the week, 0 = Sunday … 6 = Saturday (as `Date#getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A date range. `end` is `null` while only the start has been picked. */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/** Intl tags of the built-in locales: `es` follows CLDR's default (Monday first). */
const BUILT_IN_TAGS: Readonly<Record<string, string>> = { en: "en-US", es: "es", ja: "ja-JP" };

/** Resolves a built-in name (`"en"`, `"es"`, `"ja"`) or any BCP 47 tag to an `Intl` tag. */
export function intlTag(locale: string): string {
  return BUILT_IN_TAGS[locale] ?? locale;
}

/** True for a Japanese locale, which shows the era year (令和) and narrow weekday names. */
export function isJapanese(locale: string): boolean {
  return intlTag(locale).toLowerCase().split("-")[0] === "ja";
}

// ---------------------------------------------------------------------------------------------
// Arithmetic

/** The same calendar day at local midnight. */
export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** The first day of the date's month. */
export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

export const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Adds months, keeping the day of the month but clamping it to the target month's length. */
export function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}

export const addYears = (d: Date, n: number): Date => addMonths(d, n * 12);

/** Same calendar day; false when either side is missing. */
export const isSameDay = (a: Date | null | undefined, b: Date | null | undefined): boolean =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Same month of the same year; false when either side is missing. */
export const isSameMonth = (a: Date | null | undefined, b: Date | null | undefined): boolean =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Compares calendar days, ignoring the time: negative, zero or positive. */
export const compareDays = (a: Date, b: Date): number =>
  startOfDay(a).getTime() - startOfDay(b).getTime();

/** `a` is an earlier calendar day than `b`. */
export const isBeforeDay = (a: Date, b: Date): boolean => compareDays(a, b) < 0;

/** Keeps a date within `min` and `max` (either may be missing). */
export function clampDate(d: Date, min?: Date | null, max?: Date | null): Date {
  if (min && isBeforeDay(d, min)) return startOfDay(min);
  if (max && isBeforeDay(max, d)) return startOfDay(max);
  return d;
}

/** True when the day falls before `min` or after `max`. */
export const isOutOfBounds = (d: Date, min?: Date | null, max?: Date | null): boolean =>
  (!!min && isBeforeDay(d, min)) || (!!max && isBeforeDay(max, d));

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** `YYYY-MM-DD` of the local day; `""` for no date. */
export const toIsoDate = (d: Date | null | undefined): string =>
  d ? `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "";

/** Builds a local date from parts, or `null` when the parts don't name a real day. */
function fromParts(year: number, month: number, date: number): Date | null {
  const d = new Date(year, month - 1, date);
  d.setFullYear(year); // years below 100 would otherwise land in the 1900s
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === date ? d : null;
}

/** Parses `YYYY-MM-DD` to a local date, or `null`. */
export function fromIsoDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  return match ? fromParts(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

// ---------------------------------------------------------------------------------------------
// Week info

interface WeekInfo {
  firstDay: number;
  weekend?: number[];
}

function weekInfo(locale: string): WeekInfo | undefined {
  try {
    const loc = new Intl.Locale(intlTag(locale)) as Intl.Locale & {
      getWeekInfo?: () => WeekInfo;
      weekInfo?: WeekInfo;
    };
    return loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
  } catch {
    return undefined;
  }
}

/** Fallback first days for engines without `Intl.Locale` week info. */
const FALLBACK_WEEK_START: Readonly<Record<string, Weekday>> = { en: 0, es: 1, ja: 0 };

/** First day of the week for a locale (0 = Sunday), from `Intl.Locale` week info. */
export function getWeekStart(locale: string): Weekday {
  const info = weekInfo(locale);
  if (info?.firstDay) return (info.firstDay % 7) as Weekday;
  const lang = intlTag(locale).split("-")[0] ?? "";
  return FALLBACK_WEEK_START[lang] ?? 1;
}

/** Weekend days of a locale (0 = Sunday); Saturday and Sunday when the engine doesn't say. */
export function getWeekend(locale: string): readonly Weekday[] {
  const days = weekInfo(locale)?.weekend;
  return days && days.length > 0 ? days.map((n) => (n % 7) as Weekday) : [6, 0];
}

/** Six weeks of seven days covering the month of `view`, starting on `weekStartsOn`. */
export function monthGrid(view: Date, weekStartsOn: Weekday): Date[][] {
  const first = startOfMonth(view);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => addDays(start, r * 7 + c)),
  );
}

/** Offset of a day from the start of its week (0–6). */
export const dayOfWeekIndex = (d: Date, weekStartsOn: Weekday): number =>
  (d.getDay() - weekStartsOn + 7) % 7;

// ---------------------------------------------------------------------------------------------
// Names and formats

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlTag(locale), options);
    formatters.set(key, f);
  }
  return f;
}

/** Month name: `"October"`, `"octubre"`, `"10月"`. */
export const monthName = (
  d: Date,
  locale: string,
  style: "long" | "short" | "narrow" = "long",
): string => formatter(locale, { month: style }).format(d);

/** Month and year as one phrase: `"October 2026"`, `"octubre de 2026"`, `"2026年10月"`. */
export const formatMonthYear = (d: Date, locale: string): string =>
  formatter(locale, { month: "long", year: "numeric" }).format(d);

export interface WeekdayName {
  /** Column heading: short (narrow in Japanese). */
  short: string;
  /** Full name, for `abbr` and screen readers. */
  long: string;
  /** Day of the week, 0 = Sunday. */
  day: Weekday;
}

/** The seven weekday names in display order. */
export function weekdayNames(locale: string, weekStartsOn: Weekday): WeekdayName[] {
  const short = formatter(locale, { weekday: isJapanese(locale) ? "narrow" : "short" });
  const long = formatter(locale, { weekday: "long" });
  return Array.from({ length: 7 }, (_, i) => {
    const day = ((weekStartsOn + i) % 7) as Weekday;
    const d = new Date(2026, 1, 1 + day); // 1 February 2026 is a Sunday
    return { short: short.format(d), long: long.format(d), day };
  });
}

/** Full date: `"Thursday, October 22, 2026"`. */
export const formatLongDate = (d: Date, locale: string): string =>
  formatter(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(d);

/** Short date with weekday: `"Thu, Oct 22"`. */
export const formatShortDate = (d: Date, locale: string): string =>
  formatter(locale, { weekday: "short", month: "short", day: "numeric" }).format(d);

/** Japanese era year, e.g. `"令和8年"` for 2026; `""` where the engine lacks the calendar. */
export function formatEraYear(d: Date): string {
  try {
    return formatter("ja-JP-u-ca-japanese", { era: "long", year: "numeric" }).format(d);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------------------------
// Typed input

type Field = "day" | "month" | "year";

/** Order and separator of a locale's numeric date, from `Intl`: en M/D/Y, es D/M/Y, ja Y/M/D. */
function numericOrder(locale: string): { order: Field[]; separator: string } {
  const parts = formatter(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(2026, 9, 22));
  const order = parts
    .map((p) => p.type)
    .filter((t): t is Field => t === "day" || t === "month" || t === "year");
  const literal = parts.find((p) => p.type === "literal")?.value.trim();
  return {
    order: order.length === 3 ? order : ["year", "month", "day"],
    separator: literal === undefined || literal === "" ? "/" : literal,
  };
}

const PATTERN_TOKENS: Readonly<Record<Field, string>> = { day: "DD", month: "MM", year: "YYYY" };

/** The format a date field shows and accepts: `"MM/DD/YYYY"` (en), `"DD/MM/YYYY"` (es), `"YYYY/MM/DD"` (ja). */
export function datePattern(locale: string): string {
  const { order, separator } = numericOrder(locale);
  return order.map((f) => PATTERN_TOKENS[f]).join(separator);
}

/** Formats a date in {@link datePattern}; `""` for no date. */
export function formatDateInput(d: Date | null | undefined, locale: string): string {
  if (!d) return "";
  const { order, separator } = numericOrder(locale);
  const values: Record<Field, string> = {
    day: pad(d.getDate()),
    month: pad(d.getMonth() + 1),
    year: pad(d.getFullYear(), 4),
  };
  return order.map((f) => values[f]).join(separator);
}

/**
 * Parses typed text in the locale's order (any non-digit separates fields) or as ISO
 * `YYYY-MM-DD`, which is always accepted. A four-digit first field means year-first. Returns
 * `null` for anything that isn't a real day.
 */
export function parseDateInput(text: string, locale: string): Date | null {
  const fields = text.trim().split(/\D+/).filter(Boolean);
  if (fields.length !== 3) return null;
  const order: Field[] =
    fields[0]?.length === 4 ? ["year", "month", "day"] : numericOrder(locale).order;
  const values: Partial<Record<Field, number>> = {};
  order.forEach((f, i) => {
    values[f] = Number(fields[i]);
  });
  const { year, month, day } = values;
  if (year === undefined || month === undefined || day === undefined) return null;
  if (String(fields[order.indexOf("year")]).length !== 4) return null;
  return fromParts(year, month, day);
}
