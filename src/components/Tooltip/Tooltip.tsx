import {
  cloneElement,
  type FocusEvent,
  forwardRef,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useDismiss } from "../../hooks/useDismiss";
import { useFloating } from "../../hooks/useFloating";
import { cx } from "../../utils/cx";
import { Portal } from "../../utils/Portal";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Short text shown in the tooltip. Keep it to a few words; never put essential information or links here. */
  content: ReactNode;
  /**
   * Preferred side of the trigger. It flips when there is no room.
   * @default "top"
   */
  placement?: TooltipPlacement;
  /**
   * Milliseconds the pointer must rest on the trigger before the tooltip opens. Keyboard focus opens it at once.
   * @default 300
   */
  openDelay?: number;
  /**
   * Milliseconds to wait before closing after the pointer leaves. The pointer always gets a short grace
   * period to travel from the trigger to the tooltip.
   * @default 0
   */
  closeDelay?: number;
  /** Controlled open state. */
  open?: boolean;
  /**
   * Initial open state when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean;
  /** Called when the tooltip opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Extra class names for the tooltip box. */
  className?: string;
  /** The one focusable element the tooltip describes. A disabled button needs a focusable wrapper. */
  children: ReactElement;
}

/** Pointer travel time between trigger and tooltip (WCAG 1.4.13 hoverable). */
const HOVER_GRACE_MS = 100;
/** Touch press duration that opens the tooltip. */
const LONG_PRESS_MS = 500;
/** Time after a press ends before its focus and click side effects are forgotten. */
const SETTLE_MS = 400;

interface ChildProps {
  "aria-describedby"?: string | undefined;
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  ref?: Ref<HTMLElement>;
}

function setRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * A few words in an ink box that describe a control. It opens on hover after a short delay and on
 * keyboard focus at once, and closes on blur, pointer leave or Escape. The pointer can move onto the
 * tooltip without closing it. On touch, a long press opens it and a tap elsewhere closes it.
 * The tooltip renders in a portal and flips at the viewport edge.
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  {
    content,
    placement = "top",
    openDelay = 300,
    closeDelay = 0,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    className,
    children,
  },
  ref,
) {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const id = useId();
  const floatingState = useFloating<HTMLElement, HTMLDivElement>({ open, placement });
  const {
    reference,
    floating,
    setReference,
    setFloating,
    style,
    positioned,
    placement: resolved,
  } = floatingState;

  const timer = useRef(0);
  const pressTimer = useRef(0);
  const longPressed = useRef(false);
  const pointerFocus = useRef(false);
  const settleTimer = useRef(0);
  const latest = useRef(setOpen);
  latest.current = setOpen;

  const clear = () => {
    window.clearTimeout(timer.current);
  };
  const schedule = (next: boolean, delay: number) => {
    clear();
    if (delay <= 0) latest.current(next);
    else
      timer.current = window.setTimeout(() => {
        latest.current(next);
      }, delay);
  };
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(pressTimer.current);
      window.clearTimeout(settleTimer.current);
    },
    [],
  );

  useDismiss(open, () => {
    clear();
    setOpen(false);
  }, [reference, floating]);

  const child = children as ReactElement<ChildProps>;
  const own = child.props;
  const childRef = (child as { ref?: Ref<HTMLElement> }).ref ?? own.ref;
  const setTrigger = useCallback(
    (node: HTMLElement | null) => {
      setReference(node);
      setRef(childRef, node);
    },
    [setReference, childRef],
  );

  const setBubble = useCallback(
    (node: HTMLDivElement | null) => {
      setFloating(node);
      setRef(ref, node);
    },
    [setFloating, ref],
  );

  const isTouch = (event: PointerEvent) => event.pointerType === "touch";
  const settle = () => {
    // Focus from a press lands before pointerup; clearing later keeps keyboard focus working
    // in engines that never focus a pressed button. A long press's click lands just after.
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      pointerFocus.current = false;
      longPressed.current = false;
    }, SETTLE_MS);
  };
  const cancelPress = () => {
    window.clearTimeout(pressTimer.current);
  };

  const trigger = cloneElement(child, {
    ref: setTrigger,
    "aria-describedby": open
      ? [own["aria-describedby"], id].filter(Boolean).join(" ")
      : own["aria-describedby"],
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      own.onPointerEnter?.(event);
      if (!isTouch(event)) schedule(true, openDelay);
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      own.onPointerLeave?.(event);
      cancelPress();
      if (!isTouch(event)) schedule(false, Math.max(closeDelay, HOVER_GRACE_MS));
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      own.onPointerDown?.(event);
      // Focus that follows a press is not keyboard focus; hover already handles the mouse.
      pointerFocus.current = true;
      window.clearTimeout(settleTimer.current);
      longPressed.current = false;
      if (!isTouch(event)) return;
      cancelPress();
      pressTimer.current = window.setTimeout(() => {
        longPressed.current = true;
        clear();
        latest.current(true);
      }, LONG_PRESS_MS);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      own.onPointerUp?.(event);
      cancelPress();
      settle();
    },
    onPointerCancel: (event: PointerEvent<HTMLElement>) => {
      own.onPointerCancel?.(event);
      cancelPress();
      settle();
    },
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      own.onContextMenu?.(event);
      // The long-press must not also raise the native context menu.
      if (longPressed.current) event.preventDefault();
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      // The click that ends a long press only revealed the tooltip; it is not an activation.
      if (longPressed.current) {
        longPressed.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      own.onClick?.(event);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      own.onFocus?.(event);
      if (!pointerFocus.current) schedule(true, 0);
      pointerFocus.current = false;
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      own.onBlur?.(event);
      pointerFocus.current = false;
      schedule(false, 0);
    },
  });

  return (
    <>
      {trigger}
      {open ? (
        <Portal anchor={reference}>
          <div
            ref={setBubble}
            id={id}
            role="tooltip"
            data-state={positioned ? "open" : "pending"}
            data-placement={resolved.split("-")[0]}
            style={style}
            className={cx("ol-floating", "ol-tooltip", className)}
            onPointerEnter={(event) => {
              if (!isTouch(event)) clear();
            }}
            onPointerLeave={(event) => {
              if (!isTouch(event)) schedule(false, Math.max(closeDelay, HOVER_GRACE_MS));
            }}
          >
            {content}
          </div>
        </Portal>
      ) : null}
    </>
  );
});
