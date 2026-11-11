import { autoUpdate } from "@floating-ui/dom";
import { useMemo, useRef } from "react";

import { useIsomorphicLayoutEffect, type VirtualAnchor } from "../../hooks/useFloating";
import { tokens } from "../../tokens";

/** Room left around the target: the `space-2` token, overridable with `--ol-tour-pad`. */
const PAD = Number.parseFloat(tokens.space["space-2"]);

/**
 * Fallback for clearing the step-change flag when no `transitionend` arrives (an interrupted
 * or skipped transition). It must stay longer than `--dur-m`, the slide's duration.
 */
const MOVE_TIMEOUT = 1000;

/** The hole's edges, written on the mask (or the frame) as `--ol-tour-x1` … `--ol-tour-y2`. */
export const RECT_PROPERTIES = ["--ol-tour-x1", "--ol-tour-y1", "--ol-tour-x2", "--ol-tour-y2"];

function readPad(node: Element | null): number {
  if (!node) return PAD;
  const value = Number.parseFloat(getComputedStyle(node).getPropertyValue("--ol-tour-pad"));
  return Number.isFinite(value) ? value : PAD;
}

function padded(element: Element, pad: number): DOMRect {
  const rect = element.getBoundingClientRect();
  const left = rect.left - pad;
  const top = rect.top - pad;
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;
  const box = {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
  return { ...box, toJSON: () => box };
}

/**
 * Follows the target's padded box while `active`: writes its edges on `surface` as custom
 * properties (no React state per frame) on scroll, resize and layout shifts, and returns a
 * stable virtual anchor for the card. Without a target the box collapses to the centre of the
 * viewport (the hole closes). When the target changes after the first write, `surface` gets
 * `data-moving` until its transition ends, so the hole slides only between steps. `mirror`
 * gets the same edges without the slide (the forced-colours outline of the hole).
 */
export function useTargetRect(
  element: HTMLElement | null,
  active: boolean,
  surface: HTMLElement | null,
  mirror: HTMLElement | null = null,
): VirtualAnchor | null {
  // The surface the hole was last written on: a new one (the tour reopened) starts in place.
  const wrote = useRef<HTMLElement | null>(null);
  const latest = useRef(surface);

  useIsomorphicLayoutEffect(() => {
    latest.current = surface;
  });

  useIsomorphicLayoutEffect(() => {
    if (!active || !surface) return;
    const write = () => {
      let x1: number;
      let y1: number;
      let x2: number;
      let y2: number;
      if (element) {
        const rect = padded(element, readPad(surface));
        x1 = rect.left;
        y1 = rect.top;
        x2 = rect.right;
        y2 = rect.bottom;
      } else {
        x1 = x2 = window.innerWidth / 2;
        y1 = y2 = window.innerHeight / 2;
      }
      const values = [x1, y1, x2, y2];
      RECT_PROPERTIES.forEach((name, i) => {
        surface.style.setProperty(name, `${String(values[i])}px`);
        mirror?.style.setProperty(name, `${String(values[i])}px`);
      });
    };

    let timer = 0;
    const settle = (event?: Event) => {
      if (event && event.target !== surface) return;
      window.clearTimeout(timer);
      surface.removeAttribute("data-moving");
    };
    if (wrote.current === surface) {
      surface.setAttribute("data-moving", "");
      surface.addEventListener("transitionend", settle);
      surface.addEventListener("transitioncancel", settle);
      timer = window.setTimeout(settle, MOVE_TIMEOUT);
    }
    write();
    wrote.current = surface;

    let stop: () => void;
    if (element) {
      stop = autoUpdate(element, surface, write);
    } else {
      window.addEventListener("resize", write);
      stop = () => {
        window.removeEventListener("resize", write);
      };
    }
    return () => {
      stop();
      window.clearTimeout(timer);
      surface.removeEventListener("transitionend", settle);
      surface.removeEventListener("transitioncancel", settle);
    };
  }, [element, active, surface, mirror]);

  return useMemo<VirtualAnchor | null>(
    () =>
      element
        ? {
            getBoundingClientRect: () => padded(element, readPad(latest.current)),
            contextElement: element,
          }
        : null,
    [element],
  );
}
