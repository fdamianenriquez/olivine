/** Value arithmetic for a two-thumb Range. Pure functions with decimal-safe rounding. */

/** A two-thumb value, always ordered `[low, high]`. */
export type RangeValue = [number, number];

/** The bounds and grid a two-thumb Range works on. */
export interface RangeGrid {
  min: number;
  max: number;
  step: number;
  /** Least gap between the thumbs, already rounded up to a multiple of `step`. */
  gap: number;
}

/** Decimal places of a number written in plain or exponent notation. */
function decimals(n: number): number {
  const [mantissa = "", exponent] = String(n).toLowerCase().split("e");
  const places = mantissa.split(".")[1]?.length ?? 0;
  return Math.max(0, places - Number(exponent ?? 0));
}

/** Rounds away floating-point noise to the precision of `min` and `step`. */
function fix(value: number, grid: Pick<RangeGrid, "min" | "step">): number {
  const places = Math.min(20, Math.max(decimals(grid.min), decimals(grid.step)));
  return Number(value.toFixed(places));
}

/** The highest value on the step grid that is not above `max`. */
export function topOfGrid(grid: Pick<RangeGrid, "min" | "max" | "step">): number {
  if (grid.max <= grid.min) return grid.min;
  return fix(grid.min + Math.floor((grid.max - grid.min) / grid.step + 1e-9) * grid.step, grid);
}

/** `minDistance` rounded up to a whole number of steps, never negative. */
export function gapFor(minDistance: number, step: number): number {
  if (!(minDistance > 0)) return 0;
  return Number(
    (Math.ceil(minDistance / step - 1e-9) * step).toFixed(Math.min(20, decimals(step))),
  );
}

/** Snaps a value to the nearest step counted from `min`, inside `[min, top of grid]`. */
export function snap(value: number, grid: Pick<RangeGrid, "min" | "max" | "step">): number {
  const top = topOfGrid(grid);
  if (Number.isNaN(value) || value <= grid.min) return grid.min;
  if (value >= top) return top;
  return fix(grid.min + Math.round((value - grid.min) / grid.step) * grid.step, grid);
}

/** The lowest and highest value one thumb may take, given where the other thumb is. */
export function limits(thumb: 0 | 1, pair: RangeValue, grid: RangeGrid): [number, number] {
  if (thumb === 0) return [grid.min, Math.max(grid.min, fix(pair[1] - grid.gap, grid))];
  return [Math.min(topOfGrid(grid), fix(pair[0] + grid.gap, grid)), topOfGrid(grid)];
}

/** Moves one thumb to `value`, snapped and stopped at its neighbour. Never crosses. */
export function moveThumb(
  thumb: 0 | 1,
  value: number,
  pair: RangeValue,
  grid: RangeGrid,
): RangeValue {
  const [lo, hi] = limits(thumb, pair, grid);
  const next = Math.min(hi, Math.max(lo, snap(value, grid)));
  return thumb === 0 ? [next, pair[1]] : [pair[0], next];
}

/** Sorts, snaps and spreads a pair so it fits the grid and the gap. */
export function clampPair(pair: readonly number[], grid: RangeGrid): RangeValue {
  const a = snap(pair[0] ?? grid.min, grid);
  const b = snap(pair[1] ?? topOfGrid(grid), grid);
  let lo = Math.min(a, b);
  let hi = Math.max(a, b);
  if (hi - lo < grid.gap) {
    hi = Math.min(topOfGrid(grid), fix(lo + grid.gap, grid));
    lo = Math.max(grid.min, fix(hi - grid.gap, grid));
  }
  return [lo, hi];
}

/** Position of a value along the track, from 0 (min) to 1 (max). */
export function ratioOf(value: number, grid: Pick<RangeGrid, "min" | "max">): number {
  if (grid.max <= grid.min) return 0;
  return Math.min(1, Math.max(0, (value - grid.min) / (grid.max - grid.min)));
}

/**
 * The value under a pointer. Block centres travel from half a block in from each end, so the
 * usable length is the track minus one block width. `rtl` reads the track from the right.
 */
export function valueFromPointer(
  clientX: number,
  rect: { left: number; width: number },
  blockWidth: number,
  rtl: boolean,
  grid: Pick<RangeGrid, "min" | "max" | "step">,
): number {
  const usable = rect.width - blockWidth;
  const offset = clientX - rect.left - blockWidth / 2;
  let ratio = usable > 0 ? Math.min(1, Math.max(0, offset / usable)) : 0;
  if (rtl) ratio = 1 - ratio;
  return snap(grid.min + ratio * (grid.max - grid.min), grid);
}

/**
 * Which thumb a press at `value` moves: the nearest one. On a tie (both thumbs at one value, or
 * the press exactly between them) the thumb that can move toward the press; when both can, the
 * low thumb. Returns `null` when the thumbs share a value and the press lands on it, so the first
 * drag direction decides.
 */
export function pickThumb(value: number, pair: RangeValue, grid: RangeGrid): 0 | 1 | null {
  const [lo, hi] = pair;
  const toLow = Math.abs(value - lo);
  const toHigh = Math.abs(value - hi);
  if (toLow < toHigh) return 0;
  if (toHigh < toLow) return 1;
  if (lo === hi) {
    if (value > hi) return 1;
    if (value < lo) return 0;
    const lowCanMove = lo > grid.min;
    const highCanMove = hi < topOfGrid(grid);
    if (lowCanMove && !highCanMove) return 0;
    if (highCanMove && !lowCanMove) return 1;
    return null;
  }
  return 0;
}
