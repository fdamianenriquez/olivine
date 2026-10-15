import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { tokens } from ".";
import source from "./tokens.json";

const css = readFileSync("src/styles/tokens.css", "utf8");

/** Custom properties declared in the first rule whose selector list starts with `selector`. */
function declared(selector: string): Set<string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return new Set([...body.matchAll(/--([\w-]+):/g)].map((m) => m[1] ?? ""));
}

describe("tokens", () => {
  it("exports every colour token from tokens.json with a value per theme", () => {
    expect(Object.keys(tokens.color)).toEqual(source.color.tokens.map((t) => t.name));
    for (const value of Object.values(tokens.color)) {
      expect(value.washi).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
      expect(value.sumi).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
    }
  });

  it("declares every colour in both themes and in the auto theme", () => {
    const names = source.color.tokens.map((t) => t.name);
    const washi = declared(':root,\n[data-theme="washi"]');
    const sumi = declared('[data-theme="sumi"]');
    const auto = declared("@media (prefers-color-scheme: dark)");
    for (const name of names) {
      expect(washi).toContain(name);
      expect(sumi).toContain(name);
      expect(auto).toContain(name);
    }
  });

  it("declares every scale and type style as a custom property", () => {
    const scalars = declared(":root {");
    for (const group of [source.spacing, source.radius, source.stroke, source.control]) {
      for (const token of group.tokens) expect(scalars).toContain(token.name);
    }
    for (const style of Object.keys(tokens.text)) {
      for (const part of ["family", "size", "leading", "weight", "tracking"]) {
        expect(scalars).toContain(`text-${style}-${part}`);
      }
    }
  });
});
