import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";

import { useControllable } from "../../hooks/useControllable";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";

export interface PaginationProps extends Omit<
  ComponentPropsWithoutRef<"nav">,
  "onChange" | "children"
> {
  /** Number of pages. */
  total: number;
  /** Current page, 1-based. Makes the component controlled. */
  page?: number;
  /** Initial page when uncontrolled. */
  defaultPage?: number;
  /** Called with the new page when the user picks one. */
  onChange?: (page: number) => void;
  /** Pages shown on each side of the current page. */
  siblings?: number;
  /**
   * Builds the URL of a page. When given, page cells and prev/next render as
   * links (`<a href>`) instead of buttons, for server-side or link-based routing.
   * `onChange` is still called on click so client routers can intercept; the
   * default navigation is only prevented if your own handler does it. At the
   * first and last page, prev/next lose their `href` (`role="link"`,
   * `aria-disabled="true"`) so they are neither focusable nor navigable. Unlike
   * the button mode there is no focus to preserve, because following a link
   * changes the route.
   */
  getHref?: (page: number) => string;
  /** Cell size. */
  size?: "s" | "m";
}

type Item = number | "gap-start" | "gap-end";

function items(current: number, total: number, siblings: number): Item[] {
  const out: Item[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= siblings) out.push(p);
    else if (typeof out[out.length - 1] === "number")
      out.push(p < current ? "gap-start" : "gap-end");
  }
  return out;
}

/** Joined square cells with zero-padded page numbers; the current page is ink-filled. */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  { total, page, defaultPage = 1, onChange, siblings = 1, getHref, size = "m", className, ...rest },
  ref,
) {
  const t = useLabels();
  const last = Math.max(1, Math.floor(total));
  const [raw, setPage] = useControllable(page, defaultPage, onChange);
  const current = Math.min(Math.max(1, raw), last);
  const sib = Math.max(0, Math.floor(siblings));

  const cell = (
    content: ReactNode,
    label: string,
    target: number,
    disabled: boolean,
    isCurrent = false,
  ) => {
    const common = {
      className: "ol-page__item",
      "aria-label": label,
      "aria-current": isCurrent ? ("page" as const) : undefined,
      "aria-disabled": disabled ? ("true" as const) : undefined,
    };
    if (getHref) {
      return disabled ? (
        <a {...common} role="link">
          {content}
        </a>
      ) : (
        <a
          {...common}
          href={getHref(target)}
          onClick={(event) => {
            // Modified or middle clicks open a new tab: leave the current page alone.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (event.button !== 0) return;
            setPage(target);
          }}
        >
          {content}
        </a>
      );
    }
    return (
      <button
        type="button"
        {...common}
        onClick={() => {
          if (!disabled) setPage(target);
        }}
      >
        {content}
      </button>
    );
  };

  return (
    <nav
      aria-label={t.pagination}
      {...rest}
      ref={ref}
      className={cx("ol-page", size === "s" && "ol-page--s", className)}
    >
      <ul className="ol-page__list">
        <li>{cell(<span aria-hidden="true">←</span>, t.prevPage, current - 1, current <= 1)}</li>
        {items(current, last, sib).map((it) =>
          typeof it === "string" ? (
            <li key={it} aria-hidden="true">
              <span className="ol-page__item ol-page__gap">…</span>
            </li>
          ) : (
            <li key={it}>
              {cell(
                <span className="ol-page__num" aria-hidden="true">
                  {pad(it)}
                </span>,
                t.page(it),
                it,
                false,
                it === current,
              )}
            </li>
          ),
        )}
        <li>{cell(<span aria-hidden="true">→</span>, t.nextPage, current + 1, current >= last)}</li>
      </ul>
    </nav>
  );
});
