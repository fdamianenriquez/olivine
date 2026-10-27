import { defineConfig } from "@playwright/test";

const PORT = 6007;

export default defineConfig({
  // Two passes over the built Storybook: screenshots against the baselines, and axe on every story.
  projects: [
    { name: "visual", testDir: "tests/visual" },
    { name: "a11y", testDir: "tests/a11y" },
  ],
  // One flat folder of baselines. They are made on Linux (see `pnpm visual:update`), so there is
  // no platform suffix.
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "en-US",
    reducedMotion: "reduce",
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.002 },
  },
  webServer: {
    command: `node scripts/serve-static.mjs storybook-static ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}/index.json`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
