import {
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { SwipeDirection } from "../../hooks/useSwipeDismiss";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { ToastPauseContext } from "../Toast/ToastPauseContext";
import { ToastStackContext, type ToastStackContextValue } from "../Toast/ToastStackContext";

export type ToastStackPosition = "br" | "tr" | "bl" | "tc" | "static";

export interface ToastStackProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Where the stack is pinned, with a `space-6` margin: top-right, bottom-right, bottom-left,
   * top-centre, or `static` to sit in the page flow (useful in documentation; no landmark and no
   * hotkey). Top-right by default: Fab owns the bottom-end corner. Toasts swipe and leave toward
   * the stack's edge: right for `tr` and `br`, left for `bl`, up for `tc`.
   * @default "tr"
   */
  position?: ToastStackPosition;
  /** Name of the landmark. Defaults to the localised "Notifications". */
  label?: string;
  /**
   * Key that moves focus into the stack and back (`KeyboardEvent.key`, with or without Shift).
   * Only intercepted while a toast is shown. `false` turns it off.
   * @default "F6"
   */
  hotkey?: string | false;
  /**
   * The toasts. Every countdown pauses while the pointer (mouse or pen) is over the stack,
   * focus is inside it, a toast is pressed, the page is hidden or the window loses focus.
   */
  children?: ReactNode;
}

const SWIPE: Record<ToastStackPosition, SwipeDirection | false> = {
  tr: "right",
  br: "right",
  bl: "left",
  tc: "up",
  static: false,
};

const TABBABLE =
  "button:not([disabled]), a[href], input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** Toasts that are not leaving. */
function liveToasts(stack: HTMLElement): HTMLElement[] {
  return Array.from(stack.querySelectorAll<HTMLElement>(".ol-toast")).filter(
    (toast) => toast.getAttribute("data-state") !== "closing" && !toast.closest("[inert]"),
  );
}

function tabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest("[inert]") && !el.closest("[data-state='closing']"),
  );
}

function focusFirst(root: HTMLElement): boolean {
  const target = tabbables(root)[0];
  if (!target) return false;
  target.focus();
  return document.activeElement === target;
}

/**
 * Pins toasts to a screen corner and stacks them. It is a named landmark ("Notifications") that
 * owns the single polite live region, rendered even when empty so that screen readers announce
 * the toasts inserted later. The hotkey (F6) moves focus into the stack and back, also from
 * inside a modal. While the pointer is over the stack, focus is inside it, a toast is pressed or
 * the page is hidden, every toast holds its auto-dismiss timer.
 */
export const ToastStack = forwardRef<HTMLDivElement, ToastStackProps>(function ToastStack(
  {
    position = "tr",
    label,
    hotkey = "F6",
    className,
    children,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    onFocus,
    onBlur,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [blurred, setBlurred] = useState(false);
  /** The element focused before the hotkey moved focus into the stack. */
  const remembered = useRef<HTMLElement | null>(null);
  const landmark = position !== "static";
  const key = landmark && hotkey !== false && hotkey !== "" ? hotkey : null;

  const setRoot = useCallback(
    (el: HTMLDivElement | null) => {
      setNode(el);
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  useEffect(() => {
    const sync = () => {
      setHidden(document.hidden);
    };
    const onWindowBlur = () => {
      setBlurred(true);
    };
    const onWindowFocus = () => {
      setBlurred(false);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);

  // A press ends wherever the pointer is released.
  useEffect(() => {
    if (!pressed) return undefined;
    const release = () => {
      setPressed(false);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [pressed]);

  // Browsers do not reliably fire blur when the focused control is removed (a toast that
  // closed or timed out), so re-check whether focus is still inside after every change.
  useEffect(() => {
    if (!node || typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(() => {
      if (!node.contains(document.activeElement)) setFocused(false);
    });
    observer.observe(node, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [node]);

  // The hotkey: into the stack from anywhere (a modal included), and back again.
  useEffect(() => {
    if (!key || !node) return undefined;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== key || event.defaultPrevented) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const active = document.activeElement;
      if (node.contains(active)) {
        const back = remembered.current;
        remembered.current = null;
        if (!back?.isConnected) return;
        event.preventDefault();
        back.focus();
        return;
      }
      const toasts = liveToasts(node);
      if (toasts.length === 0) return;
      event.preventDefault();
      remembered.current =
        active instanceof HTMLElement && active !== document.body ? active : null;
      if (!toasts.some(focusFirst)) node.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [key, node]);

  const returnFocus = useCallback(
    (from: HTMLElement | null) => {
      if (node) {
        const others = liveToasts(node).filter((toast) => toast !== from);
        const next =
          others.find(
            (toast) =>
              from && from.compareDocumentPosition(toast) & Node.DOCUMENT_POSITION_FOLLOWING,
          ) ?? others[others.length - 1];
        if (next && focusFirst(next)) return;
      }
      const back = remembered.current;
      remembered.current = null;
      if (back?.isConnected) back.focus();
    },
    [node],
  );

  const context = useMemo<ToastStackContextValue>(
    () => ({ swipe: SWIPE[position], hotkey: key, returnFocus }),
    [position, key, returnFocus],
  );

  // Tab between the controls of the stack. Handled here and kept from the document so that a
  // modal's focus trap does not pull focus back while the stack is reached from inside it.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.key !== "Tab" || event.defaultPrevented) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const items = tabbables(event.currentTarget);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = index < 0 ? undefined : items[index + (event.shiftKey ? -1 : 1)];
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    next.focus();
  };

  const paused = hovered || focused || pressed || hidden || blurred;

  return (
    // Pointer, focus and key handlers pause the countdowns and move focus between toasts.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={setRoot}
      role={landmark ? "region" : undefined}
      aria-label={landmark ? (label ?? t.notifications) : undefined}
      tabIndex={landmark ? -1 : undefined}
      className={cx("ol-toaststack", `ol-toaststack--${position}`, className)}
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions text"
      onPointerEnter={(e: PointerEvent<HTMLDivElement>) => {
        onPointerEnter?.(e);
        // A tap emulates enter and never leaves: only a mouse or pen hover pauses.
        if (e.pointerType === "mouse" || e.pointerType === "pen") setHovered(true);
      }}
      onPointerLeave={(e: PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(e);
        setHovered(false);
      }}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        onPointerDown?.(e);
        setPressed(true);
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        setFocused(true);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <ToastStackContext.Provider value={context}>
        <ToastPauseContext.Provider value={paused}>{children}</ToastPauseContext.Provider>
      </ToastStackContext.Provider>
    </div>
  );
});
