import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

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
const allStories = Object.values(index.entries).filter((entry) => entry.type === "story");

const THEMES = ["washi", "sumi"] as const;
/** Full-page demos are captured as one desktop viewport rather than as the whole page. */
const isDemo = (id: string) => id.startsWith("demo-");

/** One story per component: its "Themes" story, or else its first story. */
const byTitle = new Map<string, IndexEntry[]>();
for (const story of allStories)
  byTitle.set(story.title, [...(byTitle.get(story.title) ?? []), story]);
const stories = [...byTitle.values()].flatMap((group) => {
  const story = group.find((entry) => /themes/i.test(entry.name)) ?? group[0];
  return story ? [story] : [];
});

for (const story of stories) {
  // "Themes" stories already draw both themes side by side: one capture is enough.
  const themes = /themes/i.test(story.name) ? THEMES.slice(0, 1) : THEMES;
  for (const theme of themes) {
    test(`${story.id} · ${theme}`, async ({ page }) => {
      const demo = isDemo(story.id);
      if (demo) await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(
        `/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme};locale:en`,
      );
      await page.waitForSelector("#storybook-root > *", { state: "attached" });
      await expect(page.locator("body.sb-show-errordisplay")).toHaveCount(0);
      await page.evaluate(async () => {
        await document.fonts.ready;
        // Lazy images below the fold never load, so do not wait on them for ever.
        const settle = (img: HTMLImageElement) =>
          Promise.race([
            img.decode().catch(() => undefined),
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]);
        await Promise.all(Array.from(document.images, settle));
      });
      // Overlays render in a portal outside the story root, so capture the viewport for them.
      const hasPortal = await page.locator(".ol-portal").count();
      const name = `${story.id}-${theme}.png`;
      if (demo || hasPortal > 0) {
        await expect(page).toHaveScreenshot(name);
      } else {
        await expect(page.locator("#storybook-root")).toHaveScreenshot(name);
      }
    });
  }
}
