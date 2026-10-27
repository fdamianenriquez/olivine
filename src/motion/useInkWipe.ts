import { type RefCallback, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "../hooks/useFloating";

/** The custom properties useInkWipe writes: the ink's edges on the group, each item's offset. */
export const INK_WIPE_PROPERTIES = ["--ol-ink-l", "--ol-ink-r", "--ol-ink-x"] as const;

interface Edges {
  l: number;
  r: number;
}

/** An item's border box, which the ink covers (it bleeds over the item's own hairline). */
function outer(item: HTMLElement, origin: number): Edges {
  const rect = item.getBoundingClientRect();
  return { l: rect.left - origin, r: rect.right - origin };
}

/** Writes the selected item's edges on the group and each item's offset; returns the edges. */
function measure(group: HTMLElement, active: number, previous: Edges | null): Edges {
  const origin = group.getBoundingClientRect().left;
  const items = group.querySelectorAll<HTMLElement>(".ol-ink-wipe");
  items.forEach((item) => {
    item.style.setProperty("--ol-ink-x", `${String(outer(item, origin).l)}px`);
  });
  const target = active >= 0 ? items[active] : undefined;
  let edges: Edges;
  if (target) {
    edges = outer(target, origin);
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
 *
 * The group is `data-ink-wipe="moving"` only while the ink travels; at rest the selected item is
 * inked whole, so no fractional clip edge is left for a browser to antialias (Safari).
 */
export function useInkWipe<T extends HTMLElement = HTMLElement>(active: number): RefCallback<T> {
  const [node, setNode] = useState<T | null>(null);
  const edges = useRef<Edges | null>(null);
  const shown = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!node) return;
    const moved = node.hasAttribute("data-ink-wipe") && shown.current !== active;
    shown.current = active;
    edges.current = measure(node, active, edges.current);
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (moved) {
      node.setAttribute("data-ink-wipe", "moving");
      const token = getComputedStyle(node).getPropertyValue("--dur-m").trim();
      const duration = (parseFloat(token) || 300) * (/[^m]s$/.test(token) ? 1000 : 1);
      timer = setTimeout(() => {
        node.setAttribute("data-ink-wipe", "ready");
      }, duration + 50);
    } else if (!node.hasAttribute("data-ink-wipe")) {
      // Travel only after the first position is in place, so the ink never sweeps in from the edge.
      frame = requestAnimationFrame(() => {
        node.setAttribute("data-ink-wipe", "ready");
      });
    }
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            edges.current = measure(node, active, edges.current);
          })
        : null;
    observer?.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [node, active]);

  return setNode;
}
