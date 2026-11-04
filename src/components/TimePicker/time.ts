import { pad } from "../../utils/pad";

/** A time of day in 24 h: hours 0–23, minutes 0–59. */
export interface TimeValue {
  h: number;
  m: number;
}

export type HourCycle = 12 | 24;
export type DayPeriod = "AM" | "PM";

/** Hour cycle a language uses unless told otherwise: English 12 h (British English 24 h), the rest 24 h. */
export function defaultHourCycle(tag: string): HourCycle {
  const [language, ...rest] = tag.toLowerCase().split("-");
  if (language !== "en") return 24;
  return rest.includes("gb") ? 24 : 12;
}

/** Tag Intl can format with; falls back to English when the tag is malformed. */
export function intlTag(tag: string): string {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(tag)[0] ?? "en";
  } catch {
    return "en";
  }
}

/** The AM and PM words of a language: "AM"/"PM", "a. m."/"p. m.", "午前"/"午後". */
export function dayPeriodNames(tag: string): Record<DayPeriod, string> {
  const name = (hour: number, fallback: DayPeriod) => {
    try {
      const parts = new Intl.DateTimeFormat(intlTag(tag), {
        hour: "numeric",
        hourCycle: "h12",
      }).formatToParts(new Date(2026, 0, 1, hour));
      return parts.find((part) => part.type === "dayPeriod")?.value ?? fallback;
    } catch {
      return fallback;
    }
  };
  return { AM: name(9, "AM"), PM: name(15, "PM") };
}

/** Hour as shown on a 12 h clock: 0 → 12, 13 → 1. */
export const to12 = (h: number): number => ((h + 11) % 12) + 1;

export const periodOf = (h: number): DayPeriod => (h >= 12 ? "PM" : "AM");

/** The 24 h hour for a 12 h clock reading and a period. */
export const from12 = (hour12: number, period: DayPeriod): number =>
  (hour12 % 12) + (period === "PM" ? 12 : 0);

/** Text of an hour: `2` on a 12 h clock, `02` on a 24 h one. */
export const formatHour = (h: number, cycle: HourCycle): string =>
  cycle === 12 ? String(to12(h)) : pad(h);

/** `HH:MM`, the value a form submits. */
export const toTimeString = (value: TimeValue): string => `${pad(value.h)}:${pad(value.m)}`;

/** The hours a period covers, in order: AM 0–11, PM 12–23. */
export const hoursOf = (period: DayPeriod): number[] =>
  Array.from({ length: 12 }, (_, i) => i + (period === "PM" ? 12 : 0));

/**
 * The entry of `cycle` that follows `from` in direction `dir`, wrapping, skipping entries `ok`
 * rejects. With no `from`, the first (up) or last (down) allowed entry. `null` when none is allowed.
 */
export function stepThrough(
  cycle: readonly number[],
  from: number | null,
  dir: 1 | -1,
  ok: (n: number) => boolean = () => true,
): number | null {
  const at = from === null ? -1 : cycle.indexOf(from);
  const start = at === -1 ? (dir === 1 ? -1 : cycle.length) : at;
  for (let i = 1; i <= cycle.length; i += 1) {
    const n = cycle[(((start + dir * i) % cycle.length) + cycle.length) % cycle.length];
    if (n !== undefined && ok(n)) return n;
  }
  return null;
}

/** The allowed value of `candidates` closest to `target`, or `null`. */
export function nearest(
  candidates: readonly number[],
  target: number,
  ok: (n: number) => boolean,
): number | null {
  let best: number | null = null;
  for (const n of candidates) {
    if (ok(n) && (best === null || Math.abs(n - target) < Math.abs(best - target))) best = n;
  }
  return best;
}

/** Whole number inside `[min, max]`; `fallback` when `n` is not a finite number. */
export function clampInt(n: number | undefined, min: number, max: number, fallback: number) {
  if (n === undefined || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
