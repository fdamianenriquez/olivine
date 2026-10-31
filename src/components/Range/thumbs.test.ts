import { describe, expect, it } from "vitest";

import {
  clampPair,
  gapFor,
  limits,
  moveThumb,
  pickThumb,
  ratioOf,
  snap,
  topOfGrid,
  valueFromPointer,
} from "./thumbs";

const grid = { min: 0, max: 100, step: 1, gap: 0 };

describe("two-thumb arithmetic", () => {
  it("snaps to the step counted from min, without float noise", () => {
    const g = { min: 0.1, max: 1, step: 0.2 };
    expect(snap(0.38, g)).toBe(0.3);
    expect(snap(0.94, g)).toBe(0.9);
    expect(snap(5, g)).toBe(0.9);
    expect(snap(-5, g)).toBe(0.1);
    expect(snap(Number.NaN, g)).toBe(0.1);
    expect(snap(1e-7, { min: 0, max: 1, step: 1e-7 })).toBe(1e-7);
  });

  it("finds the top of the grid", () => {
    expect(topOfGrid({ min: 0, max: 10, step: 3 })).toBe(9);
    expect(topOfGrid({ min: 5, max: 5, step: 1 })).toBe(5);
    expect(topOfGrid({ min: 0, max: 1, step: 0.1 })).toBe(1);
  });

  it("rounds minDistance up to whole steps", () => {
    expect(gapFor(0, 5)).toBe(0);
    expect(gapFor(-3, 5)).toBe(0);
    expect(gapFor(12, 5)).toBe(15);
    expect(gapFor(10, 5)).toBe(10);
    expect(gapFor(0.25, 0.1)).toBe(0.3);
  });

  it("gives each thumb its own limits", () => {
    const g = { ...grid, gap: 10 };
    expect(limits(0, [20, 80], g)).toEqual([0, 70]);
    expect(limits(1, [20, 80], g)).toEqual([30, 100]);
    expect(limits(0, [0, 5], g)).toEqual([0, 0]);
    expect(limits(1, [95, 100], g)).toEqual([100, 100]);
  });

  it("moves one thumb without crossing", () => {
    expect(moveThumb(0, 90, [20, 80], grid)).toEqual([80, 80]);
    expect(moveThumb(1, 10, [20, 80], grid)).toEqual([20, 20]);
    expect(moveThumb(1, 50.4, [20, 80], grid)).toEqual([20, 50]);
  });

  it("sorts, snaps and spreads pairs", () => {
    expect(clampPair([80, 20], grid)).toEqual([20, 80]);
    expect(clampPair([-5, 500], grid)).toEqual([0, 100]);
    expect(clampPair([50, 52], { ...grid, gap: 10 })).toEqual([50, 60]);
    expect(clampPair([98, 99], { ...grid, gap: 10 })).toEqual([90, 100]);
    expect(clampPair([], grid)).toEqual([0, 100]);
  });

  it("maps values to ratios and pointers to values", () => {
    expect(ratioOf(25, grid)).toBe(0.25);
    expect(ratioOf(500, grid)).toBe(1);
    expect(ratioOf(5, { min: 5, max: 5 })).toBe(0);
    const rect = { left: 10, width: 112 };
    expect(valueFromPointer(10 + 6 + 30, rect, 12, false, grid)).toBe(30);
    expect(valueFromPointer(10 + 6 + 30, rect, 12, true, grid)).toBe(70);
    expect(valueFromPointer(0, rect, 12, false, grid)).toBe(0);
    expect(valueFromPointer(500, rect, 12, false, grid)).toBe(100);
    expect(valueFromPointer(50, { left: 0, width: 10 }, 12, false, grid)).toBe(0);
  });

  it("picks the nearest thumb and breaks ties", () => {
    expect(pickThumb(30, [20, 80], grid)).toBe(0);
    expect(pickThumb(70, [20, 80], grid)).toBe(1);
    expect(pickThumb(50, [20, 80], grid)).toBe(0);
    expect(pickThumb(60, [50, 50], grid)).toBe(1);
    expect(pickThumb(40, [50, 50], grid)).toBe(0);
    expect(pickThumb(50, [50, 50], grid)).toBeNull();
    expect(pickThumb(100, [100, 100], grid)).toBe(0);
    expect(pickThumb(0, [0, 0], grid)).toBe(1);
    expect(pickThumb(0, [0, 0], { min: 0, max: 0, step: 1, gap: 0 })).toBeNull();
  });
});
