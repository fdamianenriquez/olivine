import { afterEach, beforeEach } from "vitest";

/**
 * jsdom has no `getAnimations`, so `usePresence` would wait for its timeout before unmounting
 * a closing element. Report "nothing animating" instead, as a browser does for an element
 * without exit motion.
 */
export function stubNoAnimations(): void {
  let had = false;
  beforeEach(() => {
    had = "getAnimations" in Element.prototype;
    if (!had) Element.prototype.getAnimations = () => [];
  });
  afterEach(() => {
    if (!had) delete (Element.prototype as Partial<Element>).getAnimations;
  });
}
