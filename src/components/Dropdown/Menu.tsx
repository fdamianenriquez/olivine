import {
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  type MenuFocusIntent,
  MenuTreeContext,
  useMenu,
  type UseMenuResult,
} from "../../hooks/useMenu";
import { type MenuPosition, useMenuPosition } from "../../hooks/useMenuPosition";
import { cx } from "../../utils/cx";
import { Kbd, type Shortcut, toAriaKeyShortcuts } from "../Kbd";
import { useResolvedKbdPlatform } from "../Kbd/useKbdPlatform";
import { Portal } from "../Portal";

/** Fields every selectable entry shares. */
interface MenuEntryBase {
  /** Text of the item. */
  label: ReactNode;
  /**
   * Keyboard shortcut shown at the end of the row (`"mod+r"`, or glyphs such as `"⌘R"`), drawn
   * with Kbd and exposed as `aria-keyshortcuts`. A hint only: the app handles the shortcut.
   */
  kbd?: Shortcut;
  /** Marks a destructive action; drawn in the danger colour. */
  danger?: boolean;
  /** Makes the item unselectable and skipped by the keyboard. */
  disabled?: boolean;
  /** Stable key, for items that change while the menu is open. Defaults to the position. */
  id?: string;
  /** Text used by typeahead when the label is not plain text (or for a kana reading). */
  textValue?: string;
}

/** An actionable entry of the menu. */
export interface MenuActionItem extends MenuEntryBase {
  /** Called when the item is chosen, before the menu closes. */
  onSelect?: () => void;
  /**
   * A mark before the label: a kanji or a typographic glyph, never the only label (it is hidden
   * from assistive technology). Olivine has no icon set.
   */
  icon?: ReactNode;
  /**
   * Closes the menu after the item is chosen.
   * @default true
   */
  closeOnSelect?: boolean;
}

/** An on/off entry (`menuitemcheckbox`). The menu holds no state: the app passes `checked`. */
export interface MenuCheckItem extends MenuEntryBase {
  checked: boolean;
  /** Called with the new state when the item is chosen. */
  onCheckedChange?: (checked: boolean) => void;
  /**
   * Closes the menu after the item is chosen.
   * @default false
   */
  closeOnSelect?: boolean;
}

/** One choice of a radio group. */
export interface MenuRadioOption extends MenuEntryBase {
  value: string;
  /**
   * Closes the menu after the option is chosen.
   * @default false
   */
  closeOnSelect?: boolean;
}

/** A group of mutually exclusive choices (`menuitemradio` inside a named `group`). */
export interface MenuRadiosItem {
  radios: {
    /** The chosen option's `value`. */
    value: string | undefined;
    /** Called with the chosen option's value. */
    onValueChange?: (value: string) => void;
    /** Names the group; shown as a header over its options. */
    label?: ReactNode;
    options: readonly MenuRadioOption[];
  };
  id?: string;
}

/** An entry that opens a submenu to the side. One level is the limit of good use. */
export interface MenuSubmenuItem {
  label: ReactNode;
  items: readonly MenuItem[];
  icon?: ReactNode;
  disabled?: boolean;
  id?: string;
  textValue?: string;
}

/** A label that names the items after it, up to the next header or divider. */
export interface MenuHeaderItem {
  header: ReactNode;
}

/** A hairline between groups of items. */
export interface MenuDividerItem {
  divider: true;
}

/** One entry of a menu's `items`. */
export type MenuItem =
  | MenuActionItem
  | MenuCheckItem
  | MenuRadiosItem
  | MenuSubmenuItem
  | MenuHeaderItem
  | MenuDividerItem;

type MenuEntry = MenuActionItem | MenuCheckItem | MenuRadiosItem | MenuSubmenuItem;

/** The parts of `useMenuPosition` the popup needs (the anchor stays with the caller). */
type Position = Pick<MenuPosition<HTMLElement, HTMLUListElement>, "setFloating" | "props">;

export interface MenuPopupProps extends HTMLAttributes<HTMLUListElement> {
  menu: UseMenuResult;
  /** From `useMenuPosition`. Without it the menu is not placed (a caller that positions it with its own class). */
  position?: Position;
  /**
   * The element whose island theme, language and direction the portalled menu copies. Defaults
   * to the trigger; a menu with no trigger (a context menu) passes its area.
   */
  anchorRef?: RefObject<Element | null>;
  children: ReactNode;
}

/**
 * The menu surface: a portal, the `ul[role=menu]` with the hook's props, and the menu-tree
 * context for submenus. Renders while the menu is mounted, through its exit motion. A menu
 * with its own markup and layout (Fab) uses `useMenu` directly instead.
 */
export function MenuPopup({
  menu,
  position,
  anchorRef,
  className,
  children,
  ...rest
}: MenuPopupProps) {
  const { setMenu } = menu;
  const setFloating = position?.setFloating;
  const ref = useCallback(
    (node: HTMLUListElement | null) => {
      setMenu(node);
      setFloating?.(node);
    },
    [setMenu, setFloating],
  );
  if (!menu.mounted) return null;
  return (
    <Portal anchor={anchorRef ?? menu.triggerRef}>
      <MenuTreeContext.Provider value={menu.tree}>
        <ul
          {...menu.getMenuProps(rest)}
          {...position?.props}
          style={{ ...rest.style, ...position?.props.style }}
          ref={ref}
          className={cx(position && "ol-floating", "ol-dropdown__menu", className)}
        >
          {children}
        </ul>
      </MenuTreeContext.Provider>
    </Portal>
  );
}

interface Run {
  header?: ReactNode;
  entries: { item: MenuEntry; key: string }[];
}

/** Splits the items into runs: a header starts a group, a divider ends it. */
function runs(items: readonly MenuItem[]): (Run | { divider: string })[] {
  const out: (Run | { divider: string })[] = [];
  let current: Run | null = null;
  items.forEach((item, i) => {
    if ("divider" in item) {
      out.push({ divider: `divider-${String(i)}` });
      current = null;
    } else if ("header" in item) {
      current = { header: item.header, entries: [] };
      out.push(current);
    } else {
      if (!current) {
        current = { entries: [] };
        out.push(current);
      }
      current.entries.push({ item, key: item.id ?? String(i) });
    }
  });
  return out;
}

/** Whether any row of this level has a mark column (an icon, a check or a radio dot). */
function hasLead(items: readonly MenuItem[]): boolean {
  return items.some(
    (item) =>
      "radios" in item ||
      "checked" in item ||
      ("icon" in item && item.icon !== undefined && item.icon !== null),
  );
}

export interface MenuItemsProps {
  menu: UseMenuResult;
  items: readonly MenuItem[];
}

/**
 * Renders a list of entries: actions, checkable items, radio groups, submenus, headers and
 * dividers. Headers name their group. The menu holds no state of its own: checked values come
 * from the items.
 */
export function MenuItems({ menu, items }: MenuItemsProps) {
  const base = useId();
  const lead = hasLead(items);
  return (
    <>
      {runs(items).map((run, r) => {
        if ("divider" in run) {
          return <li key={run.divider} role="separator" className="ol-dropdown__divider" />;
        }
        const rows = run.entries.map(({ item, key }) => {
          if ("items" in item) {
            return <MenuSubmenu key={key} parent={menu} item={item} lead={lead} />;
          }
          if ("radios" in item) {
            return (
              <MenuRadios
                key={key}
                menu={menu}
                radios={item.radios}
                id={`${base}-radios-${key}`}
                lead={lead}
              />
            );
          }
          return (
            <li key={key} role="none">
              <MenuRow menu={menu} item={item} lead={lead} />
            </li>
          );
        });
        if (run.header === undefined) return rows;
        const id = `${base}-group-${String(r)}`;
        return (
          <li key={id} role="none">
            <ul role="group" aria-labelledby={id} className="ol-dropdown__group">
              <li id={id} role="presentation" className="ol-dropdown__header">
                {run.header}
              </li>
              {rows}
            </ul>
          </li>
        );
      })}
    </>
  );
}

interface RowProps {
  menu: UseMenuResult;
  item: MenuActionItem | MenuCheckItem | MenuRadioOption;
  lead: boolean;
  /** Makes the row a radio of a group. */
  radio?: { checked: boolean; onChoose: () => void };
}

/** One selectable row: an action, a checkbox or a radio. */
function MenuRow({ menu, item, lead, radio }: RowProps) {
  const platform = useResolvedKbdPlatform();
  const check = "checked" in item ? item : null;
  const kind = radio ? "radio" : check ? "checkbox" : "item";
  const checked = radio ? radio.checked : check?.checked;
  const icon = "icon" in item ? item.icon : undefined;
  const onSelect = radio
    ? radio.onChoose
    : check
      ? () => {
          check.onCheckedChange?.(!check.checked);
        }
      : (item as MenuActionItem).onSelect;
  return (
    <button
      type="button"
      {...menu.getItemProps(
        {
          kind,
          checked,
          disabled: item.disabled,
          textValue: item.textValue,
          closeOnSelect: item.closeOnSelect,
          onSelect,
        },
        {
          className: cx("ol-dropdown__item", item.danger && "ol-dropdown__item--danger"),
          // The cap is hidden; the row is announced by its label and the shortcut here.
          "aria-keyshortcuts":
            item.kbd === undefined ? undefined : toAriaKeyShortcuts(item.kbd, platform),
        },
      )}
      tabIndex={-1}
    >
      {lead ? (
        <span className="ol-dropdown__main">
          <span
            className={cx(
              "ol-dropdown__lead",
              kind === "checkbox" && "ol-dropdown__lead--check",
              kind === "radio" && "ol-dropdown__lead--radio",
            )}
            aria-hidden="true"
          >
            {kind === "checkbox" ? "✓" : kind === "radio" ? null : icon}
          </span>
          <span className="ol-dropdown__label">{item.label}</span>
        </span>
      ) : (
        <span className="ol-dropdown__label">{item.label}</span>
      )}
      {item.kbd === undefined ? null : (
        <Kbd keys={item.kbd} aria-hidden="true" className="ol-dropdown__kbd" />
      )}
    </button>
  );
}

interface RadiosProps {
  menu: UseMenuResult;
  radios: MenuRadiosItem["radios"];
  id: string;
  lead: boolean;
}

function MenuRadios({ menu, radios, id, lead }: RadiosProps) {
  const { value, onValueChange, label, options } = radios;
  return (
    <li role="none">
      <ul
        role="group"
        aria-labelledby={label === undefined ? undefined : id}
        className="ol-dropdown__group"
      >
        {label === undefined ? null : (
          <li id={id} role="presentation" className="ol-dropdown__header">
            {label}
          </li>
        )}
        {options.map((option) => (
          <li key={option.id ?? option.value} role="none">
            <MenuRow
              menu={menu}
              item={option}
              lead={lead}
              radio={{
                checked: option.value === value,
                onChoose: () => {
                  onValueChange?.(option.value);
                },
              }}
            />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Pause before a hovered submenu row opens, so a pointer passing by does not flash menus. */
export const SUBMENU_OPEN_DELAY = 150;
/** Grace before a submenu closes when focus or the pointer leaves it, longer while the pointer heads for it. */
const SUBMENU_CLOSE_DELAY = 120;
const SUBMENU_GRACE_DELAY = 320;
/** Pixels: the submenu overlaps its parent's border by one hairline (1px on every screen). */
const HAIRLINE = 1;

/** The open submenu of each menu level, so opening one closes its sibling at once. */
const openSubmenus = new WeakMap<object, () => void>();

interface SubmenuProps {
  parent: UseMenuResult;
  item: MenuSubmenuItem;
  lead: boolean;
}

/**
 * A row that opens a submenu: Right (Left in RTL), Enter, Space or a click open it with focus
 * on its first item; the pointer opens it after a short intent delay. Left closes it and puts
 * focus back on the row. Moving focus or the pointer elsewhere in the parent closes it.
 */
function MenuSubmenu({ parent, item, lead }: SubmenuProps) {
  // A plain box (not a ref): the hook reads it in handlers, never during render.
  const [focusMode] = useState<MenuFocusIntent>(() => ({ mode: null }));
  const sub = useMenu({
    triggerRole: "menuitem",
    openOnArrow: "inline-end",
    initialFocus: focusMode,
  });
  const [rtl, setRtl] = useState(false);
  const position = useMenuPosition<HTMLButtonElement, HTMLUListElement>({
    open: sub.mounted,
    placement: rtl ? "left-start" : "right-start",
    gap: -HAIRLINE,
    crossOffset: -HAIRLINE,
  });
  const row = useRef<HTMLButtonElement | null>(null);
  const { setTrigger } = sub;
  const { setAnchor } = position;
  const setRow = useCallback(
    (node: HTMLButtonElement | null) => {
      row.current = node;
      setTrigger(node);
      setAnchor(node);
      if (node) setRtl(getComputedStyle(node).direction === "rtl");
    },
    [setTrigger, setAnchor],
  );

  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heading = useRef(false);
  const cancel = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  };
  useEffect(() => cancel, []);

  const { open, setOpen } = sub;
  const depth = sub.tree.depth;
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  // One submenu per level: a newly opened one closes the previous sibling immediately.
  const parentTree = parent.tree;
  useEffect(() => {
    if (!open) return;
    const mine = () => {
      setOpen(false);
    };
    const previous = openSubmenus.get(parentTree);
    if (previous) previous();
    openSubmenus.set(parentTree, mine);
    return () => {
      if (openSubmenus.get(parentTree) === mine) openSubmenus.delete(parentTree);
    };
  }, [open, parentTree, setOpen]);
  // While open: focus that lands outside the row, its popup and deeper popups closes it.
  useEffect(() => {
    if (!open) return;
    let lastX = 0;
    const popupOf = () => {
      const popupId = row.current?.getAttribute("aria-controls");
      return popupId ? document.getElementById(popupId) : null;
    };
    const onMove = (event: PointerEvent) => {
      // The pointer is over the submenu (even a header or divider): it stays.
      if (event.target instanceof Node && popupOf()?.contains(event.target)) {
        clearTimeout(closeTimer.current);
        return;
      }
      const box = row.current?.getBoundingClientRect();
      if (box) {
        const toward = (event.clientX - lastX) * (rtl ? -1 : 1) > 0;
        heading.current = toward && event.clientY >= box.top - box.height * 2;
      }
      lastX = event.clientX;
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      const popupId = row.current?.getAttribute("aria-controls");
      const popup = popupId ? document.getElementById(popupId) : null;
      const deeper = Number(
        target.closest("[data-ol-menu-depth]")?.getAttribute("data-ol-menu-depth"),
      );
      if (row.current?.contains(target) || popup?.contains(target) || deeper > depth) {
        clearTimeout(closeTimer.current);
        return;
      }
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(
        () => {
          setOpen(false);
        },
        heading.current ? SUBMENU_GRACE_DELAY : SUBMENU_CLOSE_DELAY,
      );
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("focusin", onFocusIn);
      clearTimeout(closeTimer.current);
    };
  }, [open, depth, rtl, setOpen]);

  const hover = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || item.disabled) return;
    clearTimeout(closeTimer.current);
    if (open) return;
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      if (openRef.current) return;
      focusMode.mode = "none";
      setOpen(true);
    }, SUBMENU_OPEN_DELAY);
  };

  // The handlers read the timers only when the pointer moves, never during render.
  /* eslint-disable react-hooks/refs */
  const trigger = item.disabled
    ? {
        "aria-expanded": false,
        // A disabled row swallows the open key, so it never reads as the root's arrow-out.
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
          const forward =
            getComputedStyle(event.currentTarget).direction === "rtl" ? "ArrowLeft" : "ArrowRight";
          if (event.key === forward) event.preventDefault();
        },
      }
    : sub.getTriggerProps({
        onClick: () => {
          clearTimeout(openTimer.current);
        },
        onPointerEnter: hover,
        onPointerLeave: () => {
          clearTimeout(openTimer.current);
        },
      });
  /* eslint-enable react-hooks/refs */
  const itemProps = parent.getItemProps(
    { kind: "sub", disabled: item.disabled, textValue: item.textValue },
    { className: "ol-dropdown__item ol-dropdown__item--sub", ...trigger },
  );

  return (
    <li role="none">
      <button type="button" {...itemProps} ref={setRow} tabIndex={-1}>
        {lead ? (
          <span className="ol-dropdown__main">
            <span className="ol-dropdown__lead" aria-hidden="true">
              {item.icon}
            </span>
            <span className="ol-dropdown__label">{item.label}</span>
          </span>
        ) : (
          <span className="ol-dropdown__label">{item.label}</span>
        )}
        <span className="ol-dropdown__sub" aria-hidden="true">
          →
        </span>
      </button>
      <MenuPopup menu={sub} position={position}>
        <MenuItems menu={sub} items={item.items} />
      </MenuPopup>
    </li>
  );
}
