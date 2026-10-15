import { type RefObject, useEffect } from "react";

/**
 * Calls `onDismiss` on Escape and on a pointer press outside every element in `refs`,
 * while `open` is true.
 */
export function useDismiss(
  open: boolean,
  onDismiss: (reason: "escape" | "outside") => void,
  refs: RefObject<Element | null>[],
): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss("escape");
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (refs.some((ref) => ref.current?.contains(target ?? null))) return;
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
  }, [open, onDismiss]);
}
