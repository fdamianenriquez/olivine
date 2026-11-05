import { type RefCallback, useState } from "react";

import { useIsomorphicLayoutEffect } from "../hooks/useFloating";

export interface IndicatorOptions {
  /**
   * Finds the active item inside the container.
   * @default '[aria-selected="true"]'
   */
  selector?: string;
  /**
   * The axis the bar travels on. `inline` (tabs, segmented lists) writes `--ol-indicator-x` and
   * `--ol-indicator-w`; `block` (a vertical list) writes `--ol-indicator-y` and
   * `--ol-indicator-h`, plus `data-dir="down|up"` for the two-edge stroke.
   * @default "inline"
   */
  axis?: "inline" | "block";
}

/** The custom properties useIndicator writes on the container. */
export const INDICATOR_PROPERTIES = [
  "--ol-indicator-x",
  "--ol-indicator-w",
  "--ol-indicator-y",
  "--ol-indicator-h",
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
 * The block-axis twin of `measure`: the item's top and height, and the track height. `follow`
 * is true when the active item changed (the stroke travels and takes a direction) and false for
 * a layout-only change (resize, font load), which must not animate.
 */
function measureBlock(container: HTMLElement, selector: string, follow: boolean): void {
  const target = container.querySelector<HTMLElement>(selector);
  if (!target) {
    container.style.setProperty("--ol-indicator-h", "0px");
    return;
  }
  const box = container.getBoundingClientRect();
  const item = target.getBoundingClientRect();
  const y = item.top - box.top - container.clientTop + container.scrollTop;
  if (follow) {
    const before = Number.parseFloat(container.style.getPropertyValue("--ol-indicator-y"));
    if (Number.isFinite(before) && before !== y) container.dataset.dir = y > before ? "down" : "up";
  } else {
    // Resize: jump to the new place instead of travelling there.
    container.dataset.indicatorStill = "";
    requestAnimationFrame(() => {
      delete container.dataset.indicatorStill;
    });
  }
  container.style.setProperty("--ol-indicator-y", `${String(y)}px`);
  container.style.setProperty("--ol-indicator-h", `${String(item.height)}px`);
  container.style.setProperty("--ol-indicator-track", `${String(container.scrollHeight)}px`);
}

/**
 * The sliding bar of tabs and segmented lists: a 3px olivo `.ol-indicator` that slides between
 * items. Attach the returned ref to the positioned container that holds the items and the bar,
 * and pass anything that changes when the active item does (its index or value).
 *
 * With `axis: "block"` the bar is `.ol-indicator--block`: a stroke along a vertical list whose
 * leading edge reaches the new item first and whose trailing edge follows.
 */
export function useIndicator<T extends HTMLElement = HTMLElement>(
  active: unknown,
  { selector = '[aria-selected="true"]', axis = "inline" }: IndicatorOptions = {},
): RefCallback<T> {
  const [node, setNode] = useState<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!node) return;
    const block = axis === "block";
    if (block) measureBlock(node, selector, true);
    else measure(node, selector);
    // Slide only after the first position is in place, so the bar never grows in from the edge.
    const frame = requestAnimationFrame(() => {
      node.dataset.indicator = "ready";
    });
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            if (block) measureBlock(node, selector, false);
            else measure(node, selector);
          })
        : null;
    observer?.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [node, active, selector, axis]);

  return setNode;
}
