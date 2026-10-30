import type { Placement } from "@floating-ui/dom";
import type { CSSProperties } from "react";

import { type OverlaySide, sideOf } from "../motion/shapes";
import { useFloating, type VirtualAnchor } from "./useFloating";

export interface MenuPositionOptions {
  /** Pass the menu's `mounted`, so it keeps its place while the exit motion plays. */
  open: boolean;
  /** @default "bottom-start" */
  placement?: Placement;
  gap?: number;
  crossOffset?: number;
  /** A point to open at instead of the anchor element (a context menu). */
  anchor?: VirtualAnchor | null;
  /** The menu is at least as wide as its anchor (a split button's whole bar). */
  matchWidth?: boolean;
}

export interface MenuPosition<A extends HTMLElement, M extends HTMLElement> {
  /** Callback ref for the element the menu lines up with (the trigger, or a wider root). */
  setAnchor: (node: A | null) => void;
  /** Callback ref for the menu. */
  setFloating: (node: M | null) => void;
  /** Spread on the menu with the `ol-floating` class. */
  props: {
    style: CSSProperties;
    "data-side": OverlaySide;
    "data-align": "start" | "end" | "center";
    "data-positioned"?: "";
    "data-match-width"?: "";
  };
}

/**
 * Positions a menu next to its anchor with flip and shift, and measures the room left so a
 * long menu caps its height and scrolls. The anchor may differ from the trigger.
 */
export function useMenuPosition<A extends HTMLElement, M extends HTMLElement>({
  open,
  placement = "bottom-start",
  gap,
  crossOffset,
  anchor,
  matchWidth = false,
}: MenuPositionOptions): MenuPosition<A, M> {
  const floating = useFloating<A, M>({
    open,
    placement,
    size: true,
    ...(gap === undefined ? null : { gap }),
    ...(crossOffset === undefined ? null : { crossOffset }),
    ...(anchor === undefined ? null : { anchor }),
  });
  const align = floating.placement.split("-")[1];
  return {
    setAnchor: floating.setReference,
    setFloating: floating.setFloating,
    props: {
      style: floating.style,
      "data-side": sideOf(floating.placement),
      "data-align": align === "start" || align === "end" ? align : "center",
      ...(floating.positioned ? { "data-positioned": "" } : null),
      ...(matchWidth ? { "data-match-width": "" } : null),
    },
  };
}
