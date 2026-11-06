import type { Placement } from "@floating-ui/dom";
import {
  type HTMLAttributes,
  type MouseEvent,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useIsomorphicLayoutEffect, type VirtualAnchor } from "../../hooks/useFloating";
import { type MenuCloseReason, type MenuFocusIntent, useMenu } from "../../hooks/useMenu";
import { useMenuPosition } from "../../hooks/useMenuPosition";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { forwardRefAs, type PolymorphicProps } from "../../utils/polymorphic";
import type { DropdownItem } from "../Dropdown";
import { MenuItems, MenuPopup } from "../Dropdown/Menu";
import {
  type ContextMenuRequest,
  DEFAULT_NATIVE,
  isNativeTarget,
  isSecondaryPress,
  LONG_PRESS_MS,
  swallowNextClick,
  type TriggerUserHandlers,
  useContextMenuTrigger,
} from "./useContextMenuTrigger";

/** One entry of the menu: the same items as a Dropdown. */
export type ContextMenuItem = DropdownItem;

/** Why the menu closed: passed to `onOpenChange` and `restoreFocus`. */
export type ContextMenuCloseReason = Extract<
  MenuCloseReason,
  "select" | "escape" | "outside" | "tab"
>;

export interface ContextMenuOwnProps {
  /**
   * Menu entries, as in Dropdown: actions, checkable items, radio groups, one level of submenus,
   * group headers and dividers. With none, the browser's menu shows.
   */
  items: readonly ContextMenuItem[];
  /**
   * Accessible name of the menu. Defaults to the locale's "Context menu"; give one when a page
   * has several.
   */
  label?: string;
  /**
   * Leaves the browser's menu alone: nothing is intercepted. Sets `data-disabled` on the area.
   * @default false
   */
  disabled?: boolean;
  /**
   * Opens the menu after a touch or pen is held. `true` waits 500 ms, a number is the delay in
   * ms, `false` turns it off (set it where users must select text by touch).
   * @default true
   */
  longPress?: boolean | number;
  /**
   * CSS selector of descendants that keep the browser's menu. The default is text fields,
   * selects and editable content; widen it (for example add `a[href]`) to keep more.
   */
  native?: string;
  /** Called when the menu opens or closes; closing passes the reason. */
  onOpenChange?: (open: boolean, reason?: ContextMenuCloseReason) => void;
  /**
   * Where focus goes when the menu closes. `true`: back to the element that had it before the
   * menu opened, except after an outside press. A function decides per reason and may return an
   * element. Set it to false when an item moves focus itself, such as an inline rename; focus
   * that is still inside the closing menu is then handed to the element that had it before the
   * menu opened, as a fail-safe, so move it before the menu closes (in `onSelect`).
   * @default true
   */
  restoreFocus?: boolean | ((reason: ContextMenuCloseReason) => boolean | HTMLElement | null);
  /** Extra class names for the menu (for example `ol-motion-noren`). */
  menuClassName?: string;
}

export type ContextMenuProps<E extends React.ElementType = "div"> = PolymorphicProps<
  E,
  ContextMenuOwnProps
>;

/** Where the open menu hangs: a point of the viewport, or the element that had focus. */
interface Target {
  anchor: VirtualAnchor;
  placement: Placement;
  /** Opened by the keyboard: the menu follows its element and stays on scroll. */
  follows: boolean;
  /** The element a keyboard-opened menu hangs from. */
  element?: Element;
}

/** What the menu needs to hand focus back: written when it opens, read when it closes. */
interface Opener {
  element: Element | null;
  area: HTMLElement | null;
}

const rectAt = (x: number, y: number, width = 0, height = 0): DOMRect => ({
  x,
  y,
  width,
  height,
  top: y,
  left: x,
  right: x + width,
  bottom: y + height,
  toJSON: () => ({}),
});

/** A point under the pointer. */
const pointAnchor = (x: number, y: number, area: Element): VirtualAnchor => ({
  getBoundingClientRect: () => rectAt(x, y),
  contextElement: area,
});

/** Share of the viewport height a keyboard anchor may take: the menu hangs from its top part. */
const ANCHOR_MAX_SHARE = 1 / 3;

/**
 * The part of a box that is inside the viewport, at most a third of its height from the top
 * (the box itself when none of it is visible). A tall element would otherwise leave no room
 * below or above it, and the menu would be squeezed to a few pixels.
 */
export function visibleRect(rect: DOMRect): DOMRect {
  const { clientWidth, clientHeight } = document.documentElement;
  if (clientWidth === 0 || clientHeight === 0) return rect;
  const left = Math.max(rect.left, 0);
  const top = Math.max(rect.top, 0);
  const right = Math.min(rect.right, clientWidth);
  const bottom = Math.min(rect.bottom, clientHeight);
  if (right <= left || bottom <= top) return rect;
  return rectAt(left, top, right - left, Math.min(bottom - top, clientHeight * ANCHOR_MAX_SHARE));
}

/**
 * The focused element, measured live so the menu follows it. Only the visible part counts, so
 * a tall element (a canvas, a long row) does not push the menu out of view.
 */
export const elementAnchor = (element: Element): VirtualAnchor => ({
  getBoundingClientRect: () => visibleRect(element.getBoundingClientRect()),
  contextElement: element,
});

/** Tells the menu where focus should land once it mounts (the hook reads and resets it). */
function aim(intent: MenuFocusIntent, mode: "first" | "menu") {
  intent.mode = mode;
}

/** Remembers what to give focus back to. */
function remember(opener: Opener, area: HTMLElement) {
  opener.element = document.activeElement;
  opener.area = area;
}

/** The element that gets focus back: what had it before, else the area when it can take it. */
function returnTarget(opener: Opener, reason: ContextMenuCloseReason): HTMLElement | null {
  // After an outside press, focus stays where the press put it.
  if (reason === "outside") return null;
  const { element, area } = opener;
  if (element instanceof HTMLElement && element.isConnected && element !== document.body) {
    return element;
  }
  return area?.isConnected && (area.tabIndex >= 0 || area.hasAttribute("tabindex")) ? area : null;
}

/**
 * Wraps an area and opens a menu of the same items as a Dropdown where the user asks for one:
 * a right-click, a touch long-press, Shift+F10 or the ContextMenu key. With the pointer the
 * menu's corner sits on the point; from the keyboard it hangs from the focused element and takes
 * focus on its first item. The browser's own menu still shows in text fields, with Shift and the
 * mouse, and wherever the menu is disabled. It is a shortcut: every command also needs a visible
 * control elsewhere. The `ref` points to the area.
 */
export const ContextMenu = forwardRefAs<"div", ContextMenuOwnProps>(function ContextMenu(
  {
    as: As = "div",
    items,
    label,
    disabled = false,
    longPress = true,
    native = DEFAULT_NATIVE,
    onOpenChange,
    restoreFocus = true,
    menuClassName,
    className,
    children,
    onContextMenu,
    onKeyDown,
    onPointerDown,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const areaRef = useRef<HTMLElement | null>(null);
  const enabled = !disabled && items.length > 0;
  const delay = longPress === true ? LONG_PRESS_MS : longPress === false ? 0 : longPress;

  // Plain boxes (not refs): the menu reads them in handlers, never during render.
  const [focusIntent] = useState<MenuFocusIntent>(() => ({ mode: null }));
  const [opener] = useState<Opener>(() => ({ element: null, area: null }));
  const [target, setTarget] = useState<Target | null>(null);

  const menu = useMenu({
    label: label === undefined || label === "" ? t.contextMenu : label,
    onOpenChange: (next, reason) => {
      if (reason === undefined) onOpenChange?.(next);
      else onOpenChange?.(next, reason as ContextMenuCloseReason);
    },
    initialFocus: focusIntent,
    restoreFocus: (reason) => {
      if (restoreFocus === false) return false;
      if (typeof restoreFocus === "function") return restoreFocus(reason as ContextMenuCloseReason);
      return returnTarget(opener, reason as ContextMenuCloseReason);
    },
    ignoreOutside: (node, event) => {
      const area = areaRef.current;
      // A secondary press inside the area is left alone: the `contextmenu` event that follows
      // moves the open menu, and closing now would play an exit and reopen.
      if (
        area?.contains(node) &&
        enabled &&
        isSecondaryPress(event) &&
        !event.shiftKey &&
        !isNativeTarget(node, area, native)
      ) {
        return true;
      }
      // Any other press closes the menu (the hook does it next): its click must not also
      // activate what is under it.
      swallowNextClick();
      return false;
    },
  });

  const position = useMenuPosition<HTMLElement, HTMLUListElement>({
    open: menu.mounted,
    placement: target?.placement ?? "right-start",
    // The menu's corner sits on the pointer, as in native menus.
    ...(target?.follows === false ? { gap: 0 } : null),
    anchor: target?.anchor ?? null,
  });

  const request = (req: ContextMenuRequest) => {
    const area = areaRef.current;
    if (!area) return;
    const keyboard = req.kind === "keyboard";
    if (keyboard) {
      setTarget({
        anchor: elementAnchor(req.element),
        placement: "bottom-start",
        follows: true,
        element: req.element,
      });
    } else {
      const rtl = getComputedStyle(area).direction === "rtl";
      setTarget({
        anchor: pointAnchor(req.x, req.y, area),
        placement: rtl ? "left-start" : "right-start",
        follows: false,
      });
    }
    // Already open: a new request only moves it (and, from the keyboard, takes focus).
    if (menu.open) {
      if (keyboard) menu.focusItem("first");
      return;
    }
    remember(opener, area);
    aim(focusIntent, keyboard ? "first" : "menu");
    menu.setOpen(true);
  };

  const trigger = useContextMenuTrigger({
    enabled,
    longPress: delay,
    native,
    onRequest: request,
    // Another handler took the event (an inner area, the app, a text field): this menu is done.
    onForeign: () => {
      if (menu.open) menu.close("outside");
    },
    user: {
      onContextMenu: onContextMenu as TriggerUserHandlers["onContextMenu"],
      onKeyDown: onKeyDown as TriggerUserHandlers["onKeyDown"],
      onPointerDown: onPointerDown as TriggerUserHandlers["onPointerDown"],
    },
  });

  // The menu is gone as soon as it cannot open again.
  const closeRef = useRef(menu.close);
  useIsomorphicLayoutEffect(() => {
    closeRef.current = menu.close;
  });
  const { open } = menu;
  useEffect(() => {
    if (open && !enabled) closeRef.current("outside");
  }, [open, enabled]);

  // A menu at a point of the viewport closes when the page moves under it, as native menus do.
  // One opened from the keyboard follows its element instead.
  const { popups } = menu.tree;
  const pointed = open && target !== null && !target.follows;
  useEffect(() => {
    if (!pointed) return;
    const onScroll = (event: Event) => {
      const origin = event.target;
      if (origin instanceof Node) {
        for (const popup of popups) if (popup.contains(origin)) return;
        // Only the page or something the area sits in moves the point; an auto-scrolling log or
        // a text field's caret elsewhere does not.
        const area = areaRef.current;
        if (origin !== document && !(area && origin.contains(area))) return;
      }
      closeRef.current("outside");
    };
    const onResize = () => {
      closeRef.current("outside");
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [pointed, popups]);

  // A menu hanging from an element closes if that element leaves the page.
  const anchorElement = open && target?.follows === true ? target.element : undefined;
  useEffect(() => {
    if (!anchorElement) return;
    const check = () => {
      if (!anchorElement.isConnected) closeRef.current("outside");
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [anchorElement]);

  const setArea = useCallback(
    (node: HTMLElement | null) => {
      areaRef.current = node;
      const forwarded = ref as Ref<HTMLElement> | null;
      if (typeof forwarded === "function") forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [ref],
  );

  return (
    <>
      <As
        {...(rest as HTMLAttributes<HTMLElement>)}
        {...trigger.props}
        ref={setArea}
        className={cx("ol-context-menu", className as string | undefined)}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
      >
        {children}
      </As>
      <MenuPopup
        menu={menu}
        position={position}
        anchorRef={areaRef}
        className={menuClassName}
        // No browser menu on top of ours.
        onContextMenu={(event: MouseEvent<HTMLUListElement>) => {
          event.preventDefault();
        }}
      >
        <MenuItems menu={menu} items={items} />
      </MenuPopup>
    </>
  );
});
