// The fretboard that organises the page. In equal temperament a fret falls at
// scaleLength · (1 − 2^(−n/12)); taking the octave (fret 12) as the unit length, it is
// 2 · (1 − 2^(−n/12)) of the board, so fret 12 sits exactly at the end.

/** Position of fret `n` along the board, from 0 (the nut) to 1 (fret 12). `n` may be fractional. */
export const fretAt = (n: number): number => 2 * (1 - Math.pow(2, -n / 12));

/** The same position as a CSS percentage, for `top` or `left`. */
export const fretPct = (n: number): string => `${(fretAt(n) * 100).toFixed(3)}%`;

/** Frets that carry a single inlay dot. Fret 12 carries the double dot. */
export const SINGLE_DOTS: readonly number[] = [3, 5, 7, 9];

/** CSS position and size of the space between fret `n - 1` and fret `n`, where a note is played. */
export const fretSpan = (from: number, to: number = from): { start: string; size: string } => ({
  start: fretPct(from - 1),
  size: `calc(${fretPct(to)} - ${fretPct(from - 1)})`,
});

/** The middle of the space between fret `n - 1` and fret `n`, for an inlay. */
export const fretMid = (n: number): string => `calc((${fretPct(n - 1)} + ${fretPct(n)}) / 2)`;

/**
 * How far the page has scrolled through a tall section that pins its content, from 0 (the section
 * top is at the viewport top) to 1 (its bottom is at the viewport bottom).
 */
export function pinnedProgress(top: number, height: number, viewport: number): number {
  const travel = height - viewport;
  if (travel <= 0) return 0;
  return Math.min(1, Math.max(0, -top / travel));
}

/** The week (1–12) a 0–1 progress falls in. */
export const weekAt = (progress: number): number =>
  Math.min(12, Math.max(1, Math.ceil(progress * 12 || 1e-4)));
