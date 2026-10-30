import {
  type ButtonHTMLAttributes,
  type FocusEvent,
  forwardRef,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { type MenuCloseReason, useMenu } from "../../hooks/useMenu";
import { prefersReducedMotion, useReducedMotion } from "../../motion/reducedMotion";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Portal } from "../../utils/Portal";

/** The most actions a Fab menu shows; extra ones are ignored. */
export const FAB_MAX_ACTIONS = 6;

/** Scroll distance in px that counts as a direction change, so jitter does not fold the label. */
const SCROLL_HYSTERESIS = 4;

/** One related action in the Fab's menu. */
export interface FabAction {
  /** Text of the row. */
  label: ReactNode;
  /**
   * Typographic glyph at the end of the row (decorative).
   * @default "→"
   */
  glyph?: ReactNode;
  /** Called when the action is chosen, before the menu closes. */
  onSelect?: () => void;
  /** Stable key, for actions that change while the menu is open. Defaults to the position. */
  id?: string;
  /** Text used by typeahead when the label is not plain text. */
  textValue?: string;
}

/** Why the Fab's menu closed: passed to `onOpenChange`. */
export type FabCloseReason = MenuCloseReason;

interface FabOwnProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label" | "disabled" | "type"
> {
  /**
   * Typographic glyph in the square. Olivine has no icon set: use a character, never an emoji.
   * @default "+"
   */
  glyph?: ReactNode;
  /**
   * Colour of the raised square.
   * @default "accent"
   */
  variant?: "accent" | "ink" | "paper";
  /**
   * `s` 44px, `m` 56px, `l` 80px.
   * @default "m"
   */
  size?: "s" | "m" | "l";
  /**
   * Bottom corner (or centre) the Fab sits in.
   * @default "end"
   */
  placement?: "end" | "start" | "center";
  /** Positions the Fab inside the nearest positioned ancestor instead of the viewport. */
  contained?: boolean;
  /** Folds the label away while the page scrolls down and brings it back on scroll up. */
  collapseOnScroll?: boolean;
  /** The scrolling element watched by `collapseOnScroll`. Defaults to the window. */
  scrollTarget?: RefObject<HTMLElement | null>;
  /**
   * Related actions: the Fab becomes a menu button whose list unrolls upward. At most six;
   * with actions, `onClick` is not called (use `onOpenChange`).
   */
  actions?: readonly FabAction[];
  /** Controlled open state of the menu. */
  open?: boolean;
  /**
   * Initial open state of the menu when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean;
  /** Called when the menu opens or closes; closing passes the reason. */
  onOpenChange?: (open: boolean, reason?: FabCloseReason) => void;
  /** Name of the menu. By default the menu is named after the Fab. */
  menuLabel?: string;
  /** `disabled` is not supported: hide the Fab instead. */
  disabled?: never;
}

/** With a label (extended Fab) the label is the name; without one, `aria-label` is required. */
type FabNameProps =
  | {
      /** Text of the extended Fab; always its accessible name. */
      label: string;
      /** Replaces the name only when it contains the label text. */
      "aria-label"?: string;
    }
  | { label?: undefined; "aria-label": string };

export type FabProps = FabOwnProps & FabNameProps;

/** Accessible name: the label, or an `aria-label` that contains it (Label in Name). */
function nameOf(label: string | undefined, ariaLabel: string | undefined): string | undefined {
  if (!label) return ariaLabel;
  if (ariaLabel?.toLowerCase().includes(label.toLowerCase())) return ariaLabel;
  return label;
}

/**
 * The one primary action of a view, fixed to a bottom corner: a raised square that a press
 * pushes into the paper. With a `label` it is extended; with `actions` it opens a short menu
 * that unrolls upward. Renders in a portal unless `contained`. `ref` points to the button and
 * `className` to the wrapper; other props go to the button.
 *
 * Render the Fab with the page, before any Modal opens: an open Modal makes it inert. Don't
 * mount a Fab inside a Modal or while one is open, where it would stay reachable.
 */
export const Fab = forwardRef<HTMLButtonElement, FabProps>(function Fab(
  {
    glyph = "+",
    label,
    "aria-label": ariaLabel,
    variant = "accent",
    size = "m",
    placement = "end",
    contained = false,
    collapseOnScroll = false,
    scrollTarget,
    actions,
    open,
    defaultOpen = false,
    onOpenChange,
    menuLabel,
    onClick,
    className,
    id,
    ...rest
  },
  ref,
) {
  const hasMenu = actions !== undefined && actions.length > 0;
  const items = hasMenu ? actions.slice(0, FAB_MAX_ACTIONS) : [];
  const hasLabel = label !== undefined && label !== "";
  const name = nameOf(label, ariaLabel);

  const menu = useMenu({
    ...(hasMenu ? (open === undefined ? null : { open }) : { open: false }),
    defaultOpen,
    ...(onOpenChange ? { onOpenChange } : null),
    ...(id === undefined ? null : { id }),
    ...(menuLabel ? { label: menuLabel } : null),
  });
  const { setTrigger, setMenu } = menu;
  const menuOpen = hasMenu && menu.open;

  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      setTrigger(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [setTrigger, ref],
  );

  // Collapse on scroll: down folds the label away, up brings it back.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const anchor = useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotion();
  const [scrolledDown, setScrolledDown] = useState(false);
  const watchScroll = collapseOnScroll && hasLabel;
  useEffect(() => {
    if (!watchScroll) return;
    const element = scrollTarget?.current ?? null;
    const target: HTMLElement | Window = element ?? window;
    const top = () => (element ? element.scrollTop : window.scrollY);
    let last = top();
    const onScroll = () => {
      const y = top();
      if (Math.abs(y - last) < SCROLL_HYSTERESIS) return;
      const down = y > last;
      last = y;
      // Reduced motion: no scroll-linked effects, the label stays.
      // Checked at the anchor inside the app, so an in-app setting reaches a portalled Fab.
      if (down && prefersReducedMotion(anchor.current ?? wrapRef.current)) return;
      setScrolledDown(down);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
    };
  }, [watchScroll, scrollTarget]);

  const collapsed = watchScroll && scrolledDown && !reduced && !menuOpen;
  const {
    mounted: labelMounted,
    state: labelState,
    setElement: setLabel,
  } = usePresence<HTMLSpanElement>(!collapsed);
  const extended = hasLabel && labelMounted;

  const actionCount = actions?.length ?? 0;
  useEffect(() => {
    if (!name) {
      devWarn("Fab", "the button has no accessible name. Pass `label` or `aria-label`.");
    } else if (hasLabel && ariaLabel && name !== ariaLabel) {
      devWarn("Fab", "`aria-label` is ignored because it does not contain the `label` text.");
    }
    if (actionCount > FAB_MAX_ACTIONS) {
      devWarn(
        "Fab",
        `only the first ${String(FAB_MAX_ACTIONS)} actions are shown; use a Dropdown for more.`,
      );
    }
    if (collapseOnScroll && !hasLabel) {
      devWarn("Fab", "`collapseOnScroll` has no effect without a `label`.");
    }
  }, [name, hasLabel, ariaLabel, actionCount, collapseOnScroll]);

  // Focus leaving the Fab for another element closes the menu (assistive-technology moves too).
  const { close } = menu;
  const onWrapBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (menuOpen && next && !event.currentTarget.contains(next)) close("outside");
  };

  const own = {
    type: "button" as const,
    className: cx(
      "ol-fab",
      `ol-fab--${variant}`,
      `ol-fab--${size}`,
      extended && "ol-fab--extended",
    ),
    "aria-label": name,
  };
  const buttonProps = hasMenu
    ? menu.getTriggerProps({ ...rest, ...own })
    : { ...rest, ...own, id, onClick };

  const wrapper = (
    // Focus tracking only (blur closes the menu); the wrapper itself is not interactive.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={wrapRef}
      className={cx(
        "ol-fab-wrap",
        `ol-fab-wrap--${placement}`,
        contained && "ol-fab-wrap--contained",
        className,
      )}
      onBlur={onWrapBlur}
    >
      <button {...buttonProps} ref={setRef}>
        <span key={menuOpen ? "close" : "glyph"} className="ol-fab__glyph" aria-hidden="true">
          {menuOpen ? "×" : glyph}
        </span>
        {extended && (
          <span ref={setLabel} className="ol-fab__label" data-state={labelState}>
            {label}
          </span>
        )}
      </button>
      {hasMenu && menu.mounted && (
        <ul
          {...menu.getMenuProps()}
          ref={setMenu}
          className="ol-fab__menu ol-kakejiku"
          data-side="top"
        >
          {items.map((action, index) => (
            <li key={action.id ?? String(index)} role="none">
              <button
                type="button"
                {...menu.getItemProps(
                  { onSelect: action.onSelect, textValue: action.textValue },
                  { className: "ol-fab__item" },
                )}
                tabIndex={-1}
              >
                <span className="ol-fab__item-label">{action.label}</span>
                <span className="ol-fab__item-glyph" aria-hidden="true">
                  {action.glyph ?? "→"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (contained) return wrapper;
  return (
    <>
      {/* Marks where the Fab was rendered so the portal keeps that theme and language. */}
      <span ref={anchor} hidden />
      <Portal anchor={anchor}>{wrapper}</Portal>
    </>
  );
});
