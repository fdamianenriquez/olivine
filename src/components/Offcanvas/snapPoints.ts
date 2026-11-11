import { devWarn } from "../../utils/dev";

/**
 * A stop of a bottom sheet's visible height: a share of the available height (a number from 0
 * to 1), a length in px (`"320px"`) or rem (`"20rem"`), or `"content"` to fit the content.
 */
export type OffcanvasSnapPoint = number | `${number}px` | `${number}rem` | "content";

export interface SnapContext {
  /** Height the sheet may take at most, in px (its max-height). */
  available: number;
  /** Root font size in px. */
  rem: number;
  /** Natural height of the sheet's content (handle, head and body), in px. */
  content: number;
}

export interface ResolvedPoint {
  value: OffcanvasSnapPoint;
  px: number;
}

/** One point in px, clamped to the available height. */
export function toPx(point: OffcanvasSnapPoint, { available, rem, content }: SnapContext): number {
  let px: number;
  if (point === "content") px = content;
  else if (typeof point === "number") {
    if (!(point >= 0 && point <= 1)) {
      devWarn(
        "Offcanvas",
        `snap point ${String(point)} is not a share from 0 to 1; it is clamped. Give lengths as "px" or "rem" strings.`,
      );
    }
    px = Math.min(Math.max(point, 0), 1) * available;
  } else if (point.endsWith("rem")) px = Number.parseFloat(point) * rem;
  else px = Number.parseFloat(point);
  if (!Number.isFinite(px)) px = 0;
  return Math.round(Math.min(Math.max(px, 0), available));
}

/** The points in px, ascending, without duplicates (same value, or same height). */
export function resolvePoints(
  points: readonly OffcanvasSnapPoint[],
  context: SnapContext,
): ResolvedPoint[] {
  const out: ResolvedPoint[] = [];
  for (const value of points) {
    const px = toPx(value, context);
    if (out.some((p) => p.value === value || p.px === px)) continue;
    out.push({ value, px });
  }
  return out.sort((a, b) => a.px - b.px);
}

/** Index of `value` among the resolved points: by value, else by height; -1 when missing. */
export function indexOfPoint(
  points: readonly ResolvedPoint[],
  value: OffcanvasSnapPoint | undefined,
  context: SnapContext | null,
): number {
  if (value === undefined) return -1;
  const byValue = points.findIndex((p) => p.value === value);
  if (byValue >= 0 || !context) return byValue;
  const px = toPx(value, context);
  return points.findIndex((p) => p.px === px);
}

/** Distinct values in the order given, for counting before anything is measured. */
export function distinct(points: readonly OffcanvasSnapPoint[] | undefined): OffcanvasSnapPoint[] {
  return points ? Array.from(new Set(points)) : [];
}
