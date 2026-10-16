import { useCallback, useEffect, useRef, useState } from "react";

import { useLayer } from "./layers";

const TABBABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
].join(",");

/** Marks a body-level layer that must stay reachable under a modal, e.g. the toast region. */
export const KEEP_ACTIVE_ATTR = "data-ol-keep-active";

function tabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.hidden && !el.closest("[inert]"),
  );
}

let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/** Stops the page behind from scrolling and keeps its layout still when the scrollbar goes. */
function lockScroll(): () => void {
  const { body, documentElement } = document;
  if (locks === 0) {
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    if (scrollbar > 0) {
      const current = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${String(current + scrollbar)}px`;
    }
    body.style.overflow = "hidden";
  }
  locks += 1;
  return () => {
    locks -= 1;
    if (locks === 0 && saved) {
      body.style.overflow = saved.overflow;
      body.style.paddingRight = saved.paddingRight;
      saved = null;
    }
  };
}

/** How many open overlays made each body child inert; it is released when the count hits zero. */
const inertCounts = new Map<Element, number>();

/** Makes every body child except the one holding `node` inert, and returns the undo. */
function inertSiblings(node: HTMLElement): () => void {
  let top: HTMLElement = node;
  while (top.parentElement && top.parentElement !== document.body) top = top.parentElement;
  const applied: Element[] = [];
  for (const el of Array.from(document.body.children)) {
    if (el === top || el.hasAttribute(KEEP_ACTIVE_ATTR)) continue;
    if (["SCRIPT", "STYLE", "TEMPLATE"].includes(el.tagName)) continue;
    const count = inertCounts.get(el) ?? 0;
    // Already inert for a reason of the app's own: leave it alone.
    if (count === 0 && el.hasAttribute("inert")) continue;
    inertCounts.set(el, count + 1);
    el.setAttribute("inert", "");
    applied.push(el);
  }
  return () => {
    for (const el of applied) {
      const left = (inertCounts.get(el) ?? 1) - 1;
      if (left > 0) {
        inertCounts.set(el, left);
      } else {
        inertCounts.delete(el);
        el.removeAttribute("inert");
      }
    }
  };
}

export interface OverlayOptions {
  /** Whether the overlay is open. */
  open: boolean;
  /** Called on Escape while this is the topmost overlay. */
  onClose?: (() => void) | undefined;
  /**
   * Return focus to the element that had it before the overlay opened.
   * @default true
   */
  restoreFocus?: boolean;
}

/**
 * Behaviour shared by modal dialogs: moves focus in and traps Tab, restores focus on close,
 * closes on Escape, makes the rest of the page inert and locks its scroll without layout shift.
 * Layers that mount in `document.body` after it opened (menus, popovers, tooltips, toasts) are
 * not made inert, and focus may move into any `Portal` layer.
 * Returns a callback ref for the dialog element; it also works for nodes that mount later, as
 * they do inside a `Portal`. Focus goes to the element marked `data-autofocus`, else the first
 * tabbable one, else the dialog itself.
 */
export function useOverlay({
  open,
  onClose,
  restoreFocus = true,
}: OverlayOptions): (node: HTMLElement | null) => void {
  const [dialog, setDialog] = useState<HTMLElement | null>(null);
  const isTop = useLayer(open && dialog !== null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  const ref = useCallback((node: HTMLElement | null) => {
    setDialog(node);
  }, []);

  useEffect(() => {
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockScroll();
    const restoreInert = inertSiblings(dialog);

    const target =
      dialog.querySelector<HTMLElement>("[data-autofocus]") ?? tabbables(dialog)[0] ?? dialog;
    target.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape") {
        if (event.defaultPrevented || event.isComposing) return;
        if (!close.current) return;
        event.preventDefault();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = tabbables(dialog);
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!first || !last) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
      } else if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!isTop()) return;
      const next = event.target as Element | null;
      if (!next || dialog.contains(next)) return;
      // Menus, popovers and toasts opened from inside the dialog live in their own portal
      // layer; they register as layers only after they take focus, so let them have it.
      if (next.closest(".ol-portal")) return;
      (tabbables(dialog)[0] ?? dialog).focus();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      restoreInert();
      unlock();
      if (restoreFocus && previous?.isConnected) previous.focus({ preventScroll: true });
    };
    // isTop only reads a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dialog, restoreFocus]);

  return ref;
}
