import {
  cloneElement,
  forwardRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useDelayGroup } from "../../hooks/useDelayGroup";
import { useDismiss } from "../../hooks/useDismiss";
import { useFloating, useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { type TriggerHandlers, useHoverIntent } from "../../hooks/useHoverIntent";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { getElementRef } from "../../utils/elementRef";
import { Portal } from "../Portal";
import { accessibleName, repeatsName } from "./accessibleName";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export type TooltipVariant = "plain" | "rich";

export interface TooltipProps {
  /**
   * Short text (plain) or supporting text (rich). Keep it to a few words; never put essential
   * information, links or buttons here. Empty (`null`, `false`, `""`) renders no tooltip.
   */
  content: ReactNode;
  /** Heading of a rich tooltip. Setting it makes the tooltip rich. */
  title?: ReactNode;
  /**
   * `plain`: a few words in an ink box. `rich`: a raised paper box with an optional title and a
   * short supporting text.
   * @default "rich" when `title` is set, else "plain"
   */
  variant?: TooltipVariant;
  /**
   * Preferred side of the trigger. It flips when there is no room.
   * @default "top"
   */
  placement?: TooltipPlacement;
  /**
   * Milliseconds the pointer must rest on the trigger before the tooltip opens. Keyboard focus
   * opens it at once. Inside a warm group (a tooltip was just shown) it opens at once too.
   * @default the group's `openDelay` (300)
   */
  openDelay?: number;
  /**
   * Milliseconds to wait before closing after the pointer and focus have left. The pointer
   * always gets a short grace period to travel from the trigger to the tooltip.
   * @default the group's `closeDelay` (0)
   */
  closeDelay?: number;
  /**
   * Never opens. The trigger is left untouched.
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
  /** Called when the tooltip opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Extra class names for the tooltip box. */
  className?: string;
  /** The one focusable element the tooltip describes. A disabled button needs a focusable wrapper. */
  children: ReactElement;
}

interface ChildProps extends TriggerHandlers {
  "aria-describedby"?: string | undefined;
  ref?: Ref<HTMLElement>;
}

const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]:not([contenteditable="false"])';

const isEmpty = (node: ReactNode) =>
  node === null || node === undefined || node === false || node === "";

function setRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * A few words in an ink box that describe a control, or with a `title`, a raised paper box with
 * a heading and a short supporting text. It opens on hover after a short delay, at once on
 * keyboard focus, and on a touch long press. It stays while the pointer (on the trigger or the
 * tooltip) or keyboard focus remains, and closes on Escape, blur, a press on the trigger or a
 * press elsewhere. Neighbouring tooltips open at once inside a `TooltipProvider` (or the built-in
 * default group). It renders in a portal and flips at the viewport edge.
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  {
    content,
    title,
    variant: variantProp,
    placement = "top",
    openDelay: openDelayProp,
    closeDelay: closeDelayProp,
    disabled = false,
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
  const group = useDelayGroup(id);
  const openDelay = openDelayProp ?? group.timing.openDelay;
  const closeDelay = closeDelayProp ?? group.timing.closeDelay;
  const rich = (variantProp ?? (isEmpty(title) ? "plain" : "rich")) === "rich";
  const inactive = disabled || isEmpty(content);
  const shown = open && !inactive;

  const {
    reference,
    floating,
    setReference,
    setFloating,
    style,
    positioned,
    placement: resolved,
  } = useFloating<HTMLElement, HTMLDivElement>({ open: shown, placement });

  const { getTriggerProps, contentProps, dismiss, instant } = useHoverIntent({
    open: shown,
    setOpen,
    openDelay,
    closeDelay,
    touch: "long-press",
    disabled: inactive,
    group,
  });

  useDismiss(shown, dismiss, [reference, floating]);

  // Describe the trigger unless the tooltip only repeats its name (resolved from the DOM, so
  // aria-labelledby, labels and nested text count). A rich tooltip always adds information.
  const [repeats, setRepeats] = useState(false);
  useIsomorphicLayoutEffect(() => {
    const trigger = reference.current;
    const bubble = floating.current;
    if (!shown || !trigger || !bubble) return;
    setRepeats(!rich && repeatsName(trigger, bubble.textContent));
  });

  // Development checks on the trigger, once per tooltip.
  const checkedTrigger = useRef(false);
  useEffect(() => {
    const trigger = reference.current;
    if (inactive || checkedTrigger.current || !trigger) return;
    checkedTrigger.current = true;
    if (trigger.getAttribute("title")) {
      devWarn(
        "Tooltip",
        "the trigger has a native `title`, so two tooltips would show. Remove the `title`.",
      );
    } else if (!accessibleName(trigger).name.trim()) {
      devWarn(
        "Tooltip",
        "the trigger has no accessible name; a tooltip is not a name. Give it an `aria-label` with the same words.",
      );
    }
  });

  // Development check on the box: a tooltip is never focused, so nothing in it can be reached.
  const checkedContent = useRef(false);
  useEffect(() => {
    const bubble = floating.current;
    if (!shown || checkedContent.current || !bubble) return;
    if (bubble.querySelector(FOCUSABLE)) {
      checkedContent.current = true;
      devWarn(
        "Tooltip",
        "the tooltip holds a link, button or other focusable element that no one can reach. Use a Popover or a HoverCard.",
      );
    }
  });

  const child = children as ReactElement<ChildProps>;
  const own = child.props;
  const childRef = getElementRef<HTMLElement>(child);
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

  if (inactive) return children;

  const trigger = cloneElement(child, {
    ...getTriggerProps(own),
    ref: setTrigger,
    "aria-describedby":
      shown && !repeats
        ? [own["aria-describedby"], id].filter(Boolean).join(" ")
        : own["aria-describedby"],
  });

  return (
    <>
      {trigger}
      {shown ? (
        <Portal anchor={reference}>
          <div
            ref={setBubble}
            id={id}
            role="tooltip"
            data-state={positioned ? "open" : "pending"}
            data-placement={resolved.split("-")[0]}
            data-instant={instant || undefined}
            style={style}
            className={cx("ol-floating", "ol-tooltip", rich && "ol-tooltip--rich", className)}
            {...contentProps}
          >
            {rich ? (
              <>
                {isEmpty(title) ? null : (
                  <span className="ol-tooltip__title">
                    {title}
                    {/* Keeps the title and body apart when read as one description. */}
                    <span className="ol-sr">. </span>
                  </span>
                )}
                <div className="ol-tooltip__body">{content}</div>
              </>
            ) : (
              content
            )}
          </div>
        </Portal>
      ) : null}
    </>
  );
});
