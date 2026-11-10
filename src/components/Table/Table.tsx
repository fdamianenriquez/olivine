import {
  type ChangeEvent,
  type CSSProperties,
  forwardRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Checkbox } from "../Checkbox";
import { Radio } from "../Radio";
import { addKeys, headerState, keyRange, removeKeys, type TableKey, toggleKey } from "./selection";

export type { TableKey } from "./selection";

export type TableSortDirection = "asc" | "desc";

export interface TableSort {
  /** The `key` of the sorted column. */
  key: string;
  direction: TableSortDirection;
}

/** Horizontal alignment of a column's header and cells. */
export type TableColumnAlign = "start" | "center" | "end";

/** `none`: no selection column. `single`: a radio per row. `multiple`: a checkbox per row. */
export type TableSelectionMode = "none" | "single" | "multiple";

export interface TableColumn<Row> {
  /** Column id. Also the property read from each row when `render` is omitted. */
  key: Extract<keyof Row, string> | (string & {});
  /** Header content. */
  label: ReactNode;
  /**
   * End-aligns the column and sets its cells in the figure face (tabular). Use for amounts and
   * quantities only.
   */
  numeric?: boolean;
  /**
   * Alignment of the header and cells. Defaults to `"start"`, or `"end"` when `numeric`. Changes
   * alignment only, never the face: use it for codes or dates that line up at the end.
   */
  align?: TableColumnAlign;
  /** Turns the header into a sort button. */
  sortable?: boolean;
  /**
   * Custom cell content. Defaults to `row[key]`. A selected row is an ink row: let text inherit the
   * row's colour, since muted tones (`ink-2`, `ink-3`) fall below contrast on ink.
   */
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
   * Accessible name of the scroll region around the table. Defaults to `caption` when that is a
   * string. Without a name the wrapper is a plain, non-focusable `div`.
   */
  scrollLabel?: string;
  /** Draws a hairline around every cell. */
  bordered?: boolean;
  /** Tints every second row. */
  striped?: boolean;
  /**
   * Rows invert to ink on hover. Only meaningful when rows are interactive. In a selectable table
   * unselected rows fill with paper-2 instead, since selected rows are ink.
   */
  hover?: boolean;
  /** Tighter cell padding and smaller text. */
  dense?: boolean;
  /**
   * Stable key per row. Defaults to the row index. Required in practice when selecting: index keys
   * change when the table sorts.
   */
  rowKey?: (row: Row, index: number) => TableKey;
  /** Controlled sort state. `null` means unsorted. When set, rows are shown in the order given. */
  sort?: TableSort | null;
  /** Initial sort state when uncontrolled. Rows are then sorted client-side. */
  defaultSort?: TableSort | null;
  /** Called when a sortable header is activated. */
  onSortChange?: (sort: TableSort) => void;
  /**
   * Adds a first column to select rows: a checkbox per row plus a tri-state select-all
   * (`multiple`), or a radio per row (`single`).
   * @default "none"
   */
  selectionMode?: TableSelectionMode;
  /**
   * Controlled selection: the `rowKey` values of the selected rows, in the order chosen (at most
   * one in `single`). Keys not in `rows` (other pages) are kept as they are.
   */
  selectedKeys?: readonly TableKey[];
  /** Initial selection when uncontrolled. */
  defaultSelectedKeys?: readonly TableKey[];
  /** Called with the new selection whenever a row is selected or cleared. */
  onSelectionChange?: (keys: readonly TableKey[]) => void;
  /** Rows whose selection cannot change. Their content stays interactive; select-all skips them. */
  disabledKeys?: readonly TableKey[];
  /**
   * Names each row's selection control ("Select Oak shelf"). Give it whenever `selectionMode` is
   * on; without it the control is named by its position ("Select row 2").
   */
  rowLabel?: (row: Row, index: number) => string;
  /**
   * Clicking a row also toggles it (clicks on links, buttons and form controls, and text
   * selections, are ignored). The control is always the keyboard route.
   * @default false
   */
  selectOnRowClick?: boolean;
  /**
   * The region scrolls vertically past this height (CSS length, or px for a number) and the header
   * stays in view. Name the region with a string `caption` or `scrollLabel`.
   */
  maxHeight?: number | string;
  /**
   * Keeps the header in view when the region is sized by your layout (a flex child with
   * `min-height: 0`, or a parent with a fixed height). `maxHeight` implies it.
   * @default false
   */
  stickyHeader?: boolean;
  /**
   * Shown in one full-width body row when `rows` is empty. Pass an `EmptyState size="s"`; set its
   * `announce="polite"` when it appears after a search or filter. Default: nothing.
   */
  empty?: ReactNode;
}

const NO_KEYS: readonly TableKey[] = [];

/** Clicks on these, inside a row, keep their own meaning instead of selecting the row. */
const INTERACTIVE =
  'a, button, input, label, select, textarea, summary, [role="button"], [contenteditable="true"]';

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

/** `numeric` keeps its class (face + end); other alignments add theirs only when they differ. */
function cellClass(c: { numeric?: boolean; align?: TableColumnAlign }): string | undefined {
  const align = c.align ?? (c.numeric ? "end" : "start");
  return (
    cx(
      c.numeric && "ol-num",
      align === "center" && "ol-table__cell--center",
      align === "end" && !c.numeric && "ol-table__cell--end",
      align === "start" && c.numeric && "ol-table__cell--start",
    ) || undefined
  );
}

function shiftHeld(event: { nativeEvent: Event }): boolean {
  const native = event.nativeEvent as Partial<globalThis.MouseEvent>;
  return native.shiftKey === true;
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
    selectionMode = "none",
    selectedKeys,
    defaultSelectedKeys = NO_KEYS,
    onSelectionChange,
    disabledKeys = NO_KEYS,
    rowLabel,
    selectOnRowClick = false,
    maxHeight,
    stickyHeader = false,
    empty,
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
  const [selected, setSelected] = useControllable<readonly TableKey[]>(
    selectedKeys,
    defaultSelectedKeys,
    onSelectionChange,
  );
  const selectable = selectionMode !== "none";
  const multiple = selectionMode === "multiple";
  const radioName = useId();
  // The last row toggled on its own: the start of a Shift+click range.
  const anchor: { current: TableKey | null } = useRef<TableKey | null>(null);
  const [status, setStatus] = useState("");

  const data = useMemo(() => {
    if (controlled || !current) return rows;
    const sign = current.direction === "asc" ? 1 : -1;
    const key = current.key as keyof Row;
    return rows
      .map((row, i) => ({ row, i }))
      .sort((a, b) => sign * compare(a.row[key], b.row[key]) || a.i - b.i)
      .map(({ row }) => row);
  }, [rows, current, controlled]);

  const keys = useMemo(() => data.map((row, i) => (rowKey ? rowKey(row, i) : i)), [data, rowKey]);
  const enabled = useMemo(
    () => keys.filter((k) => !disabledKeys.includes(k)),
    [keys, disabledKeys],
  );
  const all = headerState(selected, enabled);

  const sticky = stickyHeader || maxHeight !== undefined;
  const label = scrollLabel ?? (typeof caption === "string" ? caption : undefined);

  useEffect(() => {
    if (!selectable) return;
    if (!rowKey)
      devWarn("Table", "give `rowKey` to a selectable table: index keys change when it sorts.");
    if (!rowLabel)
      devWarn("Table", "give `rowLabel` to a selectable table so each row's control has a name.");
  }, [selectable, rowKey, rowLabel]);

  useEffect(() => {
    if (sticky && !label)
      devWarn("Table", "name the scrolling region with a string `caption` or `scrollLabel`.");
  }, [sticky, label]);

  // A sticky header can cover a control scrolled into view by Tab (WCAG 2.4.11): keep its height
  // as the region's scroll padding.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLTableSectionElement | null>(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    const head = headRef.current;
    if (!sticky || !wrap || !head || typeof ResizeObserver !== "function") return;
    const measure = () => {
      wrap.style.setProperty("--ol-table-head", `${String(head.offsetHeight)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(head);
    return () => {
      observer.disconnect();
      wrap.style.removeProperty("--ol-table-head");
    };
  }, [sticky]);

  const choose = (key: TableKey, on: boolean, range: boolean) => {
    if (disabledKeys.includes(key)) return;
    if (!multiple) {
      if (on && !(selected.length === 1 && selected[0] === key)) setSelected([key]);
      return;
    }
    const span = range && anchor.current !== null ? keyRange(enabled, anchor.current, key) : [];
    anchor.current = key;
    if (span.length > 1) {
      // Several rows changed at once: announce the count, as select-all does.
      const next = on ? addKeys(selected, span) : removeKeys(selected, span);
      setSelected(next);
      setStatus(t.optionsSelected(next.length));
    } else {
      // The control announces its own change; clear the status so the next bulk count is new text.
      setSelected(toggleKey(selected, key, on));
      setStatus("");
    }
  };

  const toggleAll = () => {
    const next = all === "all" ? removeKeys(selected, enabled) : addKeys(selected, enabled);
    setSelected(next);
    setStatus(t.optionsSelected(next.length));
  };

  const onRowClick = (event: MouseEvent<HTMLTableRowElement>, key: TableKey) => {
    const row = event.currentTarget;
    const hit = (event.target as Element).closest(INTERACTIVE);
    if (hit && row.contains(hit)) return;
    const picked = window.getSelection();
    if (picked && !picked.isCollapsed && picked.anchorNode && row.contains(picked.anchorNode))
      return;
    const isOn = selected.includes(key);
    choose(key, multiple ? !isOn : true, event.shiftKey);
  };

  const wrapStyle =
    maxHeight !== undefined
      ? ({
          "--ol-table-max-height":
            typeof maxHeight === "number" ? `${String(maxHeight)}px` : maxHeight,
        } as CSSProperties)
      : undefined;

  return (
    // Scrollable regions must be keyboard reachable (WCAG 2.1.1); the name makes the stop meaningful.
    <div
      ref={wrapRef}
      className={cx("ol-tablewrap", "ol-scrollbar", sticky && "ol-tablewrap--scroll")}
      style={wrapStyle}
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
          selectable && "ol-table--selectable",
          selectable && selectOnRowClick && "ol-table--rowselect",
          sticky && "ol-table--sticky",
          className,
        )}
        {...rest}
      >
        {caption ? <caption>{caption}</caption> : null}
        <thead ref={headRef}>
          <tr>
            {selectable ? (
              <th scope="col" className="ol-table__select">
                {multiple ? (
                  <Checkbox
                    aria-label={t.tableSelectAll}
                    checked={all === "all"}
                    indeterminate={all === "some"}
                    disabled={enabled.length === 0}
                    onChange={toggleAll}
                  />
                ) : (
                  <span className="ol-sr">{t.tableSelectColumn}</span>
                )}
              </th>
            ) : null}
            {columns.map((c) => {
              const dir = current?.key === c.key ? current.direction : null;
              const end = (c.align ?? (c.numeric ? "end" : "start")) === "end";
              const arrow = (
                <span aria-hidden="true" className="ol-table__arrow">
                  {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
                </span>
              );
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={cellClass(c)}
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
                      {/* End-aligned: the arrow leads, so the label's edge lines up with the figures. */}
                      {end ? arrow : null}
                      {c.label}
                      {end ? null : arrow}
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
          {data.length === 0 && empty != null && empty !== false ? (
            <tr className="ol-table__emptyrow">
              <td className="ol-table__empty" colSpan={columns.length + (selectable ? 1 : 0)}>
                {empty}
              </td>
            </tr>
          ) : null}
          {data.map((row, i) => {
            const key = keys[i] ?? i;
            const isOn = selectable && selected.includes(key);
            const disabled = selectable && disabledKeys.includes(key);
            const name = t.tableSelectRow(rowLabel ? rowLabel(row, i) : t.tableRowFallback(i + 1));
            return (
              // The row click is a pointer convenience; the checkbox or radio is the keyboard route.
              <tr
                key={key}
                className="ol-table__row"
                aria-selected={selectable ? isOn : undefined}
                data-disabled={disabled ? "" : undefined}
                onClick={
                  selectable && selectOnRowClick && !disabled
                    ? (event) => {
                        onRowClick(event, key);
                      }
                    : undefined
                }
              >
                {selectable ? (
                  <td className="ol-table__select">
                    {multiple ? (
                      <Checkbox
                        aria-label={name}
                        checked={isOn}
                        disabled={disabled}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          choose(key, event.currentTarget.checked, shiftHeld(event));
                        }}
                      />
                    ) : (
                      <Radio
                        aria-label={name}
                        name={radioName}
                        value={String(key)}
                        checked={isOn}
                        disabled={disabled}
                        onChange={() => {
                          choose(key, true, false);
                        }}
                      />
                    )}
                  </td>
                ) : null}
                {columns.map((c) => (
                  <td key={c.key} className={cellClass(c)}>
                    {c.render ? c.render(row) : (row[c.key as keyof Row] as ReactNode)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {multiple ? (
        <span className="ol-sr" role="status">
          {status}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A ruled data table with optional client-side sorting, row selection, a sticky header and an
 * empty row. Generic over the row type so `render` and column keys are checked.
 */
export const Table = forwardRef(TableInner) as <Row>(
  props: TableProps<Row> & { ref?: Ref<HTMLTableElement> },
) => ReactElement | null;
