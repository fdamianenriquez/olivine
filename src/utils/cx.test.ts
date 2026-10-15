import { describe, expect, it } from "vitest";

import { cx } from "./cx";

describe("cx", () => {
  it("joins truthy class names", () => {
    expect(cx("ol-a", false, null, undefined, "", "ol-b")).toBe("ol-a ol-b");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cx(false, undefined)).toBe("");
  });
});
