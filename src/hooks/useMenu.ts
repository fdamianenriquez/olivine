import {
  createContext,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefCallback,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { type PresenceState, usePresence } from "../motion/usePresence";
import { useLayer } from "./layers";
import { useControllable } from "./useControllable";
import { useIsomorphicLayoutEffect } from "./useFloating";
import { useRovingFocus } from "./useRovingFocus";
import { useTypeahead } from "./useTypeahead";

/** Why a menu closed. Passed to `onOpenChange` and `restoreFocus`. */
export type MenuCloseReason = "trigger" | "select" | "escape" | "outside" | "tab" | "arrow-out";

/** `item`: an action; `checkbox` / `radio`: checkable rows; `sub`: opens a submenu. */
export type MenuItemKind = "item" | "checkbox" | "radio" | "sub";

export interface UseMenuOptions {
  open?: boolean;
  defaultOpen?: boolean;
  /** Called when the menu opens or closes; closing passes the reason. */
  onOpenChange?: (open: boolean, reason?: MenuCloseReason) => void;
  /** Base for the trigger and menu ids. */
  id?: string;
  /**
   * `menuitem` for a trigger that is itself a menu item (a menubar entry or a submenu row).
   * @default "button"
   */
  triggerRole?: "button" | "menuitem";
  /** Accessible name of the menu when no trigger names it (a context menu). */
  label?: string;
  /**
   * Arrow keys wrap from the last item to the first.
   * @default true
   */
  loop?: boolean;
  /**
   * `skip`: disabled items are passed over by the keyboard. `focusable`: they can take focus
   * (APG) but can't be chosen.
   * @default "skip"
   */
  disabledItems?: "skip" | "focusable";
  /**
   * Typing moves to the item whose text starts with the typed letters.
   * @default true
   */
  typeahead?: boolean | { timeout?: number };
  /**
   * Where focus goes when the menu closes. `true`: the trigger, except after an outside press.
   * A function decides per reason and may return an element.
   * @default true
   */
  restoreFocus?: boolean | ((reason: MenuCloseReason) => boolean | HTMLElement | null);
  /** Left/Right on an item (a menubar moves to the neighbouring menu). */
  onArrowOut?: (direction: "prev" | "next") => void;
}

export interface MenuItemOptions {
  kind?: MenuItemKind;
  disabled?: boolean | undefined;
  /** Text used by typeahead when the visible label is not plain text (or for a kana reading). */
  textValue?: string | undefined;
  /** State of a checkbox or radio item. */
  checked?: boolean | undefined;
  /**
   * Closes the whole menu after the item is chosen. Defaults to true for actions and false for
   * checkbox and radio items.
   */
  closeOnSelect?: boolean | undefined;
  /** Called when the item is chosen (checkable items toggle their state here). */
  onSelect?: (() => void) | undefined;
}

/** The menus of one tree (a menu and its submenus), so they close and dismiss together. */
export interface MenuTree {
  /** Every mounted popup of the tree: a press inside any of them is not an outside press. */
  popups: Set<HTMLElement>;
  /** Closes the outermost menu. */
  closeRoot: (reason: MenuCloseReason) => void;
  /** 0 for the outermost menu. */
  depth: number;
}

/** Provided by the menu popup, read by a nested `useMenu` (a submenu). */
export const MenuTreeContext = createContext<MenuTree | null>(null);

/** Props of the element a getter is spread on; the getter returns them with its own merged in. */
type Handlers<E extends HTMLElement> = HTMLAttributes<E>;

export interface UseMenuResult {
  open: boolean;
  setOpen: (open: boolean, reason?: MenuCloseReason) => void;
  /** Closes the menu and moves focus as `restoreFocus` says. */
  close: (reason: MenuCloseReason) => void;
  /** `open`, `closing` while the exit motion plays, `closed`. */
  state: PresenceState;
  /** Render the popup while this is true. */
  mounted: boolean;
  /** The trigger element, also for the portal's theme. */
  triggerRef: { current: HTMLElement | null };
  setTrigger: RefCallback<HTMLElement>;
  setMenu: RefCallback<HTMLElement>;
  /** Pass to `MenuTreeContext.Provider` around the popup's content. */
  tree: MenuTree;
  getTriggerProps: <P extends Handlers<HTMLElement>>(user?: P) => P;
  getMenuProps: <P extends Handlers<HTMLElement>>(user?: P) => P;
  getItemProps: <P extends Handlers<HTMLElement>>(options?: MenuItemOptions, user?: P) => P;
  /** Focuses the first or last enabled item, or the menu itself. */
  focusItem: (which: "first" | "last" | "menu") => void;
}

const ITEM_SELECTOR = '[role^="menuitem"]';
const HIGHLIGHT_ATTR = "data-highlighted";

const isSkipped = (el: Element) => el.hasAttribute("data-disabled");

/** The item's text without its aria-hidden parts (shortcut caps, glyphs). */
function visibleText(item: HTMLElement): string {
  const own = item.getAttribute("data-text-value");
  if (own !== null) return own;
  let text = "";
  const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest('[aria-hidden="true"]')) text += node.textContent ?? "";
  }
  return text;
}

/** Scrolls a capped menu so the item is in view, without scrolling the page. */
function reveal(menu: HTMLElement, item: HTMLElement) {
  if (menu.scrollHeight <= menu.clientHeight) return;
  const box = menu.getBoundingClientRect();
  const row = item.getBoundingClientRect();
  if (row.top < box.top) menu.scrollTop -= box.top - row.top;
  else if (row.bottom > box.bottom) menu.scrollTop += row.bottom - box.bottom;
}

function compose<E>(user: ((event: E) => void) | undefined, own: (event: E) => void) {
  return (event: E) => {
    user?.(event);
    if (!(event as { defaultPrevented?: boolean }).defaultPrevented) own(event);
  };
}

/**
 * Behaviour of a menu (APG menu button): open state, keyboard, typeahead, dismissal, focus
 * return and the exit phase, as prop getters with no markup and no positioning. Items are found
 * in the DOM (`[role^="menuitem"]`) and must be buttons, so Enter and Space choose them.
 * Positioning is `useMenuPosition`; the shared markup is `MenuPopup` / `MenuItems`.
 */
export function useMenu({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  id: idProp,
  triggerRole = "button",
  label,
  loop = true,
  disabledItems = "skip",
  typeahead = true,
  restoreFocus = true,
  onArrowOut,
}: UseMenuOptions = {}): UseMenuResult {
  const generated = useId();
  const base = idProp ?? generated;
  const triggerId = idProp ?? `${generated}-trigger`;
  const menuId = `${base}-menu`;

  const reason = useRef<MenuCloseReason | undefined>(undefined);
  const report = useCallback(
    (next: boolean) => {
      const why = reason.current;
      reason.current = undefined;
      if (why === undefined || next) onOpenChange?.(next);
      else onOpenChange?.(next, why);
    },
    [onOpenChange],
  );
  const [open, setOpenState] = useControllable(openProp, defaultOpen, report);

  const triggerRef = useRef<HTMLElement | null>(null);
  const [hasTrigger, setHasTrigger] = useState(false);
  const menuRef = useRef<HTMLElement | null>(null);
  const [menu, setMenuNode] = useState<HTMLElement | null>(null);
  const { mounted, state, setElement } = usePresence(open);
  const initialFocus = useRef<"first" | "last" | null>(null);

  const parent = useContext(MenuTreeContext);
  const [popups] = useState(() => new Set<HTMLElement>());
  const closeSelf = useRef<(why: MenuCloseReason) => void>(() => undefined);
  const [tree] = useState<MenuTree>(() =>
    parent
      ? { popups: parent.popups, closeRoot: parent.closeRoot, depth: parent.depth + 1 }
      : {
          popups,
          closeRoot: (why) => {
            closeSelf.current(why);
          },
          depth: 0,
        },
  );

  const roving = useRovingFocus(menuRef, {
    preventScroll: true,
    itemSelector: ITEM_SELECTOR,
    orientation: "vertical",
    loop,
  });
  const { onKeyDown: typeKey, reset: resetTyped } = useTypeahead(
    typeof typeahead === "object" ? typeahead : {},
  );

  const setTrigger = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
    setHasTrigger(node !== null);
  }, []);
  const setMenu = useCallback(
    (node: HTMLElement | null) => {
      menuRef.current = node;
      setMenuNode(node);
      setElement(node);
    },
    [setElement],
  );

  const enabled = useCallback((): HTMLElement[] => {
    const root = menuRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
      (el) => el.closest('[role="menu"]') === root && !isSkipped(el),
    );
  }, []);

  const focusEl = useCallback((el: HTMLElement | undefined) => {
    const root = menuRef.current;
    if (!el || !root) return;
    el.focus({ preventScroll: true });
    reveal(root, el);
  }, []);

  const focusItem = useCallback(
    (which: "first" | "last" | "menu") => {
      const els = enabled();
      if (which === "menu") menuRef.current?.focus({ preventScroll: true });
      else focusEl(which === "first" ? els[0] : els[els.length - 1]);
    },
    [enabled, focusEl],
  );

  const setOpen = useCallback(
    (next: boolean, why?: MenuCloseReason) => {
      reason.current = next ? undefined : why;
      setOpenState(next);
    },
    [setOpenState],
  );

  const close = useCallback(
    (why: MenuCloseReason) => {
      const choice = typeof restoreFocus === "function" ? restoreFocus(why) : restoreFocus;
      const target =
        choice instanceof HTMLElement
          ? choice
          : choice === true && why !== "outside"
            ? triggerRef.current
            : null;
      setOpen(false, why);
      target?.focus();
    },
    [restoreFocus, setOpen],
  );
  useIsomorphicLayoutEffect(() => {
    closeSelf.current = close;
  });

  // Register the popup in the tree, so presses inside a submenu don't dismiss the root.
  useEffect(() => {
    if (!menu) return;
    tree.popups.add(menu);
    return () => {
      tree.popups.delete(menu);
    };
  }, [menu, tree]);

  // Once open and mounted, focus goes inside: an item after a keyboard open, the menu otherwise.
  useIsomorphicLayoutEffect(() => {
    if (!menu || !open) return;
    const mode = initialFocus.current;
    initialFocus.current = null;
    if (mode) focusItem(mode);
    else menu.focus({ preventScroll: true });
  }, [menu, open]);

  useIsomorphicLayoutEffect(() => {
    if (!open) resetTyped();
  }, [open, resetTyped]);

  // Escape closes the topmost menu only; an outside press closes the whole tree.
  const isTop = useLayer(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || !isTop()) return;
      close("escape");
      // Handled: an overlay underneath (Modal, Offcanvas) stays open whatever the listener order.
      event.preventDefault();
    };
    const onPointer = (event: globalThis.PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || triggerRef.current?.contains(target)) return;
      for (const popup of tree.popups) if (popup.contains(target)) return;
      close("outside");
    };
    document.addEventListener("keydown", onKey);
    if (!parent) document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close, isTop, parent, tree]);

  const getTriggerProps = <P extends Handlers<HTMLElement>>(user: P = {} as P): P => ({
    ...user,
    id: triggerId,
    ...(triggerRole === "menuitem" ? { role: "menuitem" } : null),
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": mounted ? menuId : undefined,
    "data-state": open ? "open" : "closed",
    onKeyDown: compose(user.onKeyDown, (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const which = event.key === "ArrowUp" ? "last" : "first";
      if (open) focusItem(which);
      else {
        initialFocus.current = which;
        setOpen(true);
      }
    }),
    onClick: compose(user.onClick, (event: MouseEvent<HTMLElement>) => {
      if (open) {
        close("trigger");
        return;
      }
      // Keyboard and assistive-technology clicks report no pointer presses.
      initialFocus.current = event.detail === 0 ? "first" : null;
      setOpen(true);
    }),
  });

  // React events bubble through portals: leave a submenu's events to the submenu.
  const inside =
    <E extends { target: EventTarget }>(
      user: ((event: E) => void) | undefined,
      own: (event: E) => void,
    ) =>
    (event: E) => {
      user?.(event);
      if ((event as { defaultPrevented?: boolean }).defaultPrevented) return;
      if (menuRef.current?.contains(event.target as Node)) own(event);
    };

  const getMenuProps = <P extends Handlers<HTMLElement>>(user: P = {} as P): P => ({
    ...user,
    id: menuId,
    role: "menu",
    tabIndex: -1,
    ...(hasTrigger && !label ? { "aria-labelledby": triggerId } : { "aria-label": label }),
    "data-state": state,
    onKeyDown: inside(user.onKeyDown, (event: KeyboardEvent<HTMLElement>) => {
      const root = menuRef.current;
      if (event.target === root) {
        if (event.key === "ArrowDown" || event.key === "Home") {
          event.preventDefault();
          focusItem("first");
          return;
        }
        if (event.key === "ArrowUp" || event.key === "End") {
          event.preventDefault();
          focusItem("last");
          return;
        }
      } else if (roving.onKeyDown(event)) {
        const active = document.activeElement;
        if (root && active instanceof HTMLElement) reveal(root, active);
        return;
      }
      if (event.key === "Tab") {
        (parent ? parent.closeRoot : close)("tab");
        return;
      }
      if (onArrowOut && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const rtl = root ? getComputedStyle(root).direction === "rtl" : false;
        onArrowOut((event.key === "ArrowRight") !== rtl ? "next" : "prev");
        return;
      }
      if (typeahead === false) return;
      const active = document.activeElement as HTMLElement | null;
      const hit = typeKey(event, enabled(), active, visibleText);
      if (hit) focusEl(hit);
    }),
    onFocus: inside(user.onFocus, (event: FocusEvent<HTMLElement>) => {
      roving.onFocus(event);
      const item = (event.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
      for (const el of menuRef.current?.querySelectorAll(`[${HIGHLIGHT_ATTR}]`) ?? []) {
        if (el !== item) el.removeAttribute(HIGHLIGHT_ATTR);
      }
      item?.setAttribute(HIGHLIGHT_ATTR, "");
    }),
    onBlur: inside(user.onBlur, (event: FocusEvent<HTMLElement>) => {
      (event.target as Element).closest(ITEM_SELECTOR)?.removeAttribute(HIGHLIGHT_ATTR);
    }),
    // The pointer moves the highlight, so only one row is ever marked (mouse and pen only).
    onPointerMove: inside(user.onPointerMove, (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") return;
      const item = (event.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
      if (!item || item === document.activeElement) return;
      // Over a skipped row the highlight leaves the previous one, as when the pointer leaves.
      if (isSkipped(item)) {
        menuRef.current?.focus({ preventScroll: true });
        return;
      }
      if (item.closest('[role="menu"]') !== menuRef.current) return;
      item.focus({ preventScroll: true });
    }),
    onPointerLeave: inside(user.onPointerLeave, (event: PointerEvent<HTMLElement>) => {
      const root = menuRef.current;
      if (event.pointerType === "touch" || !root) return;
      if (root.contains(document.activeElement) && document.activeElement !== root) {
        root.focus({ preventScroll: true });
      }
    }),
  });

  const getItemProps = <P extends Handlers<HTMLElement>>(
    { kind = "item", disabled, textValue, checked, closeOnSelect, onSelect }: MenuItemOptions = {},
    user: P = {} as P,
  ): P => ({
    ...user,
    role:
      kind === "checkbox" ? "menuitemcheckbox" : kind === "radio" ? "menuitemradio" : "menuitem",
    "aria-disabled": disabled ? true : undefined,
    ...(disabled && disabledItems === "skip" ? { "data-disabled": "" } : null),
    ...(kind === "checkbox" || kind === "radio" ? { "aria-checked": Boolean(checked) } : null),
    ...(kind === "sub" ? { "aria-haspopup": "menu" } : null),
    ...(textValue === undefined ? null : { "data-text-value": textValue }),
    onClick: compose(user.onClick, () => {
      if (disabled || state !== "open" || kind === "sub") return;
      onSelect?.();
      if (closeOnSelect ?? kind === "item") (parent ? parent.closeRoot : close)("select");
    }),
  });

  return {
    open,
    setOpen,
    close,
    state,
    mounted,
    triggerRef,
    setTrigger,
    setMenu,
    tree,
    getTriggerProps,
    getMenuProps,
    getItemProps,
    focusItem,
  };
}
