import { readFileSync } from "node:fs";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

const byId = (r: Order) => r.id;
const byItem = (r: Order) => r.item;

function Selectable(
  props: Partial<React.ComponentProps<typeof Table<Order>>> & { rows?: Order[] },
) {
  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={byId}
      rowLabel={byItem}
      selectionMode="multiple"
      {...props}
    />
  );
}

const box = (name: string) => screen.getByRole("checkbox", { name });
const row = (name: string) => {
  const tr = box(name).closest("tr");
  if (!tr) throw new Error(`no row for ${name}`);
  return tr;
};

describe("Table selection (multiple)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds a checkbox column named per row and a select-all header", () => {
    render(<Selectable />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(4);
    expect(box("Select all rows")).not.toBeChecked();
    expect(box("Select Oak shelf")).toBeInTheDocument();
    expect(row("Select Oak shelf")).toHaveAttribute("aria-selected", "false");
  });

  it("selects by pointer and by Space, emitting keys in the order chosen", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Selectable onSelectionChange={onSelectionChange} />);
    await user.click(box("Select Washi lamp"));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["003"]);
    box("Select Oak shelf").focus();
    await user.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["003", "001"]);
    expect(row("Select Oak shelf")).toHaveAttribute("aria-selected", "true");
    expect(box("Select Oak shelf")).toBeChecked();
    await user.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["003"]);
  });

  it("reaches the controls with Tab in DOM order", async () => {
    const user = userEvent.setup();
    render(<Selectable />);
    await user.tab();
    expect(box("Select all rows")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /Item/ })).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(box("Select Oak shelf")).toHaveFocus();
  });

  it("is controlled by selectedKeys", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <Selectable selectedKeys={["002"]} onSelectionChange={onSelectionChange} />,
    );
    expect(box("Select Steel hook")).toBeChecked();
    await user.click(box("Select Oak shelf"));
    expect(onSelectionChange).toHaveBeenCalledWith(["002", "001"]);
    expect(box("Select Oak shelf")).not.toBeChecked();
    rerender(<Selectable selectedKeys={["002", "001"]} onSelectionChange={onSelectionChange} />);
    expect(box("Select Oak shelf")).toBeChecked();
  });

  it("honours defaultSelectedKeys and keeps the selection when sorting", async () => {
    const user = userEvent.setup();
    render(<Selectable defaultSelectedKeys={["003"]} />);
    await user.click(screen.getByRole("button", { name: /Qty/ }));
    expect(box("Select Washi lamp")).toBeChecked();
    expect(row("Select Washi lamp")).toHaveAttribute("aria-selected", "true");
  });

  it("shows a partial selection and selects every enabled row, keeping off-page keys", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <Selectable
        defaultSelectedKeys={["900", "002"]}
        disabledKeys={["003"]}
        defaultSort={{ key: "qty", direction: "asc" }}
        onSelectionChange={onSelectionChange}
      />,
    );
    const all = box("Select all rows") as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    expect(all).not.toBeChecked();
    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["900", "002", "001"]);
    expect(all).toBeChecked();
    expect(all.indeterminate).toBe(false);
    expect(box("Select Washi lamp")).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("3 selected");
    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["900"]);
    expect(screen.getByRole("status")).toHaveTextContent("1 selected");
  });

  it("keeps a disabled selected row when clearing all", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <Selectable
        defaultSelectedKeys={["001", "002", "003"]}
        disabledKeys={["003"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(box("Select all rows")).toBeChecked();
    await user.click(box("Select all rows"));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["003"]);
    expect(box("Select Washi lamp")).toBeChecked();
    expect(box("Select Washi lamp")).toBeDisabled();
  });

  it("mounts the status region empty", () => {
    render(<Selectable />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("disables select-all when no row can change", () => {
    render(<Selectable disabledKeys={["001", "002", "003"]} />);
    expect(box("Select all rows")).toBeDisabled();
  });

  it("selects a range with Shift+click, skipping disabled rows", async () => {
    const user = userEvent.setup();
    const many: Order[] = [
      ...rows,
      { id: "004", item: "Cedar box", qty: 3 },
      { id: "005", item: "Iron pan", qty: 4 },
    ];
    const onSelectionChange = vi.fn();
    render(<Selectable rows={many} disabledKeys={["003"]} onSelectionChange={onSelectionChange} />);
    await user.click(box("Select Steel hook"));
    await user.keyboard("{Shift>}");
    await user.click(box("Select Iron pan"));
    await user.keyboard("{/Shift}");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["002", "004", "005"]);
    expect(box("Select Washi lamp")).not.toBeChecked();
    expect(box("Select Oak shelf")).not.toBeChecked();
  });

  it("selects a range with Shift+Space and announces the count", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Selectable onSelectionChange={onSelectionChange} />);
    box("Select Oak shelf").focus();
    await user.keyboard(" ");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    box("Select Washi lamp").focus();
    await user.keyboard("{Shift>} {/Shift}");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["001", "002", "003"]);
    expect(screen.getByRole("status")).toHaveTextContent("3 selected");
  });

  it("toggles select-all with Space", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Selectable onSelectionChange={onSelectionChange} />);
    box("Select all rows").focus();
    await user.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["001", "002", "003"]);
    await user.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("clears the status on a single toggle so a repeated bulk count is announced again", async () => {
    const user = userEvent.setup();
    render(<Selectable />);
    await user.click(box("Select all rows"));
    expect(screen.getByRole("status")).toHaveTextContent("3 selected");
    await user.click(box("Select Oak shelf"));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(box("Select all rows"));
    expect(screen.getByRole("status")).toHaveTextContent("3 selected");
  });

  it("keeps the hidden sort word in a selectable table", async () => {
    const user = userEvent.setup();
    render(<Selectable />);
    await user.click(screen.getByRole("button", { name: "Qty" }));
    expect(screen.getByRole("button", { name: /Qty.*sorted ascending/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Qty/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("keeps links in a selected row focusable", async () => {
    const user = userEvent.setup();
    const linked: TableColumn<Order>[] = [
      ...columns,
      { key: "open", label: "Open", render: (r) => <a href={`#${r.id}`}>View {r.item}</a> },
    ];
    render(<Selectable columns={linked} defaultSelectedKeys={["001"]} />);
    const link = screen.getByRole("link", { name: "View Oak shelf" });
    expect(link.closest("tr")).toHaveAttribute("aria-selected", "true");
    await user.tab();
    while (document.activeElement !== link && document.activeElement !== document.body) {
      await user.tab();
    }
    expect(link).toHaveFocus();
  });

  it("does not select on row click unless selectOnRowClick", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Selectable onSelectionChange={onSelectionChange} />);
    await user.click(screen.getByText("Oak shelf"));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("toggles on row click with selectOnRowClick, ignoring links, buttons and disabled rows", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const onOpen = vi.fn();
    const withLinks: TableColumn<Order>[] = [
      ...columns,
      {
        key: "open",
        label: "Open",
        render: (r) => (
          <>
            <a href={`#${r.id}`}>View {r.item}</a>
            <button type="button" onClick={onOpen}>
              Open {r.item}
            </button>
          </>
        ),
      },
    ];
    render(
      <Selectable
        columns={withLinks}
        selectOnRowClick
        disabledKeys={["003"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(screen.getByRole("link", { name: "View Oak shelf" }));
    await user.click(screen.getByRole("button", { name: "Open Oak shelf" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).not.toHaveBeenCalled();
    await user.click(screen.getByText("Washi lamp"));
    expect(onSelectionChange).not.toHaveBeenCalled();
    await user.click(screen.getByText("Oak shelf"));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["001"]);
    await user.click(screen.getByText("Oak shelf"));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("names rows by position without rowLabel and warns in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Table columns={columns} rows={rows} selectionMode="multiple" />);
    expect(box("Select row 2")).toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("rowLabel"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("rowKey"));
  });

  it.each([
    ["es", "Seleccionar todas las filas", "Seleccionar Oak shelf", "Seleccionar fila 1"],
    ["ja", "すべての行を選択", "Oak shelfを選択", "1行目を選択"],
  ] as const)("translates the selection labels in %s", (locale, all, one, fallback) => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Root locale={locale}>
        <Selectable />
        <Table columns={columns} rows={rows} rowKey={byId} selectionMode="multiple" />
      </Root>,
    );
    expect(screen.getAllByRole("checkbox", { name: all })).toHaveLength(2);
    expect(box(one)).toBeInTheDocument();
    expect(box(fallback)).toBeInTheDocument();
  });

  it("has no axe violations, partially selected and fully selected", async () => {
    const { container, rerender } = render(<Selectable caption="Orders" selectedKeys={["001"]} />);
    expect(await runAxe(container)).toHaveNoViolations();
    rerender(<Selectable caption="Orders" selectedKeys={["001", "002", "003"]} />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("Table selection (single)", () => {
  it("renders a radio column with a hidden header word", () => {
    render(<Selectable selectionMode="single" />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Select", { selector: "th .ol-sr" })).toBeInTheDocument();
    const names = screen.getAllByRole("radio").map((r) => r.getAttribute("name"));
    expect(new Set(names).size).toBe(1);
  });

  it("selects one row by pointer and moves with the arrow keys", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Selectable selectionMode="single" onSelectionChange={onSelectionChange} />);
    await user.click(screen.getByRole("radio", { name: "Select Oak shelf" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["001"]);
    await user.keyboard("{ArrowDown}");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["002"]);
    expect(screen.getByRole("radio", { name: "Select Steel hook" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Select Oak shelf" }).closest("tr")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("skips a disabled radio with the arrow keys", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <Selectable
        selectionMode="single"
        disabledKeys={["002"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Select Oak shelf" }));
    await user.keyboard("{ArrowDown}");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["003"]);
    expect(screen.getByRole("radio", { name: "Select Steel hook" })).not.toBeChecked();
  });

  it.each([
    ["es", "Seleccionar"],
    ["ja", "選択"],
  ] as const)("translates the radio column header in %s", (locale, word) => {
    render(
      <Root locale={locale}>
        <Selectable selectionMode="single" />
      </Root>,
    );
    expect(screen.getByText(word, { selector: "th .ol-sr" })).toBeInTheDocument();
  });

  it("replaces the selection on row click with selectOnRowClick", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <Selectable
        selectionMode="single"
        selectOnRowClick
        defaultSelectedKeys={["001"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(screen.getByText("Washi lamp"));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["003"]);
    await user.click(screen.getByText("Washi lamp"));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Selectable selectionMode="single" caption="Orders" defaultSelectedKeys={["002"]} />,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("Table alignment, empty and sticky header", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("aligns columns without changing the face", () => {
    const aligned: TableColumn<Order>[] = [
      { key: "id", label: "Code", align: "end" },
      { key: "item", label: "Item", align: "center" },
      { key: "qty", label: "Qty", numeric: true, align: "start" },
    ];
    render(<Table columns={aligned} rows={rows} />);
    expect(screen.getByText("001")).toHaveClass("ol-table__cell--end");
    expect(screen.getByText("001")).not.toHaveClass("ol-num");
    expect(screen.getByText("Oak shelf")).toHaveClass("ol-table__cell--center");
    expect(screen.getByText("10")).toHaveClass("ol-num", "ol-table__cell--start");
    expect(screen.getByRole("columnheader", { name: "Code" })).toHaveClass("ol-table__cell--end");
  });

  it("puts the sort arrow before the label in end-aligned headers", () => {
    render(<Table columns={columns} rows={rows} />);
    const qty = screen.getByRole("button", { name: /Qty/ });
    expect(qty.firstElementChild).toHaveClass("ol-table__arrow");
    const item = screen.getByRole("button", { name: /Item/ });
    expect(item.textContent.startsWith("Item")).toBe(true);
    expect(qty.textContent.startsWith("Qty")).toBe(false);
  });

  it("renders nothing for no rows unless empty is given", () => {
    const { rerender } = render(<Table columns={columns} rows={[]} />);
    expect(screen.getAllByRole("row")).toHaveLength(1);
    rerender(
      <Table
        columns={columns}
        rows={[]}
        selectionMode="multiple"
        rowKey={byId}
        rowLabel={byItem}
        empty={<p>No orders</p>}
      />,
    );
    const cell = screen.getByText("No orders").closest("td");
    expect(cell).toHaveAttribute("colspan", "4");
    expect(cell).toHaveClass("ol-table__empty");
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeDisabled();
  });

  it("makes the header sticky with maxHeight and with stickyHeader", () => {
    const { rerender } = render(
      <Table columns={columns} rows={rows} caption="Orders" maxHeight={240} data-testid="t" />,
    );
    const region = screen.getByRole("region", { name: "Orders" });
    expect(region).toHaveClass("ol-tablewrap", "ol-scrollbar", "ol-tablewrap--scroll");
    expect(region.style.getPropertyValue("--ol-table-max-height")).toBe("240px");
    expect(screen.getByTestId("t")).toHaveClass("ol-table--sticky");
    rerender(
      <Table columns={columns} rows={rows} caption="Orders" maxHeight="50vh" data-testid="t" />,
    );
    expect(region.style.getPropertyValue("--ol-table-max-height")).toBe("50vh");
    rerender(<Table columns={columns} rows={rows} caption="Orders" stickyHeader data-testid="t" />);
    expect(region).toHaveClass("ol-tablewrap--scroll");
    expect(region.style.getPropertyValue("--ol-table-max-height")).toBe("");
  });

  it("keeps the plain wrapper without sticky props", () => {
    render(<Table columns={columns} rows={rows} data-testid="t" />);
    expect(screen.getByTestId("t")).not.toHaveClass("ol-table--sticky");
    expect(screen.getByTestId("t").parentElement).toHaveClass("ol-tablewrap", "ol-scrollbar");
    expect(screen.getByTestId("t").parentElement).not.toHaveClass("ol-tablewrap--scroll");
  });

  it("warns when a scrolling region has no name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Table columns={columns} rows={rows} maxHeight={200} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("scrollLabel"));
  });

  it("keeps the header height as scroll padding when ResizeObserver exists", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
      },
    );
    const { unmount } = render(
      <Table columns={columns} rows={rows} caption="Orders" stickyHeader />,
    );
    const region = screen.getByRole("region", { name: "Orders" });
    expect(observe).toHaveBeenCalledWith(region.querySelector("thead"));
    expect(region.style.getPropertyValue("--ol-table-head")).toMatch(/px$/);
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("has no axe violations, empty and sticky, in both themes", async () => {
    for (const theme of ["washi", "sumi"] as const) {
      const { container, unmount } = render(
        <Root theme={theme}>
          <Table
            columns={columns}
            rows={rows}
            caption="Orders"
            maxHeight={200}
            selectionMode="multiple"
            rowKey={byId}
            rowLabel={byItem}
            defaultSelectedKeys={["002"]}
          />
          <Table columns={columns} rows={[]} scrollLabel="No orders" empty={<p>Nothing yet</p>} />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
      unmount();
    }
  });
});

describe("Table loading", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const status = () => screen.getByRole("status");

  it("shows skeleton rows on a first load, hidden from assistive technology, without empty", () => {
    const { container } = render(
      <Selectable rows={[]} loading caption="Orders" empty={<p>No orders</p>} />,
    );
    const skeletons = container.querySelectorAll("tbody tr.ol-table__skeleton");
    expect(skeletons).toHaveLength(5);
    skeletons.forEach((tr) => {
      expect(tr).toHaveAttribute("aria-hidden", "true");
      expect(tr.querySelector("input, button, a")).toBeNull();
    });
    expect(container.querySelectorAll("tbody .ol-ph")).toHaveLength(15);
    expect(screen.queryByText("No orders")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(box("Select all rows")).toBeDisabled();
    expect(container.querySelector(".ol-table__busy")).toBeNull();
  });

  it("honours loadingRows", () => {
    const { container } = render(<Table columns={columns} rows={[]} loading loadingRows={2} />);
    expect(container.querySelectorAll("tr.ol-table__skeleton")).toHaveLength(2);
  });

  it("keeps the rows and shows the busy bar on a refresh", () => {
    const { container } = render(<Table columns={columns} rows={rows} loading />);
    expect(screen.getByText("Oak shelf")).toBeInTheDocument();
    expect(container.querySelector("tr.ol-table__skeleton")).toBeNull();
    const bar = container.querySelector(".ol-table__busy");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar?.parentElement).toHaveClass("ol-tablewrap");
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });

  it("disables nothing while loading", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <Selectable loading onSortChange={onSortChange} onSelectionChange={onSelectionChange} />,
    );
    const sortButton = screen.getByRole("button", { name: /Qty/ });
    expect(sortButton).toBeEnabled();
    await user.click(sortButton);
    expect(onSortChange).toHaveBeenCalled();
    await user.click(box("Select Oak shelf"));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["001"]);
  });

  it("removes aria-busy when loading is false", () => {
    render(<Table columns={columns} rows={rows} loading={false} />);
    expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
  });

  it("has no status region for a table that never passes loading", () => {
    render(<Table columns={columns} rows={rows} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces the start and the end of a load", () => {
    const { rerender } = render(<Table columns={columns} rows={[]} loading />);
    expect(status()).toHaveTextContent("Loading");
    rerender(<Table columns={columns} rows={rows} loading={false} />);
    expect(status()).toHaveTextContent("3 rows loaded");
    rerender(<Table columns={columns} rows={rows} loading />);
    expect(status()).toHaveTextContent("Loading");
    rerender(<Table columns={columns} rows={rows.slice(0, 1)} loading={false} />);
    expect(status()).toHaveTextContent("1 row loaded");
  });

  it("says nothing when a load ends with no rows, and nothing for an idle table", () => {
    const { rerender } = render(<Table columns={columns} rows={rows} loading={false} />);
    expect(status()).toHaveTextContent("");
    rerender(<Table columns={columns} rows={[]} loading />);
    expect(status()).toHaveTextContent("Loading");
    rerender(<Table columns={columns} rows={[]} loading={false} />);
    expect(status()).toHaveTextContent("");
  });

  it.each([
    ["es", "Cargando", "3 filas cargadas", "1 fila cargada"],
    ["ja", "読み込み中", "3行を読み込みました", "1行を読み込みました"],
  ] as const)("translates the announcements in %s", (locale, start, many, one) => {
    const { rerender } = render(
      <Root locale={locale}>
        <Table columns={columns} rows={[]} loading />
      </Root>,
    );
    expect(status()).toHaveTextContent(start);
    rerender(
      <Root locale={locale}>
        <Table columns={columns} rows={rows} loading={false} />
      </Root>,
    );
    expect(status()).toHaveTextContent(many);
    rerender(
      <Root locale={locale}>
        <Table columns={columns} rows={rows} loading />
      </Root>,
    );
    rerender(
      <Root locale={locale}>
        <Table columns={columns} rows={rows.slice(0, 1)} loading={false} />
      </Root>,
    );
    expect(status()).toHaveTextContent(one);
  });

  it("has no axe violations on a first load and a refresh, in both themes", async () => {
    for (const theme of ["washi", "sumi"] as const) {
      const { container, unmount } = render(
        <Root theme={theme}>
          <Selectable rows={[]} loading caption="Orders loading" columns={footed} />
          <Selectable loading caption="Orders refreshing" columns={footed} maxHeight={200} />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
      unmount();
    }
  });
});

const footed: TableColumn<Order>[] = [
  { key: "item", label: "Item", rowHeader: true, sortable: true, footer: "Total" },
  { key: "qty", label: "Qty", numeric: true, sortable: true, footer: (rs) => sum(rs) },
  { key: "id", label: "No." },
];

const sum = (rs: readonly Order[]) => rs.reduce((n, r) => n + r.qty, 0);

describe("Table footer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const foot = (container: HTMLElement) => container.querySelector("tfoot");

  it("renders one totals row after the body, with string and function forms", () => {
    const { container } = render(<Table columns={footed} rows={rows} data-testid="t" />);
    const tfoot = foot(container);
    expect(tfoot).toHaveClass("ol-table__foot");
    expect(tfoot?.previousElementSibling?.tagName).toBe("TBODY");
    expect(tfoot?.querySelectorAll("tr")).toHaveLength(1);
    const total = screen.getByRole("rowheader", { name: "Total" });
    expect(total.tagName).toBe("TH");
    expect(total).toHaveAttribute("scope", "row");
    expect(within(tfoot as HTMLElement).getByText("19")).toHaveClass("ol-num");
    const cells = tfoot?.querySelectorAll("td, th") ?? [];
    expect(cells).toHaveLength(3);
    expect(cells[2]?.tagName).toBe("TD");
    expect(cells[2]).toBeEmptyDOMElement();
    expect(screen.getByTestId("t")).toHaveClass("ol-table--footed");
  });

  it("passes the rows as displayed, after a client sort", async () => {
    const user = userEvent.setup();
    const seen = vi.fn((rs: readonly Order[]) => rs.map((r) => r.item).join(","));
    const cols: TableColumn<Order>[] = [
      { key: "item", label: "Item", footer: seen },
      { key: "qty", label: "Qty", numeric: true, sortable: true },
    ];
    render(<Table columns={cols} rows={rows} />);
    await user.click(screen.getByRole("button", { name: /Qty/ }));
    expect(seen).toHaveBeenLastCalledWith([rows[1], rows[2], rows[0]]);
    expect(screen.getByText("Steel hook,Washi lamp,Oak shelf")).toBeInTheDocument();
  });

  it("leaves the select column's footer cell empty", () => {
    const { container } = render(<Selectable columns={footed} />);
    const first = foot(container)?.querySelector("tr > :first-child");
    expect(first?.tagName).toBe("TD");
    expect(first).toHaveClass("ol-table__select");
    expect(first).toBeEmptyDOMElement();
  });

  it("is omitted with no rows, and shows placeholders on a first load", () => {
    const { container, rerender } = render(
      <Table columns={footed} rows={[]} empty={<p>No orders</p>} />,
    );
    expect(foot(container)).toBeNull();
    rerender(<Table columns={footed} rows={[]} loading />);
    const tr = foot(container)?.querySelector("tr");
    expect(tr).toHaveAttribute("aria-hidden", "true");
    expect(tr?.querySelectorAll(".ol-ph")).toHaveLength(2);
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });

  it("keeps the footer as it is on a refresh", () => {
    render(<Table columns={footed} rows={rows} loading />);
    expect(screen.getByRole("rowheader", { name: "Total" })).toBeInTheDocument();
  });

  it("has no hover, selection or action on the footer row", async () => {
    const user = userEvent.setup();
    const onRowAction = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <Selectable
        columns={footed}
        onRowAction={onRowAction}
        onSelectionChange={onSelectionChange}
      />,
    );
    const tr = foot(container)?.querySelector("tr") as HTMLElement;
    expect(tr).not.toHaveClass("ol-table__row");
    expect(tr).not.toHaveAttribute("aria-selected");
    await user.click(screen.getByText("Total"));
    expect(onRowAction).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("keeps the footer height as scroll padding in a sticky table", () => {
    const observe = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe;
        disconnect = vi.fn();
        unobserve = vi.fn();
      },
    );
    const { unmount } = render(
      <Table columns={footed} rows={rows} caption="Orders" maxHeight={200} data-testid="t" />,
    );
    const region = screen.getByRole("region", { name: "Orders" });
    expect(screen.getByTestId("t")).toHaveClass("ol-table--sticky", "ol-table--footed");
    expect(observe).toHaveBeenCalledWith(region.querySelector("tfoot"));
    expect(region.style.getPropertyValue("--ol-table-foot")).toMatch(/px$/);
    unmount();
    vi.unstubAllGlobals();
  });

  it("has no axe violations, plain and sticky, in both themes", async () => {
    for (const theme of ["washi", "sumi"] as const) {
      const { container, unmount } = render(
        <Root theme={theme}>
          <Table columns={footed} rows={rows} caption="Totals" bordered />
          <Selectable
            columns={footed}
            caption="Sticky totals"
            maxHeight={200}
            defaultSelectedKeys={["002"]}
          />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
      unmount();
    }
  });
});

describe("Table row headers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the column's cells as th scope=row", () => {
    render(<Table columns={footed} rows={rows} />);
    const oak = screen.getByRole("rowheader", { name: "Oak shelf" });
    expect(oak.tagName).toBe("TH");
    expect(oak).toHaveAttribute("scope", "row");
    expect(oak).toHaveClass("ol-table__rowheader");
    expect(screen.getAllByRole("rowheader")).toHaveLength(4);
    // Column headers keep their look and role.
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByRole("columnheader", { name: /Item/ })).not.toHaveClass(
      "ol-table__rowheader",
    );
  });

  it("names selection controls by rowLabel, then the row header, then position", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { rerender } = render(<Selectable columns={footed} rowLabel={(r) => `order ${r.id}`} />);
    expect(box("Select order 001")).toBeInTheDocument();
    rerender(<Table columns={footed} rows={rows} rowKey={byId} selectionMode="multiple" />);
    expect(box("Select Oak shelf")).toBeInTheDocument();
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("rowLabel"));
    const blank = [{ ...rows[0], item: "" } as Order];
    rerender(<Table columns={footed} rows={blank} rowKey={byId} selectionMode="multiple" />);
    expect(box("Select row 1")).toBeInTheDocument();
  });

  it("names controls by a numeric row-header value", () => {
    const cols: TableColumn<Order>[] = [{ key: "qty", label: "Qty", rowHeader: true }];
    render(<Table columns={cols} rows={rows} rowKey={byId} selectionMode="single" />);
    expect(screen.getByRole("radio", { name: "Select 10" })).toBeInTheDocument();
  });

  it.each([
    ["es", "Seleccionar Oak shelf", "Seleccionar fila 1"],
    ["ja", "Oak shelfを選択", "1行目を選択"],
  ] as const)("translates the row-header names in %s", (locale, named, fallback) => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Root locale={locale}>
        <Table columns={footed} rows={rows} rowKey={byId} selectionMode="multiple" />
        <Table columns={columns} rows={rows} rowKey={byId} selectionMode="multiple" />
      </Root>,
    );
    expect(box(named)).toBeInTheDocument();
    expect(box(fallback)).toBeInTheDocument();
  });

  it("takes the selected-row style on the row header", async () => {
    const user = userEvent.setup();
    render(<Selectable columns={footed} hover />);
    await user.click(box("Select Steel hook"));
    const th = screen.getByRole("rowheader", { name: "Steel hook" });
    expect(th.closest("tr")).toHaveAttribute("aria-selected", "true");
  });

  it("has no axe violations with a selected row header, in both themes", async () => {
    for (const theme of ["washi", "sumi"] as const) {
      const { container, unmount } = render(
        <Root theme={theme}>
          <Selectable columns={footed} caption="Orders" defaultSelectedKeys={["001"]} striped />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
      unmount();
    }
  });
});

describe("Table row actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const action = (name: string) => screen.getByRole("button", { name });

  it("fires on a row click with the key and the row", async () => {
    const user = userEvent.setup();
    const onRowAction = vi.fn();
    render(<Table columns={columns} rows={rows} rowKey={byId} onRowAction={onRowAction} />);
    await user.click(screen.getByText("#002"));
    expect(onRowAction).toHaveBeenCalledTimes(1);
    expect(onRowAction).toHaveBeenCalledWith("002", rows[1]);
  });

  it("wraps the first column, or the first row-header column, in a button", () => {
    const { rerender } = render(<Table columns={columns} rows={rows} onRowAction={vi.fn()} />);
    expect(action("Oak shelf")).toHaveClass("ol-table__action");
    expect(action("Oak shelf")).toHaveAttribute("type", "button");
    const late: TableColumn<Order>[] = [
      { key: "id", label: "No." },
      { key: "item", label: "Item", rowHeader: true },
    ];
    rerender(<Table columns={late} rows={rows} onRowAction={vi.fn()} />);
    expect(action("Oak shelf").closest("th")).toHaveAttribute("scope", "row");
    expect(screen.queryByRole("button", { name: "001" })).not.toBeInTheDocument();
  });

  it("fires exactly once from the button with a click, Enter and Space", async () => {
    const user = userEvent.setup();
    const onRowAction = vi.fn();
    render(<Table columns={columns} rows={rows} rowKey={byId} onRowAction={onRowAction} />);
    await user.click(action("Oak shelf"));
    expect(onRowAction).toHaveBeenCalledTimes(1);
    action("Washi lamp").focus();
    await user.keyboard("{Enter}");
    expect(onRowAction).toHaveBeenCalledTimes(2);
    expect(onRowAction).toHaveBeenLastCalledWith("003", rows[2]);
    await user.keyboard(" ");
    expect(onRowAction).toHaveBeenCalledTimes(3);
  });

  it("ignores clicks on links, buttons, checkboxes and text selections", async () => {
    const user = userEvent.setup();
    const onRowAction = vi.fn();
    const onOpen = vi.fn();
    const withLinks: TableColumn<Order>[] = [
      ...columns,
      {
        key: "open",
        label: "Open",
        render: (r) => (
          <>
            <a href={`#${r.id}`}>View {r.item}</a>
            <button type="button" onClick={onOpen}>
              Ship {r.item}
            </button>
          </>
        ),
      },
    ];
    render(<Selectable columns={withLinks} onRowAction={onRowAction} />);
    await user.click(screen.getByRole("link", { name: "View Oak shelf" }));
    await user.click(screen.getByRole("button", { name: "Ship Oak shelf" }));
    await user.click(box("Select Oak shelf"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onRowAction).not.toHaveBeenCalled();
    const cell = screen.getByText("#002");
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      anchorNode: cell.firstChild,
    } as unknown as Selection);
    await user.click(cell);
    expect(onRowAction).not.toHaveBeenCalled();
  });

  it("ignores selectOnRowClick with a warning: the click is the action", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const onRowAction = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <Selectable
        selectOnRowClick
        onRowAction={onRowAction}
        onSelectionChange={onSelectionChange}
        data-testid="t"
      />,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("selectOnRowClick"));
    expect(screen.getByTestId("t")).not.toHaveClass("ol-table--rowselect");
    await user.click(screen.getByText("#001"));
    expect(onRowAction).toHaveBeenCalledWith("001", rows[0]);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("turns hover on by default and honours hover={false}", () => {
    const { rerender } = render(
      <Table columns={columns} rows={rows} onRowAction={vi.fn()} data-testid="t" />,
    );
    expect(screen.getByTestId("t")).toHaveClass("ol-table--hover", "ol-table--action");
    rerender(
      <Table columns={columns} rows={rows} onRowAction={vi.fn()} hover={false} data-testid="t" />,
    );
    expect(screen.getByTestId("t")).not.toHaveClass("ol-table--hover");
    rerender(<Table columns={columns} rows={rows} data-testid="t" />);
    expect(screen.getByTestId("t")).not.toHaveClass("ol-table--hover", "ol-table--action");
  });

  it("ignores a click on the select cell around the checkbox", async () => {
    const user = userEvent.setup();
    const onRowAction = vi.fn();
    const onSelectionChange = vi.fn();
    render(<Selectable onRowAction={onRowAction} onSelectionChange={onSelectionChange} />);
    const cell = box("Select Oak shelf").closest("td");
    if (!cell) throw new Error("no select cell");
    await user.click(cell);
    expect(onRowAction).not.toHaveBeenCalled();
  });

  it("warns when an action button has no text", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const iconOnly: TableColumn<Order>[] = [
      { key: "item", label: "Item", render: () => <span aria-hidden="true" /> },
    ];
    render(<Table columns={iconOnly} rows={rows} onRowAction={vi.fn()} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no text"));
  });

  it("still fires for a disabled row", async () => {
    const user = userEvent.setup();
    const onRowAction = vi.fn();
    render(<Selectable disabledKeys={["003"]} onRowAction={onRowAction} />);
    await user.click(screen.getByText("#003"));
    expect(onRowAction).toHaveBeenCalledWith("003", rows[2]);
  });

  it("leaves rows without role or tabindex, and skeleton rows inert", async () => {
    const user = userEvent.setup();
    const onRowAction = vi.fn();
    const { container, rerender } = render(
      <Table columns={columns} rows={rows} onRowAction={onRowAction} />,
    );
    container.querySelectorAll("tbody tr").forEach((tr) => {
      expect(tr).not.toHaveAttribute("role");
      expect(tr).not.toHaveAttribute("tabindex");
    });
    rerender(<Table columns={columns} rows={[]} loading onRowAction={onRowAction} />);
    const skeleton = container.querySelector<HTMLElement>("tr.ol-table__skeleton");
    if (!skeleton) throw new Error("no skeleton row");
    expect(skeleton.querySelector("button")).toBeNull();
    await user.click(skeleton);
    expect(onRowAction).not.toHaveBeenCalled();
  });

  it("reaches each action button with Tab after the row's control", async () => {
    const user = userEvent.setup();
    render(<Selectable columns={footed} onRowAction={vi.fn()} />);
    box("Select Oak shelf").focus();
    await user.tab();
    expect(action("Oak shelf")).toHaveFocus();
    await user.tab();
    expect(box("Select Steel hook")).toHaveFocus();
  });

  it("warns when the action cell holds a link or button", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const linked: TableColumn<Order>[] = [
      { key: "item", label: "Item", render: (r) => <a href={`#${r.id}`}>{r.item}</a> },
    ];
    render(<Table columns={linked} rows={rows} onRowAction={vi.fn()} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("row-action cell"));
  });

  it("has no axe violations with action rows, selected and not, in both themes", async () => {
    for (const theme of ["washi", "sumi"] as const) {
      const { container, unmount } = render(
        <Root theme={theme}>
          <Table columns={footed} rows={rows} caption="Open an order" onRowAction={vi.fn()} />
          <Selectable
            columns={footed}
            caption="Select or open"
            onRowAction={vi.fn()}
            defaultSelectedKeys={["001"]}
          />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
      unmount();
    }
  });
});

describe("Table CSS", () => {
  const css = readFileSync("src/components/Table/Table.css", "utf8").replace(/\s+/g, " ");
  const hovered = ".ol-table--hover:not(.ol-table--selectable) tbody .ol-table__row:hover";
  const forced = css.slice(css.indexOf("@media (forced-colors: active)"));

  it("draws the on-ink band under the focus ring in hover-inverted rows too", () => {
    expect(css).toMatch(
      new RegExp(
        `${escape(hovered)} :focus-visible[^{]*\\{ box-shadow: 0 0 0 var\\(--focus-offset\\) var\\(--on-ink\\);`,
      ),
    );
  });

  it("keeps the ring in HighlightText in hovered rows in forced colours", () => {
    expect(forced).toMatch(
      new RegExp(
        `${escape(hovered)} :focus-visible \\{ outline-color: HighlightText; box-shadow: none;`,
      ),
    );
  });

  it("resets badges in hovered rows in forced colours", () => {
    expect(forced).toMatch(
      new RegExp(`${escape(hovered)} \\) \\.ol-badge \\{ background: Canvas;`),
    );
  });

  it("keeps the busy bar's Highlight gradient in forced colours", () => {
    expect(forced).toMatch(/\.ol-table__busy::after \{ forced-color-adjust: none;/);
  });

  it("stops the busy pulse under reduced motion and uses motion tokens only", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ \.ol-table__busy::after \{ animation: none;/,
    );
    expect(css).toContain("animation: ol-table-busy var(--motion-sweep) infinite;");
  });

  it("gives the action button a 24px target in both axes", () => {
    expect(css).toMatch(
      /\.ol-table__action \{[^}]*min-block-size: var\(--target-min\);[^}]*min-inline-size: var\(--target-min\);/,
    );
  });
});

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
