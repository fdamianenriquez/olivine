import { describe, expect, it } from "vitest";

import { byId, DEFAULT_CONFIG, EXTRAS, FINISHES, MODELS, quote, yen } from "./data";

describe("quote", () => {
  it("prices the default build: base, included options and the hard case", () => {
    const q = quote(DEFAULT_CONFIG);
    expect(q.subtotal).toBe(420000 + EXTRAS.case);
    expect(q.tax).toBe(45800);
    expect(q.total).toBe(503800);
    expect(q.weeks).toBe(12);
  });

  it("lists one line per priced option and skips the case and engraving when absent", () => {
    const q = quote({ ...DEFAULT_CONFIG, case: false });
    expect(q.lines.map(([label]) => label)).toEqual([
      "Model · Norikura",
      "Body · Alder",
      "Finish · Olive",
      "Neck · Maple",
      "Fretboard · Same as the neck",
      "Pickups · S · S · S",
      "Hardware · Chrome",
    ]);
    expect(q.subtotal).toBe(420000);
  });

  it("adds each extra only when chosen", () => {
    const base = quote({ ...DEFAULT_CONFIG, case: false });
    const engraved = quote({ ...DEFAULT_CONFIG, case: false, engraving: "Hana" });
    expect(engraved.subtotal - base.subtotal).toBe(EXTRAS.engraving);
    expect(engraved.lines.at(-1)).toEqual(["Heel engraving", EXTRAS.engraving]);
    // Blank engraving is not charged.
    expect(quote({ ...DEFAULT_CONFIG, case: false, engraving: "   " }).subtotal).toBe(
      base.subtotal,
    );
  });

  it("sums the option prices of a fully loaded build", () => {
    const q = quote({
      ...DEFAULT_CONFIG,
      model: "kaichi",
      wood: "mahogany",
      finish: "kakishibu",
      neck: "roasted",
      board: "ebony",
      pickups: "hh",
      hardware: "aged",
      engraving: "白樺",
    });
    const expected =
      490000 + 45000 + 25000 + 28000 + 18000 + 16000 + 14000 + EXTRAS.case + EXTRAS.engraving;
    expect(q.subtotal).toBe(expected);
    expect(q.tax).toBe(Math.round(expected * 0.1));
    expect(q.total).toBe(expected + q.tax);
  });

  it("takes 30 % of the total as the deposit and rounds to whole yen", () => {
    const q = quote({ ...DEFAULT_CONFIG, case: false, finish: "natural" });
    expect(q.deposit).toBe(Math.round(q.total * 0.3));
    expect(Number.isInteger(q.deposit)).toBe(true);
    expect(q.deposit).toBeLessThan(q.total);
  });

  it("adds the weeks of slow finishes and woods to the model's lead time", () => {
    expect(quote({ ...DEFAULT_CONFIG, finish: "kakishibu" }).weeks).toBe(12 + 2);
    expect(quote({ ...DEFAULT_CONFIG, neck: "roasted" }).weeks).toBe(12 + 1);
    expect(
      quote({ ...DEFAULT_CONFIG, model: "kaichi", finish: "kakishibu", neck: "roasted" }).weeks,
    ).toBe(14 + 2 + 1);
  });

  it("is pure: the same config gives the same quote and the input is untouched", () => {
    const cfg = { ...DEFAULT_CONFIG };
    expect(quote(cfg)).toEqual(quote(cfg));
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });
});

describe("byId and yen", () => {
  it("falls back to the first entry for an unknown id", () => {
    expect(byId(MODELS, "nope")).toBe(MODELS[0]);
    expect(byId(FINISHES, "kakishibu").weeks).toBe(2);
  });

  it("formats yen with thousands separators", () => {
    expect(yen(503800)).toBe("¥503,800");
    expect(yen(0)).toBe("¥0");
  });
});
