import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleContext, LocaleTagContext, makeLabels } from "../../locale";
import { runAxe } from "../../test/axe";
import { Splitter, type SplitterActions, type SplitterProps } from "./Splitter";

/** jsdom has no layout: every panel reports an equal share of a `groupPx` long space. */
function mockLayout(groupPx: number) {
  return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (!this.classList.contains("ol-splitter__panel")) return new DOMRect(0, 0, 0, 0);
    const count = this.parentElement?.querySelectorAll(":scope > .ol-splitter__panel").length ?? 1;
    const share = groupPx / count;
    return new DOMRect(0, 0, share, share);
  });
}

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing element");
  return value;
}

const handles = () => screen.getAllByRole("separator");
const handle = (index = 0) => must(handles()[index]);
const now = (el: HTMLElement) => Number(el.getAttribute("aria-valuenow"));
const sizesOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(".ol-splitter__panel"), (panel) =>
    Number(panel.style.getPropertyValue("--ol-splitter-size")),
  );

function Three(props: Partial<SplitterProps>) {
  return (
    <Splitter aria-label="Workspace" {...props}>
      <Splitter.Panel label="Files" defaultSize={25}>
        files
      </Splitter.Panel>
      <Splitter.Panel label="Editor" defaultSize={50}>
        editor
      </Splitter.Panel>
      <Splitter.Panel label="Preview">preview</Splitter.Panel>
    </Splitter>
  );
}

function Sidebar(props: Partial<SplitterProps>) {
  return (
    <Splitter {...props}>
      <Splitter.Panel label="Sidebar" defaultSize={30} min={20} collapsible>
        <button type="button">Inside</button>
      </Splitter.Panel>
      <Splitter.Panel label="Main">main</Splitter.Panel>
    </Splitter>
  );
}

beforeAll(() => {
  // jsdom has no pointer capture.
  for (const [key, value] of [
    ["setPointerCapture", () => undefined],
    ["hasPointerCapture", () => true],
    ["releasePointerCapture", () => undefined],
  ] as const) {
    Object.defineProperty(Element.prototype, key, { value, configurable: true });
  }
});

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Splitter", () => {
  it("renders the root, panels and one handle between each pair", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Splitter ref={ref} aria-label="Workspace" className="extra" data-testid="s">
        <Splitter.Panel label="Files" defaultSize={25}>
          files
        </Splitter.Panel>
        <Splitter.Panel label="Editor" defaultSize={50}>
          editor
        </Splitter.Panel>
        <Splitter.Panel label="Preview">preview</Splitter.Panel>
      </Splitter>,
    );
    const root = must(container.firstElementChild);
    expect(root).toHaveClass("ol-splitter", "ol-splitter--bordered", "extra");
    expect(root).not.toHaveClass("ol-splitter--vertical");
    expect(root).toHaveAttribute("data-testid", "s");
    expect(root).toHaveAttribute("aria-label", "Workspace");
    expect(ref.current).toBe(root);
    expect(handles()).toHaveLength(2);
    expect(Array.from(root.children, (el) => el.className)).toEqual([
      "ol-splitter__panel",
      "ol-splitter__handle",
      "ol-splitter__panel",
      "ol-splitter__handle",
      "ol-splitter__panel",
    ]);
    expect(sizesOf(container)).toEqual([25, 50, 25]);
    expect(screen.getByRole("group", { name: "Files" })).toHaveTextContent("files");
  });

  it("maps orientation, bordered and grip to classes", () => {
    const { container } = render(<Three orientation="vertical" bordered={false} grip={false} />);
    const root = must(container.firstElementChild);
    expect(root).toHaveClass("ol-splitter--vertical", "ol-splitter--gripless");
    expect(root).not.toHaveClass("ol-splitter--bordered");
    expect(root).toHaveAttribute("data-orientation", "vertical");
    expect(handle()).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("forwards panel refs, ids, classes and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Splitter>
        <Splitter.Panel
          ref={ref}
          id="side"
          label="Side"
          className="mine"
          data-x="1"
          style={{ color: "red" }}
        >
          a
        </Splitter.Panel>
        <Splitter.Panel label="Main">b</Splitter.Panel>
      </Splitter>,
    );
    const panel = must(ref.current);
    expect(panel.id).toBe("side");
    expect(panel).toHaveClass("ol-splitter__panel", "mine");
    expect(panel).toHaveAttribute("data-x", "1");
    expect(panel).toHaveAttribute("data-state", "expanded");
    expect(panel.style.color).toBe("red");
    expect(panel).not.toHaveAttribute("min");
    expect(panel).not.toHaveAttribute("collapsible");
    expect(handle()).toHaveAttribute("aria-controls", "side");
  });

  it("flattens fragments", () => {
    render(
      <Splitter>
        <>
          <Splitter.Panel label="A">a</Splitter.Panel>
          <Splitter.Panel label="B">b</Splitter.Panel>
        </>
        {null}
        <Splitter.Panel label="C">c</Splitter.Panel>
      </Splitter>,
    );
    expect(handles()).toHaveLength(2);
  });

  it("gives each handle the window-splitter semantics", () => {
    render(<Three />);
    const [first, second] = [handle(0), handle(1)];
    const panels = document.querySelectorAll(".ol-splitter__panel");
    expect(first).toHaveAttribute("tabindex", "0");
    expect(first).toHaveAttribute("aria-orientation", "vertical");
    expect(first).toHaveAttribute("aria-controls", must(panels[0]).id);
    expect(second).toHaveAttribute("aria-controls", must(panels[1]).id);
    expect(first).toHaveAccessibleName("Resize Files");
    expect(second).toHaveAccessibleName("Resize Editor");
    expect(now(first)).toBe(25);
    expect(first).toHaveAttribute("aria-valuemin", "0");
    expect(first).toHaveAttribute("aria-valuemax", "75");
    expect(first).toHaveAttribute("aria-valuetext", "25%");
    expect(first.querySelector(".ol-splitter__grip")).toHaveAttribute("aria-hidden", "true");
  });

  it("updates the limits of a handle when another handle moves", () => {
    render(<Three />);
    fireEvent.keyDown(handle(1), { key: "ArrowRight" });
    expect(now(handle(1))).toBe(51);
    expect(handle(0)).toHaveAttribute("aria-valuemax", "76");
  });

  it("formats the value text and names from the locale", () => {
    render(
      <LocaleTagContext.Provider value="es">
        <LocaleContext.Provider value={makeLabels("es")}>
          <Three />
        </LocaleContext.Provider>
      </LocaleTagContext.Provider>,
    );
    expect(handle()).toHaveAccessibleName("Cambiar tamaño de Files");
    expect(handle()).toHaveAttribute(
      "aria-valuetext",
      new Intl.NumberFormat("es", { style: "percent" }).format(0.25),
    );
  });

  it("names handles in Japanese", () => {
    render(
      <LocaleContext.Provider value={makeLabels("ja")}>
        <Sidebar defaultSizes={[0, 100]} />
      </LocaleContext.Provider>,
    );
    expect(handle()).toHaveAccessibleName("Sidebarのサイズを変更");
    expect(handle()).toHaveAttribute("aria-valuetext", "折りたたみ済み");
  });

  it("lets handleLabel replace the name, and warns about unnamed panels", () => {
    render(
      <Splitter>
        <Splitter.Panel handleLabel="Drag to resize the list">a</Splitter.Panel>
        <Splitter.Panel>b</Splitter.Panel>
        <Splitter.Panel>c</Splitter.Panel>
      </Splitter>,
    );
    expect(handle(0)).toHaveAccessibleName("Drag to resize the list");
    expect(handle(1)).toHaveAccessibleName("Resize");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("give each panel a label"));
  });

  it("warns when a Panel is used outside a Splitter and renders nothing", () => {
    const { container } = render(<Splitter.Panel label="Lost">x</Splitter.Panel>);
    expect(container).toBeEmptyDOMElement();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("direct child of Splitter"));
  });

  it("warns with fewer than two panels", () => {
    render(
      <Splitter>
        <Splitter.Panel label="Only">x</Splitter.Panel>
      </Splitter>,
    );
    expect(screen.queryByRole("separator")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("at least two"));
  });

  it("shares space equally without defaults", () => {
    const { container } = render(
      <Splitter>
        <Splitter.Panel label="A">a</Splitter.Panel>
        <Splitter.Panel label="B">b</Splitter.Panel>
        <Splitter.Panel label="C">c</Splitter.Panel>
        <Splitter.Panel label="D">d</Splitter.Panel>
      </Splitter>,
    );
    expect(sizesOf(container)).toEqual([25, 25, 25, 25]);
  });
});

describe("Splitter keyboard", () => {
  it("moves the boundary by step with arrows, by largeStep with Shift and Page keys", () => {
    const onSizesChange = vi.fn();
    const onSizesCommit = vi.fn();
    const { container } = render(
      <Three onSizesChange={onSizesChange} onSizesCommit={onSizesCommit} />,
    );
    const h = handle();
    fireEvent.keyDown(h, { key: "ArrowRight" });
    expect(sizesOf(container)).toEqual([26, 49, 25]);
    fireEvent.keyDown(h, { key: "ArrowLeft" });
    fireEvent.keyDown(h, { key: "ArrowLeft" });
    expect(now(h)).toBe(24);
    fireEvent.keyDown(h, { key: "ArrowRight", shiftKey: true });
    expect(now(h)).toBe(34);
    fireEvent.keyDown(h, { key: "PageUp" });
    expect(now(h)).toBe(44);
    fireEvent.keyDown(h, { key: "PageDown" });
    expect(now(h)).toBe(34);
    expect(onSizesChange).toHaveBeenCalledTimes(6);
    expect(onSizesCommit).toHaveBeenCalledTimes(6);
    expect(onSizesCommit).toHaveBeenLastCalledWith([34, 41, 25]);
  });

  it("uses custom steps", () => {
    render(<Three step={5} largeStep={20} />);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(now(handle())).toBe(30);
    fireEvent.keyDown(handle(), { key: "PageUp" });
    expect(now(handle())).toBe(50);
  });

  it("Home and End go to the limits of the pair; only the neighbours change", () => {
    const { container } = render(<Three />);
    fireEvent.keyDown(handle(), { key: "End" });
    expect(sizesOf(container)).toEqual([75, 0, 25]);
    fireEvent.keyDown(handle(), { key: "Home" });
    expect(sizesOf(container)).toEqual([0, 75, 25]);
  });

  it("clamps at percent min and max and stops there", () => {
    const onSizesCommit = vi.fn();
    const { container } = render(
      <Splitter onSizesCommit={onSizesCommit}>
        <Splitter.Panel label="A" defaultSize={30} min={20} max={40}>
          a
        </Splitter.Panel>
        <Splitter.Panel label="B">b</Splitter.Panel>
      </Splitter>,
    );
    expect(handle()).toHaveAttribute("aria-valuemin", "20");
    expect(handle()).toHaveAttribute("aria-valuemax", "40");
    fireEvent.keyDown(handle(), { key: "PageUp" });
    fireEvent.keyDown(handle(), { key: "PageUp" });
    expect(sizesOf(container)).toEqual([40, 60]);
    expect(onSizesCommit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(handle(), { key: "Home" });
    expect(sizesOf(container)).toEqual([20, 80]);
  });

  it("converts pixel limits with the measured size", () => {
    mockLayout(1000);
    render(
      <Splitter>
        <Splitter.Panel label="Side" defaultSize={30} min="240px" max="400px">
          a
        </Splitter.Panel>
        <Splitter.Panel label="Main">b</Splitter.Panel>
      </Splitter>,
    );
    expect(handle()).toHaveAttribute("aria-valuemin", "24");
    expect(handle()).toHaveAttribute("aria-valuemax", "40");
    fireEvent.keyDown(handle(), { key: "Home" });
    expect(now(handle())).toBe(24);
  });

  it("pulls the layout into pixel limits once measured, reporting the change", () => {
    mockLayout(1000);
    const onSizesChange = vi.fn();
    render(
      <Splitter sizes={[10, 90]} onSizesChange={onSizesChange}>
        <Splitter.Panel label="Side" min="200px">
          a
        </Splitter.Panel>
        <Splitter.Panel label="Main">b</Splitter.Panel>
      </Splitter>,
    );
    expect(onSizesChange).toHaveBeenCalledWith([20, 80]);
  });

  it("ignores keys across the axis without preventing them", () => {
    render(<Three />);
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    });
    handle().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    fireEvent.keyDown(handle(), { key: "ArrowUp" });
    fireEvent.keyDown(handle(), { key: "x" });
    fireEvent.keyDown(handle(), { key: "ArrowRight", ctrlKey: true });
    expect(now(handle())).toBe(25);
  });

  it("uses Up and Down in a vertical layout", () => {
    render(<Three orientation="vertical" />);
    fireEvent.keyDown(handle(), { key: "ArrowDown" });
    expect(now(handle())).toBe(26);
    fireEvent.keyDown(handle(), { key: "ArrowUp", shiftKey: true });
    expect(now(handle())).toBe(16);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(now(handle())).toBe(16);
  });

  it("flips Left and Right in right-to-left text", () => {
    render(
      <div dir="rtl">
        <Three />
      </div>,
    );
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(now(handle())).toBe(26);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(now(handle())).toBe(24);
  });

  it("Tab moves between handles in DOM order", async () => {
    const user = userEvent.setup();
    render(<Three />);
    await user.tab();
    expect(handle(0)).toHaveFocus();
    await user.tab();
    expect(handle(1)).toHaveFocus();
    await user.tab({ shift: true });
    expect(handle(0)).toHaveFocus();
  });
});

describe("Splitter collapse", () => {
  it("Enter collapses the primary panel and restores its previous size", () => {
    const onSizesCommit = vi.fn();
    const { container } = render(<Sidebar onSizesCommit={onSizesCommit} />);
    const panel = must(container.querySelector<HTMLElement>(".ol-splitter__panel"));
    fireEvent.keyDown(handle(), { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(sizesOf(container)).toEqual([0, 100]);
    expect(handle()).toHaveAttribute("aria-valuetext", "Collapsed");
    expect(handle()).toHaveAttribute("aria-valuemin", "0");
    expect(panel).toHaveAttribute("inert");
    expect(panel).toHaveClass("ol-splitter__panel--collapsed");
    expect(panel).toHaveAttribute("data-state", "collapsed");
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(sizesOf(container)).toEqual([40, 60]);
    expect(panel).not.toHaveAttribute("inert");
    expect(onSizesCommit).toHaveBeenCalledTimes(3);
  });

  it("Enter toggles the next panel when only it is collapsible, otherwise does nothing", () => {
    const { container } = render(
      <Splitter>
        <Splitter.Panel label="Main">a</Splitter.Panel>
        <Splitter.Panel label="Console" collapsible>
          b
        </Splitter.Panel>
      </Splitter>,
    );
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(sizesOf(container)).toEqual([100, 0]);
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(sizesOf(container)).toEqual([50, 50]);

    const other = render(<Three />);
    fireEvent.keyDown(must(other.getAllByRole("separator")[0]), { key: "Enter" });
    expect(sizesOf(other.container)).toEqual([25, 50, 25]);
  });

  it("an arrow stops at min, the next one collapses, and one back jumps to min", () => {
    const { container } = render(<Sidebar defaultSizes={[21, 79]} />);
    fireEvent.keyDown(handle(), { key: "ArrowLeft", shiftKey: true });
    expect(sizesOf(container)).toEqual([20, 80]);
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(sizesOf(container)).toEqual([0, 100]);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(sizesOf(container)).toEqual([20, 80]);
    fireEvent.keyDown(handle(), { key: "Home" });
    expect(sizesOf(container)).toEqual([0, 100]);
  });

  it("double-click toggles a collapsible primary panel", async () => {
    const user = userEvent.setup();
    const onSizesCommit = vi.fn();
    const { container } = render(<Sidebar onSizesCommit={onSizesCommit} />);
    await user.dblClick(handle());
    expect(sizesOf(container)).toEqual([0, 100]);
    await user.dblClick(handle());
    expect(sizesOf(container)).toEqual([30, 70]);
    expect(onSizesCommit).toHaveBeenLastCalledWith([30, 70]);
  });

  it("double-click resets the two neighbours to their default share", () => {
    const { container } = render(<Three />);
    fireEvent.keyDown(handle(0), { key: "End" });
    fireEvent.keyDown(handle(1), { key: "ArrowRight" });
    expect(sizesOf(container)).toEqual([75, 1, 24]);
    fireEvent.doubleClick(handle(0));
    expect(sizesOf(container)).toEqual([25.333, 50.667, 24]);
  });

  it("actionRef collapses, expands, toggles, sets sizes and resets", () => {
    const actions = createRef<SplitterActions>();
    const onSizesCommit = vi.fn();
    const { container } = render(<Sidebar actionRef={actions} onSizesCommit={onSizesCommit} />);
    const api = must(actions.current);
    act(() => {
      api.collapse(0);
    });
    expect(sizesOf(container)).toEqual([0, 100]);
    act(() => {
      api.expand(0);
    });
    expect(sizesOf(container)).toEqual([30, 70]);
    act(() => {
      api.expand(0);
      api.collapse(1);
    });
    expect(sizesOf(container)).toEqual([30, 70]);
    act(() => {
      api.toggle(0);
    });
    expect(sizesOf(container)).toEqual([0, 100]);
    act(() => {
      api.setSizes([45, 55]);
    });
    expect(sizesOf(container)).toEqual([45, 55]);
    act(() => {
      api.setSizes([1, 2, 3]);
    });
    expect(sizesOf(container)).toEqual([30, 70]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("setSizes needs"));
    act(() => {
      api.setSizes([10, 90]);
    });
    expect(sizesOf(container)).toEqual([20, 80]);
    act(() => {
      api.reset();
    });
    expect(sizesOf(container)).toEqual([30, 70]);
    expect(onSizesCommit).toHaveBeenCalledTimes(7);
  });

  it("moves focus to the handle when the focused panel collapses", () => {
    const actions = createRef<SplitterActions>();
    render(<Sidebar actionRef={actions} />);
    const inside = screen.getByRole("button", { name: "Inside" });
    inside.focus();
    act(() => {
      must(actions.current).collapse(0);
    });
    expect(handle()).toHaveFocus();
  });

  it("restores the size from before the collapse on expand", () => {
    const actions = createRef<SplitterActions>();
    const { container } = render(<Sidebar actionRef={actions} />);
    fireEvent.keyDown(handle(), { key: "PageUp" });
    act(() => {
      must(actions.current).toggle(0);
    });
    act(() => {
      must(actions.current).toggle(0);
    });
    expect(sizesOf(container)).toEqual([40, 60]);
  });
});

describe("Splitter pointer", () => {
  it("drags the boundary, reports live changes and commits on release", () => {
    mockLayout(1000);
    const onSizesChange = vi.fn();
    const onSizesCommit = vi.fn();
    const { container } = render(
      <Three onSizesChange={onSizesChange} onSizesCommit={onSizesCommit} />,
    );
    const h = handle();
    const root = must(container.firstElementChild);
    fireEvent.pointerDown(h, { pointerId: 1, button: 0, clientX: 250 });
    expect(h).toHaveFocus();
    expect(h).toHaveAttribute("data-dragging");
    expect(root).toHaveAttribute("data-dragging");
    fireEvent.pointerMove(h, { pointerId: 1, clientX: 350 });
    expect(sizesOf(container)).toEqual([35, 40, 25]);
    fireEvent.pointerMove(h, { pointerId: 2, clientX: 900 });
    fireEvent.pointerMove(h, { pointerId: 1, clientX: 400 });
    expect(sizesOf(container)).toEqual([40, 35, 25]);
    expect(onSizesCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(h, { pointerId: 1, clientX: 400 });
    expect(onSizesCommit).toHaveBeenCalledTimes(1);
    expect(onSizesCommit).toHaveBeenCalledWith([40, 35, 25]);
    expect(onSizesChange).toHaveBeenCalledTimes(2);
    expect(h).not.toHaveAttribute("data-dragging");
    expect(root).not.toHaveAttribute("data-dragging");
    fireEvent.pointerMove(h, { pointerId: 1, clientX: 600 });
    expect(sizesOf(container)).toEqual([40, 35, 25]);
  });

  it("ignores other buttons and a release without movement commits nothing", () => {
    mockLayout(1000);
    const onSizesCommit = vi.fn();
    render(<Three onSizesCommit={onSizesCommit} />);
    fireEvent.pointerDown(handle(), { pointerId: 1, button: 2, clientX: 250 });
    expect(handle()).not.toHaveAttribute("data-dragging");
    fireEvent.pointerDown(handle(), { pointerId: 1, button: 0, clientX: 250 });
    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: 250 });
    expect(onSizesCommit).not.toHaveBeenCalled();
  });

  it("follows the pointer in a vertical layout and in right-to-left text", () => {
    mockLayout(1000);
    const vertical = render(<Three orientation="vertical" />);
    const v = must(vertical.getAllByRole("separator")[0]);
    fireEvent.pointerDown(v, { pointerId: 1, button: 0, clientY: 250 });
    fireEvent.pointerMove(v, { pointerId: 1, clientY: 300 });
    fireEvent.pointerUp(v, { pointerId: 1 });
    expect(now(v)).toBe(30);
    vertical.unmount();

    render(
      <div dir="rtl">
        <Three />
      </div>,
    );
    fireEvent.pointerDown(handle(), { pointerId: 1, button: 0, clientX: 750 });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 650 });
    expect(now(handle())).toBe(35);
  });

  it("snaps a collapsible panel closed past halfway to min", () => {
    mockLayout(1000);
    const { container } = render(<Sidebar />);
    fireEvent.pointerDown(handle(), { pointerId: 1, button: 0, clientX: 300 });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 150 });
    expect(sizesOf(container)).toEqual([20, 80]);
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 90 });
    expect(sizesOf(container)).toEqual([0, 100]);
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(handle()).toHaveAttribute("aria-valuetext", "Collapsed");
  });

  it("Escape during a drag restores the layout from before it", () => {
    mockLayout(1000);
    const onSizesChange = vi.fn();
    const onSizesCommit = vi.fn();
    const { container } = render(
      <Three onSizesChange={onSizesChange} onSizesCommit={onSizesCommit} />,
    );
    fireEvent.pointerDown(handle(), { pointerId: 1, button: 0, clientX: 250 });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 450 });
    expect(sizesOf(container)).toEqual([45, 30, 25]);
    fireEvent.keyDown(handle(), { key: "Escape" });
    expect(sizesOf(container)).toEqual([25, 50, 25]);
    expect(handle()).not.toHaveAttribute("data-dragging");
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(onSizesCommit).not.toHaveBeenCalled();
    expect(onSizesChange).toHaveBeenLastCalledWith([25, 50, 25]);
  });

  it("Escape without a drag does nothing", () => {
    render(<Three />);
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    handle().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("pointercancel restores the layout", () => {
    mockLayout(1000);
    const { container } = render(<Three />);
    fireEvent.pointerDown(handle(), { pointerId: 1, button: 0, clientX: 250 });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 300 });
    fireEvent.pointerCancel(handle(), { pointerId: 2 });
    expect(sizesOf(container)).toEqual([30, 45, 25]);
    fireEvent.pointerCancel(handle(), { pointerId: 1 });
    expect(sizesOf(container)).toEqual([25, 50, 25]);
  });
});

describe("Splitter state", () => {
  it("follows controlled sizes and reports requested changes", () => {
    const onSizesChange = vi.fn();
    const { container, rerender } = render(
      <Three sizes={[20, 30, 50]} onSizesChange={onSizesChange} />,
    );
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(onSizesChange).toHaveBeenCalledWith([21, 29, 50]);
    expect(sizesOf(container)).toEqual([20, 30, 50]);
    rerender(<Three sizes={[60, 20, 20]} onSizesChange={onSizesChange} />);
    expect(sizesOf(container)).toEqual([60, 20, 20]);
  });

  it("works with a parent that stores the sizes", () => {
    function Saved() {
      const [sizes, setSizes] = useState([50, 50]);
      return (
        <>
          <Sidebar sizes={sizes} onSizesChange={setSizes} />
          <output>{sizes.join(" ")}</output>
        </>
      );
    }
    render(<Saved />);
    fireEvent.keyDown(handle(), { key: "PageDown" });
    expect(screen.getByRole("status")).toHaveTextContent("40 60");
  });

  it("starts from defaultSizes over panel defaults", () => {
    const { container } = render(<Three defaultSizes={[10, 10, 80]} />);
    expect(sizesOf(container)).toEqual([10, 10, 80]);
  });

  it("normalises wrong sizes with a warning", () => {
    const { container, rerender } = render(<Three sizes={[1, 1, 2]} />);
    expect(sizesOf(container)).toEqual([25, 25, 50]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("summing to 100"));
    rerender(<Three sizes={[50, 50]} />);
    expect(sizesOf(container)).toEqual([25, 50, 25]);
    rerender(<Three defaultSizes={[50, 50]} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("defaultSizes needs"));
  });

  it("resets the layout when the number of panels changes", () => {
    const layout = (extra: boolean) => (
      <Splitter>
        <Splitter.Panel label="A">a</Splitter.Panel>
        <Splitter.Panel label="B">b</Splitter.Panel>
        {extra && <Splitter.Panel label="C">c</Splitter.Panel>}
      </Splitter>
    );
    const { container, rerender } = render(layout(true));
    fireEvent.keyDown(handle(), { key: "PageUp" });
    rerender(layout(false));
    expect(sizesOf(container)).toEqual([50, 50]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("number of panels changed"));
  });

  it("disabled handles are static separators", () => {
    const onSizesChange = vi.fn();
    const { container } = render(<Three disabled onSizesChange={onSizesChange} />);
    const h = handle();
    expect(must(container.firstElementChild)).toHaveAttribute("data-disabled");
    expect(h).not.toHaveAttribute("tabindex");
    expect(h).not.toHaveAttribute("aria-valuenow");
    expect(h).toHaveAttribute("aria-orientation", "vertical");
    fireEvent.keyDown(h, { key: "ArrowRight" });
    fireEvent.pointerDown(h, { pointerId: 1, button: 0, clientX: 0 });
    fireEvent.doubleClick(h);
    expect(onSizesChange).not.toHaveBeenCalled();
  });

  it("nests splitters, each with its own handles", () => {
    render(
      <Splitter aria-label="Outer">
        <Splitter.Panel label="Tree">tree</Splitter.Panel>
        <Splitter.Panel label="Work">
          <Splitter orientation="vertical" bordered={false}>
            <Splitter.Panel label="Editor">e</Splitter.Panel>
            <Splitter.Panel label="Console">c</Splitter.Panel>
          </Splitter>
        </Splitter.Panel>
      </Splitter>,
    );
    expect(handles()).toHaveLength(2);
    const inner = screen.getByRole("separator", { name: "Resize Editor" });
    expect(inner).toHaveAttribute("aria-orientation", "horizontal");
    fireEvent.keyDown(inner, { key: "ArrowDown" });
    expect(now(inner)).toBe(51);
    expect(now(screen.getByRole("separator", { name: "Resize Tree" }))).toBe(50);
  });

  it("keeps measuring through a ResizeObserver", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    let notify: () => void = () => undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const spy = mockLayout(1000);
    const { unmount } = render(
      <Splitter>
        <Splitter.Panel label="Side" min="300px">
          a
        </Splitter.Panel>
        <Splitter.Panel label="Main">b</Splitter.Panel>
      </Splitter>,
    );
    expect(observe).toHaveBeenCalled();
    expect(handle()).toHaveAttribute("aria-valuemin", "30");
    spy.mockRestore();
    mockLayout(600);
    act(() => {
      notify();
    });
    expect(handle()).toHaveAttribute("aria-valuemin", "50");
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("Splitter styles", () => {
  it("draws with tokens only", () => {
    const css = readFileSync("src/components/Splitter/Splitter.css", "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    expect(css).not.toMatch(/\d+px/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/transition|animation/);
  });
});

describe("Splitter accessibility", () => {
  it("has no axe violations side by side, stacked, collapsed and disabled", async () => {
    const { container } = render(
      <>
        <Three />
        <Three orientation="vertical" grip={false} />
        <Sidebar defaultSizes={[0, 100]} />
        <Three disabled />
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("Splitter round 2", () => {
  it("names the root as a group only when it has a name", () => {
    const { container, rerender } = render(<Three />);
    expect(screen.getByRole("group", { name: "Workspace" })).toBe(container.firstElementChild);
    rerender(
      <Splitter>
        <Splitter.Panel label="A">a</Splitter.Panel>
        <Splitter.Panel label="B">b</Splitter.Panel>
      </Splitter>,
    );
    expect(container.firstElementChild).not.toHaveAttribute("role");
    rerender(
      <>
        <h2 id="layout-title">Layout</h2>
        <Splitter aria-labelledby="layout-title">
          <Splitter.Panel label="A">a</Splitter.Panel>
          <Splitter.Panel label="B">b</Splitter.Panel>
        </Splitter>
      </>,
    );
    expect(screen.getByRole("group", { name: "Layout" })).toHaveClass("ol-splitter");
  });

  it("marks the handle of an outer panel collapsed to nothing as an edge", () => {
    const { rerender } = render(<Sidebar />);
    expect(handle()).not.toHaveAttribute("data-edge");
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(handle()).toHaveAttribute("data-edge", "start");
    handle().focus();
    expect(handle()).toHaveFocus();
    expect(handle()).toHaveAttribute("data-edge", "start");
    rerender(
      <Splitter defaultSizes={[100, 0]}>
        <Splitter.Panel label="Main">a</Splitter.Panel>
        <Splitter.Panel label="Inspector" collapsible>
          b
        </Splitter.Panel>
      </Splitter>,
    );
    expect(handle()).toHaveAttribute("data-edge", "end");
  });

  it("keeps the edge off a collapsed panel that still has a size, and off inner panels", () => {
    render(
      <Splitter defaultSizes={[5, 0, 95]}>
        <Splitter.Panel label="A" collapsible collapsedSize={5} min={20}>
          a
        </Splitter.Panel>
        <Splitter.Panel label="B" collapsible>
          b
        </Splitter.Panel>
        <Splitter.Panel label="C">c</Splitter.Panel>
      </Splitter>,
    );
    expect(handle(0)).toHaveAttribute("aria-valuetext", "Collapsed");
    expect(handle(0)).not.toHaveAttribute("data-edge");
    expect(handle(1)).not.toHaveAttribute("data-edge");
  });

  it("marks edges on disabled handles too", () => {
    render(<Sidebar disabled defaultSizes={[0, 100]} />);
    expect(handle()).toHaveAttribute("data-edge", "start");
  });

  it("moves focus to the handle when setSizes collapses the focused panel", () => {
    const actions = createRef<SplitterActions>();
    render(<Sidebar actionRef={actions} />);
    screen.getByRole("button", { name: "Inside" }).focus();
    act(() => {
      must(actions.current).setSizes([0, 100]);
    });
    expect(handle()).toHaveFocus();
    expect(document.querySelector(".ol-splitter__panel")).toHaveAttribute("inert");
  });

  it("moves focus to the handle when controlled sizes collapse the focused panel", () => {
    const { rerender } = render(<Sidebar sizes={[30, 70]} />);
    screen.getByRole("button", { name: "Inside" }).focus();
    rerender(<Sidebar sizes={[0, 100]} />);
    expect(handle()).toHaveFocus();
  });

  it("does not flip Up and Down in a vertical right-to-left layout", () => {
    render(
      <div dir="rtl">
        <Three orientation="vertical" />
      </div>,
    );
    fireEvent.keyDown(handle(), { key: "ArrowDown" });
    expect(now(handle())).toBe(26);
    fireEvent.keyDown(handle(), { key: "ArrowUp" });
    fireEvent.keyDown(handle(), { key: "ArrowUp" });
    expect(now(handle())).toBe(24);
  });

  it("says collapsed in Spanish", () => {
    render(
      <LocaleContext.Provider value={makeLabels("es")}>
        <Sidebar defaultSizes={[0, 100]} />
      </LocaleContext.Provider>,
    );
    expect(handle()).toHaveAttribute("aria-valuetext", "Contraído");
  });

  it("has no axe violations with a focused handle and during a drag", async () => {
    mockLayout(1000);
    const { container } = render(<Sidebar aria-label="Layout" />);
    handle().focus();
    expect(await runAxe(container)).toHaveNoViolations();
    fireEvent.pointerDown(handle(), { pointerId: 1, button: 0, clientX: 300 });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 90 });
    expect(handle()).toHaveAttribute("data-dragging");
    expect(await runAxe(container)).toHaveNoViolations();
    fireEvent.pointerUp(handle(), { pointerId: 1 });
  });
});
