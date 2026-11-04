import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode, useId } from "react";

import { useControllable } from "../../hooks/useControllable";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { Badge } from "../Badge";

export interface NavigationRailItem {
  /** Identifier passed to `onSelect` and matched against `active`. */
  key: string;
  /** Visible name of the destination. It is the accessible name; the mark is decoration. */
  label: ReactNode;
  /**
   * A kanji or a typographic glyph shown above (collapsed) or before (expanded) the label.
   * Never the only label: it is hidden from assistive tech. Kanji are set in the jp face.
   */
  mark: string;
  /** Target URL. Items with an `href` render as links; items without render as buttons. */
  href?: string;
  /** A count shown as a maple badge. Read after the label ("Inbox, 3"). */
  badge?: ReactNode;
}

/** The one primary action at the top of the rail, drawn as a square accent button. */
export interface NavigationRailAction {
  /** Visible when expanded, and the accessible name in both states. */
  label: string;
  /**
   * Typographic glyph in the square. Olivine has no icon set: use a character, never an emoji.
   * @default "+"
   */
  glyph?: ReactNode;
  /** Called when the button is pressed. */
  onClick?: () => void;
}

/** Overrides for the toggle's names. They default to the locale. */
export interface NavigationRailLabels {
  /** Name of the toggle while the rail is collapsed. */
  expand?: string;
  /** Name of the toggle while the rail is expanded. */
  collapse?: string;
}

export interface NavigationRailProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onSelect" | "children"
> {
  /** The 3 to 7 top-level destinations, in order. */
  items: readonly NavigationRailItem[];
  /** The `key` of the current destination: it gets `aria-current="page"`. */
  active?: string;
  /**
   * Called with the item `key` and the click event when a destination is activated. For an item
   * with an `href`, call `event.preventDefault()` to route on the client.
   */
  onSelect?: (key: string, event: MouseEvent<HTMLElement>) => void;
  /** Controlled state: `true` is the 240px rail with the label beside the mark. */
  expanded?: boolean;
  /**
   * Initial state when uncontrolled.
   * @default false
   */
  defaultExpanded?: boolean;
  /** Called with the next state when the toggle is pressed. */
  onExpandedChange?: (expanded: boolean) => void;
  /** One square accent button above the destinations. */
  action?: NavigationRailAction;
  /** Accessible name of the navigation landmark. Defaults to the locale's. */
  label?: string;
  /** Names of the expand / collapse toggle. They default to the locale. */
  labels?: NavigationRailLabels;
  /** Content pinned to the bottom of the rail (an avatar, a theme switch). */
  children?: ReactNode;
}

const CJK = /[぀-ヿ㐀-鿿]/;

/**
 * A vertical bar for the 3 to 7 top-level destinations of a tool on wide screens. Collapsed it
 * is 80px (a mark with its word under it); expanded it is 240px and the labels wipe in beside
 * the marks. Below 600px use a bottom navigation instead. The current destination carries
 * `aria-current="page"` and an olivo edge; counts are maple badges read after the label.
 */
export const NavigationRail = forwardRef<HTMLElement, NavigationRailProps>(function NavigationRail(
  {
    items,
    active,
    onSelect,
    expanded,
    defaultExpanded = false,
    onExpandedChange,
    action,
    label,
    labels,
    className,
    children,
    ...rest
  },
  ref,
) {
  const dictionary = useLabels();
  const [open, setOpen] = useControllable(expanded, defaultExpanded, onExpandedChange);
  const listId = useId();
  const toggleName = open
    ? (labels?.collapse ?? dictionary.railCollapse)
    : (labels?.expand ?? dictionary.railExpand);

  return (
    <nav
      ref={ref}
      aria-label={label ?? dictionary.railLabel}
      className={cx("ol-rail", open && "ol-rail--expanded", className)}
      data-state={open ? "expanded" : "collapsed"}
      {...rest}
    >
      <div className="ol-rail__top">
        <button
          type="button"
          className="ol-rail__toggle"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={toggleName}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <span aria-hidden="true">{open ? "«" : "»"}</span>
        </button>
        {action && (
          <button
            type="button"
            className="ol-rail__action"
            aria-label={open ? undefined : action.label}
            onClick={action.onClick}
          >
            <span className="ol-rail__action-glyph" aria-hidden="true">
              {action.glyph ?? "+"}
            </span>
            {open && <span className="ol-rail__action-label">{action.label}</span>}
          </button>
        )}
      </div>
      <ul id={listId} className="ol-rail__list">
        {items.map((item) => {
          const current = item.key === active;
          const handleClick = (event: MouseEvent<HTMLElement>) => {
            onSelect?.(item.key, event);
          };
          const content = (
            <>
              <span
                className="ol-rail__mark"
                aria-hidden="true"
                lang={CJK.test(item.mark) ? "ja" : undefined}
              >
                {item.mark}
              </span>
              <span className="ol-rail__label">{item.label}</span>
              {item.badge != null && (
                <Badge tone="accent" count className="ol-rail__badge">
                  <span className="ol-sr">, </span>
                  {item.badge}
                </Badge>
              )}
            </>
          );
          return (
            <li key={item.key}>
              {item.href !== undefined ? (
                <a
                  className="ol-rail__item"
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  onClick={handleClick}
                >
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  className="ol-rail__item"
                  aria-current={current ? "page" : undefined}
                  onClick={handleClick}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {children && <div className="ol-rail__foot">{children}</div>}
    </nav>
  );
});
