/**
 * Copies Martian Mono and Zen Old Mincho from their @fontsource packages into fonts/ and
 * records each file (with its unicode-range) in src/tokens/vendor-fonts.json.
 *
 * Zen Old Mincho keeps Google Fonts' unicode-range slicing: the full character set ships,
 * but browsers only download the slices a page actually uses (usually a few kana and kanji
 * slices of 20–60 kB each), so no lossy subsetting is needed.
 *
 * Run after updating either @fontsource package: `pnpm fonts:vendor`.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { FontFace } from "./lib/tokens";
import { VENDOR_FONTS_PATH } from "./lib/tokens";

interface Source {
  pkg: string;
  family: string;
  weight: string;
  dir: string;
  licence: string;
  /** Fontsource subsets to leave out (the system only needs Latin and Japanese). */
  skip: RegExp;
}

const SOURCES: Source[] = [
  {
    pkg: "@fontsource/martian-mono",
    family: "Martian Mono",
    weight: "400",
    dir: "fonts/martian-mono",
    licence: "fonts/MartianMono-OFL.txt",
    skip: /cyrillic|greek|vietnamese/,
  },
  {
    pkg: "@fontsource/zen-old-mincho",
    family: "Zen Old Mincho",
    weight: "500",
    dir: "fonts/zen-old-mincho",
    licence: "fonts/ZenOldMincho-OFL.txt",
    skip: /cyrillic|greek|-japanese-/,
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
  const css = readFileSync(join(root, `${source.weight}.css`), "utf8");

  rmSync(source.dir, { recursive: true, force: true });
  mkdirSync(source.dir, { recursive: true });
  copyFileSync(join(root, "LICENSE"), source.licence);

  for (const [, block = ""] of css.matchAll(FACE)) {
    const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(block)?.[1];
    if (!file || source.skip.test(file) || read(block, "font-style") !== "normal") continue;

    copyFileSync(join(root, "files", file), join(source.dir, file));
    const face: FontFace = {
      family: source.family,
      file: `${source.dir}/${file}`,
      weight: source.weight,
      style: "normal",
    };
    const unicodeRange = read(block, "unicode-range");
    if (unicodeRange) face.unicodeRange = unicodeRange;
    faces.push(face);
  }
}

writeFileSync(VENDOR_FONTS_PATH, `${JSON.stringify(faces, null, 2)}\n`);
console.log(`${VENDOR_FONTS_PATH}: ${String(faces.length)} font files`);
