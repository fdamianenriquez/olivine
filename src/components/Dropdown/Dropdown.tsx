import { forwardRef, type ReactNode, useCallback, useState } from "react";

import { type MenuCloseReason, useMenu } from "../../hooks/useMenu";
import { useMenuPosition } from "../../hooks/useMenuPosition";
import { cx } from "../../utils/cx";
import { isRtl } from "../../utils/isRtl";
import { Button, type ButtonProps } from "../Button";
import { toolbarMenu, useToolbar } from "../Toolbar/ToolbarContext";
import {
  type MenuActionItem,
  type MenuCheckItem,
  type MenuDividerItem,
  type MenuHeaderItem,
  type MenuItem,
  MenuItems,
  MenuPopup,
  type MenuRadioOption,
  type MenuRadiosItem,
  type MenuSubmenuItem,
} from "./Menu";

/** An actionable entry of the menu. */
export type DropdownActionItem = MenuActionItem;

/** A label that names the items after it, up to the next header or divider. */
export type DropdownHeaderItem = MenuHeaderItem;

/** A hairline between groups of items. */
export type DropdownDividerItem = MenuDividerItem;

/** An on/off entry; the app holds the state and passes `checked`. */
export type DropdownCheckItem = MenuCheckItem;

/** One choice of a radio group. */
export type DropdownRadioOption = MenuRadioOption;

/** A group of mutually exclusive choices. */
export type DropdownRadiosItem = MenuRadiosItem;

/** An entry that opens a submenu to the side. */
export type DropdownSubmenuItem = MenuSubmenuItem;

/** One entry of the `items` prop. */
export type DropdownItem = MenuItem;

/** Why the menu closed: passed to `onOpenChange` and `restoreFocus`. */
export type DropdownCloseReason = MenuCloseReason;

export interface DropdownProps extends Omit<
  ButtonProps,
  "children" | "href" | "arrow" | "onToggle" | "as" | "square"
> {
  /** Text of the trigger button. */
  label: ReactNode;
  /** Menu entries: actions, checkable items, radio groups, submenus, group headers and dividers. */
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
  /** Called when the menu opens or closes; closing passes the reason. */
  onOpenChange?: (open: boolean, reason?: DropdownCloseReason) => void;
  /**
   * Returns focus to the trigger when the menu closes (not after an outside press). Set it to
   * false when an item moves focus itself, such as an inline rename.
   * @default true
   */
  restoreFocus?: boolean | ((reason: DropdownCloseReason) => boolean | HTMLElement | null);
  /** Extra class names for the menu. */
  menuClassName?: string;
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
    open,
    defaultOpen = false,
    onOpenChange,
    restoreFocus = true,
    menuClassName,
    className,
    id,
    ...rest
  },
  ref,
) {
  const [rtl, setRtl] = useState(false);
  const inToolbar = toolbarMenu(useToolbar(), rtl);
  const menu = useMenu({
    openOnArrow: inToolbar.openOnArrow,
    ...(open === undefined ? null : { open }),
    defaultOpen,
    ...(onOpenChange ? { onOpenChange } : null),
    ...(id === undefined ? null : { id }),
    restoreFocus,
  });
  const position = useMenuPosition<HTMLButtonElement, HTMLUListElement>({
    open: menu.mounted,
    placement: inToolbar.placement ?? `${up ? "top" : "bottom"}-${align}`,
  });

  const { setTrigger } = menu;
  const { setAnchor } = position;
  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      setTrigger(node);
      setAnchor(node);
      if (node) setRtl(isRtl(node));
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [setTrigger, setAnchor, ref],
  );

  return (
    <>
      <Button
        {...menu.getTriggerProps(rest)}
        ref={setRef}
        className={cx("ol-dropdown__trigger", className)}
        arrow={menu.open ? "↑" : "↓"}
      >
        {label}
      </Button>
      <MenuPopup menu={menu} position={position} className={menuClassName}>
        <MenuItems menu={menu} items={items} />
      </MenuPopup>
    </>
  );
});
