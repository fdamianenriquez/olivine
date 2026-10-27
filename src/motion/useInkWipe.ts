import { type RefCallback, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "../hooks/useFloating";

/** The custom properties useInkWipe writes: the ink's edges on the group, each item's offset. */
export const INK_WIPE_PROPERTIES = ["--ol-ink-l", "--ol-ink-r", "--ol-ink-x"] as const;

interface Edges {
  l: number;
  r: number;
}

/**
 * Left edge of an item's padding box, where its fill starts. Items that share a border overlap
 * by its width, so measuring the border box would leak a border-wide strip of ink onto the next.
 */
const innerLeft = (item: HTMLElement, origin: number) =>
  item.getBoundingClientRect().left + item.clientLeft - origin;

/** Writes the selected item's edges on the group and each item's offset; returns the edges. */
function measure(group: HTMLElement, active: number, previous: Edges | null): Edges {
  const origin = group.getBoundingClientRect().left;
  const items = group.querySelectorAll<HTMLElement>(".ol-ink-wipe");
  items.forEach((item) => {
    item.style.setProperty("--ol-ink-x", `${String(innerLeft(item, origin))}px`);
  });
  const target = active >= 0 ? items[active] : undefined;
  let edges: Edges;
  if (target) {
    const l = innerLeft(target, origin);
    edges = { l, r: l + target.clientWidth };
  } else {
    // No selection: the ink shrinks to the middle of where it was.
    const middle = previous ? (previous.l + previous.r) / 2 : 0;
    edges = { l: middle, r: middle };
  }
  group.style.setProperty("--ol-ink-l", `${String(edges.l)}px`);
  group.style.setProperty("--ol-ink-r", `${String(edges.r)}px`);
  return edges;
}

/**
 * The ink wipe of a single-choice group (SegmentedControl, ToggleButton groups): one ink travels
 * from the previous selection to the new one, across the items in between. Attach the returned
 * ref to the element that holds the `.ol-ink-wipe` items and pass the selected index (-1 for
 * none), counted in their DOM order. Nothing animates on the first render; without the hook (or
 * before hydration) the selected item is simply inked.
 */
export function useInkWipe<T extends HTMLElement = HTMLElement>(active: number): RefCallback<T> {
  const [node, setNode] = useState<T | null>(null);
  const edges = useRef<Edges | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!node) return;
    edges.current = measure(node, active, edges.current);
    // Travel only after the first position is in place, so the ink never sweeps in from the edge.
    const frame = requestAnimationFrame(() => {
      node.dataset.inkWipe = "ready";
    });
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            edges.current = measure(node, active, edges.current);
          })
        : null;
    observer?.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [node, active]);

  return setNode;
}
