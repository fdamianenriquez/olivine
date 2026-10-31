/**
 * Locale-aware number parsing, formatting and step arithmetic for NumberField. Pure functions,
 * built on `Intl.NumberFormat` only.
 */

/** What a locale and format use to write a number, read once from `formatToParts`. */
export interface NumberSymbols {
  /** The decimal separator the locale writes. */
  decimal: string;
  /** The group separator the locale writes (a fallback when the format has no grouping). */
  group: string;
  /** The locale's own digits, mapped to ASCII. Empty when it writes ASCII digits. */
  digits: Map<string, string>;
  /** Characters a formatted value may hold besides digits and separators (%, ¥, spaces). */
  extras: Set<string>;
  /** Whether the format is a percentage, so a typed number is divided by 100. */
  percent: boolean;
  /** Fraction digits the format shows at most. */
  maxFractionDigits: number;
}

/** Characters every locale accepts besides its digits: both separators, spaces and IME punctuation. */
const COMMON = [".", ",", " ", "。", "、"];

/** Minus signs a user may type or paste: hyphen-minus, U+2212, hyphen, non-breaking hyphen. */
const MINUS = /[−‐‑‒–﹣]/g;

/** NFKC folds full-width digits, signs and spaces (０-９, ．, ，, －, ％, ￥, U+3000) to ASCII. */
function fold(text: string): string {
  return text.normalize("NFKC").replace(MINUS, "-");
}

/** Reads the separators, digits and symbols of a formatter. */
export function readSymbols(formatter: Intl.NumberFormat): NumberSymbols {
  const options = formatter.resolvedOptions();
  const parts = formatter.formatToParts(-1234567.8);
  const find = (type: Intl.NumberFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  const decimal = fold(find("decimal") ?? ".");
  const group = fold(find("group") ?? (decimal === "," ? "." : ","));

  const digits = new Map<string, string>();
  const plain = new Intl.NumberFormat(options.locale, {
    numberingSystem: options.numberingSystem,
    useGrouping: false,
  });
  for (let d = 0; d <= 9; d += 1) {
    const glyph = fold(plain.format(d));
    if (glyph !== String(d)) digits.set(glyph, String(d));
  }

  const extras = new Set<string>();
  for (const part of parts) {
    if (["percentSign", "currency", "literal", "plusSign"].includes(part.type)) {
      for (const char of fold(part.value)) extras.add(char);
    }
  }
  extras.delete("-");

  return {
    decimal,
    group,
    digits,
    extras,
    percent: options.style === "percent",
    maxFractionDigits: options.maximumFractionDigits ?? 3,
  };
}

/**
 * Whether typed text may enter the field: digits (ASCII, full-width or the locale's own),
 * separators, spaces, the format's signs, and a minus when negatives are allowed.
 */
export function isAllowedInput(data: string, symbols: NumberSymbols, negative: boolean): boolean {
  for (const char of fold(data)) {
    if (/\d/.test(char) || symbols.digits.has(char)) continue;
    if (COMMON.includes(char) || char === symbols.decimal || char === symbols.group) continue;
    if (symbols.extras.has(char) || /\s/.test(char)) continue;
    if (char === "-" && negative) continue;
    return false;
  }
  return true;
}

/** Removes the characters `isAllowedInput` would refuse, for text committed by an IME. */
export function keepAllowed(text: string, symbols: NumberSymbols, negative: boolean): string {
  return Array.from(text)
    .filter((char) => isAllowedInput(char, symbols, negative))
    .join("");
}

/** True when `,`/`.` at these positions read as thousands groups: 1–3 digits, then groups of 3. */
function isGrouped(text: string, separator: string): boolean {
  const groups = text.split(separator);
  const [head, ...rest] = groups;
  if (head === undefined || head.length < 1 || head.length > 3) return false;
  return rest.length > 0 && rest.every((g) => g.length === 3);
}

/**
 * Reads typed or pasted text as a number. Returns `null` for empty text and `NaN` for text that
 * is not a number. Full-width forms, the locale's digits, U+2212 and IME punctuation are folded
 * first. A lone `.` or `,` is a decimal point unless it is the locale's group separator in a
 * valid thousands position, so `1.500` reads 1500 in es-ES and `1.5` reads 1.5. Percent text
 * returns the fraction (`25` → 0.25).
 */
export function parseNumber(text: string, symbols: NumberSymbols): number | null {
  let s = fold(text);
  for (const [glyph, digit] of symbols.digits) s = s.split(glyph).join(digit);
  s = s.replace(/。/g, symbols.decimal).replace(/、/g, symbols.group);

  // Separators outside `.`/`,` (a space, an apostrophe) are written only as groups or decimals.
  if (symbols.group !== "." && symbols.group !== ",") s = s.split(symbols.group).join("");
  if (symbols.decimal !== "." && symbols.decimal !== ",") s = s.split(symbols.decimal).join(".");
  const decimal = symbols.decimal === "," ? "," : ".";

  // Drop the format's signs and spaces; anything else left that is not a number is an error.
  s = Array.from(s)
    .filter((char) => !symbols.extras.has(char) && !/\s/.test(char))
    .join("");
  if (s === "") return null;
  if (!/^[\d.,-]+$/.test(s)) return Number.NaN;

  const minuses = s.split("-").length - 1;
  if (minuses > 1) return Number.NaN;
  const negative = minuses === 1;
  s = s.replace("-", "");
  if (!/\d/.test(s)) return Number.NaN;

  const marks = Array.from(new Set(s.replace(/\d/g, "")));
  let intPart = s;
  let fracPart = "";
  if (marks.length === 2) {
    // Both kinds typed: the last one is the decimal point, the other groups.
    const point = /[.,](?=\d*$)/.exec(s)?.[0] ?? ".";
    const other = point === "." ? "," : ".";
    const at = s.lastIndexOf(point);
    if (s.indexOf(point) !== at) return Number.NaN;
    intPart = s.slice(0, at).split(other).join("");
    fracPart = s.slice(at + 1);
  } else if (marks.length === 1) {
    const [mark = ""] = marks;
    const count = s.split(mark).length - 1;
    if (count > 1) {
      if (!isGrouped(s, mark)) return Number.NaN;
      intPart = s.split(mark).join("");
    } else if (mark === symbols.group && mark !== decimal && isGrouped(s, mark)) {
      intPart = s.split(mark).join("");
    } else {
      [intPart = "", fracPart = ""] = s.split(mark);
    }
  }
  if (/\D/.test(intPart) || /\D/.test(fracPart)) return Number.NaN;

  let value = Number(`${intPart || "0"}.${fracPart || "0"}`);
  if (symbols.percent) value = tidy(value / 100);
  return negative ? -value : value;
}

/** Counts the decimal places of a number, including exponent notation (1e-7). */
export function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const [mantissa = "", exponent] = String(n).split("e");
  const places = mantissa.split(".")[1]?.length ?? 0;
  return Math.max(0, places - Number(exponent ?? 0));
}

/** Rounds away binary float noise (0.1 + 0.2) to 15 significant digits. */
function tidy(n: number): number {
  return Number(n.toPrecision(15));
}

/** Rounds to `places` decimals and turns -0 into 0. */
function roundTo(n: number, places: number): number {
  return Number(n.toFixed(Math.min(places, 100))) + 0;
}

/** The range and step a value lives on. */
export interface StepGrid {
  step: number;
  min?: number | undefined;
  max?: number | undefined;
}

/** Keeps a value inside `min`/`max`. */
export function clamp(value: number, { min, max }: StepGrid): number {
  if (max !== undefined && value > max) return max;
  if (min !== undefined && value < min) return min;
  return value;
}

/** Decimals a value on this grid needs: those of `step` and of `min`. */
function placesOf({ step, min }: StepGrid): number {
  return Math.max(decimalsOf(step), decimalsOf(min ?? 0));
}

/**
 * Snaps a value to the nearest multiple of `step` counted from `min` (or 0), rounded to the
 * step's precision, then clamps it.
 */
export function snapToStep(value: number, grid: StepGrid): number {
  if (!(grid.step > 0)) return clamp(value, grid);
  const origin = grid.min ?? 0;
  const k = Math.round(tidy((value - origin) / grid.step));
  return clamp(roundTo(origin + k * grid.step, placesOf(grid)), grid);
}

/**
 * Moves a value by `count` steps of `size` (negative goes down). A value between grid points
 * moves to the next point in that direction first, so 1.5 + 1 is 2 and 1.5 − 1 is 1.
 */
export function stepValue(value: number, count: number, size: number, grid: StepGrid): number {
  if (!(grid.step > 0) || !(size > 0)) return clamp(value + count * size, grid);
  const origin = grid.min ?? 0;
  const position = tidy((value - origin) / grid.step);
  const steps = (count * size) / grid.step;
  const base = count > 0 ? Math.floor(position) : Math.ceil(position);
  const places = Math.max(placesOf(grid), decimalsOf(size));
  return clamp(roundTo(origin + (base + steps) * grid.step, places), grid);
}
