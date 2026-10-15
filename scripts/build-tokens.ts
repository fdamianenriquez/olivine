/**
 * src/tokens/tokens.json → generated sources, committed so typecheck, tests and Storybook
 * work without a build step (CI fails if they drift):
 *   src/tokens/index.ts   typed tokens for the `olivine/tokens` entry
 *   src/styles/tokens.css custom properties for both themes
 *   src/styles/fonts.css     @font-face rules pointing at fonts/ (for Storybook; dist gets its own)
 *   src/styles/fonts-jp.css  the same for the opt-in Japanese set
 */
import { writeFileSync } from "node:fs";

import { format } from "prettier";

import { fontsCss, fontSets, readTokens, tokensCss, tokensTs } from "./lib/tokens";

const tokens = readTokens();
const fonts = fontSets(tokens);

const outputs: [string, string][] = [
  ["src/tokens/index.ts", tokensTs(tokens)],
  ["src/styles/tokens.css", tokensCss(tokens)],
  ["src/styles/fonts.css", fontsCss(fonts.core, "../../fonts/")],
  ["src/styles/fonts-jp.css", fontsCss(fonts.jp, "../../fonts/")],
];

for (const [file, source] of outputs) {
  writeFileSync(
    file,
    await format(source, { filepath: file, printWidth: 100, trailingComma: "all" }),
  );
  console.log(file);
}
