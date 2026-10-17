// The visual job runs in the Playwright image, and its tag must match the installed
// @playwright/test: the baselines are rendered by that exact browser build.
import { readFileSync } from "node:fs";

const { version } = JSON.parse(
  readFileSync("node_modules/@playwright/test/package.json", "utf8"),
) as { version: string };
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const tag = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-/.exec(workflow)?.[1];

if (tag !== version) {
  console.error(
    `The visual job uses the Playwright image v${tag ?? "(not found)"} but @playwright/test is ${version}.\n` +
      `Set the image in .github/workflows/ci.yml to mcr.microsoft.com/playwright:v${version}-noble, ` +
      "then run `pnpm visual:update` and commit the baselines that changed.",
  );
  process.exit(1);
}
console.log(`Playwright image and package agree on v${version}.`);
