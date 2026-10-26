/**
 * Builds the published stylesheets from src/styles:
 *   dist/tokens.css      custom properties for both themes
 *   dist/fonts.css       @font-face rules, URLs relative to the package's fonts/
 *   dist/fonts-jp.css    opt-in Zen Old Mincho (kanji), sliced by unicode-range
 *   dist/components.css  base + components + utilities, no tokens or fonts
 *   dist/motion-extras.css  opt-in ol-motion-* classes (byōbu, noren, kumiko, shishi-odoshi, sumi, origami)
 *   dist/olivine.css     everything above in one file
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { bundle, transform } from "lightningcss";

import type { FontFace } from "./lib/tokens";
import { fontsCss, fontSets, readTokens } from "./lib/tokens";

function bundleFile(filename: string): string {
  const { code, warnings } = bundle({ filename, minify: true });
  for (const warning of warnings) {
    console.warn(`${warning.loc.filename}:${String(warning.loc.line)} ${warning.message}`);
  }
  return code.toString();
}

function fontFile(fonts: FontFace[]): string {
  const code = Buffer.from(fontsCss(fonts, "../fonts/"));
  return transform({ filename: "fonts.css", code, minify: true }).code.toString();
}

const fonts = fontSets(readTokens());

const files = {
  "dist/tokens.css": bundleFile("src/styles/tokens.css"),
  "dist/fonts.css": fontFile(fonts.core),
  "dist/fonts-jp.css": fontFile(fonts.jp),
  "dist/components.css": bundleFile("src/styles/index.css"),
  "dist/motion-extras.css": bundleFile("src/styles/motion-extras.css"),
};

const all = {
  ...files,
  "dist/olivine.css": [
    files["dist/tokens.css"],
    files["dist/fonts.css"],
    files["dist/components.css"],
  ].join(""),
};

mkdirSync("dist", { recursive: true });
for (const [file, code] of Object.entries(all)) {
  writeFileSync(file, code);
  console.log(`${file} (${String(Buffer.byteLength(code))} bytes)`);
}
