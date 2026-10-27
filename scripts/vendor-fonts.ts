/**
 * Copies the typography v2 faces (Big Shoulders Display, Familjen Grotesk, Xanh Mono, Yuji Syuku)
 * from their @fontsource packages into fonts/ and records each file (with its unicode-range) in
 * src/tokens/vendor-fonts.json.
 *
 * Yuji Syuku keeps Google Fonts' unicode-range slicing: the full character set ships, but
 * browsers only download the slices a page actually uses (usually a few kana and kanji slices
 * of 20–60 kB each), so no lossy subsetting is needed.
 *
 * Run after updating any of the @fontsource packages: `pnpm fonts:vendor`.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { FontFace } from "./lib/tokens";
import { VENDOR_FONTS_PATH } from "./lib/tokens";

interface Source {
  pkg: string;
  family: string;
  weights: string[];
  dir: string;
  licence: string;
  /** Fontsource subsets to leave out (the system only needs Latin and Japanese). */
  skip: RegExp;
}

const SOURCES: Source[] = [
  {
    pkg: "@fontsource/big-shoulders-display",
    family: "Big Shoulders Display",
    weights: ["300", "400", "800"],
    dir: "fonts/big-shoulders-display",
    licence: "fonts/BigShouldersDisplay-OFL.txt",
    skip: /vietnamese/,
  },
  {
    pkg: "@fontsource/familjen-grotesk",
    family: "Familjen Grotesk",
    weights: ["400", "500", "600"],
    dir: "fonts/familjen-grotesk",
    licence: "fonts/FamiljenGrotesk-OFL.txt",
    skip: /vietnamese/,
  },
  {
    pkg: "@fontsource/xanh-mono",
    family: "Xanh Mono",
    weights: ["400"],
    dir: "fonts/xanh-mono",
    licence: "fonts/XanhMono-OFL.txt",
    skip: /vietnamese/,
  },
  {
    pkg: "@fontsource/yuji-syuku",
    family: "Yuji Syuku",
    weights: ["400"],
    dir: "fonts/yuji-syuku",
    licence: "fonts/YujiSyuku-OFL.txt",
    skip: /cyrillic|-japanese-/,
  },
];

const require = createRequire(import.meta.url);
const FACE = /@font-face\s*{([^}]*)}/g;

function read(block: string, property: string): string | undefined {
  return new RegExp(`${property}:\\s*([^;]+);`).exec(block)?.[1]?.trim();
}

const faces: FontFace[] = [];

for (const source of SOURCES) {
  const root = dirname(require.resolve(`${source.pkg}/package.json`));

  rmSync(source.dir, { recursive: true, force: true });
  mkdirSync(source.dir, { recursive: true });
  copyFileSync(join(root, "LICENSE"), source.licence);

  for (const weight of source.weights) {
    const css = readFileSync(join(root, `${weight}.css`), "utf8");
    for (const [, block = ""] of css.matchAll(FACE)) {
      const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(block)?.[1];
      if (!file || source.skip.test(file) || read(block, "font-style") !== "normal") continue;

      copyFileSync(join(root, "files", file), join(source.dir, file));
      const face: FontFace = {
        family: source.family,
        file: `${source.dir}/${file}`,
        weight,
        style: "normal",
      };
      const unicodeRange = read(block, "unicode-range");
      if (unicodeRange) face.unicodeRange = unicodeRange;
      faces.push(face);
    }
  }
}

writeFileSync(VENDOR_FONTS_PATH, `${JSON.stringify(faces, null, 2)}\n`);
console.log(`${VENDOR_FONTS_PATH}: ${String(faces.length)} font files`);
