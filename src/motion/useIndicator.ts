import { type RefCallback, useState } from "react";

import { useIsomorphicLayoutEffect } from "../hooks/useFloating";

export interface IndicatorOptions {
  /**
   * Finds the active item inside the container.
   * @default '[aria-selected="true"]'
   */
  selector?: string;
}

/** The custom properties useIndicator writes on the container. */
export const INDICATOR_PROPERTIES = [
  "--ol-indicator-x",
  "--ol-indicator-w",
  "--ol-indicator-track",
] as const;

/** Writes the active item's position on the container; the `.ol-indicator` bar reads it. */
function measure(container: HTMLElement, selector: string): void {
  const target = container.querySelector<HTMLElement>(selector);
  if (!target) {
    container.style.setProperty("--ol-indicator-w", "0px");
    return;
  }
  const box = container.getBoundingClientRect();
  const item = target.getBoundingClientRect();
  const x = item.left - box.left - container.clientLeft + container.scrollLeft;
  container.style.setProperty("--ol-indicator-x", `${String(x)}px`);
  container.style.setProperty("--ol-indicator-w", `${String(item.width)}px`);
  container.style.setProperty("--ol-indicator-track", `${String(container.scrollWidth)}px`);
}

/**
 * The sliding bar of tabs and segmented lists: a 3px olivo `.ol-indicator` that slides between
 * items. Attach the returned ref to the positioned container that holds the items and the bar,
 * and pass anything that changes when the active item does (its index or value).
 */
export function useIndicator<T extends HTMLElement = HTMLElement>(
  active: unknown,
  { selector = '[aria-selected="true"]' }: IndicatorOptions = {},
): RefCallback<T> {
  const [node, setNode] = useState<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!node) return;
    measure(node, selector);
    // Slide only after the first position is in place, so the bar never grows in from the edge.
    const frame = requestAnimationFrame(() => {
      node.dataset.indicator = "ready";
    });
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            measure(node, selector);
          })
        : null;
    observer?.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [node, active, selector]);

  return setNode;
}
