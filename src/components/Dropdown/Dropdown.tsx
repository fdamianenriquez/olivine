import {
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useDismiss } from "../../hooks/useDismiss";
import { useFloating, useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { cx } from "../../utils/cx";
import { Portal } from "../../utils/Portal";
import { Button, type ButtonProps } from "../Button";

/** An actionable entry of the menu. */
export interface DropdownActionItem {
  /** Text of the item. */
  label: ReactNode;
  /** Called when the item is chosen, before the menu closes. */
  onSelect?: () => void;
  /** Keyboard shortcut hint shown at the end of the row, e.g. `⌘R`. Purely visual. */
  kbd?: string;
  /** Marks a destructive action; drawn in the danger colour. */
  danger?: boolean;
  /** Makes the item unselectable and skipped by the keyboard. */
  disabled?: boolean;
}

/** A non-interactive group label. */
export interface DropdownHeaderItem {
  header: ReactNode;
}

/** A hairline between groups of items. */
export interface DropdownDividerItem {
  divider: true;
}

/** One entry of the `items` prop. */
export type DropdownItem = DropdownActionItem | DropdownHeaderItem | DropdownDividerItem;

export interface DropdownProps extends Omit<
  ButtonProps,
  "children" | "href" | "arrow" | "onToggle" | "as" | "square"
> {
  /** Text of the trigger button. */
  label: ReactNode;
  /** Menu entries: actions, group headers and dividers. */
  items: readonly DropdownItem[];
  /**
   * Which edge of the trigger the menu lines up with.
   * @default "start"
   */
  align?: "start" | "end";
  /** Opens the menu above the trigger. It still flips when there is no room. */
  up?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /**
   * Initial open state when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean;
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Extra class names for the menu. */
  menuClassName?: string;
}

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';
const TYPEAHEAD_MS = 500;

function isAction(item: DropdownItem): item is DropdownActionItem {
  return "label" in item;
}

function itemText(el: Element): string {
  return (el.querySelector(".ol-dropdown__label") ?? el).textContent.trim().toLowerCase();
}

/**
 * A raised menu opened from a button. Arrow keys, Home/End and typeahead move between items;
 * Escape and outside presses close it. The trigger is a `Button`, so `variant` and `size` pass
 * through, and the `ref` points to it.
 */
export const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(function Dropdown(
  {
    label,
    items,
    align = "start",
    up,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    menuClassName,
    className,
    onClick,
    onKeyDown,
    id: idProp,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const generated = useId();
  const triggerId = idProp ?? `${generated}-trigger`;
  const menuId = `${generated}-menu`;

  const [menu, setMenu] = useState<HTMLUListElement | null>(null);
  const { reference, floating, setReference, setFloating, style, positioned } = useFloating<
    HTMLButtonElement,
    HTMLUListElement
  >({
    open,
    placement: `${up ? "top" : "bottom"}-${align}`,
  });
  const [active, setActive] = useState(-1);
  const initialFocus = useRef<"first" | "last" | null>(null);
  const typed = useRef({ text: "", timer: 0 });

  const setTrigger = useCallback(
    (node: HTMLButtonElement | null) => {
      setReference(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [setReference, ref],
  );
  const setMenuNode = useCallback(
    (node: HTMLUListElement | null) => {
      setFloating(node);
      setMenu(node);
    },
    [setFloating],
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

  const enabled = useCallback(
    (): HTMLElement[] =>
      menu ? Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : [],
    [menu],
  );
  const focusEl = (el: HTMLElement | undefined) => {
    el?.focus({ preventScroll: true });
  };

  // Once the menu is mounted, put focus inside it: on an item for keyboard opens, on the menu otherwise.
  useIsomorphicLayoutEffect(() => {
    if (!menu) return;
    const mode = initialFocus.current;
    initialFocus.current = null;
    const els = enabled();
    if (mode === "first") focusEl(els[0]);
    else if (mode === "last") focusEl(els[els.length - 1]);
    else menu.focus({ preventScroll: true });
  }, [menu]);

  useIsomorphicLayoutEffect(() => {
    if (!open) setActive(-1);
  }, [open]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Enter" || event.key === " ") {
      // The click that follows opens the menu; remember it came from the keyboard.
      initialFocus.current = "first";
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const toLast = event.key === "ArrowUp";
      if (open) {
        const els = enabled();
        focusEl(toLast ? els[els.length - 1] : els[0]);
      } else {
        initialFocus.current = toLast ? "last" : "first";
        setOpen(true);
      }
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const els = enabled();
    const current = els.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      event.preventDefault();
      focusEl(els[(i + els.length) % els.length]);
    };
    switch (event.key) {
      case "ArrowDown":
        go(current + 1);
        return;
      case "ArrowUp":
        go(current < 0 ? -1 : current - 1);
        return;
      case "Home":
        go(0);
        return;
      case "End":
        go(-1);
        return;
      case "Tab":
        // Focus goes back to the trigger so the browser tabs on from there.
        close(true);
        return;
      default:
    }
    const isChar = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    const t = typed.current;
    if (!isChar || (event.key === " " && t.text === "")) return;
    event.preventDefault();
    window.clearTimeout(t.timer);
    t.text += event.key.toLowerCase();
    t.timer = window.setTimeout(() => {
      t.text = "";
    }, TYPEAHEAD_MS);
    // A repeated single letter cycles through matches; a longer prefix keeps the best match.
    const cycle = t.text.split("").every((c) => c === t.text[0]);
    const needle = cycle ? t.text[0] : t.text;
    const ordered = [...els.slice(current + 1), ...els.slice(0, current + 1)];
    const hit = (cycle ? ordered : [...els.slice(Math.max(current, 0)), ...els]).find((el) =>
      itemText(el).startsWith(needle ?? ""),
    );
    focusEl(hit);
  };

  const select = (item: DropdownActionItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    close(true);
  };

  return (
    <>
      <Button
        {...rest}
        id={triggerId}
        ref={setTrigger}
        className={cx("ol-dropdown__trigger", className)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-state={open ? "open" : "closed"}
        arrow={open ? "↑" : "↓"}
        onKeyDown={onTriggerKeyDown}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (open) close(false);
          else setOpen(true);
        }}
      >
        {label}
      </Button>
      {open ? (
        <Portal anchor={reference}>
          <ul
            ref={setMenuNode}
            id={menuId}
            // A menu is a list with the menu role (ARIA menu pattern); the lint rule has no exception for it.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
            role="menu"
            tabIndex={-1}
            aria-labelledby={triggerId}
            data-state={positioned ? "open" : "pending"}
            style={style}
            className={cx("ol-floating", "ol-dropdown__menu", menuClassName)}
            onKeyDown={onMenuKeyDown}
          >
            {items.map((item, i) => {
              if ("divider" in item) {
                return <li key={i} role="separator" className="ol-dropdown__divider" />;
              }
              if (!isAction(item)) {
                return (
                  <li key={i} role="presentation" className="ol-dropdown__header">
                    {item.header}
                  </li>
                );
              }
              return (
                <li key={i} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={active === i ? 0 : -1}
                    aria-disabled={item.disabled ? true : undefined}
                    className={cx("ol-dropdown__item", item.danger && "ol-dropdown__item--danger")}
                    onFocus={() => {
                      setActive(i);
                    }}
                    onClick={() => {
                      select(item);
                    }}
                  >
                    <span className="ol-dropdown__label">{item.label}</span>
                    {item.kbd ? (
                      <span className="ol-dropdown__kbd" aria-hidden="true">
                        {item.kbd}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Portal>
      ) : null}
    </>
  );
});
