import type { ReactNode } from "react";

import { rankMatch } from "../../utils/rankMatch";
import type { Shortcut } from "../Kbd";

export interface CommandPaletteItem {
  /** Stable identity of the row. */
  id: string;
  /** Visible name of the command. Matched letters are highlighted. */
  label: string;
  /** Secondary text at the end of the row: a kind, a status, a path. */
  meta?: ReactNode;
  /** The command's own shortcut, drawn as keycaps: `"mod+n"`, `["mod", "shift", "p"]`. */
  kbd?: Shortcut;
  /** Extra search terms (synonyms, old names). Matched like the label, but ranked below it. */
  keywords?: string | readonly string[];
  /** Runs when the row is chosen with Enter or a click. The palette closes first. */
  onSelect?: () => void;
}

export interface CommandPaletteGroup {
  /** Heading of the group. It also names the group for assistive tech. */
  label: string;
  items: readonly CommandPaletteItem[];
}

export interface RankedItem {
  item: CommandPaletteItem;
  /** Matched characters of `item.label` (user-perceived characters); empty for no highlight. */
  indices: readonly number[];
  score: number;
}

export interface RankedGroup {
  /** Position of the group in the `groups` prop. */
  key: number;
  label: string;
  items: RankedItem[];
}

/** Scores are small, so this puts every keyword-only match below every label match. */
const KEYWORD_PENALTY = 1000;

function termsOf(keywords: CommandPaletteItem["keywords"]): readonly string[] {
  if (keywords === undefined) return [];
  return typeof keywords === "string" ? [keywords] : keywords;
}

function rankItem(item: CommandPaletteItem, query: string, lang: string): RankedItem | null {
  const own = rankMatch(item.label, query, lang);
  if (own) return { item, indices: own.indices, score: own.score };
  let best: number | null = null;
  for (const term of termsOf(item.keywords)) {
    const hit = rankMatch(term, query, lang);
    if (hit && (best === null || hit.score > best)) best = hit.score;
  }
  return best === null ? null : { item, indices: [], score: best - KEYWORD_PENALTY };
}

/**
 * Filters and orders the groups for a query. Every typed character must appear in order in the
 * label or in a keyword. Rows are ranked by match quality, and the group holding the best match
 * moves to the top; ties keep the order the app gave. An empty query keeps everything in place.
 * Groups with no row left are dropped.
 */
export function rankGroups(
  groups: readonly CommandPaletteGroup[],
  query: string,
  lang = "",
): RankedGroup[] {
  const searching = query.trim() !== "";
  const out: RankedGroup[] = [];
  groups.forEach((group, key) => {
    const items: RankedItem[] = [];
    for (const item of group.items) {
      if (!searching) {
        items.push({ item, indices: [], score: 0 });
        continue;
      }
      const ranked = rankItem(item, query, lang);
      if (ranked) items.push(ranked);
    }
    if (searching) items.sort((a, b) => b.score - a.score);
    if (items.length > 0) out.push({ key, label: group.label, items });
  });
  if (searching) {
    const top = (group: RankedGroup) => group.items[0]?.score ?? -Infinity;
    out.sort((a, b) => top(b) - top(a));
  }
  return out;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Splits a label into runs, each flagged when it holds matched characters. */
export function highlightRuns(
  text: string,
  indices: readonly number[],
): { text: string; hit: boolean }[] {
  if (indices.length === 0) return [{ text, hit: false }];
  const hits = new Set(indices);
  const runs: { text: string; hit: boolean }[] = [];
  let current: { text: string; hit: boolean } | undefined;
  let index = 0;
  for (const { segment } of segmenter.segment(text)) {
    const hit = hits.has(index);
    if (current?.hit === hit) {
      current.text += segment;
    } else {
      current = { text: segment, hit };
      runs.push(current);
    }
    index += 1;
  }
  return runs;
}
