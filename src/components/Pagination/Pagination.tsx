import { type ComponentPropsWithoutRef, forwardRef } from "react";

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
  { total, page, defaultPage = 1, onChange, siblings = 1, size = "m", className, ...rest },
  ref,
) {
  const t = useLabels();
  const last = Math.max(1, Math.floor(total));
  const [raw, setPage] = useControllable(page, defaultPage, onChange);
  const current = Math.min(Math.max(1, raw), last);
  const sib = Math.max(0, Math.floor(siblings));

  return (
    <nav
      aria-label={t.pagination}
      {...rest}
      ref={ref}
      className={cx("ol-page", size === "s" && "ol-page--s", className)}
    >
      <ul className="ol-page__list">
        <li>
          <button
            type="button"
            className="ol-page__item"
            aria-disabled={current <= 1 ? "true" : undefined}
            aria-label={t.prevPage}
            onClick={() => {
              if (current > 1) setPage(current - 1);
            }}
          >
            <span aria-hidden="true">←</span>
          </button>
        </li>
        {items(current, last, sib).map((it) =>
          typeof it === "string" ? (
            <li key={it} aria-hidden="true">
              <span className="ol-page__item ol-page__gap">…</span>
            </li>
          ) : (
            <li key={it}>
              <button
                type="button"
                className="ol-page__item"
                aria-current={it === current ? "page" : undefined}
                aria-label={t.page(it)}
                onClick={() => {
                  setPage(it);
                }}
              >
                <span className="ol-page__num" aria-hidden="true">
                  {pad(it)}
                </span>
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className="ol-page__item"
            aria-disabled={current >= last ? "true" : undefined}
            aria-label={t.nextPage}
            onClick={() => {
              if (current < last) setPage(current + 1);
            }}
          >
            <span aria-hidden="true">→</span>
          </button>
        </li>
      </ul>
    </nav>
  );
});
