// Visual regression helper.
//   tsx scripts/visual.ts test      build Storybook and compare against the baselines (Linux container)
//   tsx scripts/visual.ts update    build Storybook and rewrite the baselines (Linux container)
// Extra arguments go to Playwright, e.g. `pnpm visual:update -g demo`.
// The baselines are rendered in the same Playwright image the CI job uses, so they match there.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(
  readFileSync("node_modules/@playwright/test/package.json", "utf8"),
) as { version: string };
const mode = process.argv[2] ?? "test";
if (!["test", "update"].includes(mode)) {
  console.error("Usage: tsx scripts/visual.ts <test|update>");
  process.exit(1);
}

const run = (command: string, args: string[]) => {
  execFileSync(command, args, { stdio: "inherit" });
};

run("pnpm", ["storybook:build"]);
run("docker", [
  "run",
  "--rm",
  "--platform",
  "linux/amd64",
  "--ipc=host",
  "-e",
  "CI=1",
  "-v",
  `${process.cwd()}:/work`,
  "-w",
  "/work",
  `mcr.microsoft.com/playwright:v${version}-noble`,
  "node",
  "node_modules/@playwright/test/cli.js",
  "test",
  // "all" rewrites every baseline: the default only rewrites those past the diff threshold, so a
  // small but real change (a label's case, a glyph) would keep its stale baseline.
  ...(mode === "update" ? ["--update-snapshots=all"] : []),
  // Anything after the mode goes to Playwright, e.g. `-g demo` to run a few stories.
  ...process.argv.slice(3),
]);
