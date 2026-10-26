import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Class that forces reduced motion on a subtree (an in-app setting); see styles/motion.css. */
export const REDUCE_MOTION_CLASS = "ol-reduce-motion";

function mediaQuery(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY)
    : null;
}

/**
 * True when the user asks for reduced motion, or when `element` (default: the document root)
 * sits inside `.ol-reduce-motion`. Always false on the server.
 */
export function prefersReducedMotion(element?: Element | null): boolean {
  if (mediaQuery()?.matches) return true;
  if (typeof document === "undefined") return false;
  const target = element ?? document.documentElement;
  return target.closest(`.${REDUCE_MOTION_CLASS}`) !== null;
}

function subscribe(onChange: () => void): () => void {
  const query = mediaQuery();
  if (!query) return () => undefined;
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function snapshot(): boolean {
  return mediaQuery()?.matches ?? false;
}

/** Tracks `prefers-reduced-motion: reduce`. False during server rendering and hydration. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
