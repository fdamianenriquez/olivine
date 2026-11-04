import { describe, expect, it } from "vitest";

import { rankMatch } from "./rankMatch";

describe("rankMatch", () => {
  it("matches every typed character in order, not side by side", () => {
    expect(rankMatch("Open project", "opj")?.indices).toEqual([0, 1, 8]);
    expect(rankMatch("Open project", "jpo")).toBeNull();
  });

  it("matches everything for an empty query and ignores spaces in it", () => {
    expect(rankMatch("Anything", "")).toEqual({ score: 0, indices: [] });
    expect(rankMatch("Anything", "  ")).toEqual({ score: 0, indices: [] });
    expect(rankMatch("New file", "new f")?.indices).toEqual([0, 1, 2, 4]);
  });

  it("ignores case and accents", () => {
    expect(rankMatch("Configuración", "CONFIGURACION")?.indices).toHaveLength(13);
  });

  it("folds katakana to hiragana and full-width Latin", () => {
    expect(rankMatch("ひらがな", "ヒラ")?.indices).toEqual([0, 1]);
    expect(rankMatch("Search", "ＳＥＡ")?.indices).toEqual([0, 1, 2]);
  });

  it("ranks the start of the text and of words above the middle", () => {
    const start = rankMatch("Settings", "se");
    const word = rankMatch("Open settings", "se");
    const middle = rankMatch("Reset", "se");
    expect(start?.score).toBeGreaterThan(word?.score ?? 0);
    expect(word?.score).toBeGreaterThan(middle?.score ?? 0);
  });

  it("ranks a contiguous run above a scattered match", () => {
    const run = rankMatch("Open project", "proj");
    const scattered = rankMatch("Print or object jam", "proj");
    expect(run?.score).toBeGreaterThan(scattered?.score ?? 0);
  });

  it("prefers word starts when the letters could match elsewhere", () => {
    expect(rankMatch("Go to file", "gtf")?.indices).toEqual([0, 3, 6]);
  });

  it("prefers the shorter text for the same match", () => {
    expect(rankMatch("Open", "op")?.score).toBeGreaterThan(
      rankMatch("Open recent", "op")?.score ?? 0,
    );
  });

  it("returns null when the query is longer than the text", () => {
    expect(rankMatch("ab", "abc")).toBeNull();
  });
});
