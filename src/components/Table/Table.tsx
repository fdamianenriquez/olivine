import { forwardRef, type ReactElement, type ReactNode, type Ref, useMemo } from "react";

import { useControllable } from "../../hooks/useControllable";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";

export type TableSortDirection = "asc" | "desc";

export interface TableSort {
  /** The `key` of the sorted column. */
  key: string;
  direction: TableSortDirection;
}

export interface TableColumn<Row> {
  /** Column id. Also the property read from each row when `render` is omitted. */
  key: Extract<keyof Row, string> | (string & {});
  /** Header content. */
  label: ReactNode;
  /** Right-aligns the column and sets its cells in tabular mono figures. */
  numeric?: boolean;
  /** Turns the header into a sort button. */
  sortable?: boolean;
  /** Custom cell content. Defaults to `row[key]`. */
  render?: (row: Row) => ReactNode;
}

export interface TableProps<Row> extends Omit<React.ComponentPropsWithoutRef<"table">, "children"> {
  /** Column definitions, in display order. */
  columns: readonly TableColumn<Row>[];
  /** Data rows. */
  rows: readonly Row[];
  /** Caption shown below the table in small ink-2 text. Also names the scroll region when it is a string. */
  caption?: ReactNode;
  /**
   * Accessible name of the horizontal scroll region around the table. Defaults to `caption` when
   * that is a string. Without a name the wrapper is a plain, non-focusable `div`.
   */
  scrollLabel?: string;
  /** Draws a hairline around every cell. */
  bordered?: boolean;
  /** Tints every second row. */
  striped?: boolean;
  /** Rows invert to ink on hover. Only meaningful when rows are interactive. */
  hover?: boolean;
  /** Tighter cell padding and smaller text. */
  dense?: boolean;
  /** Stable key per row. Defaults to the row index. */
  rowKey?: (row: Row, index: number) => string | number;
  /** Controlled sort state. `null` means unsorted. When set, rows are shown in the order given. */
  sort?: TableSort | null;
  /** Initial sort state when uncontrolled. Rows are then sorted client-side. */
  defaultSort?: TableSort | null;
  /** Called when a sortable header is activated. */
  onSortChange?: (sort: TableSort) => void;
}

function text(v: unknown): string {
  return typeof v === "string"
    ? v
    : typeof v === "number" || typeof v === "boolean"
      ? String(v)
      : "";
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return text(a).localeCompare(text(b), undefined, { numeric: true });
}

function TableInner<Row>(
  {
    columns,
    rows,
    caption,
    scrollLabel,
    bordered = false,
    striped = false,
    hover = false,
    dense = false,
    rowKey,
    sort,
    defaultSort = null,
    onSortChange,
    className,
    ...rest
  }: TableProps<Row>,
  ref: Ref<HTMLTableElement>,
) {
  const t = useLabels();
  const [current, setSort] = useControllable<TableSort | null>(sort, defaultSort, (next) => {
    if (next) onSortChange?.(next);
  });
  const controlled = sort !== undefined;

  const data = useMemo(() => {
    if (controlled || !current) return rows;
    const sign = current.direction === "asc" ? 1 : -1;
    const key = current.key as keyof Row;
    return rows
      .map((row, i) => ({ row, i }))
      .sort((a, b) => sign * compare(a.row[key], b.row[key]) || a.i - b.i)
      .map(({ row }) => row);
  }, [rows, current, controlled]);

  const label = scrollLabel ?? (typeof caption === "string" ? caption : undefined);

  return (
    // Scrollable regions must be keyboard reachable (WCAG 2.1.1); the name makes the stop meaningful.
    <div
      className="ol-tablewrap"
      role={label ? "region" : undefined}
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={label ? 0 : undefined}
    >
      <table
        ref={ref}
        className={cx(
          "ol-table",
          bordered && "ol-table--bordered",
          striped && "ol-table--striped",
          hover && "ol-table--hover",
          dense && "ol-table--dense",
          className,
        )}
        {...rest}
      >
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => {
              const dir = current?.key === c.key ? current.direction : null;
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={c.numeric ? "ol-num" : undefined}
                  aria-sort={
                    c.sortable
                      ? dir
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                >
                  {c.sortable ? (
                    <button
                      type="button"
                      className="ol-table__sort"
                      data-state={dir ?? "none"}
                      onClick={() => {
                        setSort({ key: c.key, direction: dir === "asc" ? "desc" : "asc" });
                      }}
                    >
                      {c.label}
                      <span aria-hidden="true" className="ol-table__arrow">
                        {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
                      </span>
                      {dir ? (
                        <span className="ol-sr">
                          {dir === "asc" ? t.sortedAscending : t.sortedDescending}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={rowKey ? rowKey(row, i) : i}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? "ol-num" : undefined}>
                  {c.render ? c.render(row) : (row[c.key as keyof Row] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A ruled data table with optional client-side sorting. Generic over the row type so `render` and
 * column keys are checked.
 */
export const Table = forwardRef(TableInner) as <Row>(
  props: TableProps<Row> & { ref?: Ref<HTMLTableElement> },
) => ReactElement | null;
