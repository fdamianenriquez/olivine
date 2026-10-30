import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, forwardRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Tabs } from "./Tabs";

const Demo = forwardRef<HTMLDivElement, Partial<React.ComponentProps<typeof Tabs>>>(
  function Demo(props, ref) {
    return (
      <Tabs label="Sections" ref={ref} {...props}>
        <Tabs.Tab label="One">Panel one</Tabs.Tab>
        <Tabs.Tab label="Two">Panel two</Tabs.Tab>
        <Tabs.Tab label="Three" disabled>
          Panel three
        </Tabs.Tab>
        <Tabs.Tab label="Four">
          <button type="button">Inside</button>
        </Tabs.Tab>
      </Tabs>
    );
  },
);

function Bare(props: Omit<React.ComponentProps<typeof Tabs>, "children">) {
  return (
    <Tabs {...props}>
      <Tabs.Tab label="One">a</Tabs.Tab>
    </Tabs>
  );
}

/** Marks an element inert through the DOM (React 18 types have no `inert` prop). */
function markInert(node: HTMLDivElement | null) {
  node?.setAttribute("inert", "");
}

describe("Tabs", () => {
  it("renders root class, className, native props and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Demo className="extra" data-x="1" ref={ref} />);
    expect(ref.current).toHaveClass("ol-tabs", "extra");
    expect(ref.current).toHaveAttribute("data-x", "1");
  });

  it("maps fill and indexed", () => {
    const { container } = render(<Demo fill indexed />);
    expect(container.firstChild).toHaveClass("ol-tabs--fill");
    expect(screen.getByRole("tab", { name: /Two/ })).toHaveTextContent("02");
  });

  it("wires aria and the roving tabindex", () => {
    render(<Demo />);
    const list = screen.getByRole("tablist", { name: "Sections" });
    expect(list).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("data-state", "active");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", tabs[0]?.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveAttribute("aria-labelledby", tabs[0]?.id ?? "");
    expect(panel).toHaveTextContent("Panel one");
  });

  it("switches on click (uncontrolled) and calls onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "Two" }));
    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
  });

  it("honours defaultValue", () => {
    render(<Demo defaultValue={1} />);
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
  });

  it("is controlled when value is given", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState(1);
      return <Demo value={v} onChange={setV} />;
    }
    render(<Controlled />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
    await user.click(screen.getByRole("tab", { name: "One" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
  });

  it("stays on the given value when nothing updates it", async () => {
    const user = userEvent.setup();
    render(<Demo value={0} />);
    await user.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves with arrows, wraps, skips disabled and activates on focus", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    screen.getByRole("tab", { name: "One" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
  });

  it("leaves Ctrl, Alt and Meta arrow combinations to the browser", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    screen.getByRole("tab", { name: "One" }).focus();
    for (const mod of ["Control", "Alt", "Meta"]) {
      await user.keyboard(`{${mod}>}{ArrowRight}{/${mod}}`);
    }
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
  });

  it("jumps with Home and End", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    screen.getByRole("tab", { name: "One" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
  });

  it("makes a panel a tab stop only when it has no focusable content", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "0");
    await user.click(screen.getByRole("tab", { name: "Four" }));
    expect(screen.getByRole("tabpanel")).not.toHaveAttribute("tabindex");
  });

  it("has no axe violations by default and after switching", async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo indexed />);
    expect(await runAxe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("tab", { name: /Four/ }));
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("names the tablist from label, aria-label or aria-labelledby", () => {
    const { rerender, container } = render(<Demo label="A" />);
    expect(screen.getByRole("tablist", { name: "A" })).toBeInTheDocument();
    rerender(<Bare aria-label="B" />);
    expect(screen.getByRole("tablist", { name: "B" })).toBeInTheDocument();
    expect(container.firstChild).not.toHaveAttribute("aria-label");
    rerender(
      <>
        <span id="lbl">C</span>
        <Bare aria-labelledby="lbl" />
      </>,
    );
    expect(screen.getByRole("tablist", { name: "C" })).toBeInTheDocument();
  });

  it("flips arrows in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Demo />
      </div>,
    );
    screen.getByRole("tab", { name: "One" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
  });

  it("ignores clicks on a disabled tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "Three" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("falls back to the first enabled tab stop when value is disabled", () => {
    render(<Demo value={2} />);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("tabindex", "-1");
  });

  it("skips a disabled first or last tab on Home and End", async () => {
    const user = userEvent.setup();
    render(
      <Tabs label="x">
        <Tabs.Tab label="A" disabled />
        <Tabs.Tab label="B">b</Tabs.Tab>
        <Tabs.Tab label="C">c</Tabs.Tab>
        <Tabs.Tab label="D" disabled />
      </Tabs>,
    );
    screen.getByRole("tab", { name: "B" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "C" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "B" })).toHaveFocus();
  });

  it("has no axe violations with fill and a disabled tab", async () => {
    const { container } = render(<Demo fill indexed />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

/** Ten 100px tabs in a 200px list; `scrollLeft` is read from `scroll.left`. */
const css = readFileSync("src/components/Tabs/Tabs.css", "utf8");

function find(root: Element, selector: string): Element {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el;
}

function stubOverflow({ client = 200, total = 1000 } = {}) {
  const scroll = { left: 0 };
  const scrollBy = vi.fn();
  const isList = (el: Element) => el.classList.contains("ol-tabs__list");
  vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (this: Element) {
    return isList(this) ? client : 0;
  });
  vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (this: Element) {
    return isList(this) ? total : 0;
  });
  vi.spyOn(Element.prototype, "scrollLeft", "get").mockImplementation(function (this: Element) {
    return isList(this) ? scroll.left : 0;
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const index = (this as HTMLElement).dataset.index;
    const [left, width] = isList(this)
      ? [0, client]
      : index !== undefined
        ? [Number(index) * 100 - scroll.left, 100]
        : [0, 0];
    return {
      left,
      right: left + width,
      width,
      top: 0,
      bottom: 44,
      height: 44,
      x: left,
      y: 0,
      toJSON: () => ({}),
    };
  });
  Object.defineProperty(Element.prototype, "scrollBy", {
    configurable: true,
    writable: true,
    value: scrollBy,
  });
  return { scroll, scrollBy };
}

function Many(props: Partial<React.ComponentProps<typeof Tabs>>) {
  return (
    <Tabs label="Many" {...props}>
      {Array.from({ length: 10 }, (_, i) => (
        <Tabs.Tab key={i} label={`Tab ${String(i + 1)}`}>
          Panel {i + 1}
        </Tabs.Tab>
      ))}
    </Tabs>
  );
}

describe("Tabs audit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (Element.prototype as Partial<Element>).scrollBy;
  });

  describe("F1 scroll buttons", () => {
    it("renders no scroll buttons when the list fits", () => {
      const { container } = render(<Many />);
      expect(container.querySelector(".ol-tabs__scroll")).toBeNull();
      expect(container.querySelector(".ol-tabs__bar")).toContainElement(
        screen.getByRole("tablist"),
      );
    });

    it("shows pointer-only buttons on overflow, disabled at the ends", () => {
      const { scroll } = stubOverflow();
      const { container } = render(<Many />);
      const [start, end] = Array.from(
        container.querySelectorAll<HTMLButtonElement>(".ol-tabs__scroll"),
      );
      expect(start).toHaveClass("ol-tabs__scroll--start");
      for (const button of [start, end]) {
        expect(button).toHaveAttribute("aria-hidden", "true");
        expect(button).toHaveAttribute("tabindex", "-1");
        expect(button).toHaveAttribute("type", "button");
      }
      expect(start).toBeDisabled();
      expect(end).toBeEnabled();
      // Not in the accessibility tree: only the tabs are reachable.
      expect(screen.queryAllByRole("button")).toHaveLength(0);

      const list = screen.getByRole("tablist");
      scroll.left = 400;
      fireEvent.scroll(list);
      expect(start).toBeEnabled();
      expect(end).toBeEnabled();
      scroll.left = 800;
      fireEvent.scroll(list);
      expect(start).toBeEnabled();
      expect(end).toBeDisabled();
    });

    it("scrolls by three quarters of the list, mirrored in RTL", async () => {
      const user = userEvent.setup();
      const { scroll, scrollBy } = stubOverflow();
      scroll.left = 400;
      const { container, unmount } = render(<Many />);
      fireEvent.scroll(screen.getByRole("tablist"));
      scrollBy.mockClear();
      await user.click(find(container, ".ol-tabs__scroll--end"));
      expect(scrollBy).toHaveBeenLastCalledWith({ left: 150 });
      await user.click(find(container, ".ol-tabs__scroll--start"));
      expect(scrollBy).toHaveBeenLastCalledWith({ left: -150 });
      unmount();

      scroll.left = -400;
      const rtl = render(
        <div dir="rtl" style={{ direction: "rtl" }}>
          <Many />
        </div>,
      );
      fireEvent.scroll(screen.getByRole("tablist"));
      scrollBy.mockClear();
      const end = find(rtl.container, ".ol-tabs__scroll--end");
      expect(end).toHaveTextContent("‹");
      await user.click(end);
      expect(scrollBy).toHaveBeenLastCalledWith({ left: -150 });
    });

    it("has no axe violations while overflowing", async () => {
      stubOverflow();
      const { container } = render(<Many />);
      expect(container.querySelector(".ol-tabs__scroll")).not.toBeNull();
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("F2 selected tab into view", () => {
    it("scrolls the list to a selected tab off-screen on mount", () => {
      const { scrollBy } = stubOverflow();
      render(<Many defaultValue={4} />);
      // Tab 5 spans 400–500 in a 200px list.
      expect(scrollBy).toHaveBeenCalledWith({ left: 300 });
    });

    it("scrolls on a controlled change, and not for a visible tab", () => {
      const { scrollBy } = stubOverflow();
      const { rerender } = render(<Many value={1} />);
      expect(scrollBy).not.toHaveBeenCalled();
      rerender(<Many value={7} />);
      expect(scrollBy).toHaveBeenLastCalledWith({ left: 600 });
    });

    it("scrolls back toward the start for a tab before the visible area", () => {
      const { scroll, scrollBy } = stubOverflow();
      scroll.left = 600;
      render(<Many defaultValue={2} />);
      expect(scrollBy).toHaveBeenCalledWith({ left: -400 });
    });
  });

  describe("F3 effective selection", () => {
    it("shows the first enabled tab when the value is disabled, without onChange", () => {
      const onChange = vi.fn();
      render(<Demo value={2} onChange={onChange} />);
      expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("shows the first enabled tab when the value is out of range", () => {
      render(<Demo defaultValue={9} />);
      expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
    });

    it("skips a disabled first tab", () => {
      render(
        <Tabs label="x" value={0}>
          <Tabs.Tab label="A" disabled>
            a
          </Tabs.Tab>
          <Tabs.Tab label="B">b</Tabs.Tab>
        </Tabs>,
      );
      expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel")).toHaveTextContent("b");
    });

    it("selects nothing when every tab is disabled", () => {
      render(
        <Tabs label="x">
          <Tabs.Tab label="A" disabled>
            a
          </Tabs.Tab>
          <Tabs.Tab label="B" disabled>
            b
          </Tabs.Tab>
        </Tabs>,
      );
      for (const tab of screen.getAllByRole("tab")) {
        expect(tab).toHaveAttribute("aria-selected", "false");
      }
      expect(screen.queryByRole("tabpanel")).toBeNull();
    });
  });

  describe("F4 manual activation", () => {
    it("moves focus with arrows without selecting; Enter and Space select", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Demo activation="manual" onChange={onChange} />);
      screen.getByRole("tab", { name: "One" }).focus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
      expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
      expect(onChange).not.toHaveBeenCalled();
      await user.keyboard("{Enter}");
      expect(onChange).toHaveBeenLastCalledWith(1);
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
      await user.keyboard("{End}");
      expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
      await user.keyboard(" ");
      expect(onChange).toHaveBeenLastCalledWith(3);
    });

    it("returns the tab stop to the selected tab when focus leaves", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Demo activation="manual" />
          <button type="button">After</button>
        </>,
      );
      screen.getByRole("tab", { name: "One" }).focus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("tabindex", "0");
      act(() => {
        screen.getByRole("button", { name: "After" }).focus();
      });
      expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("tabindex", "0");
      expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("tabindex", "-1");
    });

    it("has no axe violations in manual mode", async () => {
      const { container } = render(<Demo activation="manual" />);
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("F5 vertical orientation", () => {
    it("sets aria-orientation, the modifier and ignores fill", () => {
      const { container } = render(<Demo orientation="vertical" fill />);
      expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
      expect(container.firstChild).toHaveClass("ol-tabs--vertical");
      expect(container.firstChild).not.toHaveClass("ol-tabs--fill");
      expect(container.querySelector(".ol-tabs__mark")).toBeNull();
    });

    it("does not write aria-orientation when horizontal", () => {
      render(<Demo />);
      expect(screen.getByRole("tablist")).not.toHaveAttribute("aria-orientation");
    });

    it("moves with Up and Down and leaves Left and Right to the page", async () => {
      const user = userEvent.setup();
      render(<Demo orientation="vertical" />);
      const one = screen.getByRole("tab", { name: "One" });
      one.focus();
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(one).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
      const four = screen.getByRole("tab", { name: "Four" });
      expect(fireEvent.keyDown(four, { key: "ArrowRight" })).toBe(true);
      expect(fireEvent.keyDown(four, { key: "ArrowLeft" })).toBe(true);
      expect(four).toHaveFocus();
    });

    it("leaves Up and Down to the page when horizontal", () => {
      render(<Demo />);
      const one = screen.getByRole("tab", { name: "One" });
      one.focus();
      expect(fireEvent.keyDown(one, { key: "ArrowDown" })).toBe(true);
      expect(one).toHaveFocus();
    });

    it("has no axe violations when vertical", async () => {
      const { container } = render(<Demo orientation="vertical" indexed />);
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("F6 modifiers and composition", () => {
    it("does not prevent Alt+Left, Ctrl+Home, Meta+End or keys during composition", () => {
      render(<Demo defaultValue={1} />);
      const two = screen.getByRole("tab", { name: "Two" });
      two.focus();
      expect(fireEvent.keyDown(two, { key: "ArrowLeft", altKey: true })).toBe(true);
      expect(fireEvent.keyDown(two, { key: "Home", ctrlKey: true })).toBe(true);
      expect(fireEvent.keyDown(two, { key: "End", metaKey: true })).toBe(true);
      expect(fireEvent.keyDown(two, { key: "ArrowRight", isComposing: true })).toBe(true);
      expect(two).toHaveFocus();
      expect(two).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("F7/F10 motion", () => {
    it("renders a decorative mark that useIndicator positions on the list", async () => {
      const { container } = render(<Demo />);
      const mark = container.querySelector(".ol-tabs__mark");
      const list = screen.getByRole("tablist");
      expect(mark).toHaveAttribute("aria-hidden", "true");
      expect(list).toContainElement(mark as HTMLElement);
      expect(list.style.getPropertyValue("--ol-indicator-w")).not.toBe("");
      await waitFor(() => {
        expect(list).toHaveAttribute("data-indicator", "ready");
      });
    });

    it("uses only motion tokens: the edge on dur-m / ease-move, labels on dur-s / ease-effect", () => {
      expect(css).not.toMatch(/--motion-/);
      expect(css).toMatch(/transform var\(--dur-m\) var\(--ease-move\)/);
      expect(css).toMatch(/color var\(--dur-s\) var\(--ease-effect\)/);
      for (const [, value] of css.matchAll(/transition:([^;]+);/g)) {
        expect(value).not.toMatch(/\d+m?s\b|cubic-bezier|steps\(/);
      }
    });
  });

  describe("F8 panel tab stop", () => {
    it("ignores disabled, inert, hidden, negative-tabindex and closed-details content", () => {
      render(
        <Tabs label="x">
          <Tabs.Tab label="A">
            <button type="button" disabled>
              Off
            </button>
            <fieldset disabled>
              <input aria-label="In fieldset" />
            </fieldset>
            {/* `inert` set as an attribute: React 18 has no prop for it. */}
            <div ref={markInert}>
              <a href="#x">Inert</a>
            </div>
            <div hidden>
              <button type="button">Hidden</button>
            </div>
            <span tabIndex={-1}>Script only</span>
            <details>
              <summary>More</summary>
              <div>
                <button type="button">In details</button>
              </div>
            </details>
          </Tabs.Tab>
        </Tabs>,
      );
      // The summary is focusable, so the panel is not a stop.
      expect(screen.getByRole("tabpanel")).not.toHaveAttribute("tabindex");
    });

    it("is a stop when only disabled or inert content is inside", () => {
      render(
        <Tabs label="x">
          <Tabs.Tab label="A">
            <button type="button" disabled>
              Off
            </button>
            {/* `inert` set as an attribute: React 18 has no prop for it. */}
            <div ref={markInert}>
              <a href="#x">Inert</a>
            </div>
          </Tabs.Tab>
        </Tabs>,
      );
      expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "0");
    });

    it("re-evaluates when the visible panel's content changes", async () => {
      render(<Demo />);
      const panel = screen.getByRole("tabpanel");
      expect(panel).toHaveAttribute("tabindex", "0");
      const button = document.createElement("button");
      panel.append(button);
      await waitFor(() => {
        expect(panel).not.toHaveAttribute("tabindex");
      });
      button.disabled = true;
      await waitFor(() => {
        expect(panel).toHaveAttribute("tabindex", "0");
      });
    });

    it("leaves tabindex off hidden panels", async () => {
      const user = userEvent.setup();
      const { container } = render(<Demo />);
      await user.click(screen.getByRole("tab", { name: "Two" }));
      const hidden = Array.from(container.querySelectorAll(".ol-tabs__panel[hidden]"));
      expect(hidden).toHaveLength(3);
      for (const panel of hidden) expect(panel).not.toHaveAttribute("tabindex");
    });
  });

  describe("F9 keepMounted", () => {
    it("keeps inactive content mounted by default", async () => {
      const user = userEvent.setup();
      const { container } = render(<Demo />);
      const panels = container.querySelectorAll(".ol-tabs__panel");
      expect(panels[1]).toHaveTextContent("Panel two");
      await user.click(screen.getByRole("tab", { name: "Two" }));
      expect(panels[0]).toHaveTextContent("Panel one");
    });

    it("renders empty shells for inactive panels when false", async () => {
      const user = userEvent.setup();
      const { container } = render(<Demo keepMounted={false} />);
      const panels = Array.from(container.querySelectorAll(".ol-tabs__panel"));
      expect(panels).toHaveLength(4);
      expect(panels[0]).toHaveTextContent("Panel one");
      expect(panels[1]).toBeEmptyDOMElement();
      for (const tab of screen.getAllByRole("tab")) {
        expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")).not.toBeNull();
      }
      await user.click(screen.getByRole("tab", { name: "Two" }));
      expect(panels[0]).toBeEmptyDOMElement();
      expect(panels[1]).toHaveTextContent("Panel two");
    });
  });

  describe("F11 children", () => {
    it("flattens fragments", () => {
      render(
        <Tabs label="x">
          <>
            <Tabs.Tab label="A">a</Tabs.Tab>
            <Tabs.Tab label="B">b</Tabs.Tab>
          </>
          <Tabs.Tab label="C">c</Tabs.Tab>
        </Tabs>,
      );
      expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["A", "B", "C"]);
    });

    it("warns in development about children that are not Tabs.Tab", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Tabs label="x">
          <Tabs.Tab label="A">a</Tabs.Tab>
          <div>stray</div>
        </Tabs>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Tabs.Tab"));
    });

    it("does not warn for Tabs.Tab children", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Demo />);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("review round 1", () => {
    it("keeps focus where it was when a scroll button is clicked", async () => {
      const user = userEvent.setup();
      stubOverflow();
      const { container } = render(<Many />);
      const first = screen.getByRole("tab", { name: "Tab 1" });
      first.focus();
      await user.click(find(container, ".ol-tabs__scroll--end"));
      expect(first).toHaveFocus();
    });

    it("scales the mark to the selected tab with a unitless ratio", () => {
      stubOverflow();
      render(<Many defaultValue={1} />);
      // A 100px tab in a 200px list.
      expect(screen.getByRole("tablist").style.getPropertyValue("--ol-tabs-w")).toBe("0.5");
    });

    it("animates the mark with transform only", () => {
      const mark = /\.ol-tabs__mark \{[^}]*\}/.exec(css)?.[0] ?? "";
      expect(mark).toMatch(/transform-origin: left/);
      for (const [, value] of css.matchAll(/transition:([^;]+);/g)) {
        expect(value).not.toMatch(/\bwidth\b/);
      }
    });

    it("renders the roving tabindex on the server", () => {
      const html = renderToString(<Demo defaultValue={1} />);
      expect(html).toMatch(
        /aria-selected="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-selected="true"/,
      );
      expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
    });

    it("counts media controls and image-map links as focusable panel content", () => {
      render(
        <Tabs label="x">
          <Tabs.Tab label="A">
            <video controls aria-label="Clip">
              <track kind="captions" />
            </video>
          </Tabs.Tab>
        </Tabs>,
      );
      expect(screen.getByRole("tabpanel")).not.toHaveAttribute("tabindex");
    });

    it("returns from a panel stop to the selected tab with Shift+Tab", async () => {
      const user = userEvent.setup();
      render(<Demo defaultValue={1} />);
      screen.getByRole("tab", { name: "Two" }).focus();
      await user.tab();
      expect(screen.getByRole("tabpanel")).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    });

    it("keeps nested Tabs on their own roving", async () => {
      const user = userEvent.setup();
      render(
        <Tabs label="Outer">
          <Tabs.Tab label="O1">
            <Tabs label="Inner">
              <Tabs.Tab label="I1">i1</Tabs.Tab>
              <Tabs.Tab label="I2">i2</Tabs.Tab>
            </Tabs>
          </Tabs.Tab>
          <Tabs.Tab label="O2">o2</Tabs.Tab>
        </Tabs>,
      );
      screen.getByRole("tab", { name: "I1" }).focus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: "I2" })).toHaveFocus();
      expect(screen.getByRole("tab", { name: "O1" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "I2" })).toHaveAttribute("aria-selected", "true");
    });

    it("has no axe violations when every tab is disabled", async () => {
      const { container } = render(
        <Tabs label="x">
          <Tabs.Tab label="A" disabled>
            a
          </Tabs.Tab>
          <Tabs.Tab label="B" disabled>
            b
          </Tabs.Tab>
        </Tabs>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
