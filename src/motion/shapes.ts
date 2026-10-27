/**
 * The ensō of the shodō spinner: one open brush stroke and a faint inner echo, drawn on a
 * 48 × 48 box. Render both paths with `pathLength="1"` and the `.ol-enso__stroke` /
 * `.ol-enso__echo` classes.
 */
export const ENSO = {
  viewBox: "0 0 48 48",
  stroke: "M30.5 6.2 A19 19 0 1 0 41.6 17",
  echo: "M28 9.4 A15.6 15.6 0 1 0 38.4 18.6",
} as const;

/** Side of the anchor an overlay sits on, for `data-side` (noren, kakejiku). */
export type OverlaySide = "top" | "bottom" | "left" | "right";

/** `"top-start"` → `"top"`: the side part of a floating-ui placement. */
export function sideOf(placement: string): OverlaySide {
  const side = placement.split("-")[0];
  return side === "top" || side === "left" || side === "right" ? side : "bottom";
}
