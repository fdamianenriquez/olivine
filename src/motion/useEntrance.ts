import { type RefCallback, useCallback, useState } from "react";

import { useIsomorphicLayoutEffect } from "../hooks/useFloating";

export interface EntranceOptions {
  /**
   * Share that must be visible before the entrance plays: of the element's height, or of the
   * viewport's height for an element taller than the viewport (whichever is smaller), so a very
   * tall section still opens.
   * @default 0.2
   */
  threshold?: number;
}

export interface Entrance<T extends Element> {
  /** Callback ref for the `.ol-johakyu` (or `.ol-stagger`, `.ol-mokuhanga`, `.ol-shodo`) element. */
  setElement: RefCallback<T>;
  /** Plays the entrance again from the start. */
  replay: () => void;
}

/** Restarts every CSS animation on the element, its descendants and their pseudo-elements. */
export function replayAnimations(element: Element | null): void {
  if (!element || typeof element.getAnimations !== "function") return;
  for (const animation of element.getAnimations({ subtree: true })) {
    animation.cancel();
    animation.play();
  }
}

/** True when the visible height reaches `threshold` of the element or of the viewport. */
function entered(entry: IntersectionObserverEntry, threshold: number): boolean {
  if (!entry.isIntersecting) return false;
  const height = entry.boundingClientRect.height;
  const viewport = entry.rootBounds?.height ?? window.innerHeight;
  if (height === 0) return true;
  // Half a pixel of slack for sub-pixel layout.
  return entry.intersectionRect.height + 0.5 >= Math.min(threshold * height, threshold * viewport);
}

/** The intersection ratio at which `entered` can first be true for this element. */
function ratioFor(node: Element, threshold: number): number {
  const height = node.getBoundingClientRect().height;
  if (!(height > 0)) return threshold;
  return Math.min(threshold, (threshold * window.innerHeight) / height);
}

/**
 * Holds an entrance (jo-ha-kyū, stagger, shodō, mokuhanga) until the element scrolls into view,
 * then plays it once. It is triggered by visibility, not scrubbed by scroll. Without
 * IntersectionObserver, or before hydration, the entrance plays on mount.
 */
export function useEntrance<T extends Element = HTMLElement>({
  threshold = 0.2,
}: EntranceOptions = {}): Entrance<T> {
  const [node, setNode] = useState<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!node || typeof IntersectionObserver !== "function") return;
    node.setAttribute("data-enter", "wait");
    let observer: IntersectionObserver | null = null;
    const watch = () => {
      observer?.disconnect();
      const ratio = ratioFor(node, threshold);
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entered(entry, threshold))) {
            node.setAttribute("data-enter", "in");
            observer?.disconnect();
          } else if (Math.abs(ratioFor(node, threshold) - ratio) > 0.001) {
            // The element or the viewport changed size since the ratio was chosen.
            watch();
          }
        },
        { threshold: ratio > 0 ? [0, ratio] : [0] },
      );
      observer.observe(node);
    };
    watch();
    return () => {
      observer?.disconnect();
      node.removeAttribute("data-enter");
    };
  }, [node, threshold]);

  const replay = useCallback(() => {
    replayAnimations(node);
  }, [node]);

  return { setElement: setNode, replay };
}
