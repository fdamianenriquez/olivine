import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as olivine from ".";

const components = readdirSync("src/components", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const entry = readFileSync("src/index.ts", "utf8");
const styles = readFileSync("src/styles/index.css", "utf8");

describe("public entry", () => {
  it.each(components.filter((name) => name !== "Carousel"))("exports %s", (name) => {
    expect(entry).toContain(`from "./components/${name}"`);
    expect(olivine).toHaveProperty(name);
  });

  it.each(components.filter((name) => existsSync(join("src/components", name, `${name}.css`))))(
    "bundles the styles of %s",
    (name) => {
      expect(styles).toContain(`@import "../components/${name}/${name}.css";`);
    },
  );
});
