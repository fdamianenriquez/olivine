import { describe, expect, it } from "vitest";

import {
  collapsePanel,
  defaultSizesFor,
  deltaToPercent,
  effectiveLimits,
  expandPanel,
  fitSizes,
  handleFor,
  isCollapsed,
  isPixelLength,
  keyToDelta,
  normaliseSizes,
  type PanelLimits,
  resizePair,
  resolveLimits,
  round,
  sameSizes,
  setPanelSize,
  toPercent,
} from "./layout";

const free: PanelLimits = { min: 0, max: 100, collapsible: false, collapsedSize: 0 };
const panel = (over: Partial<PanelLimits> = {}): PanelLimits => ({ ...free, ...over });

describe("lengths", () => {
  it("recognises pixel strings only", () => {
    expect(isPixelLength("240px")).toBe(true);
    expect(isPixelLength("12.5px")).toBe(true);
    expect(isPixelLength("240")).toBe(false);
    expect(isPixelLength(240)).toBe(false);
    expect(isPixelLength("20%")).toBe(false);
  });

  it("converts numbers as percent and pixels against the measured space", () => {
    expect(toPercent(30, 0)).toBe(30);
    expect(toPercent(Number.NaN, 0)).toBeUndefined();
    expect(toPercent(undefined, 1000)).toBeUndefined();
    expect(toPercent("200px", 1000)).toBe(20);
    expect(toPercent("200px", 0)).toBeUndefined();
  });

  it("resolves limits with defaults, clamps and a collapsed size not above min", () => {
    const [a, b, c] = resolveLimits(
      [
        {},
        { min: "250px", max: 40, collapsible: true, collapsedSize: "50px" },
        { min: 80, max: 20, collapsedSize: 90 },
      ],
      1000,
    );
    expect(a).toEqual({ min: 0, max: 100, collapsible: false, collapsedSize: 0 });
    expect(b).toEqual({ min: 25, max: 40, collapsible: true, collapsedSize: 5 });
    expect(c).toEqual({ min: 80, max: 80, collapsible: false, collapsedSize: 80 });
  });

  it("ignores pixel limits until the space is measured", () => {
    const [a] = resolveLimits([{ min: "250px", max: "500px", collapsedSize: "40px" }], 0);
    expect(a).toEqual({ min: 0, max: 100, collapsible: false, collapsedSize: 0 });
  });

  it("converts pointer movement to percent", () => {
    expect(deltaToPercent(100, 1000)).toBe(10);
    expect(deltaToPercent(100, 0)).toBe(0);
  });

  it("rounds to three decimals", () => {
    expect(round(33.33333)).toBe(33.333);
  });
});

describe("default and normalised sizes", () => {
  it("keeps given defaults and shares the rest equally", () => {
    expect(defaultSizesFor([20, undefined, undefined])).toEqual([20, 40, 40]);
    expect(defaultSizesFor([undefined, undefined])).toEqual([50, 50]);
    expect(defaultSizesFor([])).toEqual([]);
  });

  it("scales defaults that overflow 100 and treats invalid ones as open", () => {
    expect(defaultSizesFor([60, 60])).toEqual([50, 50]);
    expect(defaultSizesFor([-5, 50])).toEqual([50, 50]);
    expect(defaultSizesFor([100, undefined])).toEqual([100, 0]);
  });

  it("falls back on a wrong length and reports the correction", () => {
    expect(normaliseSizes([50, 50], 3, [30, 30, 40])).toEqual({
      sizes: [30, 30, 40],
      changed: true,
    });
    expect(normaliseSizes(undefined, 2, [50, 50])).toEqual({ sizes: [50, 50], changed: false });
  });

  it("scales a wrong sum and keeps a valid layout", () => {
    expect(normaliseSizes([1, 1], 2, [])).toEqual({ sizes: [50, 50], changed: true });
    expect(normaliseSizes([0, 0], 2, [])).toEqual({ sizes: [50, 50], changed: true });
    expect(normaliseSizes([25, 75], 2, [])).toEqual({ sizes: [25, 75], changed: false });
  });

  it("compares layouts to three decimals", () => {
    expect(sameSizes([33.3333, 66.6667], [33.3334, 66.6666])).toBe(true);
    expect(sameSizes([30, 70], [31, 69])).toBe(false);
    expect(sameSizes([50, 50], [50, 25, 25])).toBe(false);
  });
});

describe("effectiveLimits", () => {
  it("keeps both neighbours within their limits", () => {
    const limits = [panel({ min: 10, max: 60 }), panel({ min: 30 }), panel()];
    expect(effectiveLimits(0, [30, 40, 30], limits)).toEqual({ lo: 10, hi: 40, min: 10, max: 40 });
  });

  it("reaches the collapsed sizes of either neighbour", () => {
    const limits = [
      panel({ min: 20, collapsible: true, collapsedSize: 5 }),
      panel({ min: 20, collapsible: true }),
    ];
    expect(effectiveLimits(0, [50, 50], limits)).toEqual({ lo: 20, hi: 80, min: 5, max: 100 });
  });

  it("holds the boundary when the pair can't satisfy both panels", () => {
    const limits = [panel({ min: 60 }), panel({ min: 60 })];
    expect(effectiveLimits(0, [50, 50], limits)).toEqual({ lo: 50, hi: 50, min: 50, max: 50 });
  });

  it("returns the size itself for a missing pair", () => {
    expect(effectiveLimits(1, [50, 50], [free, free])).toEqual({
      lo: 50,
      hi: 50,
      min: 50,
      max: 50,
    });
  });
});

describe("resizePair", () => {
  const three = [panel({ min: 10, max: 60 }), panel({ min: 10 }), panel()];

  it("moves only the two neighbours and clamps at the limits", () => {
    expect(resizePair([30, 40, 30], 0, 35, three, "key")).toEqual([35, 35, 30]);
    expect(resizePair([30, 40, 30], 0, 99, three, "key")).toEqual([60, 10, 30]);
    expect(resizePair([30, 40, 30], 0, -5, three, "drag")).toEqual([10, 60, 30]);
    expect(resizePair([30, 40, 30], 2, 50, three, "key")).toEqual([30, 40, 30]);
  });

  const collapsible = [panel({ min: 20, collapsible: true, collapsedSize: 4 }), panel()];

  it("drag snaps to collapsed past halfway between collapsed and min", () => {
    expect(resizePair([50, 50], 0, 13, collapsible, "drag")).toEqual([20, 80]);
    expect(resizePair([50, 50], 0, 11, collapsible, "drag")).toEqual([4, 96]);
    expect(resizePair([4, 96], 0, 12.5, collapsible, "drag")).toEqual([20, 80]);
  });

  it("key stops at min first, then collapses; a step out of collapsed jumps to min", () => {
    expect(resizePair([21, 79], 0, 11, collapsible, "key")).toEqual([20, 80]);
    expect(resizePair([20, 80], 0, 19, collapsible, "key")).toEqual([4, 96]);
    expect(resizePair([4, 96], 0, 3, collapsible, "key")).toEqual([4, 96]);
    expect(resizePair([4, 96], 0, 5, collapsible, "key")).toEqual([20, 80]);
  });

  it("collapses the next panel symmetrically", () => {
    const next = [panel(), panel({ min: 20, collapsible: true })];
    expect(resizePair([79, 21], 0, 90, next, "key")).toEqual([80, 20]);
    expect(resizePair([80, 20], 0, 81, next, "key")).toEqual([100, 0]);
    expect(resizePair([100, 0], 0, 99, next, "key")).toEqual([80, 20]);
    expect(resizePair([50, 50], 0, 95, next, "drag")).toEqual([100, 0]);
    expect(resizePair([50, 50], 0, 85, next, "drag")).toEqual([80, 20]);
    expect(resizePair([50, 50], 0, 100, next, "exact")).toEqual([100, 0]);
    expect(resizePair([50, 50], 0, 95, next, "exact")).toEqual([80, 20]);
  });

  it("exact mode reaches the collapsed size only when asked for it", () => {
    expect(resizePair([50, 50], 0, 4, collapsible, "exact")).toEqual([4, 96]);
    expect(resizePair([50, 50], 0, 10, collapsible, "exact")).toEqual([20, 80]);
  });
});

describe("collapse and expand", () => {
  const limits = [panel({ min: 20, collapsible: true }), panel({ min: 10 }), panel()];

  it("picks the handle after a panel, or before the last one", () => {
    expect(handleFor(0, 3)).toBe(0);
    expect(handleFor(1, 3)).toBe(1);
    expect(handleFor(2, 3)).toBe(1);
  });

  it("collapses a collapsible panel into its neighbour", () => {
    const out = collapsePanel([30, 40, 30], 0, limits);
    expect(out).toEqual([0, 70, 30]);
    expect(isCollapsed(out[0] ?? -1, limits[0] ?? free)).toBe(true);
  });

  it("leaves a panel that can't collapse unchanged", () => {
    expect(collapsePanel([30, 40, 30], 1, limits)).toEqual([30, 40, 30]);
    const blocked = [panel({ collapsible: true }), panel({ max: 50 })];
    expect(collapsePanel([50, 50], 0, blocked)).toEqual([50, 50]);
  });

  it("collapses the last panel through the handle before it", () => {
    const last = [panel(), panel({ collapsible: true })];
    expect(collapsePanel([60, 40], 1, last)).toEqual([100, 0]);
    expect(setPanelSize([60, 40], 1, 30, last)).toEqual([70, 30]);
    expect(setPanelSize([100], 0, 30, [free])).toEqual([100]);
  });

  it("expands to a target, at least min, as far as the neighbour allows", () => {
    expect(expandPanel([0, 70, 30], 0, 30, limits)).toEqual([30, 40, 30]);
    expect(expandPanel([0, 70, 30], 0, 5, limits)).toEqual([20, 50, 30]);
    expect(expandPanel([0, 70, 30], 0, 90, limits)).toEqual([60, 10, 30]);
    expect(expandPanel([0, 70, 30], 5, 90, limits)).toEqual([0, 70, 30]);
  });

  it("only a collapsible panel at its collapsed size is collapsed", () => {
    expect(isCollapsed(0, panel())).toBe(false);
    expect(isCollapsed(0, panel({ collapsible: true }))).toBe(true);
    expect(isCollapsed(2, panel({ collapsible: true }))).toBe(false);
  });
});

describe("fitSizes", () => {
  it("pulls every pair back within its limits", () => {
    const limits = [panel({ min: 25 }), panel({ min: 10 }), panel({ min: 20 })];
    expect(fitSizes([10, 80, 10], limits)).toEqual([25, 55, 20]);
  });

  it("keeps a valid layout as it is", () => {
    expect(fitSizes([30, 40, 30], [free, free, free])).toEqual([30, 40, 30]);
  });
});

describe("keyToDelta", () => {
  it("uses Left / Right in a horizontal layout and flips them in right-to-left text", () => {
    expect(keyToDelta("ArrowRight", false, false, "horizontal", 1, 10)).toBe(1);
    expect(keyToDelta("ArrowLeft", false, false, "horizontal", 1, 10)).toBe(-1);
    expect(keyToDelta("ArrowRight", true, false, "horizontal", 1, 10)).toBe(10);
    expect(keyToDelta("ArrowRight", false, true, "horizontal", 1, 10)).toBe(-1);
    expect(keyToDelta("ArrowLeft", false, true, "horizontal", 1, 10)).toBe(1);
    expect(keyToDelta("ArrowUp", false, false, "horizontal", 1, 10)).toBeNull();
  });

  it("uses Up / Down in a vertical layout", () => {
    expect(keyToDelta("ArrowDown", false, false, "vertical", 2, 10)).toBe(2);
    expect(keyToDelta("ArrowUp", true, true, "vertical", 2, 10)).toBe(-10);
    expect(keyToDelta("ArrowLeft", false, false, "vertical", 2, 10)).toBeNull();
  });

  it("maps Page keys, Home, End and Enter", () => {
    expect(keyToDelta("PageUp", false, false, "horizontal", 1, 10)).toBe(10);
    expect(keyToDelta("PageDown", false, false, "vertical", 1, 10)).toBe(-10);
    expect(keyToDelta("Home", false, false, "horizontal", 1, 10)).toBe("min");
    expect(keyToDelta("End", false, false, "horizontal", 1, 10)).toBe("max");
    expect(keyToDelta("Enter", false, false, "horizontal", 1, 10)).toBe("toggle");
    expect(keyToDelta("a", false, false, "horizontal", 1, 10)).toBeNull();
  });
});
