import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { DelayGroupMember } from "./useDelayGroup";

/** Pointer travel time between trigger and content (WCAG 1.4.13 hoverable). */
export const HOVER_GRACE_MS = 100;
/** Touch press duration that opens with `touch: "long-press"`. */
export const LONG_PRESS_MS = 500;
/** Time after a press ends before its focus and click side effects are forgotten. */
const SETTLE_MS = 400;

export interface HoverIntentOptions {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Milliseconds the pointer rests on the trigger before opening. */
  openDelay: number;
  /** Milliseconds to wait after pointer and focus have left; the pointer always gets the grace. */
  closeDelay: number;
  /**
   * Milliseconds keyboard focus must stay on the trigger before opening.
   * @default 0
   */
  focusDelay?: number;
  /**
   * `ignore`: touch never opens. `long-press`: a 500 ms press opens, the click that ends it is
   * swallowed, the context menu is suppressed and a tap on the content closes it.
   * @default "ignore"
   */
  touch?: "ignore" | "long-press";
  /** Keeps the content open while text inside it is being selected or is selected. */
  keepOpenWhileSelecting?: boolean;
  /** Never opens. */
  disabled?: boolean;
  /** Hover delay group; opening is instant while the group is warm. */
  group?: DelayGroupMember | undefined;
  /** The content element, for the selection guard. */
  contentRef?: RefObject<HTMLElement | null>;
}

export interface TriggerHandlers {
  onPointerEnter?: ((event: PointerEvent<HTMLElement>) => void) | undefined;
  onPointerLeave?: ((event: PointerEvent<HTMLElement>) => void) | undefined;
  onPointerDown?: ((event: PointerEvent<HTMLElement>) => void) | undefined;
  onPointerUp?: ((event: PointerEvent<HTMLElement>) => void) | undefined;
  onPointerCancel?: ((event: PointerEvent<HTMLElement>) => void) | undefined;
  onFocus?: ((event: FocusEvent<HTMLElement>) => void) | undefined;
  onBlur?: ((event: FocusEvent<HTMLElement>) => void) | undefined;
  onClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  onContextMenu?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
}

export interface ContentHandlers {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
}

export interface HoverIntent {
  /** Merges the hover handlers with the trigger's own (its own run first). */
  getTriggerProps: (own: TriggerHandlers) => Required<TriggerHandlers>;
  /** Spread on the content element. */
  contentProps: ContentHandlers;
  /** Closes now and forgets every source (Escape, outside press). Hover does not reopen until the pointer re-enters. */
  dismiss: () => void;
  /** True when the current opening skipped the delay because the group was warm. */
  instant: boolean;
}

/**
 * Hover and focus intent for a trigger and its floating content (Tooltip, HoverCard). It opens
 * after a delay on mouse/pen hover and on keyboard focus (not focus caused by a press), and
 * closes only once the pointer has left both the trigger and the content and focus has left the
 * trigger. A mouse or pen press on the trigger closes it until the pointer leaves.
 */
export function useHoverIntent({
  open,
  setOpen,
  openDelay,
  closeDelay,
  focusDelay = 0,
  touch = "ignore",
  keepOpenWhileSelecting = false,
  disabled = false,
  group,
  contentRef,
}: HoverIntentOptions): HoverIntent {
  const [instant, setInstant] = useState(false);
  const timer = useRef(0);
  const pressTimer = useRef(0);
  const settleTimer = useRef(0);
  const longPressed = useRef(false);
  const pointerFocus = useRef(false);
  /** A press on the trigger blocks hover-open until the pointer leaves. */
  const pressed = useRef(false);
  const sources = useRef({ trigger: false, content: false, focus: false, selecting: false });

  const latest = useRef({ setOpen, group, disabled, contentRef, keepOpenWhileSelecting });
  const openRef = useRef(open);
  useLayoutEffect(() => {
    latest.current = { setOpen, group, disabled, contentRef, keepOpenWhileSelecting };
    openRef.current = open;
  });

  const clear = () => {
    window.clearTimeout(timer.current);
  };

  const show = useCallback((delay: number) => {
    window.clearTimeout(timer.current);
    if (latest.current.disabled) return;
    const warm = latest.current.group?.isWarm() ?? false;
    const wait = warm ? 0 : delay;
    const run = () => {
      setInstant(warm);
      latest.current.setOpen(true);
    };
    if (wait <= 0) run();
    else timer.current = window.setTimeout(run, wait);
  }, []);

  const hasSelection = () => {
    const { contentRef: ref, keepOpenWhileSelecting: guard } = latest.current;
    if (!guard) return false;
    if (sources.current.selecting) return true;
    const selection = typeof window.getSelection === "function" ? window.getSelection() : null;
    const node = ref?.current;
    return Boolean(
      node &&
      selection &&
      !selection.isCollapsed &&
      selection.anchorNode &&
      node.contains(selection.anchorNode),
    );
  };

  const hide = useCallback((delay: number) => {
    window.clearTimeout(timer.current);
    const { trigger, content, focus } = sources.current;
    if (trigger || content || focus) return;
    const run = () => {
      const s = sources.current;
      if (s.trigger || s.content || s.focus || hasSelection()) return;
      latest.current.setOpen(false);
    };
    if (delay <= 0) run();
    else timer.current = window.setTimeout(run, delay);
  }, []);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    window.clearTimeout(pressTimer.current);
    sources.current = { trigger: false, content: false, focus: false, selecting: false };
    latest.current.setOpen(false);
  }, []);

  // Group membership follows the open state.
  useEffect(() => {
    if (!open) return;
    const member = latest.current.group;
    member?.opened(() => {
      window.clearTimeout(timer.current);
      sources.current = { trigger: false, content: false, focus: false, selecting: false };
      latest.current.setOpen(false);
    });
    return () => {
      member?.closed();
    };
  }, [open]);

  // Disabling closes.
  useEffect(() => {
    if (disabled && openRef.current) dismiss();
  }, [disabled, dismiss]);

  // Selection guard: re-check when the selection or the press ends.
  useEffect(() => {
    if (!open || !keepOpenWhileSelecting) return;
    const onUp = () => {
      if (!sources.current.selecting) return;
      sources.current.selecting = false;
      hide(Math.max(closeDelay, HOVER_GRACE_MS));
    };
    const onChange = () => {
      if (!hasSelection()) hide(Math.max(closeDelay, HOVER_GRACE_MS));
    };
    document.addEventListener("pointerup", onUp);
    document.addEventListener("selectionchange", onChange);
    return () => {
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("selectionchange", onChange);
    };
  }, [open, keepOpenWhileSelecting, closeDelay, hide]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(pressTimer.current);
      window.clearTimeout(settleTimer.current);
    },
    [],
  );

  const isTouch = (event: PointerEvent) => event.pointerType === "touch";
  const pointerClose = () => {
    hide(Math.max(closeDelay, HOVER_GRACE_MS));
  };
  const settle = () => {
    // Focus from a press lands before pointerup; clearing later keeps keyboard focus working in
    // engines that never focus a pressed button. A long press's click lands just after.
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      pointerFocus.current = false;
      longPressed.current = false;
    }, SETTLE_MS);
  };

  const getTriggerProps = (own: TriggerHandlers): Required<TriggerHandlers> => ({
    onPointerEnter: (event) => {
      own.onPointerEnter?.(event);
      if (isTouch(event)) return;
      sources.current.trigger = true;
      if (!pressed.current) show(openDelay);
    },
    onPointerLeave: (event) => {
      own.onPointerLeave?.(event);
      window.clearTimeout(pressTimer.current);
      if (isTouch(event)) return;
      sources.current.trigger = false;
      pressed.current = false;
      pointerClose();
    },
    onPointerDown: (event) => {
      own.onPointerDown?.(event);
      // Focus that follows a press is not keyboard focus.
      pointerFocus.current = true;
      window.clearTimeout(settleTimer.current);
      longPressed.current = false;
      if (!isTouch(event)) {
        if (event.button !== 0) return;
        pressed.current = true;
        clear();
        if (openRef.current) dismiss();
        return;
      }
      if (touch !== "long-press" || latest.current.disabled) return;
      window.clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => {
        longPressed.current = true;
        clear();
        setInstant(false);
        latest.current.setOpen(true);
      }, LONG_PRESS_MS);
    },
    onPointerUp: (event) => {
      own.onPointerUp?.(event);
      window.clearTimeout(pressTimer.current);
      settle();
    },
    onPointerCancel: (event) => {
      own.onPointerCancel?.(event);
      window.clearTimeout(pressTimer.current);
      settle();
    },
    onContextMenu: (event) => {
      own.onContextMenu?.(event);
      // The long press must not also raise the native context menu.
      if (longPressed.current) event.preventDefault();
    },
    onClick: (event) => {
      // The click that ends a long press only revealed the content; it is not an activation.
      if (longPressed.current) {
        longPressed.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      own.onClick?.(event);
    },
    onFocus: (event) => {
      own.onFocus?.(event);
      if (!pointerFocus.current) {
        sources.current.focus = true;
        show(focusDelay);
      }
      pointerFocus.current = false;
    },
    onBlur: (event) => {
      own.onBlur?.(event);
      pointerFocus.current = false;
      sources.current.focus = false;
      // Close at once so the content never covers the next focused element (WCAG 2.4.11).
      hide(0);
    },
  });

  const contentProps: ContentHandlers = {
    onPointerEnter: (event) => {
      if (isTouch(event)) return;
      sources.current.content = true;
      clear();
    },
    onPointerLeave: (event) => {
      if (isTouch(event)) return;
      sources.current.content = false;
      pointerClose();
    },
    onPointerDown: (event) => {
      if (isTouch(event)) {
        if (touch === "long-press") dismiss();
        return;
      }
      if (keepOpenWhileSelecting && event.button === 0) sources.current.selecting = true;
    },
  };

  return { getTriggerProps, contentProps, dismiss, instant };
}
