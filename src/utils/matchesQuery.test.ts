import { describe, expect, it } from "vitest";

import { matchesQuery } from "./matchesQuery";

describe("matchesQuery", () => {
  it("matches anywhere, ignoring case and accents", () => {
    expect(matchesQuery("Árbol de olivo", "OLIV", "es")).toBe(true);
    expect(matchesQuery("Árbol de olivo", "arbol", "es")).toBe(true);
    expect(matchesQuery("Árbol", "pino", "es")).toBe(false);
  });

  it("folds width and katakana to hiragana", () => {
    expect(matchesQuery("トウキョウ", "とうきょう", "ja")).toBe(true);
    expect(matchesQuery("ＴＯＫＹＯ", "tokyo", "ja")).toBe(true);
    expect(matchesQuery("ﾄｳｷｮｳ", "とうきょう", "ja")).toBe(true);
  });

  it("treats an empty query as a match and a longer query as no match", () => {
    expect(matchesQuery("Oak", "  ")).toBe(true);
    expect(matchesQuery("Oak", "Oaks")).toBe(false);
  });
});
