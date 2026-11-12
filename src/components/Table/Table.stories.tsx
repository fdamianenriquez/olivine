import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { Badge } from "../Badge";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Root } from "../Root";
import { Table, type TableColumn, type TableKey, type TableProps, type TableSort } from "./Table";

interface Order {
  id: string;
  item: string;
  status: string;
  tone: "success" | "warning" | "danger";
  qty: number;
  total: string;
}

const rows: Order[] = [
  { id: "001", item: "Oak shelf", status: "Shipped", tone: "success", qty: 2, total: "¥48,000" },
  { id: "002", item: "Steel hook", status: "Pending", tone: "warning", qty: 12, total: "¥9,600" },
  { id: "003", item: "Washi lamp", status: "Failed", tone: "danger", qty: 1, total: "¥22,000" },
];

const more: Order[] = [
  ...rows,
  { id: "004", item: "Cedar box", status: "Shipped", tone: "success", qty: 4, total: "¥11,111" },
  { id: "005", item: "Iron kettle", status: "Pending", tone: "warning", qty: 1, total: "¥88,888" },
  { id: "006", item: "Linen cloth", status: "Shipped", tone: "success", qty: 30, total: "¥4,500" },
  { id: "007", item: "Clay cup", status: "Shipped", tone: "success", qty: 6, total: "¥7,200" },
  { id: "008", item: "Bamboo tray", status: "Failed", tone: "danger", qty: 2, total: "¥3,300" },
  { id: "009", item: "Pine stool", status: "Pending", tone: "warning", qty: 1, total: "¥19,800" },
  { id: "010", item: "Paper fan", status: "Shipped", tone: "success", qty: 50, total: "¥1,000" },
];

const byId = (r: Order) => r.id;
const byItem = (r: Order) => r.item;

const plain: TableColumn<Order>[] = [
  { key: "id", label: "No." },
  { key: "item", label: "Item" },
  { key: "total", label: "Total" },
];

const columns: TableColumn<Order>[] = [
  { key: "id", label: "No." },
  { key: "item", label: "Item", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <Badge tone={r.tone} dot>
        {r.status}
      </Badge>
    ),
  },
  { key: "qty", label: "Qty", numeric: true, sortable: true },
  { key: "total", label: "Total", numeric: true },
];

const yen = new Intl.NumberFormat("en-US", { style: "currency", currency: "JPY" });
const amount = (r: Order) => Number(r.total.replace(/\D/g, ""));

/** Totals, row headers and figures: the columns of the N6b stories. */
const totalled: TableColumn<Order>[] = [
  { key: "item", label: "Item", rowHeader: true, sortable: true, footer: "Total" },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <Badge tone={r.tone} dot>
        {r.status}
      </Badge>
    ),
  },
  {
    key: "qty",
    label: "Qty",
    numeric: true,
    sortable: true,
    footer: (rs) => rs.reduce((n, r) => n + r.qty, 0),
  },
  {
    key: "total",
    label: "Total",
    numeric: true,
    footer: (rs) => yen.format(rs.reduce((n, r) => n + amount(r), 0)),
  },
];

const meta: Meta<TableProps<Order>> = {
  title: "Content/Table",
  component: Table<Order>,
  tags: ["autodocs"],
  args: { columns, rows },
  parameters: {
    docs: {
      description: {
        component:
          'Table has ink rules above and below the header, `line-soft` rows, and end-aligned amounts in the figure face. It stays a native `table`: each control is a Tab stop and nothing is scripted as a grid.\n\n**Props** — `columns` (`[{key, label, numeric, align, sortable, render}]`), `rows`, `caption` (below), `scrollLabel`, `bordered`, `striped`, `hover` (rows invert; in a selectable table unselected rows fill with paper-2), `dense`, `rowKey`, `sort` / `defaultSort` / `onSortChange` (`{key, direction}`), `selectionMode` (`none` | `single` | `multiple`), `selectedKeys` / `defaultSelectedKeys` / `onSelectionChange`, `disabledKeys`, `rowLabel`, `selectOnRowClick`, `maxHeight`, `stickyHeader`, `empty`, `loading`, `loadingRows`, `onRowAction`. Column fields also take `footer` (a node, or a function of the rows as displayed) and `rowHeader`.\n\n- Sortable headers are buttons; the state is exposed through `aria-sort` and a visually hidden, translated string. In end-aligned headers the arrow comes before the label.\n- Uncontrolled tables sort client-side; pass `sort` to sort rows yourself.\n- `hover` only makes sense when rows are interactive (for example they contain links or buttons).\n- The table sits in its own scroll region. When it has a name (a string `caption` or `scrollLabel`) the region is keyboard-focusable so wide tables stay reachable at 320px. Do not wrap it in a ScrollArea.\n- Numbers only in `numeric` columns; use `align="end"` for codes or dates (keeps the interface face).\n- Selection: give `rowKey` and `rowLabel`. Selected rows are ink rows; the checkbox or radio carries the state too. Select-all acts on the rows given (the loaded page) and keeps keys from other pages. Shift+click on a checkbox selects a range.\n- `maxHeight` scrolls the region and keeps the header in view; `stickyHeader` does the same in a region sized by your layout.\n- `empty` replaces the body with one full-width row: pass an `EmptyState size="s"`.\n- `loading` marks the table busy: skeleton rows on a first load, a thin hatched bar on a refresh. Nothing is disabled; the start and the end are announced.\n- A column `footer` adds one totals row in a `tfoot`; it sticks to the bottom of a scrolling region.\n- `rowHeader` makes the cells of a column row headers (`th scope="row"`); they also name the selection control of the row.\n- `onRowAction(key, row)` runs on a row click or on the button built into the name cell of the row. Selection is then by the checkbox or radio only.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<TableProps<Order>>;

export const Default: Story = {
  render: () => <Table columns={plain} rows={rows} caption="Fig. 01 — Orders, October 2026" />,
};

export const NumericSortable: Story = {
  render: () => (
    <Table columns={columns} rows={rows} caption="Fig. 02 — Sortable by item and quantity" />
  ),
};

export const Striped: Story = {
  render: () => <Table columns={columns} rows={rows} striped />,
};

export const Bordered: Story = {
  render: () => <Table columns={columns} rows={rows} bordered />,
};

export const Dense: Story = {
  render: () => <Table columns={columns} rows={rows} dense />,
};

export const Hover: Story = {
  render: () => (
    <Table columns={columns} rows={rows} hover caption="Fig. 03 — Orders, October 2026" />
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <Table
            columns={columns}
            rows={rows}
            striped
            hover
            caption={theme}
            defaultSort={{ key: "qty", direction: "asc" }}
          />
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Table
            columns={columns}
            rows={rows}
            caption={locale}
            defaultSort={{ key: "item", direction: "asc" }}
          />
        </Root>
      ))}
    </div>
  ),
};

function SelectableDemo(props: Partial<TableProps<Order>>) {
  const [keys, setKeys] = useState<readonly TableKey[]>(["002"]);
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <p style={{ margin: 0 }}>Selected: {keys.length ? keys.join(", ") : "none"}</p>
      <Table
        columns={columns}
        rows={rows}
        rowKey={byId}
        rowLabel={byItem}
        selectionMode="multiple"
        selectedKeys={keys}
        onSelectionChange={setKeys}
        caption="Fig. 04 — Select orders to ship"
        {...props}
      />
    </div>
  );
}

export const Selectable: Story = {
  render: () => <SelectableDemo hover />,
};

export const SelectOnRowClick: Story = {
  render: () => <SelectableDemo selectOnRowClick />,
};

export const Single: Story = {
  render: () => (
    <Table
      columns={columns}
      rows={rows}
      rowKey={byId}
      rowLabel={byItem}
      selectionMode="single"
      defaultSelectedKeys={["001"]}
      caption="Fig. 05 — Choose one order"
    />
  ),
};

export const DisabledRows: Story = {
  render: () => (
    <Table
      columns={columns}
      rows={rows}
      rowKey={byId}
      rowLabel={byItem}
      selectionMode="multiple"
      defaultSelectedKeys={["001"]}
      disabledKeys={["001", "003"]}
      caption="Fig. 06 — Shipped and failed orders cannot change"
    />
  ),
};

export const StickyHeader: Story = {
  render: () => (
    <Table
      columns={columns}
      rows={more}
      rowKey={byId}
      rowLabel={byItem}
      selectionMode="multiple"
      defaultSelectedKeys={["003", "005"]}
      maxHeight={240}
      striped
      caption="Fig. 07 — Ten orders in a 240px region"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-8)" }}>
      <Table
        columns={columns}
        rows={[]}
        caption="Fig. 08 — No orders yet"
        empty={<EmptyState size="s" variant="no-data" headingLevel={3} />}
      />
      <Table
        columns={columns}
        rows={[]}
        rowKey={byId}
        rowLabel={byItem}
        selectionMode="multiple"
        caption="Fig. 09 — No orders match the filter"
        empty={
          <EmptyState
            size="s"
            variant="no-results"
            headingLevel={3}
            announce="polite"
            action={<Button brackets>Clear filters</Button>}
          />
        }
      />
    </div>
  ),
};

const aligned: TableColumn<Order>[] = [
  { key: "item", label: "Item" },
  { key: "id", label: "Code", align: "end" },
  { key: "qty", label: "Qty", numeric: true, sortable: true },
  { key: "total", label: "Total", numeric: true, sortable: true },
];

export const AlignedFigures: Story = {
  render: () => (
    <Table
      columns={aligned}
      rows={more}
      caption="Fig. 10 — Figures line up at the end; the code column is end-aligned in the interface face"
    />
  ),
};

export const SelectionThemes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <Table
            columns={columns}
            rows={more}
            rowKey={byId}
            rowLabel={byItem}
            selectionMode="multiple"
            defaultSelectedKeys={["002", "004"]}
            disabledKeys={["006"]}
            hover
            striped
            maxHeight={260}
            caption={theme}
          />
        </div>
      ))}
    </div>
  ),
};

const withActions: TableColumn<Order>[] = [
  { key: "item", label: "Item" },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <span style={{ display: "inline-flex", gap: "var(--space-2)" }}>
        <Badge tone={r.tone} dot>
          {r.status}
        </Badge>
        <Badge tone="solid">{r.id}</Badge>
      </span>
    ),
  },
  { key: "total", label: "Total", numeric: true },
  {
    key: "open",
    label: "Actions",
    render: (r) => (
      <span style={{ display: "inline-flex", gap: "var(--space-3)", alignItems: "center" }}>
        <a href={`#order-${r.id}`}>View {r.item}</a>
        <Button size="s">Ship</Button>
      </span>
    ),
  },
];

/** Links and buttons stay live in a selected (ink) row; their focus ring sits on an on-ink band. */
export const SelectedWithActions: Story = {
  render: () => (
    <Table
      columns={withActions}
      rows={rows}
      rowKey={byId}
      rowLabel={byItem}
      selectionMode="multiple"
      defaultSelectedKeys={["001", "002"]}
      disabledKeys={["003"]}
      hover
      caption="Fig. 11 — Actions inside selected rows"
    />
  ),
};

/** First load: skeleton rows (and footer placeholders) instead of `empty`; the table is busy. */
export const LoadingFirst: Story = {
  render: () => (
    <Table
      columns={totalled}
      rows={[]}
      rowKey={byId}
      selectionMode="multiple"
      loading
      loadingRows={4}
      caption="Fig. 12 — Orders loading"
      empty={<EmptyState size="s" variant="no-data" headingLevel={3} />}
    />
  ),
};

/** Refresh: the rows stay live under a thin hatched bar while new ones load. */
export const LoadingRefresh: Story = {
  render: () => (
    <Table
      columns={totalled}
      rows={rows}
      rowKey={byId}
      selectionMode="multiple"
      defaultSelectedKeys={["002"]}
      loading
      caption="Fig. 13 — Orders refreshing"
    />
  ),
};

function ServerSortDemo() {
  const [sort, setSort] = useState<TableSort | null>(null);
  const [shown, setShown] = useState<readonly Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const sign = sort?.direction === "desc" ? -1 : 1;
      const next = [...more];
      if (sort?.key === "qty") next.sort((a, b) => sign * (a.qty - b.qty));
      if (sort?.key === "item") next.sort((a, b) => sign * a.item.localeCompare(b.item));
      setShown(next);
      setLoading(false);
    }, 1200);
    return () => {
      window.clearTimeout(id);
    };
  }, [sort]);
  return (
    <Table
      columns={totalled}
      rows={shown}
      rowKey={byId}
      sort={sort}
      onSortChange={(next) => {
        setLoading(true);
        setSort(next);
      }}
      loading={loading}
      maxHeight={320}
      caption="Fig. 14 — Sorted on the server: the first load, then a refresh per sort"
    />
  );
}

/** Server-side sort: skeleton rows on the first load, then the bar on every sort. */
export const LoadingServerSort: Story = {
  render: () => <ServerSortDemo />,
};

/** One totals row: "Total" is a row header, amounts stay in the figure face at the end. */
export const Totals: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-8)" }}>
      <Table columns={totalled} rows={rows} rowKey={byId} caption="Fig. 15 — October totals" />
      <Table
        columns={totalled}
        rows={more}
        rowKey={byId}
        maxHeight={240}
        striped
        caption="Fig. 16 — The totals stay in view in a 240px region"
      />
    </div>
  ),
};

/** The item names its row: a row header in ink and label weight, and the name of its checkbox. */
export const RowHeaders: Story = {
  render: () => (
    <Table
      columns={totalled}
      rows={rows}
      rowKey={byId}
      selectionMode="multiple"
      defaultSelectedKeys={["001"]}
      hover
      caption="Fig. 17 — Row headers name each row and its checkbox"
    />
  ),
};

function RowActionDemo(props: Partial<TableProps<Order>>) {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <p style={{ margin: 0 }}>Opened: {opened ?? "none"}</p>
      <Table
        columns={totalled}
        rows={rows}
        rowKey={byId}
        onRowAction={(_, row) => {
          setOpened(row.item);
        }}
        {...props}
      />
    </div>
  );
}

/** Click a row, or Tab to its name and press Enter: the row opens. Hover is on by itself. */
export const RowAction: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-8)" }}>
      <RowActionDemo caption="Fig. 18 — Open an order" />
      <RowActionDemo
        selectionMode="multiple"
        defaultSelectedKeys={["002"]}
        caption="Fig. 19 — Select with the checkbox, open with the row"
      />
    </div>
  ),
};

/** The four additions in both themes. */
export const ExtensionThemes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-6)",
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <Table
            columns={totalled}
            rows={[]}
            rowKey={byId}
            selectionMode="multiple"
            loading
            loadingRows={3}
            caption={`${theme} — first load`}
          />
          <Table
            columns={totalled}
            rows={rows}
            rowKey={byId}
            selectionMode="multiple"
            defaultSelectedKeys={["002"]}
            loading
            onRowAction={() => undefined}
            caption={`${theme} — refresh, totals, row headers and row actions`}
          />
        </div>
      ))}
    </div>
  ),
};
