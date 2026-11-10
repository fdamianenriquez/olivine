import { describe, expect, it } from "vitest";

import { addKeys, headerState, keyRange, removeKeys, toggleKey } from "./selection";

describe("table selection helpers", () => {
  it("toggles one key, keeping the order chosen", () => {
    expect(toggleKey(["b"], "a", true)).toEqual(["b", "a"]);
    expect(toggleKey(["b", "a"], "b", false)).toEqual(["a"]);
    const same = ["a"];
    expect(toggleKey(same, "a", true)).toBe(same);
    expect(toggleKey(same, "z", false)).toBe(same);
  });

  it("adds and removes a set, leaving other keys alone", () => {
    expect(addKeys(["x", 2], [1, 2, 3])).toEqual(["x", 2, 1, 3]);
    expect(removeKeys(["x", 1, 2, 3], [1, 3])).toEqual(["x", 2]);
    const same = ["x"];
    expect(addKeys(same, ["x"])).toBe(same);
    expect(removeKeys(same, ["y"])).toBe(same);
  });

  it("returns a range in displayed order in either direction", () => {
    const order = ["a", "b", "d", "e"];
    expect(keyRange(order, "a", "d")).toEqual(["a", "b", "d"]);
    expect(keyRange(order, "e", "b")).toEqual(["b", "d", "e"]);
    expect(keyRange(order, "c", "e")).toEqual([]);
  });

  it("derives the header state over enabled rows only", () => {
    expect(headerState([], ["a", "b"])).toBe("none");
    expect(headerState(["a", "off-page"], ["a", "b"])).toBe("some");
    expect(headerState(["b", "a"], ["a", "b"])).toBe("all");
    expect(headerState(["a"], [])).toBe("none");
  });
});
