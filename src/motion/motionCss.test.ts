import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import source from "../tokens/tokens.json";

const read = (path: string) => readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** The motion core, bundled in styles.css. */
const core = read("src/styles/motion.css");
/** The opt-in ol-motion-* classes, a separate stylesheet. */
const extras = read("src/styles/motion-extras.css");
/** Both, in load order: most rules hold for the whole motion layer. */
const css = `${core}\n${extras}`;

/** The body of the block that starts at `start` (the index of its opening brace). */
function blockAt(text: string, start: number): string {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start + 1, i);
    }
  }
  throw new Error("Unbalanced braces");
}

/** Every at-rule block with this prelude pattern in `text`, as [prelude, body]. */
function atRulesIn(text: string, pattern: RegExp): [string, string][] {
  return [...text.matchAll(pattern)].map((match) => {
    const open = text.indexOf("{", match.index);
    return [match[0], blockAt(text, open)];
  });
}

function atRules(pattern: RegExp): [string, string][] {
  return atRulesIn(css, pattern);
}

/** The body of the first rule (top level or nested) whose whole selector is `selector`. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\n/g, "\\n\\s*");
  const match = new RegExp(`(?:^|\\n\\n|\\{\\n)[ ]*${escaped} \\{`).exec(css);
  if (!match) throw new Error(`No rule for ${selector}`);
  return blockAt(css, match.index + match[0].length - 1);
}

const keyframes = atRules(/@keyframes\s+([\w-]+)\s*\{/g);
const declarations = (body: string) =>
  [...body.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g)].map(([, property = "", value = ""]) => [
    property,
    value.trim(),
  ]);

const ANIMATABLE = new Set([
  "opacity",
  "transform",
  "clip-path",
  "stroke-dashoffset",
  "animation-timing-function",
]);
const ROTATING = /^@keyframes\s+ol-shishi-/;
const OPT_IN = ["byobu", "noren", "kumiko", "shishi", "sumi", "shoji", "origami"];

/** Every at-rule body matching the pattern, joined (a block may be split across both files). */
function allBodies(pattern: RegExp): string {
  return atRules(pattern)
    .map(([, body]) => body)
    .join("\n");
}

describe("motion.css and motion-extras.css", () => {
  it("keeps the opt-in classes out of the core and the core out of the extras", () => {
    const optIn = [...core.matchAll(/\.ol-motion-([\w-]+)/g)].map(([, name]) => name);
    for (const name of optIn)
      expect(name, `.ol-motion-${String(name)}`).toMatch(/^(shoji|paused)$/);

    const coreClasses = [
      "ol-johakyu",
      "ol-draw",
      "ol-stagger",
      "ol-shodo",
      "ol-enso",
      "ol-mokuhanga",
      "ol-print-block",
      "ol-kintsugi",
      "ol-hanko",
      "ol-stamp",
      "ol-kakejiku",
      "ol-ink-wipe",
      "ol-indicator",
      "ol-vt-morph",
      "ol-motion-shoji",
    ];
    for (const name of coreClasses) {
      expect(extras, name).not.toMatch(new RegExp(`\\.${name}(?![\\w-])|\\.${name}__`));
    }
    for (const name of ["byobu", "noren", "kumiko", "shishi", "sumi", "origami"]) {
      expect(extras).toContain(`.ol-motion-${name}`);
    }
    expect(extras).toMatch(/@property --ol-noren-inner/);
    expect(core).not.toMatch(/--ol-noren-/);
  });

  it("animates only transform, opacity, clip-path, stroke-dashoffset and its own properties", () => {
    expect(keyframes.length).toBeGreaterThan(30);
    for (const [name, body] of keyframes) {
      for (const [property] of declarations(body)) {
        const allowed = ANIMATABLE.has(property ?? "") || property?.startsWith("--ol-");
        expect(allowed, `${name}: ${String(property)}`).toBe(true);
      }
    }
  });

  it("transitions only paint-level properties", () => {
    const allowed = /^(transform|opacity|clip-path|stroke-dashoffset|color|--ol-[\w-]+)$/;
    for (const [property, value] of declarations(css)) {
      if (property !== "transition" && property !== "transition-property") continue;
      if (/^none(\s*!important)?$/.test(value ?? "")) continue;
      for (const part of (value ?? "").split(/,(?![^(]*\))/)) {
        const animated = part.trim().split(/\s+/)[0] ?? "";
        expect(animated, part).toMatch(allowed);
      }
    }
  });

  it("never scales past 1.02, and rotates only in byōbu, shishi-odoshi and origami", () => {
    for (const [property, value = ""] of declarations(css)) {
      if (property !== "transform") continue;
      for (const [, amount = ""] of value.matchAll(/scale[XY]?\(([^)]+)\)/g)) {
        if (amount.startsWith("var(")) continue;
        expect(Number(amount), value).toBeLessThanOrEqual(1.02);
      }
    }
    expect(css).toMatch(/--ol-motion-stamp-scale:\s*1\.02;/);

    for (const [name, body] of keyframes) {
      if (body.includes("rotate")) expect(name).toMatch(ROTATING);
    }
    const rotating = [...css.matchAll(/([^{}]+)\{[^{}]*rotate[^{}]*\}/g)]
      .map(([, selector = ""]) => selector.trim())
      .filter((selector) => !/^(from|to|\d)/.test(selector));
    for (const selector of rotating) {
      expect(selector).toMatch(/ol-motion-(byobu|shishi|origami)/);
    }
  });

  it("uses tokens for every duration and curve", () => {
    const times = [...css.matchAll(/(?<![\w.-])(\d*\.?\d+)m?s\b/g)].map(([time]) => time);
    expect(new Set(times)).toEqual(new Set(["1ms", "0ms"]));
    for (const [, x1, y1, x2, y2] of css.matchAll(
      /cubic-bezier\(\s*([\d.]+),\s*([\d.-]+),\s*([\d.]+),\s*([\d.-]+)\s*\)/g,
    )) {
      for (const y of [y1, y2]) {
        expect(
          Number(y),
          `cubic-bezier(${String(x1)}, ${String(y1)}, ${String(x2)}, ${String(y2)})`,
        ).toBeGreaterThanOrEqual(0);
        expect(Number(y)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("drops every duration to 1ms and stops the loops under reduced motion", () => {
    const blocks = atRules(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g).map(
      ([, body]) => body,
    );
    const all = blocks.join("\n");
    for (const token of ["dur-s", "dur-m", "dur-l", "dur-xl"]) {
      expect(all).toMatch(new RegExp(`--${token}:\\s*1ms;`));
    }
    expect(all).toMatch(/--stagger:\s*0ms;/);
    for (const loop of [
      "ol-enso__stroke",
      "ol-motion-kumiko::before",
      "ol-motion-shishi__tube",
      "ol-motion-shishi__drip",
    ]) {
      expect(all).toContain(loop);
    }
    expect(all).toMatch(/::view-transition-group\(\*\)/);
    expect(all).toMatch(/animation:\s*none\s*!important/);

    const island = blockAt(css, css.indexOf("{", css.indexOf(".ol-reduce-motion {")));
    expect(island).toMatch(/--dur-xl:\s*1ms;/);
  });

  it("names every opt-in class ol-motion-<name> and gives each an @supports fallback", () => {
    const supports = atRules(/@supports[^{]+\{/g)
      .map(([prelude, body]) => prelude + body)
      .join("\n");
    for (const name of OPT_IN) {
      expect(css).toContain(`.ol-motion-${name}`);
      expect(supports, name).toContain(`ol-motion-${name}`);
    }
  });

  it("leaves jo-ha-kyū's cubic-bezier fallback to tokens.css, in step with tokens.json", () => {
    const move = source.motion.tokens.find((token) => token.name === "ease-move");
    const fallback = move && "fallback" in move ? move.fallback : "";
    expect(fallback).toBe("cubic-bezier(0.6, 0, 0.75, 0.45)");
    expect(css).not.toMatch(/--ease-move\s*:/);
    const tokensCss = readFileSync("src/styles/tokens.css", "utf8");
    const [, body = ""] =
      atRulesIn(tokensCss, /@supports\s+not\s*\(transition-timing-function:\s*linear\(/g)[0] ?? [];
    expect(body).toContain(`--ease-move: ${fallback};`);
  });

  it("writes no literal z-index", () => {
    for (const [property, value = ""] of declarations(css)) {
      if (property === "z-index") expect(value).toMatch(/var\(--z-/);
    }
  });

  it("lets the kakejiku rod be omitted and hangs it outside the moving edge", () => {
    expect(rule(".ol-kakejiku--rodless::after")).toMatch(/content:\s*none/);
    expect(rule(".ol-kakejiku::after")).toContain("calc(var(--stroke-heavy) * -1)");
    expect(rule('.ol-kakejiku[data-side="top"]::after')).toContain(
      "inset: calc(var(--stroke-heavy) * -1)",
    );
    expect(rule(".ol-kakejiku--from-right::after")).toContain("calc(var(--stroke-heavy) * -1)");
    expect(rule(".ol-kakejiku--from-left::after")).toContain("calc(var(--stroke-heavy) * -1)");
  });

  it("gives every shishi-odoshi loop a curve; only the drip runs linear", () => {
    for (const part of ["tube", "knock", "fill"]) {
      expect(rule(`.ol-motion-shishi__${part}`), part).toMatch(/animation:[^;]*var\(--ease-/);
    }
    expect(rule(".ol-motion-shishi__drip")).toMatch(/animation:[^;]*\blinear\b/);
  });

  it("clips the ink-wipe copy exactly like the fill, in both directions and in RTL", () => {
    for (const [ink, dir, name] of [
      ["enter", "forward", "ol-ink-in-from-left"],
      ["enter", "back", "ol-ink-in-from-right"],
      ["leave", "forward", "ol-ink-out-to-right"],
      ["leave", "back", "ol-ink-out-to-left"],
    ]) {
      const base = `.ol-ink-wipe[data-ink="${String(ink)}"][data-ink-dir="${String(dir)}"]`;
      const body = rule(`${base}::before,\n${base} > .ol-ink-wipe__ink`);
      expect(body).toContain(String(name));
      expect(css).toContain(`${base}:dir(rtl) > .ol-ink-wipe__ink`);
    }
    // With the copy, the label itself keeps its colour.
    expect(css).toMatch(/:not\(:where\(:has\(> \.ol-ink-wipe__ink\)\)\)\s*\{\s*color:/);
  });

  it("follows forced colours: Highlight bar and selection, origami shows the real text", () => {
    const body = allBodies(/@media\s*\(forced-colors:\s*active\)\s*\{/g);
    expect(body).toMatch(/\.ol-indicator\s*\{[^}]*forced-color-adjust:\s*none;[^}]*Highlight/);
    expect(body).toMatch(/\.ol-ink-wipe::before[^{]*\{[^}]*background:\s*Highlight/);
    expect(body).toMatch(/HighlightText/);
    expect(body).toMatch(/\.ol-motion-origami__sheet\s*\{\s*display:\s*none/);
    expect(body).toMatch(/-webkit-text-fill-color:\s*currentcolor/);
  });

  it("inks origami with currentcolor and never with a captured colour", () => {
    expect(css).not.toContain("--ol-origami-ink");
    expect(rule(".ol-motion-origami[data-origami]")).toMatch(
      /-webkit-text-fill-color:\s*transparent/,
    );
    expect(rule(".ol-motion-origami__sheet")).toMatch(/-webkit-text-fill-color:\s*currentcolor/);
    expect(rule('.ol-motion-origami[data-origami="done"]')).toMatch(
      /-webkit-text-fill-color:\s*currentcolor/,
    );
  });

  /** Selectors of the rule that sets animation-play-state: paused. */
  function pauseSelectors(): string[] {
    const rules = css.matchAll(/([^{}]+)\{\s*animation-play-state:\s*paused !important;\s*\}/g);
    return [...rules].flatMap(([, selectors = ""]) =>
      selectors
        .split(/,(?![^(]*\))/)
        .map((selector) => selector.trim())
        .filter(Boolean),
    );
  }

  it("pauses only the wait loops under .ol-motion-paused", () => {
    const selectors = pauseSelectors();
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector).not.toContain("*");
      expect(selector).toMatch(/\.ol-(enso__(stroke|echo)|motion-shishi__\w+|motion-kumiko)/);
    }
  });

  it("does not pause a one-shot entrance or exit under .ol-motion-paused", () => {
    document.body.innerHTML = `
      <div class="ol-motion-paused">
        <section class="ol-johakyu"><div class="ol-johakyu__ha"></div></section>
        <ul class="ol-stagger"><li></li></ul>
        <div class="ol-kakejiku" data-state="closing"></div>
        <button class="ol-ink-wipe" data-ink="enter"></button>
        <svg><path class="ol-enso__stroke"></path></svg>
        <div class="ol-motion-kumiko"></div>
      </div>
      <div class="ol-enso__echo" data-motion="paused"></div>`;
    const matched = (node: Element) =>
      pauseSelectors().some((selector) => node.matches(selector.replace(/::(before|after)$/, "")));
    for (const selector of [
      ".ol-motion-paused",
      ".ol-johakyu",
      ".ol-johakyu__ha",
      ".ol-stagger > li",
      ".ol-kakejiku",
      ".ol-ink-wipe",
    ]) {
      const node = document.querySelector(selector);
      expect(node && matched(node), selector).toBe(false);
    }
    for (const selector of [".ol-enso__stroke", ".ol-motion-kumiko", ".ol-enso__echo"]) {
      const node = document.querySelector(selector);
      expect(node && matched(node), selector).toBe(true);
    }
    document.body.innerHTML = "";
  });

  it("plays kumiko and the ensō once outside a live wait", () => {
    const kumiko = rule(".ol-motion-kumiko::before,\n.ol-motion-kumiko::after");
    expect(kumiko).not.toContain("infinite");
    expect(css).toMatch(
      /\.ol-motion-kumiko:is\(\[aria-busy="true"\], \[role="status"\]\)::after\s*\{\s*animation-iteration-count:\s*infinite/,
    );
    expect(rule(".ol-enso__stroke,\n.ol-enso__echo")).not.toContain("infinite");
    expect(css).toMatch(
      /:is\(\[aria-busy="true"\], \[role="status"\]\) :is\(\.ol-enso__stroke, \.ol-enso__echo\)\s*\{\s*animation-iteration-count:\s*infinite/,
    );
  });

  it("gives the ink-wipe focus ring a system colour and prints the ink", () => {
    const forced = allBodies(/@media\s*\(forced-colors:\s*active\)\s*\{/g);
    expect(forced).toMatch(/\.ol-ink-wipe:focus-visible\s*\{\s*outline-color:\s*CanvasText/);
    const print = allBodies(/@media\s+print\s*\{/g);
    expect(print).toMatch(/\.ol-ink-wipe__ink\s*\{\s*print-color-adjust:\s*exact/);
  });

  it("keeps the shishi-odoshi SVG geometry in local custom properties", () => {
    const geometry = rule(".ol-motion-shishi");
    for (const name of ["drops", "drop-step", "pivot", "spout"]) {
      expect(geometry).toContain(`--ol-shishi-${name}:`);
    }
    for (const part of ["drip", "tube", "fill"]) {
      expect(rule(`.ol-motion-shishi__${part}`)).not.toMatch(/\d+px|dasharray:\s*\d/);
    }
  });

  it("prints everything in its end state", () => {
    const body = allBodies(/@media\s+print\s*\{/g);
    expect(body).toMatch(/animation:\s*none !important/);
    expect(body).toMatch(/transition:\s*none !important/);
  });

  it("draws the noren strip edges only while it moves", () => {
    const edges = rule(".ol-motion-noren::before");
    expect(edges).toMatch(/opacity:\s*0/);
    expect(edges).toContain("var(--ol-noren-inner)");
    expect(edges).toContain("var(--ol-noren-outer)");
    expect(css).toMatch(/@keyframes ol-noren-edges/);
  });

  it("honours an in-app reduce-motion class on the origami element itself", () => {
    expect(css).toContain(".ol-reduce-motion.ol-motion-origami");
  });
});
