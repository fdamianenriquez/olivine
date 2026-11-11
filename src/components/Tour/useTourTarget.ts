import { type RefObject, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";

/**
 * What a tour step points at: a CSS selector, an element, a ref object, or a function that
 * returns the element (or `null` when it is not on the page).
 */
export type TourTarget =
  string | HTMLElement | RefObject<HTMLElement | null> | (() => HTMLElement | null);

/** `none`: the step has no target (a centred step). `pending`: not resolved yet. */
export type TourTargetStatus = "none" | "pending" | "found" | "missing";

/**
 * Resolves a target to an element that is on the page and has a size, or `null`. An invalid
 * selector resolves to `null` too.
 */
export function resolveTarget(target: TourTarget | undefined): HTMLElement | null {
  if (target === undefined || typeof document === "undefined") return null;
  let element: HTMLElement | null;
  if (typeof target === "string") {
    try {
      element = document.querySelector<HTMLElement>(target);
    } catch {
      element = null;
    }
  } else if (typeof target === "function") {
    element = target();
  } else if ("current" in target) {
    element = target.current;
  } else {
    element = target;
  }
  if (!element?.isConnected) return null;
  const rect = element.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0 ? null : element;
}

interface Resolved {
  key: number;
  element: HTMLElement | null;
}

/**
 * Resolves the current step's target while `active`, and keeps watching the page so a target
 * that is removed or hidden while its step is shown turns `missing`. `key` (the step index)
 * says when the step changed, so an inline function target does not re-resolve every render.
 * Mutations inside `ignore` (the tour's own layer) are not watched.
 */
export function useTourTarget(
  target: TourTarget | undefined,
  active: boolean,
  key: number,
  ignore: RefObject<Element | null>,
): { element: HTMLElement | null; status: TourTargetStatus } {
  const latest = useRef(target);
  const hasTarget = target !== undefined;
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useIsomorphicLayoutEffect(() => {
    latest.current = target;
  });

  useIsomorphicLayoutEffect(() => {
    if (!active || !hasTarget) {
      setResolved(null);
      return;
    }
    const check = () => {
      const element = resolveTarget(latest.current);
      setResolved((prev) =>
        prev?.key === key && prev.element === element ? prev : { key, element },
      );
    };
    check();
    if (typeof MutationObserver !== "function") return;
    const observer = new MutationObserver((records) => {
      const layer = ignore.current;
      if (layer && records.every((record) => layer.contains(record.target))) return;
      check();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "class", "style"],
    });
    return () => {
      observer.disconnect();
    };
  }, [active, hasTarget, key, ignore]);

  if (!active || !hasTarget) return { element: null, status: "none" };
  if (resolved?.key !== key) return { element: null, status: "pending" };
  return resolved.element
    ? { element: resolved.element, status: "found" }
    : { element: null, status: "missing" };
}
