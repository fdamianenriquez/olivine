import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "../Badge";
import { Root } from "../Root";
import { Table, type TableColumn, type TableProps } from "./Table";

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

const meta: Meta<TableProps<Order>> = {
  title: "Content/Table",
  component: Table<Order>,
  tags: ["autodocs"],
  args: { columns, rows },
  parameters: {
    docs: {
      description: {
        component:
          "Table has ink rules above and below the header, `line-soft` rows, and right-aligned tabular mono numbers.\n\n**Props** — `columns` (`[{key, label, numeric, sortable, render}]`), `rows`, `caption` (below), `bordered`, `striped`, `hover` (rows invert), `dense`, `rowKey`, `sort` / `defaultSort` / `onSortChange` (`{key, direction}`).\n\n- Sortable headers are buttons; the state is exposed through `aria-sort` and a visually hidden, translated string.\n- Uncontrolled tables sort client-side; pass `sort` to sort rows yourself.\n- `hover` only makes sense when rows are interactive (for example they contain links or buttons).\n- The table sits in a horizontal scroll region. When it has a name (a string `caption` or `scrollLabel`) the region is keyboard-focusable so wide tables stay reachable at 320px.\n- Numbers only in `numeric` columns; keep words left-aligned.",
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
