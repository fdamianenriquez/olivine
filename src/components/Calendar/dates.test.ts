import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  compareDays,
  datePattern,
  dayOfWeekIndex,
  formatDateInput,
  formatEraYear,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  fromIsoDate,
  getWeekend,
  getWeekStart,
  intlTag,
  isBeforeDay,
  isJapanese,
  isOutOfBounds,
  isSameDay,
  isSameMonth,
  monthGrid,
  monthName,
  parseDateInput,
  startOfDay,
  startOfMonth,
  toIsoDate,
  weekdayNames,
} from "./dates";

const d = (year: number, month: number, date: number) => new Date(year, month - 1, date);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dates", () => {
  it("maps built-in names to Intl tags and passes other tags through", () => {
    expect(intlTag("en")).toBe("en-US");
    expect(intlTag("es")).toBe("es");
    expect(intlTag("ja")).toBe("ja-JP");
    expect(intlTag("de-DE")).toBe("de-DE");
    expect(isJapanese("ja")).toBe(true);
    expect(isJapanese("ja-JP-u-ca-japanese")).toBe(true);
    expect(isJapanese("en")).toBe(false);
  });

  it("does day and month arithmetic on local days", () => {
    expect(startOfDay(new Date(2026, 9, 22, 17, 45))).toEqual(d(2026, 10, 22));
    expect(startOfMonth(d(2026, 10, 22))).toEqual(d(2026, 10, 1));
    expect(addDays(d(2026, 10, 31), 1)).toEqual(d(2026, 11, 1));
    expect(addMonths(d(2026, 1, 31), 1)).toEqual(d(2026, 2, 28));
    expect(addMonths(d(2026, 3, 15), -14)).toEqual(d(2025, 1, 15));
    expect(addYears(d(2028, 2, 29), 1)).toEqual(d(2029, 2, 28));
  });

  it("compares days, ignoring the time", () => {
    expect(isSameDay(d(2026, 10, 22), new Date(2026, 9, 22, 23))).toBe(true);
    expect(isSameDay(d(2026, 10, 22), null)).toBe(false);
    expect(isSameMonth(d(2026, 10, 1), d(2026, 10, 31))).toBe(true);
    expect(isSameMonth(d(2026, 10, 1), d(2025, 10, 1))).toBe(false);
    expect(isSameMonth(undefined, d(2026, 10, 1))).toBe(false);
    expect(compareDays(d(2026, 10, 22), new Date(2026, 9, 22, 12))).toBe(0);
    expect(isBeforeDay(d(2026, 10, 21), d(2026, 10, 22))).toBe(true);
    expect(isBeforeDay(d(2026, 10, 22), d(2026, 10, 22))).toBe(false);
  });

  it("clamps to bounds and reports days outside them", () => {
    const min = d(2026, 10, 10);
    const max = d(2026, 10, 20);
    expect(clampDate(d(2026, 10, 1), min, max)).toEqual(min);
    expect(clampDate(d(2026, 10, 30), min, max)).toEqual(max);
    expect(clampDate(d(2026, 10, 15), min, max)).toEqual(d(2026, 10, 15));
    expect(clampDate(d(2026, 10, 15))).toEqual(d(2026, 10, 15));
    expect(isOutOfBounds(d(2026, 10, 9), min, max)).toBe(true);
    expect(isOutOfBounds(d(2026, 10, 21), min, max)).toBe(true);
    expect(isOutOfBounds(d(2026, 10, 20), min, max)).toBe(false);
    expect(isOutOfBounds(d(2026, 10, 20))).toBe(false);
  });

  it("writes and reads ISO days", () => {
    expect(toIsoDate(d(2026, 3, 7))).toBe("2026-03-07");
    expect(toIsoDate(null)).toBe("");
    expect(fromIsoDate("2026-03-07")).toEqual(d(2026, 3, 7));
    expect(fromIsoDate(" 2026-02-30 ")).toBeNull();
    expect(fromIsoDate("7/3/2026")).toBeNull();
  });

  it("reads the week start and weekend from Intl week info", () => {
    expect(getWeekStart("en")).toBe(0);
    expect(getWeekStart("es")).toBe(1);
    expect(getWeekStart("ja")).toBe(0);
    expect(getWeekStart("en-GB")).toBe(1);
    expect(getWeekend("en")).toEqual([6, 0]);
  });

  it("falls back when the engine has no week info", () => {
    vi.spyOn(Intl, "Locale").mockImplementation(function unsupported() {
      throw new RangeError("unsupported");
    });
    expect(getWeekStart("es")).toBe(1);
    expect(getWeekStart("en")).toBe(0);
    expect(getWeekStart("fr-FR")).toBe(1);
    expect(getWeekend("es")).toEqual([6, 0]);
  });

  it("uses the weekInfo getter of older engines", () => {
    vi.spyOn(Intl, "Locale").mockImplementation(function older() {
      return { weekInfo: { firstDay: 6, weekend: [5, 6] } } as unknown as Intl.Locale;
    });
    expect(getWeekStart("ar-EG")).toBe(6);
    expect(getWeekend("ar-EG")).toEqual([5, 6]);
  });

  it("lays out six weeks from the week start", () => {
    const sunday = monthGrid(d(2026, 10, 15), 0);
    expect(sunday).toHaveLength(6);
    expect(sunday.every((w) => w.length === 7)).toBe(true);
    expect(sunday[0]?.[0]).toEqual(d(2026, 9, 27));
    const monday = monthGrid(d(2026, 10, 15), 1);
    expect(monday[0]?.[0]).toEqual(d(2026, 9, 28));
    expect(monday[5]?.[6]).toEqual(d(2026, 11, 8));
    expect(dayOfWeekIndex(d(2026, 10, 22), 1)).toBe(3);
  });

  it("names months, weekdays and dates in the locale", () => {
    const oct = d(2026, 10, 22);
    expect(monthName(oct, "en")).toBe("October");
    expect(monthName(oct, "es", "short")).toBe("oct");
    expect(monthName(oct, "ja")).toBe("10月");
    expect(formatMonthYear(oct, "es")).toBe("octubre de 2026");
    expect(formatLongDate(oct, "en")).toBe("Thursday, October 22, 2026");
    expect(formatShortDate(oct, "en")).toBe("Thu, Oct 22");
    const names = weekdayNames("ja", 0);
    expect(names.map((n) => n.short).join("")).toBe("日月火水木金土");
    expect(names[0]).toEqual({ short: "日", long: "日曜日", day: 0 });
    expect(weekdayNames("es", 1)[6]).toEqual({ short: "dom", long: "domingo", day: 0 });
  });

  it("formats the Japanese era year", () => {
    expect(formatEraYear(d(2026, 10, 22))).toBe("令和8年");
    expect(formatEraYear(d(2019, 4, 30))).toBe("平成31年");
  });

  it("returns no era where the engine lacks the calendar", async () => {
    vi.resetModules();
    const fresh = await import("./dates");
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function unsupported() {
      throw new RangeError("unsupported");
    });
    expect(fresh.formatEraYear(d(2026, 10, 22))).toBe("");
  });

  describe("typed input", () => {
    it("derives the field pattern from the locale", () => {
      expect(datePattern("en")).toBe("MM/DD/YYYY");
      expect(datePattern("es")).toBe("DD/MM/YYYY");
      expect(datePattern("ja")).toBe("YYYY/MM/DD");
      expect(datePattern("de-DE")).toBe("DD.MM.YYYY");
    });

    it("formats a date in the pattern", () => {
      const oct = d(2026, 10, 4);
      expect(formatDateInput(oct, "en")).toBe("10/04/2026");
      expect(formatDateInput(oct, "es")).toBe("04/10/2026");
      expect(formatDateInput(oct, "ja")).toBe("2026/10/04");
      expect(formatDateInput(null, "en")).toBe("");
    });

    it("parses typed text in the locale's order, and ISO always", () => {
      expect(parseDateInput("10/04/2026", "en")).toEqual(d(2026, 10, 4));
      expect(parseDateInput("4-10-2026", "es")).toEqual(d(2026, 10, 4));
      expect(parseDateInput("2026/10/04", "ja")).toEqual(d(2026, 10, 4));
      expect(parseDateInput("2026-10-04", "en")).toEqual(d(2026, 10, 4));
      expect(parseDateInput("2026-10-04", "es")).toEqual(d(2026, 10, 4));
    });

    it("rejects text that isn't a real day", () => {
      expect(parseDateInput("", "en")).toBeNull();
      expect(parseDateInput("10/04", "en")).toBeNull();
      expect(parseDateInput("02/30/2026", "en")).toBeNull();
      expect(parseDateInput("13/13/2026", "es")).toBeNull();
      expect(parseDateInput("10/04/26", "en")).toBeNull();
      expect(parseDateInput("0099/01/01", "ja")).toEqual(
        new Date(new Date(99, 0, 1).setFullYear(99)),
      );
    });
  });
});
