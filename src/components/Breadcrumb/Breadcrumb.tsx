import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";

export interface BreadcrumbItem {
  /** Text of the crumb. */
  label: ReactNode;
  /** Target of the crumb. Items without one render as plain text. The last item never links. */
  href?: string;
}

export interface BreadcrumbProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The path, from the root to the current page. The last item is the current page. */
  items: BreadcrumbItem[];
  /** Accessible name of the navigation landmark. Defaults to the locale's "Breadcrumb". */
  label?: string;
}

/**
 * Path of mono labels separated by "/". The last item is the current page and is not a link.
 * Long trails wrap onto further lines.
 */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { items, label, className, ...rest },
  ref,
) {
  const t = useLabels();
  return (
    <nav
      ref={ref}
      aria-label={label ?? t.breadcrumb}
      className={cx("ol-breadcrumb", className)}
      {...rest}
    >
      <ol className="ol-breadcrumb__list">
        {items.map((item, i) => {
          const current = i === items.length - 1;
          return (
            <li key={i} className="ol-breadcrumb__item" data-current={current ? "" : undefined}>
              {!current && item.href ? (
                <a className="ol-breadcrumb__link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span aria-current={current ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
