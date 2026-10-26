import { useCallback } from "react";
import { flushSync } from "react-dom";

import { prefersReducedMotion } from "./reducedMotion";

/** Which way the shoji slides: `forward` (next) or `back` (previous). */
export type ViewTransitionDirection = "forward" | "back";

export interface ViewTransitionOptions {
  /**
   * Sets `data-ol-vt` on `<html>` while the transition runs, so the CSS can slide the right way.
   * @default "forward"
   */
  direction?: ViewTransitionDirection;
  /**
   * The element that changes. When it sits inside `.ol-reduce-motion` (an in-app setting), the
   * change is direct, as under `prefers-reduced-motion`.
   */
  element?: Element | null;
}

/** The attribute that marks an Olivine view transition on the document root. */
export const VIEW_TRANSITION_ATTR = "data-ol-vt";

let current: object | null = null;

/**
 * Runs `update` inside a View Transition when the browser has the API and the user does not ask
 * for reduced motion; otherwise runs it straight away (the change is direct). Resolves when the
 * transition has finished. `update` must change the DOM synchronously.
 */
export function startViewTransition(
  update: () => void,
  options: ViewTransitionOptions = {},
): Promise<void> {
  if (
    typeof document === "undefined" ||
    typeof document.startViewTransition !== "function" ||
    prefersReducedMotion(options.element)
  ) {
    update();
    return Promise.resolve();
  }

  const root = document.documentElement;
  const token = {};
  current = token;
  root.setAttribute(VIEW_TRANSITION_ATTR, options.direction ?? "forward");
  const transition = document.startViewTransition(update);
  const cleanup = () => {
    // A newer transition owns the attribute now.
    if (current !== token) return;
    current = null;
    root.removeAttribute(VIEW_TRANSITION_ATTR);
  };
  return transition.finished.then(cleanup, cleanup);
}

/**
 * React flavour of `startViewTransition`: state updates made in `update` are flushed inside the
 * transition, so the new snapshot shows them.
 */
export function useViewTransition(): (
  update: () => void,
  options?: ViewTransitionOptions,
) => Promise<void> {
  return useCallback(
    (update: () => void, options?: ViewTransitionOptions) =>
      startViewTransition(() => {
        flushSync(update);
      }, options),
    [],
  );
}
