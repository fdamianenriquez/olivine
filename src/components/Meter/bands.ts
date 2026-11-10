/** Which band of the range a Meter reading falls in. */
export type MeterState = "good" | "fair" | "poor";

export interface MeterBounds {
  min?: number | undefined;
  max?: number | undefined;
  low?: number | undefined;
  high?: number | undefined;
  optimum?: number | undefined;
}

/** The numbers a Meter draws, after the HTML `meter` value processing. */
export interface MeterReading {
  value: number;
  min: number;
  max: number;
  low: number;
  high: number;
  optimum: number;
  /** Position of `value` in the range, from 0 to 1. */
  fraction: number;
  /** Position of `low` and `high` in the range, from 0 to 1. */
  lowAt: number;
  highAt: number;
  /** The band that holds `optimum`, as fractions of the range. */
  goodFrom: number;
  goodTo: number;
  /** The band of `value`, or `undefined` when none of `low`, `high`, `optimum` was given. */
  state: MeterState | undefined;
}

const finite = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Resolves a reading with the value processing of the HTML `meter` element: `max` is raised to
 * `min`, `value` is clamped, `low` defaults to `min`, `high` to `max` (never below `low`) and
 * `optimum` to the midpoint. The value's band follows the browser's region rules, boundaries
 * included in the band nearer the optimum:
 * - `low ≤ optimum ≤ high`: `[low, high]` is good, both outer bands are fair.
 * - `optimum < low`: `[min, low]` good, `(low, high]` fair, `(high, max]` poor.
 * - `optimum > high`: `[high, max]` good, `[low, high)` fair, `[min, low)` poor.
 */
export function readMeter(value: number, bounds: MeterBounds = {}): MeterReading {
  const min = finite(bounds.min) ? bounds.min : 0;
  const max = finite(bounds.max) ? Math.max(bounds.max, min) : Math.max(100, min);
  const now = finite(value) ? clamp(value, min, max) : min;
  const low = finite(bounds.low) ? clamp(bounds.low, min, max) : min;
  const high = finite(bounds.high) ? clamp(bounds.high, low, max) : max;
  const optimum = finite(bounds.optimum) ? clamp(bounds.optimum, min, max) : (min + max) / 2;
  const span = max - min;
  const at = (n: number) => (span > 0 ? (n - min) / span : 0);
  const banded = finite(bounds.low) || finite(bounds.high) || finite(bounds.optimum);

  let state: MeterState;
  let good: [number, number];
  if (optimum < low) {
    good = [min, low];
    state = now <= low ? "good" : now <= high ? "fair" : "poor";
  } else if (optimum > high) {
    good = [high, max];
    state = now >= high ? "good" : now >= low ? "fair" : "poor";
  } else {
    good = [low, high];
    state = now >= low && now <= high ? "good" : "fair";
  }

  return {
    value: now,
    min,
    max,
    low,
    high,
    optimum,
    fraction: at(now),
    lowAt: at(low),
    highAt: at(high),
    goodFrom: at(good[0]),
    goodTo: at(good[1]),
    state: banded ? state : undefined,
  };
}
