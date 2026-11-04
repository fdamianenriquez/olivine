import { describe, expect, it } from "vitest";

import {
  clampInt,
  dayPeriodNames,
  defaultHourCycle,
  formatHour,
  from12,
  hoursOf,
  nearest,
  periodOf,
  stepThrough,
  to12,
  toTimeString,
} from "./time";

describe("time helpers", () => {
  it("defaults the hour cycle by language", () => {
    expect(defaultHourCycle("en")).toBe(12);
    expect(defaultHourCycle("en-US")).toBe(12);
    expect(defaultHourCycle("en-GB")).toBe(24);
    expect(defaultHourCycle("es")).toBe(24);
    expect(defaultHourCycle("es-MX")).toBe(24);
    expect(defaultHourCycle("ja")).toBe(24);
  });

  it("converts between 24 h and 12 h", () => {
    expect([0, 1, 11, 12, 13, 23].map(to12)).toEqual([12, 1, 11, 12, 1, 11]);
    expect(periodOf(11)).toBe("AM");
    expect(periodOf(12)).toBe("PM");
    expect(from12(12, "AM")).toBe(0);
    expect(from12(12, "PM")).toBe(12);
    expect(from12(2, "PM")).toBe(14);
    expect(formatHour(14, 12)).toBe("2");
    expect(formatHour(14, 24)).toBe("14");
    expect(formatHour(2, 24)).toBe("02");
    expect(toTimeString({ h: 9, m: 5 })).toBe("09:05");
  });

  it("names the day periods of a language", () => {
    expect(dayPeriodNames("en-US")).toEqual({ AM: "AM", PM: "PM" });
    expect(dayPeriodNames("ja")).toEqual({ AM: "午前", PM: "午後" });
    expect(dayPeriodNames("es-MX").AM).toMatch(/a\.\s?m\./i);
  });

  it("lists the hours of a period", () => {
    expect(hoursOf("AM")).toHaveLength(12);
    expect(hoursOf("PM")[0]).toBe(12);
  });

  it("steps through a cycle, wrapping and skipping disallowed entries", () => {
    const cycle = [0, 1, 2, 3];
    expect(stepThrough(cycle, 3, 1)).toBe(0);
    expect(stepThrough(cycle, 0, -1)).toBe(3);
    expect(stepThrough(cycle, 1, 1, (n) => n !== 2)).toBe(3);
    expect(stepThrough(cycle, null, 1)).toBe(0);
    expect(stepThrough(cycle, null, -1)).toBe(3);
    expect(stepThrough(cycle, 1, 1, () => false)).toBeNull();
  });

  it("finds the nearest allowed value", () => {
    expect(nearest([1, 2, 3, 4], 1, (n) => n >= 3)).toBe(3);
    expect(nearest([1, 2], 1, () => false)).toBeNull();
  });

  it("clamps to whole numbers", () => {
    expect(clampInt(7.9, 0, 23, 0)).toBe(7);
    expect(clampInt(99, 0, 23, 0)).toBe(23);
    expect(clampInt(undefined, 0, 23, 5)).toBe(5);
    expect(clampInt(Number.NaN, 1, 60, 5)).toBe(5);
  });
});
