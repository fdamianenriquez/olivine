import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";

import { cx } from "../../utils/cx";

export interface ListGroupItem {
  /** Main text of the row. */
  title: ReactNode;
  /** Secondary line under the title. */
  description?: ReactNode;
  /** Right-aligned label, such as a count or an arrow. */
  meta?: ReactNode;
  /** Makes the row a link. Takes precedence over `onClick`. */
  href?: string;
  /** Makes the row a button. Ignored when `href` is set. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Marks the row as the current one: olive left edge and `aria-current`. */
  active?: boolean;
  /** Dims the row and removes it from the tab order. */
  disabled?: boolean;
}

export interface ListGroupProps extends Omit<HTMLAttributes<HTMLUListElement>, "children"> {
  /** The rows of the list. */
  items: ListGroupItem[];
  /** Prefixes each row with a zero-padded figure (01, 02…) and renders an ordered list. */
  numbered?: boolean;
  /** Draws a hairline frame around the whole list. */
  boxed?: boolean;
  /** Removes the horizontal padding of the rows so they align with surrounding text. */
  flush?: boolean;
}

function Content({ item }: { item: ListGroupItem }) {
  return (
    <>
      <span className="ol-list__body">
        <span className="ol-list__title">{item.title}</span>
        {item.description != null && <span className="ol-list__desc">{item.description}</span>}
      </span>
      {item.meta != null && <span className="ol-list__meta">{item.meta}</span>}
    </>
  );
}

/**
 * Stack of ruled rows with a title, an optional description and right-aligned meta.
 * Rows with `href` render links, rows with `onClick` render buttons, and the rest are static.
 */
export const ListGroup = forwardRef<HTMLUListElement | HTMLOListElement, ListGroupProps>(
  function ListGroup(
    { items, numbered = false, boxed = false, flush = false, className, ...rest },
    ref,
  ) {
    const Tag = numbered ? "ol" : "ul";
    return (
      <Tag
        ref={ref as never}
        className={cx(
          "ol-list",
          numbered && "ol-list--numbered",
          boxed && "ol-list--boxed",
          flush && "ol-list--flush",
          className,
        )}
        {...rest}
      >
        {items.map((item, i) => {
          const { href, onClick, active, disabled } = item;
          const base = cx(
            "ol-list__item",
            (href !== undefined || onClick !== undefined) && !disabled && "ol-list__item--action",
            active && "ol-list__item--active",
          );
          const state = {
            "data-active": active ? "" : undefined,
            "data-disabled": disabled ? "" : undefined,
          };
          let row: ReactNode;
          if (href) {
            // Without href an anchor is not focusable and not announced as a link target.
            row = (
              <a
                className={base}
                href={disabled ? undefined : href}
                aria-disabled={disabled ? true : undefined}
                aria-current={active ? "page" : undefined}
                onClick={disabled ? undefined : onClick}
                {...state}
              >
                <Content item={item} />
              </a>
            );
          } else if (onClick) {
            // Buttons toggle a selection rather than mark a page, so the token is "true".
            row = (
              <button
                type="button"
                className={base}
                disabled={disabled}
                aria-current={active ? true : undefined}
                onClick={onClick}
                {...state}
              >
                <Content item={item} />
              </button>
            );
          } else {
            row = (
              <div className={base} aria-current={active ? true : undefined} {...state}>
                <Content item={item} />
              </div>
            );
          }
          return <li key={i}>{row}</li>;
        })}
      </Tag>
    );
  },
);
