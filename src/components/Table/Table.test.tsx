import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Table, type TableColumn, type TableSort } from "./Table";

interface Order {
  id: string;
  item: string;
  qty: number;
}

const rows: Order[] = [
  { id: "001", item: "Oak shelf", qty: 10 },
  { id: "002", item: "Steel hook", qty: 2 },
  { id: "003", item: "Washi lamp", qty: 7 },
];

const columns: TableColumn<Order>[] = [
  { key: "item", label: "Item", sortable: true },
  { key: "qty", label: "Qty", numeric: true, sortable: true },
  { key: "id", label: "No.", render: (r) => `#${r.id}` },
];

const items = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("cell")[0]?.textContent);

describe("Table", () => {
  it("renders columns, rows and the render function", () => {
    render(<Table columns={columns} rows={rows} data-testid="t" className="extra" />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByText("#002")).toBeInTheDocument();
    expect(screen.getByTestId("t")).toHaveClass("ol-table", "extra");
  });

  it("maps variants to modifier classes", () => {
    render(<Table columns={columns} rows={rows} bordered striped hover dense data-testid="t" />);
    expect(screen.getByTestId("t")).toHaveClass(
      "ol-table--bordered",
      "ol-table--striped",
      "ol-table--hover",
      "ol-table--dense",
    );
  });

  it("marks numeric cells and headers", () => {
    render(<Table columns={columns} rows={rows} />);
    expect(screen.getByText("10")).toHaveClass("ol-num");
    expect(screen.getByRole("columnheader", { name: /Qty/ })).toHaveClass("ol-num");
    expect(screen.getByText("Oak shelf")).not.toHaveClass("ol-num");
  });

  it("uses rowKey and renders a caption that names the scroll region", () => {
    render(<Table columns={columns} rows={rows} caption="Orders" rowKey={(r) => r.id} />);
    expect(screen.getByText("Orders", { selector: "caption" })).toBeInTheDocument();
    const region = screen.getByRole("region", { name: "Orders" });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("has no scroll region without a name", () => {
    render(<Table columns={columns} rows={rows} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("sorts by click, ascending then descending, numerically", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} rows={rows} />);
    await user.click(screen.getByRole("button", { name: /Qty/ }));
    expect(items()).toEqual(["Steel hook", "Washi lamp", "Oak shelf"]);
    expect(screen.getByRole("columnheader", { name: /Qty/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await user.click(screen.getByRole("button", { name: /Qty/ }));
    expect(items()).toEqual(["Oak shelf", "Washi lamp", "Steel hook"]);
    expect(screen.getByRole("columnheader", { name: /Qty/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(screen.getByRole("columnheader", { name: /Item/ })).toHaveAttribute("aria-sort", "none");
  });

  it("sorts strings and works from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} rows={rows} />);
    await user.tab();
    expect(screen.getByRole("button", { name: /Item/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(items()).toEqual(["Oak shelf", "Steel hook", "Washi lamp"]);
    await user.keyboard(" ");
    expect(items()).toEqual(["Washi lamp", "Steel hook", "Oak shelf"]);
  });

  it("announces the sort state with hidden text", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} rows={rows} />);
    const btn = screen.getByRole("button", { name: "Qty" });
    await user.click(btn);
    expect(screen.getByRole("button", { name: /Qty.*sorted ascending/ })).toBeInTheDocument();
    await user.click(btn);
    expect(screen.getByRole("button", { name: /Qty.*sorted descending/ })).toBeInTheDocument();
  });

  it.each([
    ["es", "orden ascendente"],
    ["ja", "昇順で並べ替え済み"],
  ] as const)("translates the sort text in %s", (locale, text) => {
    render(
      <Root locale={locale}>
        <Table columns={columns} rows={rows} defaultSort={{ key: "qty", direction: "asc" }} />
      </Root>,
    );
    expect(screen.getByText(text)).toHaveClass("ol-sr");
  });

  it("honours defaultSort", () => {
    render(<Table columns={columns} rows={rows} defaultSort={{ key: "qty", direction: "desc" }} />);
    expect(items()).toEqual(["Oak shelf", "Washi lamp", "Steel hook"]);
  });

  it("supports controlled sort without reordering rows itself", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const { rerender } = render(
      <Table columns={columns} rows={rows} sort={null} onSortChange={onSortChange} />,
    );
    await user.click(screen.getByRole("button", { name: /Qty/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "qty", direction: "asc" });
    expect(items()).toEqual(["Oak shelf", "Steel hook", "Washi lamp"]);
    rerender(
      <Table
        columns={columns}
        rows={rows}
        sort={{ key: "qty", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );
    expect(screen.getByRole("columnheader", { name: /Qty/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("lets a parent drive controlled sort", async () => {
    const user = userEvent.setup();
    function Host() {
      const [sort, setSort] = useState<TableSort | null>(null);
      const sorted = sort ? [...rows].sort((a, b) => b.qty - a.qty) : rows;
      return <Table columns={columns} rows={sorted} sort={sort} onSortChange={setSort} />;
    }
    render(<Host />);
    await user.click(screen.getByRole("button", { name: /Qty/ }));
    expect(items()[0]).toBe("Oak shelf");
  });

  it("forwards the ref to the table", () => {
    const ref = createRef<HTMLTableElement>();
    render(<Table ref={ref} columns={columns} rows={rows} />);
    expect(ref.current).toBeInstanceOf(HTMLTableElement);
  });

  it("has no axe violations, default or sorted", async () => {
    const { container } = render(
      <Table
        columns={columns}
        rows={rows}
        caption="Orders"
        defaultSort={{ key: "qty", direction: "asc" }}
      />,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
