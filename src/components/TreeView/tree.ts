import type { ReactNode } from "react";

/** One node of a `TreeView`, given as data. */
export interface TreeNode {
  /** Unique, stable id across the whole tree. */
  id: string;
  /** The label: plain text or light markup, no interactive content. */
  label: ReactNode;
  /**
   * Plain text of the node for typeahead, when the label is not plain text (an icon, an amount,
   * markup) or should be found by a reading (romaji or kana for a kanji label).
   */
  textValue?: string | undefined;
  /** A second line under the label, read as the node's description. */
  description?: ReactNode | undefined;
  /** A short trailing detail (a count, a size), read as part of the description. */
  meta?: ReactNode | undefined;
  /** The loaded child nodes. */
  children?: readonly TreeNode[] | undefined;
  /** `true` with no `children` marks a branch whose children load on demand. */
  hasChildren?: boolean | undefined;
  /** The node cannot be selected, checked or toggled by the user, and the keyboard skips it. */
  disabled?: boolean | undefined;
  /** `false` removes selection and the check mark from the node (a folder that only groups). */
  selectable?: boolean | undefined;
}

/** The checkbox state of a node: `mixed` for a parent with some, not all, of its children checked. */
export type CheckState = "checked" | "unchecked" | "mixed";

/** A node with its place in the tree. */
export interface TreeEntry {
  node: TreeNode;
  id: string;
  parentId: string | null;
  /** 1-based depth. */
  level: number;
  /** Number of siblings in the level, including this node. */
  setSize: number;
  /** 1-based position among the siblings. */
  posInSet: number;
}

export interface TreeIndex {
  roots: readonly TreeNode[];
  /** Every loaded node by id (the first one wins when an id is repeated). */
  entries: ReadonlyMap<string, TreeEntry>;
  /** Every loaded node id in depth-first order, closed branches included. */
  order: readonly string[];
  /** Ids used more than once, for a development warning. */
  duplicates: readonly string[];
}

export const hasLoadedChildren = (node: TreeNode): boolean => (node.children?.length ?? 0) > 0;

/** A node that can open: it has children, or its children can be loaded. */
export const isBranch = (node: TreeNode): boolean =>
  hasLoadedChildren(node) || node.hasChildren === true;

/** A branch whose children have not been loaded yet. */
export const needsLoading = (node: TreeNode): boolean =>
  node.hasChildren === true && !hasLoadedChildren(node);

export const isSelectable = (node: TreeNode): boolean => node.selectable !== false;

/** Selectable and enabled: the nodes a click, a key or a cascade can change. */
export const isEligible = (node: TreeNode): boolean =>
  node.selectable !== false && node.disabled !== true;

/** Indexes the tree: every loaded node with its level, siblings, parent and depth-first order. */
export function indexTree(items: readonly TreeNode[]): TreeIndex {
  const entries = new Map<string, TreeEntry>();
  const order: string[] = [];
  const duplicates: string[] = [];
  const walk = (nodes: readonly TreeNode[], parentId: string | null, level: number) => {
    nodes.forEach((node, i) => {
      if (entries.has(node.id)) {
        duplicates.push(node.id);
      } else {
        entries.set(node.id, {
          node,
          id: node.id,
          parentId,
          level,
          setSize: nodes.length,
          posInSet: i + 1,
        });
        order.push(node.id);
      }
      if (node.children) walk(node.children, node.id, level + 1);
    });
  };
  walk(items, null, 1);
  return { roots: items, entries, order, duplicates };
}

/**
 * The rows a reader can see: the roots, and the children of every open branch, in order. Pure
 * model of the DOM (collapsed branches are not rendered), so it can be tested without one and
 * is the seam for a windowed tree.
 */
export function flattenTree(
  items: readonly TreeNode[],
  expanded: ReadonlySet<string>,
): TreeEntry[] {
  const rows: TreeEntry[] = [];
  const walk = (nodes: readonly TreeNode[], parentId: string | null, level: number) => {
    nodes.forEach((node, i) => {
      rows.push({ node, id: node.id, parentId, level, setSize: nodes.length, posInSet: i + 1 });
      if (node.children && expanded.has(node.id)) walk(node.children, node.id, level + 1);
    });
  };
  walk(items, null, 1);
  return rows;
}

/** The ids of a node's ancestors, nearest first. */
export function ancestorsOf(index: TreeIndex, id: string): string[] {
  const out: string[] = [];
  let parent = index.entries.get(id)?.parentId ?? null;
  while (parent !== null) {
    out.push(parent);
    parent = index.entries.get(parent)?.parentId ?? null;
  }
  return out;
}

/** The nearest ancestor (or the node itself) that is among the visible ids; `null` when none is. */
export function nearestVisibleAncestor(
  index: TreeIndex,
  visible: ReadonlySet<string>,
  id: string,
): string | null {
  if (visible.has(id)) return id;
  return ancestorsOf(index, id).find((a) => visible.has(a)) ?? null;
}

/** The nodes that share a parent with `id` (itself included), in order. */
export function siblingsOf(index: TreeIndex, id: string): readonly TreeNode[] {
  const entry = index.entries.get(id);
  if (!entry) return [];
  return entry.parentId === null
    ? index.roots
    : (index.entries.get(entry.parentId)?.node.children ?? []);
}

/**
 * The nodes whose state decides a parent's: its eligible descendants, looking through the
 * disabled and `selectable: false` nodes in between (a grouping folder is transparent).
 */
function participantsOf(node: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  for (const child of node.children ?? []) {
    if (isEligible(child)) out.push(child);
    else out.push(...participantsOf(child));
  }
  return out;
}

/** The ids a click on this node's box reaches: itself and all the eligible nodes under it. */
function branchIds(node: TreeNode): string[] {
  const out = [node.id];
  for (const p of participantsOf(node)) out.push(...branchIds(p));
  return out;
}

/**
 * With cascade a parent in the value stands for all the nodes under it: expands them, so the
 * value can be read bottom-up. Disabled nodes keep what they were given.
 */
function expandChecked(index: TreeIndex, value: readonly string[], cascade: boolean): Set<string> {
  const out = new Set(value);
  if (!cascade) return out;
  for (const id of value) {
    const entry = index.entries.get(id);
    if (entry && isEligible(entry.node)) {
      for (const below of branchIds(entry.node)) out.add(below);
    }
  }
  return out;
}

/**
 * The checkbox state of every selectable node. Without `cascade` a node is checked when its id
 * is in the value. With it, a parent is derived from the eligible nodes under it (checked when
 * all are, mixed when some are); a parent with none (all disabled, or children not loaded yet)
 * is checked by its own id.
 */
export function checkedStates(
  index: TreeIndex,
  value: readonly string[],
  cascade: boolean,
): Map<string, CheckState> {
  const own = expandChecked(index, value, cascade);
  const memo = new Map<string, CheckState>();
  const get = (node: TreeNode): CheckState => {
    const known = memo.get(node.id);
    if (known) return known;
    const below = cascade && isEligible(node) ? participantsOf(node) : [];
    let state: CheckState;
    if (below.length === 0) {
      state = own.has(node.id) ? "checked" : "unchecked";
    } else {
      const states = below.map(get);
      state = states.every((s) => s === "checked")
        ? "checked"
        : states.every((s) => s === "unchecked")
          ? "unchecked"
          : "mixed";
    }
    memo.set(node.id, state);
    return state;
  };
  const out = new Map<string, CheckState>();
  for (const id of index.order) {
    const node = index.entries.get(id)?.node;
    if (node && isSelectable(node)) out.set(id, get(node));
  }
  return out;
}

/**
 * Normalises a checked value: every id whose state is checked stays, in the order it had; ids
 * that are no longer checked (a parent that became mixed) go; newly checked parents follow in
 * tree order. Ids the tree does not know are kept.
 */
export function normalizeChecked(
  index: TreeIndex,
  value: readonly string[],
  cascade: boolean,
): string[] {
  const states = checkedStates(index, value, cascade);
  const out = new Set<string>();
  for (const id of expandChecked(index, value, cascade)) {
    const entry = index.entries.get(id);
    if (!entry) out.add(id);
    else if (states.get(id) === "checked") out.add(id);
  }
  for (const [id, state] of states) if (state === "checked") out.add(id);
  return [...out];
}

/**
 * Checks or unchecks a node and, with `cascade`, everything eligible under it; parents follow
 * their children. Returns the normalised value; the same value when the node cannot change.
 */
export function cascadeCheck(
  index: TreeIndex,
  value: readonly string[],
  id: string,
  on: boolean,
  cascade = true,
): string[] {
  const entry = index.entries.get(id);
  if (!entry || !isEligible(entry.node)) return [...value];
  const set = expandChecked(index, value, cascade);
  for (const target of cascade ? branchIds(entry.node) : [id]) {
    if (on) set.add(target);
    else set.delete(target);
  }
  if (cascade && !on) {
    // A parent that stood for all its children no longer does: the siblings are already explicit.
    for (const a of ancestorsOf(index, id)) {
      const node = index.entries.get(a)?.node;
      if (node && isEligible(node)) set.delete(a);
    }
  }
  return cascade ? normalizeChecked(index, [...set], true) : [...set];
}

/** Every enabled selectable loaded node, closed branches included, in tree order. */
export function eligibleIds(index: TreeIndex): string[] {
  return index.order.filter((id) => {
    const entry = index.entries.get(id);
    return entry !== undefined && isEligible(entry.node);
  });
}
