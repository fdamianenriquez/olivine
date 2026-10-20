import {
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useId,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useDismiss } from "../../hooks/useDismiss";
import { useFloating, useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { getElementRef } from "../../utils/elementRef";
import { Portal } from "../../utils/Portal";
import { CloseButton } from "../CloseButton";

/** Which side of the trigger the popover opens on. It flips when there is no room. */
export type PopoverPlacement = "bottom" | "top" | "right";

/** Props of the element passed as `trigger`. */
interface TriggerProps {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "content"> {
  /** The element that toggles the popover. It receives the click handler and the ARIA attributes. */
  trigger: ReactElement;
  /** Heading of the panel, shown with a close button. Also names the dialog. */
  title?: ReactNode;
  /** Body of the panel. May hold interactive content such as a form. */
  content: ReactNode;
  /**
   * Side of the trigger to open on.
   * @default "bottom"
   */
  placement?: PopoverPlacement;
  /** Controlled open state. */
  open?: boolean;
  /**
   * Initial open state when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean;
  /** Called when the popover opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Accessible name when there is no `title`. A `title` names the dialog by itself. */
  "aria-label"?: string;
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable]:not([contenteditable="false"]), [tabindex]';

function isTabbable(el: HTMLElement): boolean {
  return (
    el.tabIndex >= 0 &&
    !el.hidden &&
    !el.closest("[inert], [hidden]") &&
    getComputedStyle(el).visibility !== "hidden" &&
    getComputedStyle(el).display !== "none"
  );
}

function assign<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * A raised panel with a title row, toggled by clicking its trigger. It is a non-modal dialog:
 * focus moves into the panel on open, Escape and the close button close it and return focus to
 * the trigger, an outside press closes it without moving focus, and tabbing past the last control
 * closes it and carries on from the trigger. The `ref` points to the panel.
 */
export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(
  {
    trigger,
    title,
    content,
    placement = "bottom",
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    className,
    id: idProp,
    onKeyDown,
    style: styleProp,
    ...rest
  },
  ref,
) {
  if (!title && !rest["aria-label"] && !rest["aria-labelledby"]) {
    devWarn("Popover", "give the popover a `title` or an `aria-label` so the dialog has a name.");
  }
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const generated = useId();
  const panelId = idProp ?? `${generated}-panel`;
  const titleId = `${generated}-title`;

  const {
    reference,
    floating,
    setReference,
    setFloating,
    style,
    placement: actual,
    positioned,
  } = useFloating<HTMLElement, HTMLDivElement>({ open, placement: `${placement}-start` });

  const triggerRef = getElementRef<HTMLElement>(trigger);
  const setTrigger = useCallback(
    (node: HTMLElement | null) => {
      setReference(node);
      assign(triggerRef, node);
    },
    [setReference, triggerRef],
  );
  const [panelNode, setPanelNode] = useState<HTMLDivElement | null>(null);
  const setPanel = useCallback(
    (node: HTMLDivElement | null) => {
      setFloating(node);
      setPanelNode(node);
      assign(ref, node);
    },
    [setFloating, ref],
  );

  const close = useCallback(
    (returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) reference.current?.focus();
    },
    [setOpen, reference],
  );

  useDismiss(
    open,
    (reason) => {
      close(reason === "escape");
    },
    [reference, floating],
  );

  // The panel lives in a portal at the end of the page: bring focus into it once it mounts.
  useIsomorphicLayoutEffect(() => {
    panelNode?.focus({ preventScroll: true });
  }, [panelNode]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Tab") return;
    const panel = event.currentTarget;
    const tabbable = Array.from(panel.querySelectorAll<HTMLElement>(TABBABLE)).filter(isTabbable);
    const first = tabbable[0] ?? panel;
    const last = tabbable[tabbable.length - 1] ?? panel;
    const active = document.activeElement;
    if (!event.shiftKey && active === last) {
      // Focus goes back to the trigger so the browser tabs on from there.
      close(true);
    } else if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      reference.current?.focus();
    }
  };

  const toggle = (event: MouseEvent<HTMLElement>) => {
    (trigger.props as TriggerProps).onClick?.(event);
    if (event.defaultPrevented) return;
    setOpen(!open);
  };

  return (
    <>
      {cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        ref: setTrigger,
        onClick: toggle,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        "aria-controls": open ? panelId : undefined,
        "data-state": open ? "open" : "closed",
      })}
      {open ? (
        <Portal anchor={reference} keepActive>
          {/* The dialog handles Tab here to hand focus back to the trigger. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            {...rest}
            ref={setPanel}
            id={panelId}
            role="dialog"
            tabIndex={-1}
            aria-labelledby={title ? titleId : undefined}
            data-state={positioned ? "open" : "pending"}
            data-placement={actual.split("-")[0]}
            style={{ ...styleProp, ...style }}
            className={cx("ol-floating", "ol-popover", `ol-popover--${placement}`, className)}
            onKeyDown={onPanelKeyDown}
          >
            {title ? (
              <div className="ol-popover__head">
                <span id={titleId} className="ol-popover__title">
                  {title}
                </span>
                <CloseButton
                  onClick={() => {
                    close(true);
                  }}
                />
              </div>
            ) : null}
            <div className="ol-popover__body">{content}</div>
          </div>
        </Portal>
      ) : null}
    </>
  );
});
