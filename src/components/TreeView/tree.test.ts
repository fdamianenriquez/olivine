import { describe, expect, it } from "vitest";

import {
  ancestorsOf,
  cascadeCheck,
  checkedStates,
  eligibleIds,
  flattenTree,
  hasLoadedChildren,
  indexTree,
  isBranch,
  isEligible,
  isSelectable,
  nearestVisibleAncestor,
  needsLoading,
  normalizeChecked,
  siblingsOf,
  type TreeNode,
} from "./tree";

const TREE: TreeNode[] = [
  {
    id: "a",
    label: "A",
    children: [
      { id: "a1", label: "A1" },
      { id: "a2", label: "A2" },
      {
        id: "a3",
        label: "A3",
        children: [
          { id: "a3x", label: "A3x" },
          { id: "a3y", label: "A3y" },
        ],
      },
    ],
  },
  {
    id: "b",
    label: "B",
    children: [
      { id: "b1", label: "B1" },
      { id: "b2", label: "B2", disabled: true },
    ],
  },
  { id: "c", label: "C", hasChildren: true },
  { id: "d", label: "D" },
];

const index = indexTree(TREE);

function at(i: number): TreeNode {
  const node = TREE[i];
  if (!node) throw new Error(`no node ${String(i)}`);
  return node;
}

describe("node predicates", () => {
  it("tells branches, unloaded branches, selectable and eligible nodes apart", () => {
    expect(hasLoadedChildren(at(0))).toBe(true);
    expect(hasLoadedChildren({ id: "e", label: "E", children: [] })).toBe(false);
    expect(isBranch(at(0))).toBe(true);
    expect(isBranch(at(2))).toBe(true);
    expect(isBranch(at(3))).toBe(false);
    expect(needsLoading(at(2))).toBe(true);
    expect(needsLoading(at(0))).toBe(false);
    expect(isSelectable({ id: "f", label: "F", selectable: false })).toBe(false);
    expect(isEligible({ id: "g", label: "G", disabled: true })).toBe(false);
    expect(isEligible({ id: "h", label: "H" })).toBe(true);
  });
});

describe("indexTree", () => {
  it("records level, siblings, position and parent of every loaded node", () => {
    expect(index.entries.get("a3y")).toMatchObject({
      parentId: "a3",
      level: 3,
      setSize: 2,
      posInSet: 2,
    });
    expect(index.entries.get("d")).toMatchObject({
      parentId: null,
      level: 1,
      setSize: 4,
      posInSet: 4,
    });
  });

  it("lists every node in depth-first order, closed branches included", () => {
    expect(index.order).toEqual(["a", "a1", "a2", "a3", "a3x", "a3y", "b", "b1", "b2", "c", "d"]);
  });

  it("reports repeated ids and keeps the first", () => {
    const dup = indexTree([
      { id: "x", label: "X" },
      { id: "x", label: "Again" },
    ]);
    expect(dup.duplicates).toEqual(["x"]);
    expect(dup.entries.get("x")?.node.label).toBe("X");
  });
});

describe("flattenTree", () => {
  it("lists the roots when nothing is open", () => {
    expect(flattenTree(TREE, new Set()).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("adds the children of every open branch, in place", () => {
    const rows = flattenTree(TREE, new Set(["a", "a3"]));
    expect(rows.map((r) => r.id)).toEqual(["a", "a1", "a2", "a3", "a3x", "a3y", "b", "c", "d"]);
    expect(rows.find((r) => r.id === "a3x")).toMatchObject({
      level: 3,
      setSize: 2,
      posInSet: 1,
      parentId: "a3",
    });
  });

  it("skips the children of a branch whose parent is closed", () => {
    expect(flattenTree(TREE, new Set(["a3"])).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("ancestors and siblings", () => {
  it("lists ancestors nearest first", () => {
    expect(ancestorsOf(index, "a3x")).toEqual(["a3", "a"]);
    expect(ancestorsOf(index, "a")).toEqual([]);
    expect(ancestorsOf(index, "nope")).toEqual([]);
  });

  it("finds the nearest visible ancestor, or the node itself", () => {
    const visible = new Set(["a", "b", "c", "d"]);
    expect(nearestVisibleAncestor(index, visible, "a3x")).toBe("a");
    expect(nearestVisibleAncestor(index, visible, "b")).toBe("b");
    expect(nearestVisibleAncestor(index, new Set(), "a3x")).toBeNull();
  });

  it("lists the siblings of a root and of a nested node", () => {
    expect(siblingsOf(index, "b").map((n) => n.id)).toEqual(["a", "b", "c", "d"]);
    expect(siblingsOf(index, "a2").map((n) => n.id)).toEqual(["a1", "a2", "a3"]);
    expect(siblingsOf(index, "nope")).toEqual([]);
  });
});

describe("checkedStates", () => {
  it("uses the ids in the value when not cascading", () => {
    const states = checkedStates(index, ["a", "a1"], false);
    expect(states.get("a")).toBe("checked");
    expect(states.get("a2")).toBe("unchecked");
    expect(states.get("b")).toBe("unchecked");
  });

  it("derives a parent from its children: checked, mixed or unchecked", () => {
    const states = checkedStates(index, ["a1", "a3x"], true);
    expect(states.get("a")).toBe("mixed");
    expect(states.get("a3")).toBe("mixed");
    expect(states.get("a1")).toBe("checked");
    expect(states.get("b")).toBe("unchecked");
    expect(checkedStates(index, ["a1", "a2", "a3x", "a3y"], true).get("a")).toBe("checked");
  });

  it("reads a parent id as all of its children", () => {
    const states = checkedStates(index, ["a"], true);
    expect(states.get("a3y")).toBe("checked");
    expect(states.get("a")).toBe("checked");
  });

  it("leaves disabled children out of the parent's state and keeps their own", () => {
    expect(checkedStates(index, ["b1"], true).get("b")).toBe("checked");
    const states = checkedStates(index, ["b2"], true);
    expect(states.get("b2")).toBe("checked");
    expect(states.get("b")).toBe("unchecked");
  });

  it("gives a parent with unloaded children its own box", () => {
    expect(checkedStates(index, ["c"], true).get("c")).toBe("checked");
    expect(checkedStates(index, [], true).get("c")).toBe("unchecked");
  });

  it("looks through a node that cannot be selected", () => {
    const tree: TreeNode[] = [
      {
        id: "top",
        label: "Top",
        children: [
          {
            id: "group",
            label: "Group",
            selectable: false,
            children: [
              { id: "g1", label: "G1" },
              { id: "g2", label: "G2" },
            ],
          },
        ],
      },
    ];
    const idx = indexTree(tree);
    const states = checkedStates(idx, ["g1"], true);
    expect(states.has("group")).toBe(false);
    expect(states.get("top")).toBe("mixed");
    expect(checkedStates(idx, ["g1", "g2"], true).get("top")).toBe("checked");
  });
});

describe("cascadeCheck", () => {
  it("checks a parent and everything enabled under it, parent ids included", () => {
    const next = cascadeCheck(index, [], "a", true);
    expect([...next].sort(byOrder)).toEqual(["a", "a1", "a2", "a3", "a3x", "a3y"]);
  });

  it("makes the siblings explicit when a child of a checked parent is unchecked", () => {
    const all = cascadeCheck(index, [], "a", true);
    const next = cascadeCheck(index, all, "a2", false);
    expect(next).not.toContain("a");
    expect(next).not.toContain("a2");
    expect(next).toEqual(expect.arrayContaining(["a1", "a3", "a3x", "a3y"]));
    expect(checkedStates(index, next, true).get("a")).toBe("mixed");
  });

  it("adds a parent when its last unchecked child is checked", () => {
    const next = cascadeCheck(index, ["a1", "a2", "a3x"], "a3y", true);
    expect(next).toEqual(expect.arrayContaining(["a3", "a"]));
  });

  it("keeps the order the ids were chosen in", () => {
    expect(cascadeCheck(index, ["d", "a1"], "a2", true).slice(0, 3)).toEqual(["d", "a1", "a2"]);
  });

  it("does not touch disabled descendants, and cannot change a disabled node", () => {
    const next = cascadeCheck(index, [], "b", true);
    expect(next).toEqual(["b", "b1"]);
    expect(cascadeCheck(index, [], "b2", true)).toEqual([]);
  });

  it("unchecks a whole branch", () => {
    const all = cascadeCheck(index, [], "a", true);
    expect(cascadeCheck(index, all, "a", false)).toEqual([]);
  });

  it("toggles one id when not cascading", () => {
    expect(cascadeCheck(index, ["a"], "a1", true, false)).toEqual(["a", "a1"]);
    expect(cascadeCheck(index, ["a", "a1"], "a", false, false)).toEqual(["a1"]);
  });
});

describe("normalizeChecked", () => {
  it("expands a parent id to its children and keeps unknown ids", () => {
    const next = normalizeChecked(index, ["a", "gone"], true);
    expect(next).toEqual(expect.arrayContaining(["a", "a1", "a2", "a3", "a3x", "a3y", "gone"]));
  });

  it("drops a parent that is no longer fully checked", () => {
    expect(normalizeChecked(index, ["a1", "a2"], true)).toEqual(["a1", "a2"]);
  });
});

describe("eligibleIds", () => {
  it("lists every enabled selectable loaded node, closed branches included", () => {
    expect(eligibleIds(index)).toEqual(["a", "a1", "a2", "a3", "a3x", "a3y", "b", "b1", "c", "d"]);
  });
});

/** Tree order, to compare values without caring about the order a cascade appended them in. */
function byOrder(x: string, y: string) {
  return index.order.indexOf(x) - index.order.indexOf(y);
}
