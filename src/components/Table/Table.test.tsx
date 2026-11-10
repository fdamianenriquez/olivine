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
