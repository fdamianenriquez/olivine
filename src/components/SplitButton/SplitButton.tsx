import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { type MenuCloseReason, useMenu } from "../../hooks/useMenu";
import { useMenuPosition } from "../../hooks/useMenuPosition";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { Button, type ButtonProps } from "../Button";
import { type DropdownItem } from "../Dropdown";
import { MenuItems, MenuPopup } from "../Dropdown/Menu";

/** One entry of the `items` prop: the same actions, headers and dividers as Dropdown. */
export type SplitButtonItem = DropdownItem;

/** Why the menu closed: passed to `onOpenChange`. */
export type SplitButtonCloseReason = MenuCloseReason;

/** Props passed through to one half of the bar. */
export type SplitButtonHalfProps = Omit<
  ButtonProps,
  "children" | "variant" | "size" | "square" | "arrow" | "block" | "loading" | "href"
>;

export interface SplitButtonProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onClick" | "children"
> {
  /** Text of the primary button. */
  label: ReactNode;
  /** The primary action. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Renders the primary as an `<a>`. */
  href?: string;
  /** Menu entries: related actions, group headers and dividers. */
  items: readonly SplitButtonItem[];
  /**
   * Visual weight of both halves. Use `accent` once per view.
   * @default "outline"
   */
  variant?: ButtonProps["variant"];
  /**
   * Control height of both halves: 32, 44 or 56px.
   * @default "m"
   */
  size?: ButtonProps["size"];
  /** Frames the primary label as [ LABEL ]. */
  brackets?: boolean;
  /** Leading icon of the primary. */
  icon?: ReactNode;
  /** Full width: the primary fills, the trigger stays square. */
  block?: boolean;
  /** Shows the stepped square on the primary and makes both halves inert; an open menu closes. */
  loading?: boolean;
  /** Disables both halves. */
  disabled?: boolean;
  /**
   * Which edge of the bar the menu lines up with.
   * @default "start"
   */
  align?: "start" | "end";
  /** Opens the menu above the bar. It still flips when there is no room. */
  up?: boolean;
  /** Controlled open state of the menu. */
  open?: boolean;
  /**
   * Initial open state when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean;
  /** Called when the menu opens or closes; closing passes the reason. */
  onOpenChange?: (open: boolean, reason?: SplitButtonCloseReason) => void;
  /** Accessible name of the trigger. Defaults to the locale's "More actions". */
  menuLabel?: string;
  /** Extra class names for the menu (e.g. `ol-motion-noren`). */
  menuClassName?: string;
  /** Props for the primary button only (e.g. `type`, `form`, `disabled`). */
  primaryProps?: SplitButtonHalfProps;
  /** Props for the menu trigger only (e.g. `disabled`). */
  triggerProps?: Omit<SplitButtonHalfProps, "aria-label" | "aria-labelledby">;
}

/**
 * A primary button and a square menu trigger joined into one ruled bar. The primary runs the
 * main action; the trigger opens a raised menu of related actions, lined up with the whole bar.
 * The `ref` points to the root element.
 */
export const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(function SplitButton(
  {
    label,
    onClick,
    href,
    items,
    variant = "outline",
    size = "m",
    brackets,
    icon,
    block,
    loading,
    disabled,
    align = "start",
    up,
    open,
    defaultOpen = false,
    onOpenChange,
    menuLabel,
    menuClassName,
    primaryProps,
    triggerProps,
    className,
    ...rest
  },
  ref,
) {
  const labels = useLabels();
  const menu = useMenu({
    ...(open === undefined ? null : { open }),
    defaultOpen,
    ...(onOpenChange ? { onOpenChange } : null),
  });
  const position = useMenuPosition<HTMLDivElement, HTMLUListElement>({
    open: menu.mounted,
    placement: `${up ? "top" : "bottom"}-${align}`,
    matchWidth: true,
  });

  const { setTrigger, setOpen, getTriggerProps, triggerRef } = menu;
  const { setAnchor } = position;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLElement | null>(null);
  const setPrimary = useCallback((node: HTMLElement | null) => {
    primaryRef.current = node;
  }, []);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      setAnchor(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [setAnchor, ref],
  );

  const triggerInert = disabled === true || loading === true || triggerProps?.disabled === true;
  const isOpen = menu.open;
  const primaryInert = disabled === true || loading === true || primaryProps?.disabled === true;
  // A trigger that turns inert can't close its menu any more: close it now. Focus inside the
  // menu would drop to the body, so it moves to the primary, or to the bar itself.
  useEffect(() => {
    if (!triggerInert || !isOpen) return;
    const menuId = triggerRef.current?.getAttribute("aria-controls");
    const popup = menuId ? document.getElementById(menuId) : null;
    if (popup?.contains(document.activeElement)) {
      const root = rootRef.current;
      if (!primaryInert && primaryRef.current) primaryRef.current.focus();
      else if (root) {
        root.tabIndex = -1;
        root.addEventListener(
          "blur",
          () => {
            root.removeAttribute("tabindex");
          },
          { once: true },
        );
        root.focus();
      }
    }
    setOpen(false);
  }, [triggerInert, primaryInert, isOpen, setOpen, triggerRef]);

  const { onClick: primaryClick, className: primaryClass, ...primaryRest } = primaryProps ?? {};
  const runPrimary = (event: MouseEvent<HTMLElement>) => {
    // A press on the primary while the menu is open closes it, then runs the action once.
    if (menu.open) setOpen(false, "outside");
    (primaryClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
    if (!event.defaultPrevented) onClick?.(event);
  };

  const named = rest["aria-label"] !== undefined || rest["aria-labelledby"] !== undefined;
  const { className: triggerClass, ...triggerRest } = triggerProps ?? {};
  const primaryShared = {
    ...primaryRest,
    variant,
    size,
    brackets: brackets === true,
    icon,
    block: block === true,
    loading: loading === true,
    disabled: disabled === true || primaryRest.disabled === true,
    onClick: runPrimary,
    className: cx("ol-split__primary", primaryClass),
  };

  return (
    <div
      {...rest}
      ref={setRef}
      role={named ? "group" : rest.role}
      className={cx("ol-split", block && "ol-split--block", className)}
    >
      {href === undefined ? (
        <Button {...primaryShared} ref={setPrimary}>
          {label}
        </Button>
      ) : (
        <Button {...primaryShared} href={href} ref={setPrimary}>
          {label}
        </Button>
      )}
      <Button
        {...getTriggerProps(triggerRest)}
        ref={setTrigger}
        square
        aria-label={menuLabel ?? labels.moreActions}
        variant={variant}
        size={size}
        disabled={triggerInert}
        className={cx("ol-split__trigger", triggerClass)}
      >
        {menu.open ? "↑" : "↓"}
      </Button>
      <MenuPopup menu={menu} position={position} className={menuClassName}>
        <MenuItems menu={menu} items={items} />
      </MenuPopup>
    </div>
  );
});
