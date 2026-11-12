import { type RefObject, useEffect } from "react";

import { isScrimPress, swallowNextClick } from "../utils/swallowClick";
import { useLayer } from "./layers";

export interface DismissOptions {
  /**
   * A hover layer (Tooltip, HoverCard). It does not swallow the click of a scrim press, and its
   * elements do not count as inside for the layers below it: pressing a button that shows a
   * tooltip still dismisses an open menu. Other layers swallow a scrim press that dismisses them,
   * so a popup in a dialog does not close the dialog as well.
   * @default false
   */
  hover?: boolean;
}

/**
 * Calls `onDismiss` on Escape and on a pointer press outside every element in `refs`,
 * while `open` is true. With several overlays open, only the topmost one answers to Escape.
 * The outside press lands, except on a scrim (see `hover`).
 */
export function useDismiss(
  open: boolean,
  onDismiss: (reason: "escape" | "outside") => void,
  refs: RefObject<Element | null>[],
  { hover = false }: DismissOptions = {},
): void {
  const { isTop, isInAbove } = useLayer(open, () => (hover ? [] : refs.map((ref) => ref.current)));
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && isTop()) onDismiss("escape");
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (refs.some((ref) => ref.current?.contains(target ?? null))) return;
      // A press in a layer opened from this one (a menu in a popover) is not outside it.
      if (isInAbove(target)) return;
      // Only when this layer is the topmost: a scrim above it belongs to a dialog opened later.
      if (!hover && event.button === 0 && isScrimPress(target) && isTop()) {
        swallowNextClick();
      }
      onDismiss("outside");
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
    // refs are stable ref objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onDismiss, hover, isTop, isInAbove]);
}
