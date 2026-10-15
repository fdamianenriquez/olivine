import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  target: "es2020",
  fixedExtension: false,
  dts: true,
  tsconfig: "tsconfig.build.json",
  sourcemap: false,
  clean: true,
  // Every component is a client component under React Server Components.
  outputOptions: { banner: '"use client";' },
});
