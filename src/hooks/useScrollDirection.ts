import { type RefObject, useEffect, useState } from "react";

import { prefersReducedMotion } from "../motion/reducedMotion";

/** Scroll distance in px that counts as a change of direction, so jitter does not flip it. */
export const SCROLL_HYSTERESIS = 4;

export interface ScrollDirectionOptions {
  /** Watches only while true. */
  enabled?: boolean;
  /** The scrolling element. Defaults to the window. */
  target?: RefObject<HTMLElement | null> | undefined;
  /**
   * Element whose reduced-motion setting counts (the app root can carry an in-app setting that
   * the media query does not know). Under reduced motion the direction never becomes `down`.
   */
  motionAnchor?: RefObject<HTMLElement | null>;
}

/**
 * Whether the user last scrolled down. Moves of less than a few pixels are ignored; scrolling
 * up resets it. Under reduced motion it stays false, so scroll-linked effects never run.
 */
export function useScrollDirection({
  enabled = true,
  target,
  motionAnchor,
}: ScrollDirectionOptions = {}): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const element = target?.current ?? null;
    const source: HTMLElement | Window = element ?? window;
    const top = () => (element ? element.scrollTop : window.scrollY);
    let last = top();
    const onScroll = () => {
      const y = top();
      if (Math.abs(y - last) < SCROLL_HYSTERESIS) return;
      const goingDown = y > last;
      last = y;
      if (goingDown && prefersReducedMotion(motionAnchor?.current ?? null)) return;
      setDown(goingDown);
    };
    source.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      source.removeEventListener("scroll", onScroll);
    };
  }, [enabled, target, motionAnchor]);
  return enabled && down;
}
