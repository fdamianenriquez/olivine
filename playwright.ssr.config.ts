import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/ssr",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${String(PORT)}` },
  webServer: {
    command: `pnpm --dir examples/next-app exec next start -p ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
