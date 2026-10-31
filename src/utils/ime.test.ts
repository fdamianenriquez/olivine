import { describe, expect, it } from "vitest";

import { isImeKey } from "./ime";

describe("isImeKey", () => {
  it("flags composing keys, Process and Safari's keyCode 229", () => {
    expect(isImeKey(new KeyboardEvent("keydown", { key: "a", isComposing: true }))).toBe(true);
    expect(isImeKey(new KeyboardEvent("keydown", { key: "Process" }))).toBe(true);
    expect(isImeKey(new KeyboardEvent("keydown", { key: "Enter", keyCode: 229 }))).toBe(true);
    expect(isImeKey(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(false);
  });
});
