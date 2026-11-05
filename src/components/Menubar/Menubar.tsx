import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import {
  type MenuCloseReason,
  type MenuFocusIntent,
  type MenuInitialFocus,
  useMenu,
} from "../../hooks/useMenu";
import { useMenuPosition } from "../../hooks/useMenuPosition";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import { useTypeahead } from "../../hooks/useTypeahead";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { visibleText } from "../../utils/listItems";
import { type DropdownItem } from "../Dropdown";
import { MenuItems, MenuPopup } from "../Dropdown/Menu";

/** Fields every entry of the bar shares. */
interface MenubarEntryBase {
  /** Text of the entry. */
  label: ReactNode;
  /** Makes the entry unselectable and skipped by the keyboard. An entry with no `items` is disabled too. */
  disabled?: boolean;
  /** Identifies the entry in `value`. Defaults to its position as a string. */
  id?: string;
  /** Text used by typeahead when the label is not plain text (or for a kana reading). */
  textValue?: string;
}

/** An entry that opens a menu: the same items as a Dropdown. */
export interface MenubarMenuItem extends MenubarEntryBase {
  /** Actions, checkable items, radio groups, one level of submenus, headers and dividers. */
  items: readonly DropdownItem[];
}

/** An entry that runs an action when chosen, with no menu. */
export interface MenubarActionItem extends MenubarEntryBase {
  /** Called when the entry is chosen. */
  onSelect?: () => void;
}

/** One entry of the bar: a menu or a plain action. */
export type MenubarItem = MenubarMenuItem | MenubarActionItem;

/**
 * Why the open entry changed. `open`: from none to an entry. `switch`: from one entry to another
 * (hover, Left and Right, a tap on a neighbour). Closing passes the menu's own reason.
 */
export type MenubarChangeReason = "open" | "switch" | MenuCloseReason;

export interface MenubarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "defaultValue"
> {
  /** The entries of the bar, in order: menus, or plain actions. */
  items: readonly MenubarItem[];
  /**
   * Accessible name of the bar. Defaults to the locale's "Menu bar"; give one when the page has
   * several menu bars or navigations.
   */
  label?: string;
  /** Controlled open entry: its `id` (its position as a string when it has none), `null` for none. */
  value?: string | null;
  /**
   * Initially open entry when uncontrolled.
   * @default null
   */
  defaultValue?: string | null;
  /** Called when the open entry changes, with why. */
  onValueChange?: (value: string | null, reason: MenubarChangeReason) => void;
  /** Opens the menus above the bar (a bottom-docked bar). They still flip when there is no room. */
  up?: boolean;
  /**
   * Returns focus to the bar entry when a menu closes (not after an outside press). Set it to
   * false, or to a function that returns an element, when an item moves focus into the document.
   * @default true
   */
  restoreFocus?: boolean | ((reason: MenuCloseReason) => boolean | HTMLElement | null);
  /** Extra class names for every menu (for example `ol-motion-noren`). */
  menuClassName?: string;
}

/** Pixels: the menu overlaps the bar's bottom border by one hairline (1px on every screen). */
const HAIRLINE = 1;

const ENTRY = '[role="menuitem"]';

const keyOf = (item: MenubarItem, index: number) => item.id ?? String(index);

const hasMenu = (item: MenubarItem): item is MenubarMenuItem => "items" in item;

/** A menu entry that can open: not disabled and with something to show. */
const canOpen = (item: MenubarItem): item is MenubarMenuItem =>
  hasMenu(item) && !item.disabled && item.items.length > 0;

const isOff = (item: MenubarItem) => item.disabled === true || (hasMenu(item) && !canOpen(item));

/** Tells the next menu to open where focus should land (the hook reads and resets it). */
function aim(intent: MenuFocusIntent, mode: MenuInitialFocus) {
  intent.mode = mode;
}

/** The entries that are direct children of the bar (menus live in portals). */
const entriesOf = (bar: HTMLElement) =>
  Array.from(bar.querySelectorAll<HTMLElement>(`:scope > ${ENTRY}`));

type OnToggle = (key: string, open: boolean, reason: MenuCloseReason | undefined) => void;

interface MenuEntryProps {
  item: MenubarMenuItem;
  entryKey: string;
  active: boolean;
  instant: boolean;
  up: boolean;
  restoreFocus: MenubarProps["restoreFocus"];
  menuClassName: string | undefined;
  focusIntent: MenuFocusIntent;
  barRef: RefObject<HTMLElement | null>;
  onToggle: OnToggle;
  onHover: (key: string, event: PointerEvent<HTMLElement>) => void;
  onArrowOut: (key: string, direction: "prev" | "next") => void;
}

/**
 * One entry that opens a menu. A component of its own because the hooks run once per entry:
 * the same assembly as Dropdown, with a bar cell for a trigger.
 */
function MenubarMenu({
  item,
  entryKey,
  active,
  instant,
  up,
  restoreFocus,
  menuClassName,
  focusIntent,
  barRef,
  onToggle,
  onHover,
  onArrowOut,
}: MenuEntryProps) {
  const menu = useMenu({
    open: active,
    onOpenChange: (next, reason) => {
      onToggle(entryKey, next, reason);
    },
    triggerRole: "menuitem",
    onArrowOut: (direction) => {
      onArrowOut(entryKey, direction);
    },
    ...(restoreFocus === undefined ? null : { restoreFocus }),
    initialFocus: focusIntent,
    // A press on the bar is not outside: another entry's click performs the switch. A press on
    // a disabled cell does nothing there, so it closes the menu as any other outside press.
    ignoreOutside: (target) =>
      (barRef.current?.contains(target) ?? false) &&
      !(target instanceof Element && target.closest("[data-disabled]")),
  });
  const position = useMenuPosition<HTMLButtonElement, HTMLUListElement>({
    open: menu.mounted,
    placement: up ? "top-start" : "bottom-start",
    gap: -HAIRLINE,
  });
  const { setTrigger } = menu;
  const { setAnchor } = position;
  const setCell = useCallback(
    (node: HTMLButtonElement | null) => {
      setTrigger(node);
      setAnchor(node);
    },
    [setTrigger, setAnchor],
  );

  return (
    <>
      <button
        type="button"
        {...menu.getTriggerProps({
          className: "ol-menubar__item",
          "data-text-value": item.textValue,
          onPointerEnter: (event: PointerEvent<HTMLElement>) => {
            onHover(entryKey, event);
          },
          // A pointer click opens on the menu itself; Enter and Space (detail 0) open on an item.
          onClick: (event) => {
            if (event.detail !== 0) aim(focusIntent, null);
          },
        })}
        ref={setCell}
      >
        {item.label}
      </button>
      <MenuPopup
        menu={menu}
        position={position}
        className={cx("ol-menubar__menu", menuClassName)}
        data-instant={instant ? "" : undefined}
      >
        <MenuItems menu={menu} items={item.items} />
      </MenuPopup>
    </>
  );
}

interface ActionEntryProps {
  item: MenubarItem;
  onChoose: (() => void) | undefined;
  /** Menu entry that cannot open: a disabled cell that still announces a menu. */
  hasPopup: boolean;
}

/** A cell that runs an action, or a disabled cell. */
function MenubarCell({ item, onChoose, hasPopup }: ActionEntryProps) {
  const off = isOff(item);
  return (
    <button
      type="button"
      role="menuitem"
      className="ol-menubar__item"
      aria-haspopup={hasPopup ? "menu" : undefined}
      aria-expanded={hasPopup ? false : undefined}
      aria-disabled={off ? true : undefined}
      data-disabled={off ? "" : undefined}
      data-text-value={item.textValue}
      onClick={off ? undefined : onChoose}
    >
      {item.label}
    </button>
  );
}

function setRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * The horizontal bar of an application: File, Edit, View, Help. Each entry opens a menu of the
 * same items as a Dropdown, or runs an action. The bar is one tab stop; Left and Right move
 * between entries (and between open menus), Down opens, Escape closes and returns focus to
 * the entry. The menus hang from the bar and switch instantly while one is open. The `ref`
 * points to the bar.
 */
export const Menubar = forwardRef<HTMLDivElement, MenubarProps>(function Menubar(
  {
    items,
    label,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    up = false,
    restoreFocus = true,
    menuClassName,
    className,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const barRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useControllable<string | null>(valueProp, defaultValue);
  // A plain box (not a ref): the menus read it in handlers, never during render.
  const [focusIntent] = useState<MenuFocusIntent>(() => ({ mode: null }));

  // Going from one open entry to another is instant; opening from none or closing is not.
  const [track, setTrack] = useState({ value, instant: false });
  if (track.value !== value) {
    setTrack({ value, instant: track.value !== null && value !== null });
  }
  const instant = track.instant;

  const roving = useRovingFocus(barRef, {
    itemSelector: ENTRY,
    orientation: "horizontal",
    loop: true,
  });
  const { onKeyDown: typeKey } = useTypeahead();

  const keys = items.map(keyOf);

  const change = (next: string | null, reason: MenubarChangeReason) => {
    if (next === value) return;
    setValue(next);
    onValueChange?.(next, reason);
  };

  const onToggle: OnToggle = (key, open, reason) => {
    if (open) change(key, value === null ? "open" : "switch");
    // The leaving menu of a switch must not clear the entry that replaced it.
    else if (value === key) change(null, reason ?? "trigger");
  };

  const onHover = (key: string, event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || value === null || value === key) return;
    aim(focusIntent, null);
    change(key, "switch");
  };

  const onArrowOut = (key: string, direction: "prev" | "next") => {
    const at = keys.indexOf(key);
    for (let step = 1; step < items.length; step += 1) {
      const index = (at + (direction === "next" ? step : -step) + items.length * 2) % items.length;
      const candidate = items[index];
      const target = keys[index];
      if (target !== undefined && candidate && canOpen(candidate)) {
        aim(focusIntent, "first");
        change(target, "switch");
        return;
      }
    }
  };

  /** While a menu is open, moving along the bar moves the menu with it. */
  const followFocus = (bar: HTMLElement) => {
    const index = entriesOf(bar).indexOf(document.activeElement as HTMLElement);
    const item = items[index];
    const key = keys[index];
    if (!item || key === undefined) return;
    if (canOpen(item)) {
      aim(focusIntent, "first");
      change(key, "switch");
    } else change(null, "arrow-out");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const bar = barRef.current;
    // Keys of the menus bubble here through their portals.
    if (!bar?.contains(event.target as Node)) return;
    if (event.key === "Tab") {
      if (value !== null) change(null, "tab");
      return;
    }
    let moved = roving.onKeyDown(event);
    if (!moved) {
      const enabled = entriesOf(bar).filter((el) => !el.hasAttribute("data-disabled"));
      const hit = typeKey(
        event,
        enabled,
        document.activeElement as HTMLElement | null,
        visibleText,
      );
      if (hit) moved = roving.focusItem(hit);
    }
    if (moved && value !== null) followFocus(bar);
  };

  const setBar = useCallback(
    (node: HTMLDivElement | null) => {
      barRef.current = node;
      setRef(ref, node);
    },
    [ref],
  );

  return (
    // The bar is not a tab stop of its own: its entries are (roving tabindex).
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      aria-label={label ?? t.menubar}
      {...rest}
      ref={setBar}
      role="menubar"
      className={cx("ol-menubar", className)}
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        rest.onFocus?.(event);
        roving.onFocus(event);
      }}
    >
      {items.map((item, index) => {
        const key = keys[index] ?? String(index);
        if (canOpen(item)) {
          return (
            <MenubarMenu
              key={key}
              item={item}
              entryKey={key}
              active={value === key}
              instant={instant}
              up={up}
              restoreFocus={restoreFocus}
              menuClassName={menuClassName}
              focusIntent={focusIntent}
              barRef={barRef}
              onToggle={onToggle}
              onHover={onHover}
              onArrowOut={onArrowOut}
            />
          );
        }
        return (
          <MenubarCell
            key={key}
            item={item}
            hasPopup={hasMenu(item)}
            onChoose={() => {
              // A plain action closes whatever is open, then runs.
              if (value !== null) change(null, "select");
              if (!hasMenu(item)) item.onSelect?.();
            }}
          />
        );
      })}
    </div>
  );
});
