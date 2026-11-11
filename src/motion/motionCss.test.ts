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
const ROTATING = /^@keyframes\s+ol-(shishi|fold)-/;
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

  it("never scales past 1.02, and rotates only in byōbu, shishi-odoshi, origami and the disclosure fold", () => {
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
      expect(selector).toMatch(/ol-motion-(byobu|shishi|origami)|ol-fold/);
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

  it("hangs the kakejiku rod outside the moving edge of horizontal unrolls only", () => {
    expect(css).not.toMatch(/\.ol-kakejiku(\[[^\]]*\])*::after/);
    expect(css).not.toContain("ol-kakejiku--rodless");
    const right = rule(".ol-kakejiku--from-right::after,\n.ol-kakejiku--from-end::after");
    expect(right).toContain("inset: 0 0 0 calc(var(--stroke-heavy) * -1);");
    expect(right).toContain("border-left-width: var(--stroke-heavy);");
    const left = rule(".ol-kakejiku--from-left::after,\n.ol-kakejiku--from-start::after");
    expect(left).toContain("inset: 0 calc(var(--stroke-heavy) * -1) 0 0;");
    expect(left).toContain("border-right-width: var(--stroke-heavy);");
  });

  it("gives the logical kakejiku classes the physical motion in LTR", () => {
    const pairs: [string, string, string][] = [
      ['.ol-kakejiku--from-right:not([data-state="closing"])', "end", "ol-unroll-left"],
      ['.ol-kakejiku--from-right[data-state="closing"]', "end", "ol-roll-right"],
      ['.ol-kakejiku--from-left:not([data-state="closing"])', "start", "ol-unroll-right"],
      ['.ol-kakejiku--from-left[data-state="closing"]', "start", "ol-roll-left"],
    ];
    for (const [physical, side, name] of pairs) {
      const logical = physical.replace(/from-(right|left)/, `from-${side}`);
      expect(rule(`${physical},\n${logical}`), logical).toContain(`animation-name: ${name};`);
      expect(rule(`${physical}::after,\n${logical}::after`), `${logical}::after`).toMatch(
        /animation: ol-rod-[\w-]+ var\(--dur-l\) var\(--ease-move\) (backwards|forwards);/,
      );
    }
  });

  it("swaps the logical kakejiku clip, rod side and rod travel under :dir(rtl), with a fallback", () => {
    const rtl: [string, string][] = [
      [
        '.ol-kakejiku--from-end{rtl}:not([data-state="closing"])',
        "animation-name: ol-unroll-right;",
      ],
      ['.ol-kakejiku--from-end{rtl}:not([data-state="closing"])::after', "ol-rod-right-in"],
      ['.ol-kakejiku--from-end{rtl}[data-state="closing"]', "animation-name: ol-roll-left;"],
      ['.ol-kakejiku--from-end{rtl}[data-state="closing"]::after', "ol-rod-left-out"],
      [".ol-kakejiku--from-end{rtl}::after", "border-width: 0 var(--stroke-heavy) 0 0;"],
      [
        '.ol-kakejiku--from-start{rtl}:not([data-state="closing"])',
        "animation-name: ol-unroll-left;",
      ],
      ['.ol-kakejiku--from-start{rtl}:not([data-state="closing"])::after', "ol-rod-left-in"],
      ['.ol-kakejiku--from-start{rtl}[data-state="closing"]', "animation-name: ol-roll-right;"],
      ['.ol-kakejiku--from-start{rtl}[data-state="closing"]::after', "ol-rod-right-out"],
      [".ol-kakejiku--from-start{rtl}::after", "border-width: 0 0 0 var(--stroke-heavy);"],
    ];
    const [, fallback = ""] = atRules(/@supports\s+not\s+selector\(:dir\(rtl\)\)\s*\{/g)[0] ?? [];
    for (const [template, expected] of rtl) {
      const native = template.replace("{rtl}", ":where(:dir(rtl))");
      expect(rule(native), native).toContain(expected);
      const attr = template.replace("{rtl}", ':where([dir="rtl"], [dir="rtl"] *)');
      expect(fallback, attr).toContain(`${attr} {`);
    }
    // Zero-specificity direction test, so data-state="closed" (later, doubled class) still wins.
    expect(css).not.toMatch(/\.ol-kakejiku--from-(end|start):dir\(/);
    // Token timing only, like the physical rules.
    for (const [, body] of atRules(/@supports\s+not\s+selector\(:dir\(rtl\)\)\s*\{/g)) {
      expect(body).not.toMatch(/\d+m?s\b|cubic-bezier|linear\(/);
    }
    const firstRtl = css.indexOf(
      '.ol-kakejiku--from-end:where(:dir(rtl)):not([data-state="closing"])',
    );
    const lastLtr = css.lastIndexOf('.ol-kakejiku--from-start[data-state="closing"]::after {');
    expect(firstRtl).toBeGreaterThan(lastLtr);
  });

  it("gives every shishi-odoshi loop a curve; only the drip runs linear", () => {
    for (const part of ["tube", "knock", "fill"]) {
      expect(rule(`.ol-motion-shishi__${part}`), part).toMatch(/animation:[^;]*var\(--ease-/);
    }
    expect(rule(".ol-motion-shishi__drip")).toMatch(/animation:[^;]*\blinear\b/);
  });

  it("clips the ink-wipe copy exactly like the fill, to the travelling ink", () => {
    const body = rule(
      '[data-ink-wipe="moving"] .ol-ink-wipe::before,\n[data-ink-wipe="moving"] .ol-ink-wipe > .ol-ink-wipe__ink',
    );
    expect(body).toContain("var(--ol-ink-l) - var(--ol-ink-x, 0px)");
    expect(body).toContain("100% - var(--ol-ink-r) + var(--ol-ink-x, 0px)");
    expect(body).toMatch(/--ol-ink-l var\(--dur-m\) var\(--ease-move\)/);
    expect(css).toMatch(/@property --ol-ink-l \{[^}]*inherits: true/);
    // With the copy, the label itself keeps its colour.
    expect(css).toMatch(/:not\(:where\(:has\(> \.ol-ink-wipe__ink\)\)\)\s*\{\s*color:/);
  });

  it("draws the block-axis stroke with two registered edges, leading edge first", () => {
    for (const name of ["y", "h"]) {
      expect(css).toMatch(new RegExp(`@property --ol-indicator-${name} \\{[^}]*inherits: true`));
    }
    for (const name of ["top", "bottom"]) {
      expect(css).toMatch(
        new RegExp(
          `@property --ol-indicator-${name} \\{[^}]*syntax: "<length>"[^}]*inherits: false`,
        ),
      );
    }
    const bar = rule(".ol-indicator--block");
    expect(bar).toMatch(/inset-inline-start:\s*0/);
    expect(bar).toMatch(/inset-block-start:\s*0/);
    expect(bar).toMatch(/inline-size:\s*var\(--ol-indicator-size, var\(--stroke-bold\)\)/);
    expect(bar).toMatch(/clip-path:\s*inset\(var\(--ol-indicator-top\)/);
    expect(bar).not.toMatch(/(?<![-\w])(?:left|right|top|bottom)\s*:/);

    const down = rule('[data-indicator="ready"] .ol-indicator--block');
    expect(down).toMatch(/--ol-indicator-bottom var\(--dur-m\) var\(--ease-move\),/);
    expect(down).toMatch(/--ol-indicator-top var\(--dur-m\) var\(--ease-move\) var\(--stagger\)/);
    const up = rule('[data-indicator="ready"][data-dir="up"] .ol-indicator--block');
    expect(up).toMatch(/--ol-indicator-top var\(--dur-m\) var\(--ease-move\),/);
    expect(up).toMatch(/--ol-indicator-bottom var\(--dur-m\) var\(--ease-move\) var\(--stagger\)/);
    expect(rule("[data-indicator-still][data-indicator] .ol-indicator--block")).toMatch(
      /transition:\s*none/,
    );
  });

  it("follows forced colours: Highlight bar and selection, origami shows the real text", () => {
    const body = allBodies(/@media\s*\(forced-colors:\s*active\)\s*\{/g);
    expect(body).toMatch(/\.ol-indicator\s*\{[^}]*forced-color-adjust:\s*none;[^}]*Highlight/);
    expect(body).toMatch(
      /\.ol-indicator--block\s*\{[^}]*forced-color-adjust:\s*none;[^}]*Highlight/,
    );
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
        <button class="ol-ink-wipe"></button>
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

  it("holds the hanko and the pressed stamp for useEntrance, with token timing only", () => {
    const body = rule(".ol-hanko,\n.ol-stamp--press");
    expect(body).toMatch(/animation:\s*ol-hanko var\(--dur-m\) var\(--ease-move\) backwards;/);
    expect(body).toMatch(/animation-delay:\s*var\(--ol-hanko-delay, 0ms\);/);
    // After the shorthand, which would reset it.
    expect(body).toMatch(
      /animation:[^;]*;[\s\S]*animation-play-state:\s*var\(--ol-enter-state, running\);/,
    );
    // No literal duration but the 0ms default delay; no literal curve.
    expect(body.replace("var(--ol-hanko-delay, 0ms)", "")).not.toMatch(
      /\d+m?s\b|cubic-bezier|linear\(/,
    );
    expect(rule('[data-enter="wait"]')).toContain("--ol-enter-state: paused;");
  });

  it("runs no kakejiku animation on a panel kept hidden after its exit", () => {
    expect(rule('.ol-kakejiku.ol-kakejiku[data-state="closed"]')).toMatch(/animation:\s*none;/);
    expect(
      rule(
        [
          '.ol-kakejiku--from-right[data-state="closed"]::after',
          '.ol-kakejiku--from-left[data-state="closed"]::after',
          '.ol-kakejiku--from-end[data-state="closed"]::after',
          '.ol-kakejiku--from-start[data-state="closed"]::after',
        ].join(",\n"),
      ),
    ).toMatch(/animation:\s*none;/);
    // After every direction rule, RTL included: the later rule wins at equal specificity.
    const last = css.lastIndexOf(
      '[data-state="closing"]::after {\n    animation: ol-rod-right-out',
    );
    expect(last).toBeGreaterThan(0);
    expect(css.indexOf('.ol-kakejiku.ol-kakejiku[data-state="closed"]')).toBeGreaterThan(last);
  });

  it("rolls every kakejiku direction from the shared --ol-kakejiku-start inset", () => {
    // Reset on each scroll (zero specificity) so a nested one never inherits a sheet's value.
    expect(rule(":where(.ol-kakejiku)")).toContain("--ol-kakejiku-start: 100%;");
    const names = ["down", "up", "left", "right"].flatMap((d) => [
      `ol-unroll-${d}`,
      `ol-roll-${d}`,
    ]);
    for (const name of names) {
      const found = keyframes.find(([prelude]) => prelude === `@keyframes ${name} {`);
      expect(found, name).toBeDefined();
      const body = found?.[1] ?? "";
      expect(body, name).toContain("var(--ol-kakejiku-start, 100%)");
      expect(body.replace(/var\(--ol-kakejiku-start, 100%\)/g, ""), name).not.toMatch(/100%/);
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
