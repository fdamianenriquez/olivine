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

/** Makes every body child except the one holding `node` inert, and returns the undo. */
function inertSiblings(node: HTMLElement): () => void {
  let top: HTMLElement = node;
  while (top.parentElement && top.parentElement !== document.body) top = top.parentElement;
  const changed: Element[] = [];
  for (const el of Array.from(document.body.children)) {
    if (el === top || el.hasAttribute("inert") || el.hasAttribute(KEEP_ACTIVE_ATTR)) continue;
    if (["SCRIPT", "STYLE", "TEMPLATE"].includes(el.tagName)) continue;
    el.setAttribute("inert", "");
    changed.push(el);
  }
  return () => {
    for (const el of changed) el.removeAttribute("inert");
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
        if (event.defaultPrevented) return;
        event.preventDefault();
        close.current?.();
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
      const next = event.target as Node | null;
      if (next && !dialog.contains(next)) (tabbables(dialog)[0] ?? dialog).focus();
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
