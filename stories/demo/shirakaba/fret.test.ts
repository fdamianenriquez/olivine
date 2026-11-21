import { describe, expect, it } from "vitest";

import { STAGES } from "./data";
import { fretAt, fretMid, fretPct, fretSpan, pinnedProgress, weekAt } from "./fret";

describe("fretAt", () => {
  it("puts the nut at 0 and the octave at the end of the board", () => {
    expect(fretAt(0)).toBe(0);
    expect(fretAt(12)).toBeCloseTo(1, 12);
  });

  it("follows 2·(1 − 2^(−n/12)): frets crowd together toward the body", () => {
    expect(fretAt(1)).toBeCloseTo(2 * (1 - Math.pow(2, -1 / 12)), 12);
    const gaps = Array.from({ length: 12 }, (_, i) => fretAt(i + 1) - fretAt(i));
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThan(gaps[i - 1] ?? 0);
    // Seven semitones: 2·(1 − 2^(−7/12)) ≈ 0.665 of the octave length.
    expect(fretAt(7)).toBeCloseTo(0.665, 3);
  });

  it("moves in semitones: a fractional fret lies between its neighbours", () => {
    expect(fretAt(4.5)).toBeGreaterThan(fretAt(4));
    expect(fretAt(4.5)).toBeLessThan(fretAt(5));
  });
});

describe("css helpers", () => {
  it("formats a fret as a percentage with three decimals", () => {
    expect(fretPct(0)).toBe("0.000%");
    expect(fretPct(12)).toBe("100.000%");
  });

  it("describes the span between two frets and the middle of one space", () => {
    expect(fretSpan(3, 4)).toEqual({
      start: fretPct(2),
      size: `calc(${fretPct(4)} - ${fretPct(2)})`,
    });
    expect(fretSpan(5).start).toBe(fretPct(4));
    expect(fretMid(12)).toBe(`calc((${fretPct(11)} + ${fretPct(12)}) / 2)`);
  });
});

describe("pinnedProgress and weekAt", () => {
  it("is 0 before the section pins and 1 when it releases", () => {
    expect(pinnedProgress(200, 2700, 900)).toBe(0);
    expect(pinnedProgress(0, 2700, 900)).toBe(0);
    expect(pinnedProgress(-900, 2700, 900)).toBeCloseTo(0.5);
    expect(pinnedProgress(-1800, 2700, 900)).toBe(1);
    expect(pinnedProgress(-5000, 2700, 900)).toBe(1);
  });

  it("does not divide by zero when the section is not taller than the viewport", () => {
    expect(pinnedProgress(-10, 900, 900)).toBe(0);
  });

  it("maps progress to weeks 1 to 12", () => {
    expect(weekAt(0)).toBe(1);
    expect(weekAt(0.01)).toBe(1);
    expect(weekAt(0.5)).toBe(6);
    expect(weekAt(1)).toBe(12);
  });

  it("covers every week with exactly one stage", () => {
    for (let week = 1; week <= 12; week++) {
      expect(STAGES.filter((s) => week >= s.from && week <= s.to)).toHaveLength(1);
    }
  });
});
