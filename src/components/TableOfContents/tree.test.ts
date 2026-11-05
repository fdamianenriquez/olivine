import { afterEach, describe, expect, it, vi } from "vitest";

import { ancestorsOf, buildTree, resolveEntry, type TableOfContentsItem } from "./tree";

function list(levels: (number | undefined)[]): TableOfContentsItem[] {
  return levels.map((level, i) => ({
    id: `s${String(i)}`,
    label: `Section ${String(i)}`,
    ...(level === undefined ? {} : { level }),
  }));
}

function depths(levels: (number | undefined)[], maxDepth?: 1 | 2 | 3): number[] {
  return buildTree(list(levels), maxDepth).all.map((e) => e.depth);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildTree", () => {
  it("derives depth from levels relative to the smallest one", () => {
    expect(depths([2, 3, 3, 2])).toEqual([0, 1, 1, 0]);
    expect(depths([1, 2, 2, 1])).toEqual([0, 1, 1, 0]);
    expect(depths([4, 5, 4])).toEqual([0, 1, 0]);
  });

  it("defaults the level to 1", () => {
    expect(depths([undefined, undefined])).toEqual([0, 0]);
  });

  it("shows a jump of more than one level as one step deeper", () => {
    expect(depths([2, 4, 5])).toEqual([0, 1, 2]);
    expect(depths([2, 3, 4, 2, 4])).toEqual([0, 1, 2, 0, 1]);
  });

  it("opens with depth zero even when the first entry is nested in the data", () => {
    expect(depths([3, 2, 3])).toEqual([0, 0, 1]);
  });

  it("ignores levels that are not positive integers", () => {
    expect(depths([0, Number.NaN, 2.4, -3])).toEqual([0, 0, 1, 0]);
  });

  it("groups the visible entries into a forest and records parents", () => {
    const tree = buildTree(list([2, 3, 3, 2, 4]), 3);
    expect(tree.roots.map((n) => n.item.id)).toEqual(["s0", "s3"]);
    expect(tree.roots[0]?.children.map((n) => n.item.id)).toEqual(["s1", "s2"]);
    expect(tree.roots[1]?.children.map((n) => n.item.id)).toEqual(["s4"]);
    expect(tree.all.map((e) => e.parent)).toEqual([null, "s0", "s0", null, "s3"]);
  });

  it("drops entries deeper than maxDepth from the visible list", () => {
    const tree = buildTree(list([2, 3, 4, 3]), 2);
    expect(tree.all).toHaveLength(4);
    expect(tree.visible.map((e) => e.item.id)).toEqual(["s0", "s1", "s3"]);
    expect(buildTree(list([2, 3, 4, 3]), 1).visible.map((e) => e.item.id)).toEqual(["s0"]);
    expect(buildTree(list([2, 3, 4, 3]), 3).visible).toHaveLength(4);
  });

  it("skips repeated ids (the first wins) and empty ids, with a development warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const tree = buildTree([
      { id: "a", label: "First" },
      { id: "a", label: "Second" },
      { id: "", label: "None" },
      { id: "b", label: "B" },
    ]);
    expect(tree.all.map((e) => e.item.label)).toEqual(["First", "B"]);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("is empty for no items", () => {
    expect(buildTree([])).toEqual({ all: [], visible: [], roots: [] });
  });
});

describe("resolveEntry and ancestorsOf", () => {
  const tree = buildTree(list([2, 3, 4, 3]), 2);

  it("returns the entry itself when it is visible", () => {
    expect(resolveEntry(tree, "s1")?.item.id).toBe("s1");
  });

  it("maps a hidden entry to the closest visible one above it", () => {
    expect(resolveEntry(tree, "s2")?.item.id).toBe("s1");
  });

  it("returns null for null and for unknown ids", () => {
    expect(resolveEntry(tree, null)).toBeNull();
    expect(resolveEntry(tree, "nope")).toBeNull();
  });

  it("lists the ancestors of an entry, not the entry", () => {
    const deep = buildTree(list([2, 3, 4]), 3);
    expect([...ancestorsOf(deep, resolveEntry(deep, "s2"))]).toEqual(["s1", "s0"]);
    expect(ancestorsOf(deep, resolveEntry(deep, "s0")).size).toBe(0);
    expect(ancestorsOf(deep, null).size).toBe(0);
  });
});
