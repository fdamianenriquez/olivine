import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

// Axe reads computed colours, so it cannot see the backplate Chromium draws behind text or a ring
// painted in the fill colour. These captures render the parts that keep their own fill
// (`forced-color-adjust: none`) under `forced-colors: active`, in a light and a dark system palette.
// Run `pnpm storybook:build` first: the stories are read from the built Storybook.
const index = JSON.parse(readFileSync("storybook-static/index.json", "utf8")) as {
  entries: Record<string, { id: string }>;
};

const STORIES = [
  "actions-badge--tones",
  "actions-badge--dot",
  "navigation-navigationrail--expanded",
  "navigation-sidebar--nested-current",
  "navigation-bottomnav--five-items",
  "forms-timepicker--open",
  "forms-timepicker--states",
] as const;

const PALETTES = [
  { theme: "washi", colorScheme: "light" },
  { theme: "sumi", colorScheme: "dark" },
] as const;

for (const id of STORIES) {
  for (const { theme, colorScheme } of PALETTES) {
    for (const focused of [false, true]) {
      const name = `forced-colors-${id}-${theme}${focused ? "-focus" : ""}`;
      test(name, async ({ page }) => {
        expect(index.entries[id], `story ${id} exists`).toBeDefined();
        await page.emulateMedia({ forcedColors: "active", colorScheme });
        await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};locale:en`);
        await page.waitForSelector("#storybook-root > *", { state: "attached" });
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        if (focused) await page.keyboard.press("Tab");
        // Overlays render in a portal outside the story root, so capture the viewport.
        await expect(page).toHaveScreenshot(`${name}.png`);
      });
    }
  }
}
