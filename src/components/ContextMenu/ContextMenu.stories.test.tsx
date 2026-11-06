import { describe, expect, it } from "vitest";

import * as stories from "./ContextMenu.stories";

describe("ContextMenu stories", () => {
  // Storybook's centered and padded layouts add padding to a canvas that already fills the
  // viewport, so the page scrolls although nothing is taller than the window.
  it("use the fullscreen layout, so the page never scrolls", () => {
    const { default: meta, ...all } = stories;
    expect(meta.parameters.layout).toBe("fullscreen");
    for (const [name, story] of Object.entries(all)) {
      const layout = (story as { parameters?: { layout?: string } }).parameters?.layout;
      expect([name, layout ?? "fullscreen"]).toEqual([name, "fullscreen"]);
    }
  });
});
