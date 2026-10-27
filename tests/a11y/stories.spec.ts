import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { expect, type Page, test } from "@playwright/test";
import type { AxeResults, Result, RunOptions } from "axe-core";

import { KNOWN_ISSUES } from "./known-issues";

interface IndexEntry {
  id: string;
  title: string;
  type: string;
  name: string;
}

// Run `pnpm storybook:build` first: the stories are read from the built Storybook.
const index = JSON.parse(readFileSync("storybook-static/index.json", "utf8")) as {
  entries: Record<string, IndexEntry>;
};
const stories = Object.values(index.entries).filter((entry) => entry.type === "story");

const THEMES = ["washi", "sumi"] as const;
const AXE = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

/** WCAG 2.2 AA, the level the library promises. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

async function open(page: Page, id: string, theme: string): Promise<void> {
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};locale:en`);
  await page.waitForSelector("#storybook-root > *", { state: "attached" });
  await expect(page.locator("body.sb-show-errordisplay")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function axe(page: Page, options: RunOptions): Promise<Result[]> {
  await page.addScriptTag({ path: AXE });
  const results = await page.evaluate(async (runOptions) => {
    const { axe } = window as unknown as {
      axe: { run: (context: unknown, options: unknown) => Promise<AxeResults> };
    };
    // Storybook's a11y addon runs axe on every story too; wait for its run to finish.
    for (let attempt = 0; ; attempt++) {
      try {
        // The story root and any portal the story opened; Storybook's own docs root is left out.
        return await axe.run({ exclude: [["#storybook-docs"]] }, runOptions);
      } catch (error) {
        if (attempt >= 50 || !String(error).includes("already running")) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }, options);
  return results.violations;
}

/** Drops the nodes of known, planned issues (see known-issues.ts). */
function triage(storyId: string, violations: Result[]): Result[] {
  return violations.flatMap((violation) => {
    const nodes = violation.nodes.filter((node) => {
      const selector = node.target.join(" ");
      return !KNOWN_ISSUES.some(
        (issue) =>
          issue.rule === violation.id &&
          issue.stories.test(storyId) &&
          (!issue.target || issue.target.test(selector)),
      );
    });
    return nodes.length > 0 ? [{ ...violation, nodes }] : [];
  });
}

/** One line per failing node, so the report says what to fix and where. */
const describe = (violations: Result[]) =>
  violations
    .flatMap((v) =>
      v.nodes.map((node) => `${v.id} (${v.impact ?? "?"}): ${node.target.join(" ")} — ${v.help}`),
    )
    .join("\n");

test.describe("stories", () => {
  for (const story of stories) {
    for (const theme of THEMES) {
      test(`${story.id} · ${theme}`, async ({ page }) => {
        await open(page, story.id, theme);
        const found = await axe(page, { runOnly: { type: "tag", values: TAGS } });
        const violations = triage(story.id, found);
        expect(violations, describe(violations)).toEqual([]);
      });
    }

    // Forced colours replace the palette, so contrast is the system's; check everything else.
    test(`${story.id} · forced colours`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await open(page, story.id, THEMES[0]);
      const found = await axe(page, {
        runOnly: { type: "tag", values: TAGS },
        rules: { "color-contrast": { enabled: false } },
      });
      const violations = triage(story.id, found);
      expect(violations, describe(violations)).toEqual([]);
    });
  }
});
