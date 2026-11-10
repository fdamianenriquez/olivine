/** A panel length: a number is a percent of the panel space, a `"240px"` string a pixel size. */
export type SplitterLength = number | `${number}px`;

export type SplitterOrientation = "horizontal" | "vertical";

/** The limits a panel declares, before pixel lengths are converted. */
export interface PanelSpec {
  min?: SplitterLength | undefined;
  max?: SplitterLength | undefined;
  collapsible?: boolean | undefined;
  collapsedSize?: SplitterLength | undefined;
  defaultSize?: number | undefined;
}

/** A panel's limits in percent of the panel space. */
export interface PanelLimits {
  min: number;
  max: number;
  collapsible: boolean;
  collapsedSize: number;
}

/** Limits of the primary panel of one handle, in percent. */
export interface HandleLimits {
  /** Smallest size that keeps both panels expanded and within their limits. */
  lo: number;
  /** Largest size that keeps both panels expanded and within their limits. */
  hi: number;
  /** Smallest reachable size, including the primary panel's collapsed size. */
  min: number;
  /** Largest reachable size, including the next panel's collapsed size. */
  max: number;
}

/**
 * How a requested size is reached when it falls outside the expanded limits.
 * - `drag`: snaps to the collapsed size past the halfway point between it and the limit.
 * - `key`: a step stops at the limit first, the next one collapses; a step out of the collapsed
 *   size jumps to the limit.
 * - `exact`: only the collapsed size itself, otherwise the nearest limit.
 */
export type ResizeMode = "drag" | "key" | "exact";

const EPSILON = 1e-3;

/** Rounds to 3 decimals so repeated steps keep stable values. */
export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

const near = (a: number, b: number) => Math.abs(a - b) < EPSILON;

/** Whether a value is a pixel length (`"240px"`). */
export function isPixelLength(value: unknown): value is `${number}px` {
  return typeof value === "string" && /^-?\d*\.?\d+px$/.test(value.trim());
}

/**
 * Converts a length to percent of a panel space `groupPx` pixels long. A pixel length is
 * `undefined` until the space is measured, and so is anything that is not a length.
 */
export function toPercent(length: SplitterLength | undefined, groupPx: number): number | undefined {
  if (typeof length === "number") return Number.isFinite(length) ? length : undefined;
  if (!isPixelLength(length)) return undefined;
  if (groupPx <= 0) return undefined;
  return (Number.parseFloat(length) / groupPx) * 100;
}

/**
 * Resolves each panel's limits to percent. Before the space is measured, pixel limits fall back
 * to the defaults (min 0, max 100, collapsed 0). The collapsed size never exceeds `min`.
 */
export function resolveLimits(panels: readonly PanelSpec[], groupPx: number): PanelLimits[] {
  return panels.map((panel) => {
    const min = clamp(toPercent(panel.min, groupPx) ?? 0, 0, 100);
    const max = clamp(toPercent(panel.max, groupPx) ?? 100, min, 100);
    const collapsedSize = clamp(toPercent(panel.collapsedSize, groupPx) ?? 0, 0, min);
    return { min, max, collapsible: panel.collapsible === true, collapsedSize };
  });
}

/** Spreads 100 over `count` panels: given sizes are kept, the rest share what remains. */
export function defaultSizesFor(defaults: readonly (number | undefined)[]): number[] {
  const count = defaults.length;
  if (count === 0) return [];
  const given = defaults.map((size) =>
    typeof size === "number" && Number.isFinite(size) && size >= 0 ? size : undefined,
  );
  const used = given.reduce<number>((sum, size) => sum + (size ?? 0), 0);
  const open = given.filter((size) => size === undefined).length;
  const share = open > 0 ? Math.max(0, 100 - used) / open : 0;
  return scaleTo100(given.map((size) => size ?? share));
}

/** Scales sizes so they sum to 100; all-zero input becomes equal shares. */
function scaleTo100(sizes: readonly number[]): number[] {
  const clean = sizes.map((size) => (Number.isFinite(size) && size > 0 ? size : 0));
  const sum = clean.reduce((total, size) => total + size, 0);
  if (sum <= 0) return clean.map(() => round(100 / clean.length));
  return clean.map((size) => round((size / sum) * 100));
}

/**
 * Makes `sizes` a valid layout of `count` panels. A wrong length falls back to `fallback`;
 * negative values become 0 and a sum other than 100 is scaled. `changed` reports a correction.
 */
export function normaliseSizes(
  sizes: readonly number[] | undefined,
  count: number,
  fallback: readonly number[],
): { sizes: number[]; changed: boolean } {
  if (sizes?.length !== count) return { sizes: [...fallback], changed: sizes !== undefined };
  const sum = sizes.reduce((total, size) => total + size, 0);
  const valid = sizes.every((size) => Number.isFinite(size) && size >= 0) && near(sum, 100);
  if (valid) return { sizes: sizes.map(round), changed: false };
  return { sizes: scaleTo100(sizes), changed: true };
}

/** Whether a panel of this size rests at its collapsed size. */
export function isCollapsed(size: number, limits: PanelLimits): boolean {
  return limits.collapsible && near(size, limits.collapsedSize);
}

/** The limits of the primary panel (`index`) of the handle between `index` and `index + 1`. */
export function effectiveLimits(
  index: number,
  sizes: readonly number[],
  limits: readonly PanelLimits[],
): HandleLimits {
  const a = limits[index];
  const b = limits[index + 1];
  const size = sizes[index] ?? 0;
  if (!a || !b) return { lo: size, hi: size, min: size, max: size };
  const total = size + (sizes[index + 1] ?? 0);
  let lo = Math.max(a.min, total - b.max);
  let hi = Math.min(a.max, total - b.min);
  if (lo > hi) {
    // The pair can't satisfy both panels: hold the boundary where it is.
    lo = hi = clamp(size, Math.min(lo, hi), Math.max(lo, hi));
  }
  let min = lo;
  let max = hi;
  if (a.collapsible && total - a.collapsedSize <= b.max + EPSILON)
    min = Math.min(lo, a.collapsedSize);
  if (b.collapsible && total - b.collapsedSize <= a.max + EPSILON)
    max = Math.max(hi, total - b.collapsedSize);
  return { lo: round(lo), hi: round(hi), min: round(min), max: round(max) };
}

/**
 * Moves the boundary between panels `index` and `index + 1` so the first gets `next` percent.
 * Only those two panels change; the result respects their limits and collapsing rules.
 */
export function resizePair(
  sizes: readonly number[],
  index: number,
  next: number,
  limits: readonly PanelLimits[],
  mode: ResizeMode,
): number[] {
  const a = limits[index];
  const b = limits[index + 1];
  if (!a || !b) return [...sizes];
  const current = sizes[index] ?? 0;
  const total = current + (sizes[index + 1] ?? 0);
  const { lo, hi, min, max } = effectiveLimits(index, sizes, limits);
  const collapseA = min < lo ? min : undefined;
  const collapseB = max > hi ? max : undefined;

  let size: number;
  if (next < lo) {
    if (collapseA === undefined) size = lo;
    else if (mode === "drag") size = next < (collapseA + lo) / 2 ? collapseA : lo;
    else if (mode === "key") size = next < current && current <= lo + EPSILON ? collapseA : lo;
    else size = near(next, collapseA) || next < collapseA ? collapseA : lo;
  } else if (next > hi) {
    if (collapseB === undefined) size = hi;
    else if (mode === "drag") size = next > (collapseB + hi) / 2 ? collapseB : hi;
    else if (mode === "key") size = next > current && current >= hi - EPSILON ? collapseB : hi;
    else size = near(next, collapseB) || next > collapseB ? collapseB : hi;
  } else {
    size = next;
  }

  const out = [...sizes];
  out[index] = round(size);
  out[index + 1] = round(total - size);
  return out;
}

/** The handle that moves panel `index` (the one after it, or before it for the last panel). */
export function handleFor(index: number, count: number): number {
  return index < count - 1 ? index : index - 1;
}

/** Sets panel `index` to `size` through its handle, as far as the limits allow. */
export function setPanelSize(
  sizes: readonly number[],
  index: number,
  size: number,
  limits: readonly PanelLimits[],
): number[] {
  const handle = handleFor(index, sizes.length);
  if (handle < 0) return [...sizes];
  if (handle === index) return resizePair(sizes, handle, size, limits, "exact");
  const total = (sizes[handle] ?? 0) + (sizes[index] ?? 0);
  return resizePair(sizes, handle, total - size, limits, "exact");
}

/** Collapses panel `index`; unchanged when it is not collapsible or its neighbour can't grow. */
export function collapsePanel(
  sizes: readonly number[],
  index: number,
  limits: readonly PanelLimits[],
): number[] {
  const panel = limits[index];
  if (!panel?.collapsible) return [...sizes];
  const out = setPanelSize(sizes, index, panel.collapsedSize, limits);
  return isCollapsed(out[index] ?? 0, panel) ? out : [...sizes];
}

/**
 * Expands a collapsed panel `index` to `target` (its last expanded size or its default), taking
 * the space from its neighbour as far as the limits allow.
 */
export function expandPanel(
  sizes: readonly number[],
  index: number,
  target: number,
  limits: readonly PanelLimits[],
): number[] {
  const panel = limits[index];
  if (!panel) return [...sizes];
  const size = Math.max(target, panel.min);
  return setPanelSize(sizes, index, size, limits);
}

/** Pulls each pair back within its limits, from the first handle to the last. */
export function fitSizes(sizes: readonly number[], limits: readonly PanelLimits[]): number[] {
  let out = [...sizes];
  for (let pass = 0; pass < 2; pass++) {
    for (let handle = 0; handle < out.length - 1; handle++) {
      out = resizePair(out, handle, out[handle] ?? 0, limits, "exact");
    }
  }
  return out;
}

/** Converts a pointer movement in pixels to percent of the panel space. */
export function deltaToPercent(deltaPx: number, groupPx: number): number {
  return groupPx > 0 ? (deltaPx / groupPx) * 100 : 0;
}

/** What a key press on a handle asks for: a change in percent, a limit, or a collapse toggle. */
export type KeyIntent = number | "min" | "max" | "toggle";

/**
 * Maps a key to a change of the primary panel. Horizontal layouts use Left / Right (flipped in
 * right-to-left text), vertical layouts Up / Down. Keys across the axis return null.
 */
export function keyToDelta(
  key: string,
  shift: boolean,
  rtl: boolean,
  orientation: SplitterOrientation,
  step: number,
  largeStep: number,
): KeyIntent | null {
  const amount = shift ? largeStep : step;
  if (orientation === "horizontal") {
    if (key === "ArrowRight") return rtl ? -amount : amount;
    if (key === "ArrowLeft") return rtl ? amount : -amount;
  } else {
    if (key === "ArrowDown") return amount;
    if (key === "ArrowUp") return -amount;
  }
  if (key === "PageUp") return largeStep;
  if (key === "PageDown") return -largeStep;
  if (key === "Home") return "min";
  if (key === "End") return "max";
  if (key === "Enter") return "toggle";
  return null;
}

/** Whether two layouts are the same, to 3 decimals. */
export function sameSizes(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((size, i) => near(size, b[i] ?? Number.NaN));
}
