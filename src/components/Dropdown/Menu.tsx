import { type HTMLAttributes, type ReactNode, useCallback, useId } from "react";

import { MenuTreeContext, type UseMenuResult } from "../../hooks/useMenu";
import type { MenuPosition } from "../../hooks/useMenuPosition";
import { cx } from "../../utils/cx";
import { Portal } from "../../utils/Portal";
import { Kbd, type Shortcut, toAriaKeyShortcuts } from "../Kbd";
import { useResolvedKbdPlatform } from "../Kbd/useKbdPlatform";

/** An actionable entry of the menu. */
export interface MenuActionItem {
  /** Text of the item. */
  label: ReactNode;
  /** Called when the item is chosen, before the menu closes. */
  onSelect?: () => void;
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
  /**
   * Closes the menu after the item is chosen.
   * @default true
   */
  closeOnSelect?: boolean;
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
export type MenuItem = MenuActionItem | MenuHeaderItem | MenuDividerItem;

/** The parts of `useMenuPosition` the popup needs (the anchor stays with the caller). */
type Position = Pick<MenuPosition<HTMLElement, HTMLUListElement>, "setFloating" | "props">;

export interface MenuPopupProps extends HTMLAttributes<HTMLUListElement> {
  menu: UseMenuResult;
  /** From `useMenuPosition`. Without it the menu is not placed (a caller that positions it with its own class). */
  position?: Position;
  children: ReactNode;
}

/**
 * The menu surface: a portal, the `ul[role=menu]` with the hook's props, and the menu-tree
 * context for submenus. Renders while the menu is mounted, through its exit motion. A menu
 * with its own markup and layout (Fab) uses `useMenu` directly instead.
 */
export function MenuPopup({ menu, position, className, children, ...rest }: MenuPopupProps) {
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
    <Portal anchor={menu.triggerRef}>
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
  entries: { item: MenuActionItem; key: string }[];
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

export interface MenuItemsProps {
  menu: UseMenuResult;
  items: readonly MenuItem[];
}

/** Renders a list of action, header and divider entries; headers name their group. */
export function MenuItems({ menu, items }: MenuItemsProps) {
  const base = useId();
  const platform = useResolvedKbdPlatform();
  return (
    <>
      {runs(items).map((run, r) => {
        if ("divider" in run) {
          return <li key={run.divider} role="separator" className="ol-dropdown__divider" />;
        }
        const rows = run.entries.map(({ item, key }) => (
          <li key={key} role="none">
            <button
              type="button"
              {...menu.getItemProps(
                {
                  disabled: item.disabled,
                  textValue: item.textValue,
                  closeOnSelect: item.closeOnSelect,
                  onSelect: item.onSelect,
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
              <span className="ol-dropdown__label">{item.label}</span>
              {item.kbd === undefined ? null : (
                <Kbd keys={item.kbd} aria-hidden="true" className="ol-dropdown__kbd" />
              )}
            </button>
          </li>
        ));
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
