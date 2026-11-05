import type { ReactNode } from "react";

import { devWarn } from "../../utils/dev";

/** One entry of a {@link TableOfContents}: a heading of the document. */
export interface TableOfContentsItem {
  /** The `id` of the heading in the page. Also the key of the entry, so it must be unique. */
  id: string;
  /** The text of the link, usually the heading's own text. */
  label: ReactNode;
  /**
   * The heading level (2 for an `h2`) or any positive integer. Nesting is derived from it
   * relative to the smallest level in the list. @default 1
   */
  level?: number;
  /** Overrides the default `#id` target, for a document served under a base path. */
  href?: string;
}

/** How many nested levels a list can show. */
export type TableOfContentsDepth = 1 | 2 | 3;

/** An entry with its place in the tree. */
export interface TocEntry {
  item: TableOfContentsItem;
  /** Zero for the top level. Never more than the previous entry's depth plus one. */
  depth: number;
  /** The `id` of the closest entry above with a smaller depth, or null at the top level. */
  parent: string | null;
}

/** An entry with its children, ready to render as nested lists. */
export interface TocNode extends TocEntry {
  children: TocNode[];
}

export interface TocTree {
  /** Every item with a usable id, in order, with its depth (also the ones `maxDepth` hides). */
  all: TocEntry[];
  /** The entries that are shown, in order. */
  visible: TocEntry[];
  /** The shown entries as a forest. */
  roots: TocNode[];
}

function normaliseLevel(level: number | undefined): number {
  if (level === undefined || !Number.isFinite(level)) return 1;
  return Math.max(1, Math.round(level));
}

/**
 * Turns the flat list into a tree. Levels are taken relative to the smallest one, a jump of
 * more than one level counts as one step deeper, entries deeper than `maxDepth` are hidden and
 * a repeated id is skipped (the first one wins).
 */
export function buildTree(
  items: readonly TableOfContentsItem[],
  maxDepth: TableOfContentsDepth = 2,
): TocTree {
  const limit = Math.min(3, Math.max(1, Math.round(maxDepth)));
  const seen = new Set<string>();
  const usable: TableOfContentsItem[] = [];
  for (const item of items) {
    if (item.id === "" || seen.has(item.id)) {
      devWarn("TableOfContents", `skipped "${item.id}": ids must be unique and not empty`);
      continue;
    }
    seen.add(item.id);
    usable.push(item);
  }

  const smallest = usable.reduce((min, it) => Math.min(min, normaliseLevel(it.level)), Infinity);
  const all: TocEntry[] = [];
  // The entry that is the latest one at each depth: the parent candidates.
  const trail: TocEntry[] = [];
  let previous = -1;
  for (const item of usable) {
    const depth = Math.min(normaliseLevel(item.level) - smallest, previous + 1);
    const parent = depth > 0 ? (trail[depth - 1]?.item.id ?? null) : null;
    const entry: TocEntry = { item, depth, parent };
    trail.length = depth;
    trail[depth] = entry;
    previous = depth;
    all.push(entry);
  }

  const visible = all.filter((entry) => entry.depth < limit);
  const roots: TocNode[] = [];
  const nodes = new Map<string, TocNode>();
  for (const entry of visible) {
    const node: TocNode = { ...entry, children: [] };
    nodes.set(entry.item.id, node);
    const parent = entry.parent === null ? undefined : nodes.get(entry.parent);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return { all, visible, roots };
}

/**
 * The visible entry an id stands for: the entry itself, or for an entry that `maxDepth` hides
 * the closest visible entry above it (its section belongs to that one). Null when the id is
 * unknown.
 */
export function resolveEntry(tree: TocTree, id: string | null): TocEntry | null {
  if (id === null) return null;
  const at = tree.all.findIndex((entry) => entry.item.id === id);
  if (at < 0) return null;
  for (let i = at; i >= 0; i -= 1) {
    const entry = tree.all[i];
    if (entry && tree.visible.includes(entry)) return entry;
  }
  return null;
}

/** The ids of the entries above `entry`, from the top level down. */
export function ancestorsOf(tree: TocTree, entry: TocEntry | null): Set<string> {
  const parents = new Map(tree.all.map((e) => [e.item.id, e.parent]));
  const out = new Set<string>();
  let parent = entry?.parent ?? null;
  while (parent !== null && !out.has(parent)) {
    out.add(parent);
    parent = parents.get(parent) ?? null;
  }
  return out;
}
