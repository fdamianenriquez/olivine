import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", tokens: "src/tokens/index.ts" },
  format: ["esm", "cjs"],
  platform: "neutral",
  target: "es2020",
  fixedExtension: false,
  dts: true,
  tsconfig: "tsconfig.build.json",
  sourcemap: false,
  clean: true,
  // Components are client components under React Server Components; tokens are plain data
  // and stay importable from server code.
  outputOptions: { banner: (chunk) => (chunk.name === "index" ? '"use client";' : "") },
});
