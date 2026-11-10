import { type RefObject, useEffect, useState } from "react";

/** Where a scroller has content beyond its box. `start` / `end` are logical (they flip in RTL). */
export interface ScrollEdges {
  /** Content is wider than the box. */
  x: boolean;
  /** Content is taller than the box. */
  y: boolean;
  /** More content before the visible part on the inline-start side. */
  xStart: boolean;
  /** More content after the visible part on the inline-end side. */
  xEnd: boolean;
  /** More content above the visible part. */
  yStart: boolean;
  /** More content below the visible part. */
  yEnd: boolean;
}

export const NO_EDGES: ScrollEdges = {
  x: false,
  y: false,
  xStart: false,
  xEnd: false,
  yStart: false,
  yEnd: false,
};

/** Sub-pixel scroll positions (zoom, fractional sizes) count as "at the edge". */
const EDGE_TOLERANCE = 1;

/** Reads the overflow and edges of `box` right now. */
export function measureScrollEdges(box: HTMLElement): ScrollEdges {
  const maxX = box.scrollWidth - box.clientWidth;
  const maxY = box.scrollHeight - box.clientHeight;
  const x = maxX > EDGE_TOLERANCE;
  const y = maxY > EDGE_TOLERANCE;
  // In RTL `scrollLeft` runs from 0 to -max; its absolute value is the distance from the start.
  const left = Math.abs(box.scrollLeft);
  const top = box.scrollTop;
  return {
    x,
    y,
    xStart: x && left > EDGE_TOLERANCE,
    xEnd: x && maxX - left > EDGE_TOLERANCE,
    yStart: y && top > EDGE_TOLERANCE,
    yEnd: y && maxY - top > EDGE_TOLERANCE,
  };
}

function sameEdges(a: ScrollEdges, b: ScrollEdges): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.xStart === b.xStart &&
    a.xEnd === b.xEnd &&
    a.yStart === b.yStart &&
    a.yEnd === b.yEnd
  );
}

/**
 * Overflow and edge state of a native scroller. Re-measured when the scroller or any of its
 * direct children changes size, when children are added or removed, and on scroll (passive, at
 * most once per frame). Without `ResizeObserver` (server render, jsdom) it measures once on mount
 * and on scroll only.
 */
export function useScrollEdges(
  scroller: RefObject<HTMLElement | null>,
  { enabled = true }: { enabled?: boolean } = {},
): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NO_EDGES);

  useEffect(() => {
    const box = scroller.current;
    if (!enabled || !box) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = measureScrollEdges(box);
      setEdges((prev) => (sameEdges(prev, next) ? prev : next));
    };
    const schedule = () => {
      if (frame) return;
      frame =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(measure)
          : (measure(), 0);
    };
    measure();
    box.addEventListener("scroll", schedule, { passive: true });

    let resize: ResizeObserver | undefined;
    let mutation: MutationObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(schedule);
      resize = observer;
      const observeAll = () => {
        observer.disconnect();
        observer.observe(box);
        for (const child of Array.from(box.children)) observer.observe(child);
      };
      observeAll();
      if (typeof MutationObserver !== "undefined") {
        mutation = new MutationObserver(() => {
          observeAll();
          schedule();
        });
        mutation.observe(box, { childList: true });
      }
    }

    return () => {
      box.removeEventListener("scroll", schedule);
      resize?.disconnect();
      mutation?.disconnect();
      if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
    };
  }, [scroller, enabled]);

  return edges;
}
