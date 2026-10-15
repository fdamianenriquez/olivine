import { mkdirSync, writeFileSync } from "node:fs";

import { bundle } from "lightningcss";

const entry = "src/styles/index.css";
const outFile = "dist/olivine.css";

const { code, warnings } = bundle({ filename: entry, minify: true });

for (const warning of warnings) {
  console.warn(`${warning.loc.filename}:${String(warning.loc.line)} ${warning.message}`);
}

mkdirSync("dist", { recursive: true });
writeFileSync(outFile, code);
console.log(`${outFile} (${String(code.byteLength)} bytes)`);
