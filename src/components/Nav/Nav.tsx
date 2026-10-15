import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";

import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";

export interface NavItem {
  /** Visible text of the item. */
  label: ReactNode;
  /** Target URL. Items with an `href` render as links; items without render as buttons. */
  href?: string;
  /** Marks the current item: `aria-current="page"` on links, `aria-current="true"` on buttons. */
  active?: boolean;
  /** Removes the item from the tab order and ignores activation. */
  disabled?: boolean;
  /** Identifier passed to `onSelect`. Falls back to the item index. */
  key?: string | number;
}

export interface NavProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "onSelect"> {
  /** The items to list, in order. */
  items: NavItem[];
  /**
   * `line` draws an olivo underline under the active item, `boxed` joins the items into
   * cells and fills the active one with ink, `vertical` stacks them beside an olivo edge.
   * @default "line"
   */
  variant?: "line" | "boxed" | "vertical";
  /** Prefixes each item with its zero-padded position (01, 02…). @default false */
  indexed?: boolean;
  /** Accessible name of the navigation landmark. Give one whenever a page has several. */
  label?: string;
  /** Called with the item `key` (or its index) when an enabled item is activated. */
  onSelect?: (key: string | number) => void;
}

/**
 * A list of links, or of buttons when items have no `href` (an in-page switcher whose
 * active item carries `aria-current="true"`). Not a tab widget: use Tabs for panels.
 */
export const Nav = forwardRef<HTMLElement, NavProps>(function Nav(
  { items, variant = "line", indexed = false, label, onSelect, className, ...rest },
  ref,
) {
  return (
    <nav
      ref={ref}
      aria-label={label}
      className={cx("ol-nav", `ol-nav--${variant}`, className)}
      {...rest}
    >
      <ul className="ol-nav__list">
        {items.map((it, i) => {
          const id = it.key ?? i;
          const isLink = it.href !== undefined;
          const common = {
            className: cx("ol-nav__link", it.active && "ol-nav__link--active"),
            "data-active": it.active ? "" : undefined,
          };
          const content = (
            <>
              {indexed && (
                <span className="ol-nav__index" aria-hidden="true">
                  {pad(i + 1)}
                </span>
              )}
              {it.label}
            </>
          );
          return (
            <li key={id} className="ol-nav__item">
              {isLink ? (
                <a
                  {...common}
                  // A disabled link has no href, so it is not focusable or navigable.
                  href={it.disabled ? undefined : it.href}
                  role={it.disabled ? "link" : undefined}
                  aria-current={it.active ? "page" : undefined}
                  aria-disabled={it.disabled ? true : undefined}
                  onClick={
                    onSelect && !it.disabled
                      ? (e: MouseEvent<HTMLAnchorElement>) => {
                          if (e.defaultPrevented) return;
                          onSelect(id);
                        }
                      : undefined
                  }
                >
                  {content}
                </a>
              ) : (
                <button
                  {...common}
                  type="button"
                  disabled={it.disabled}
                  aria-current={it.active ? "true" : undefined}
                  onClick={
                    onSelect
                      ? () => {
                          onSelect(id);
                        }
                      : undefined
                  }
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
