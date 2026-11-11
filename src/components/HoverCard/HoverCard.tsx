import {
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useDismiss } from "../../hooks/useDismiss";
import { useFloating, useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { type TriggerHandlers, useHoverIntent } from "../../hooks/useHoverIntent";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { getElementRef } from "../../utils/elementRef";
import { Portal } from "../Portal";
import { useUntabbable } from "./untabbable";

/** Which side of the link the card opens on, aligned to the link's start. It flips when there is no room. */
export type HoverCardPlacement = "bottom" | "top" | "right" | "left";

export interface HoverCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  /**
   * The link the card previews: an `<a href>` or a `Link`. It receives the hover and focus
   * handlers, the ref and `data-state`; it keeps its own name and gets no ARIA from the card.
   */
  trigger: ReactElement;
  /**
   * Body of the card, mounted only while open. Keep it to a glance and supplementary: everything
   * in it must also be on the linked page. Focusable elements inside are taken out of the tab order.
   */
  content: ReactNode;
  /**
   * Side of the link to open on.
   * @default "bottom"
   */
  placement?: HoverCardPlacement;
  /**
   * Milliseconds the pointer must rest on the link, or keyboard focus must stay on it, before
   * the card opens.
   * @default 600
   */
  openDelay?: number;
  /**
   * Milliseconds to wait after the pointer and focus have left before closing. The pointer always
   * gets a short grace to travel from the link to the card.
   * @default 300
   */
  closeDelay?: number;
  /**
   * Never opens.
   * @default false
   */
  disabled?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /**
   * Initial open state when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean;
  /** Called when the card opens or closes. */
  onOpenChange?: (open: boolean) => void;
}

interface TriggerOwnProps extends TriggerHandlers {
  ref?: Ref<HTMLElement>;
}

function assign<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * A raised card that previews what a link points to. It opens when a mouse or pen rests on the
 * link, or when the link takes keyboard focus, after `openDelay`; touch never opens it. It closes
 * on Escape, on a press on the link or outside the card, and once pointer and focus have both
 * left. Focus never moves into the card and the card is not announced: the link stays the whole
 * accessible interface. The `ref` points to the card.
 */
export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(function HoverCard(
  {
    trigger,
    content,
    placement = "bottom",
    openDelay = 600,
    closeDelay = 300,
    disabled = false,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    className,
    style: styleProp,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    ...rest
  },
  ref,
) {
  const [open, setOpenState] = useControllable(openProp, defaultOpen, onOpenChange);
  const openRef = useRef(open);
  useIsomorphicLayoutEffect(() => {
    openRef.current = open;
  });
  // The hover timers may settle on the state the card is already in; report real changes only.
  const setOpen = useCallback(
    (next: boolean) => {
      if (next !== openRef.current) setOpenState(next);
    },
    [setOpenState],
  );

  const {
    reference,
    floating,
    setReference,
    setFloating,
    style,
    placement: actual,
    positioned,
  } = useFloating<HTMLElement, HTMLDivElement>({ open, placement: `${placement}-start` });

  const { getTriggerProps, contentProps, dismiss } = useHoverIntent({
    open,
    setOpen,
    openDelay,
    closeDelay,
    focusDelay: openDelay,
    touch: "ignore",
    keepOpenWhileSelecting: true,
    contentRef: floating,
    disabled,
  });

  // Only the card is inside: a press on the link means "go there" and closes the card too.
  useDismiss(open, dismiss, [floating]);

  const triggerRef = getElementRef<HTMLElement>(trigger);
  const setTrigger = useCallback(
    (node: HTMLElement | null) => {
      setReference(node);
      assign(triggerRef, node);
    },
    [setReference, triggerRef],
  );

  const [card, setCard] = useState<HTMLDivElement | null>(null);
  const setCardNode = useCallback(
    (node: HTMLDivElement | null) => {
      setFloating(node);
      setCard(node);
      assign(ref, node);
    },
    [setFloating, ref],
  );
  useUntabbable(card);

  // A mouse click can focus a swept control in the card; when the card goes, hand focus back to
  // the link instead of dropping it on <body>. Removal fires no blur, so the flag survives it.
  const focusInside = useRef(false);
  useEffect(() => {
    if (open || !focusInside.current) return;
    focusInside.current = false;
    reference.current?.focus({ preventScroll: true });
  }, [open, reference]);

  useEffect(() => {
    const node = reference.current;
    if (node && !node.matches("a[href]")) {
      devWarn("HoverCard", "a hover card previews a link; use a link (`a[href]`) as the trigger.");
    }
  }, [reference]);

  const own = trigger.props as TriggerOwnProps;
  const handlers = getTriggerProps({
    onPointerEnter: own.onPointerEnter,
    onPointerLeave: own.onPointerLeave,
    onPointerDown: own.onPointerDown,
    onPointerUp: own.onPointerUp,
    onPointerCancel: own.onPointerCancel,
    onContextMenu: own.onContextMenu,
    onFocus: own.onFocus,
    onBlur: own.onBlur,
    onClick: (event: MouseEvent<HTMLElement>) => {
      own.onClick?.(event);
      // Following the link (a press or Enter) closes the card.
      if (openRef.current) dismiss();
    },
  });

  return (
    <>
      {cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        ...handlers,
        ref: setTrigger,
        "data-state": open ? "open" : "closed",
      })}
      {open ? (
        <Portal anchor={reference}>
          <div
            {...rest}
            ref={setCardNode}
            data-state={positioned ? "open" : "pending"}
            data-placement={actual.split("-")[0]}
            style={{ ...styleProp, ...style }}
            className={cx("ol-floating", "ol-hover-card", className)}
            onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
              onPointerEnter?.(event);
              contentProps.onPointerEnter(event);
            }}
            onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
              onPointerLeave?.(event);
              contentProps.onPointerLeave(event);
            }}
            onFocusCapture={() => {
              focusInside.current = true;
            }}
            onBlurCapture={() => {
              focusInside.current = false;
            }}
            onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
              onPointerDown?.(event);
              contentProps.onPointerDown(event);
            }}
          >
            <div className="ol-hover-card__body">{content}</div>
          </div>
        </Portal>
      ) : null}
    </>
  );
});
