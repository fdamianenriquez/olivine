import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { ScrollArea } from "./ScrollArea";

/** Stands in for ResizeObserver: tests call `notify()` after they have faked a layout. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve = () => undefined;
  disconnect() {
    this.observed = [];
  }
  trigger() {
    this.callback();
  }
}

function notify() {
  act(() => {
    FakeResizeObserver.instances.forEach((o) => {
      o.trigger();
    });
  });
}

interface Layout {
  scrollWidth?: number;
  scrollHeight?: number;
  scrollLeft?: number;
  scrollTop?: number;
}

/** Fakes the layout of the scroller (jsdom measures every box as 0), then re-measures. */
function layout(el: HTMLElement, box: Layout) {
  const values = {
    clientWidth: 300,
    clientHeight: 100,
    scrollWidth: box.scrollWidth ?? 300,
    scrollHeight: box.scrollHeight ?? 100,
    scrollLeft: box.scrollLeft ?? 0,
    scrollTop: box.scrollTop ?? 0,
  };
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(el, key, { configurable: true, writable: true, value });
  }
  notify();
}

/** Moves the scroller and fires the (non-bubbling) scroll event on it. */
function scrollTo(el: HTMLElement, position: { left?: number; top?: number }) {
  if (position.left !== undefined) el.scrollLeft = position.left;
  if (position.top !== undefined) el.scrollTop = position.top;
  act(() => {
    fireEvent.scroll(el);
  });
}

const viewport = (container: HTMLElement): HTMLElement => {
  const el = container.querySelector<HTMLElement>(".ol-scrollarea__viewport");
  if (!el) throw new Error("no viewport");
  return el;
};

const root = (container: HTMLElement): HTMLElement => {
  const el = container.querySelector<HTMLElement>(".ol-scrollarea");
  if (!el) throw new Error("no root");
  return el;
};

const Rows = () => (
  <ul>
    {Array.from({ length: 30 }, (_, i) => (
      <li key={i}>Order {i + 1}</li>
    ))}
  </ul>
);

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  FakeResizeObserver.instances = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  // One measurement per frame: run the frame at once so a scroll re-measures synchronously.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  warn.mockRestore();
});

describe("ScrollArea rendering", () => {
  it("renders a root with a skinned viewport and the children straight inside it", () => {
    const { container } = render(
      <ScrollArea label="Orders">
        <p>Content</p>
      </ScrollArea>,
    );
    const el = root(container);
    expect(el).toHaveClass("ol-scrollarea");
    expect(el).toHaveAttribute("data-orientation", "vertical");
    const vp = viewport(container);
    expect(vp.parentElement).toBe(el);
    expect(vp).toHaveClass("ol-scrollbar");
    expect(vp.firstElementChild?.tagName).toBe("P");
  });

  it("passes className, native attributes and the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <ScrollArea ref={ref} className="extra" id="area" data-testid="a" style={{ height: 10 }} />,
    );
    const el = root(container);
    expect(ref.current).toBe(el);
    expect(el).toHaveClass("ol-scrollarea", "extra");
    expect(el).toHaveAttribute("id", "area");
    expect(screen.getByTestId("a")).toBe(el);
    expect(el.style.height).toBe("10px");
  });

  it("adds the modifier classes only on request", () => {
    const { container, rerender } = render(<ScrollArea />);
    const el = root(container);
    for (const mod of ["bordered", "hints", "gutter", "contain"]) {
      expect(el).not.toHaveClass(`ol-scrollarea--${mod}`);
    }
    rerender(<ScrollArea bordered hints gutter contain />);
    for (const mod of ["bordered", "hints", "gutter", "contain"]) {
      expect(el).toHaveClass(`ol-scrollarea--${mod}`);
    }
  });

  it("publishes the orientation", () => {
    const { container, rerender } = render(<ScrollArea orientation="horizontal" />);
    expect(root(container)).toHaveAttribute("data-orientation", "horizontal");
    rerender(<ScrollArea orientation="both" />);
    expect(root(container)).toHaveAttribute("data-orientation", "both");
  });

  it("gives the viewport ref the scrolling element (object and callback refs)", () => {
    const ref = createRef<HTMLDivElement>();
    const { container, unmount } = render(<ScrollArea viewportRef={ref} />);
    expect(ref.current).toBe(viewport(container));
    unmount();
    expect(ref.current).toBeNull();

    const callback = vi.fn();
    const second = render(<ScrollArea viewportRef={callback} />);
    expect(callback).toHaveBeenCalledWith(viewport(second.container));
  });

  it("calls onScroll from the scrolling element", () => {
    let target: EventTarget | null = null;
    const onScroll = vi.fn((event: { currentTarget: EventTarget }) => {
      target = event.currentTarget;
    });
    const { container } = render(<ScrollArea onScroll={onScroll} />);
    fireEvent.scroll(viewport(container));
    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(target).toBe(viewport(container));
  });

  it("renders on the server with no tab stop, no region and no edge data", () => {
    const html = renderToString(<ScrollArea label="Orders">x</ScrollArea>);
    expect(html).toContain("ol-scrollarea__viewport");
    expect(html).not.toContain("tabindex");
    expect(html).not.toContain("region");
    expect(html).not.toContain("data-overflow");
  });

  it("is a tab stop on the server with focusable=always", () => {
    const html = renderToString(
      <ScrollArea label="Orders" focusable="always">
        x
      </ScrollArea>,
    );
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="region"');
  });
});

describe("ScrollArea overflow and focus", () => {
  it("adds no tab stop and no region while the content fits", () => {
    const { container } = render(<ScrollArea label="Orders" />);
    layout(viewport(container), {});
    const vp = viewport(container);
    expect(vp).not.toHaveAttribute("tabindex");
    expect(vp).not.toHaveAttribute("role");
    expect(vp).not.toHaveAttribute("aria-label");
    expect(root(container)).not.toHaveAttribute("data-overflow-y");
  });

  it("becomes a named region and a tab stop while it overflows, and stops when it fits", () => {
    const { container } = render(
      <ScrollArea label="Order history">
        <Rows />
      </ScrollArea>,
    );
    layout(viewport(container), { scrollHeight: 400 });
    const region = screen.getByRole("region", { name: "Order history" });
    expect(region).toBe(viewport(container));
    expect(region).toHaveAttribute("tabindex", "0");

    layout(viewport(container), { scrollHeight: 100 });
    expect(screen.queryByRole("region")).toBeNull();
    expect(viewport(container)).not.toHaveAttribute("tabindex");
  });

  it("moves aria-label and aria-labelledby to the scroller", () => {
    const { container, rerender } = render(
      <>
        <h2 id="t">Release notes</h2>
        <ScrollArea aria-labelledby="t" />
      </>,
    );
    layout(viewport(container), { scrollHeight: 400 });
    expect(screen.getByRole("region", { name: "Release notes" })).toBe(viewport(container));
    expect(root(container)).not.toHaveAttribute("aria-labelledby");

    rerender(
      <>
        <h2 id="t">Release notes</h2>
        <ScrollArea aria-label="Notes" />
      </>,
    );
    expect(screen.getByRole("region", { name: "Notes" })).toBe(viewport(container));
    expect(root(container)).not.toHaveAttribute("aria-label");
  });

  it("moves aria-describedby and aria-description to the scroller while it is a tab stop", () => {
    const { container } = render(
      <>
        <p id="d">Newest first</p>
        <ScrollArea label="Orders" aria-describedby="d" aria-description="Scroll for more" />
      </>,
    );
    const vp = viewport(container);
    expect(vp).not.toHaveAttribute("aria-describedby");
    layout(vp, { scrollHeight: 400 });
    expect(vp).toHaveAttribute("aria-describedby", "d");
    expect(vp).toHaveAttribute("aria-description", "Scroll for more");
    expect(screen.getByRole("region")).toHaveAccessibleDescription("Newest first");
    expect(root(container)).not.toHaveAttribute("aria-describedby");
    expect(root(container)).not.toHaveAttribute("aria-description");
  });

  it("keeps the tab stop while focused when the content stops overflowing, drops it on blur", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <ScrollArea label="Orders">
          <Rows />
        </ScrollArea>
        <button type="button">After</button>
      </>,
    );
    const vp = viewport(container);
    layout(vp, { scrollHeight: 400 });
    await user.tab();
    expect(vp).toHaveFocus();

    layout(vp, {});
    expect(vp).toHaveFocus();
    expect(vp).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("region", { name: "Orders" })).toBe(vp);

    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(vp).not.toHaveAttribute("tabindex");
    expect(vp).not.toHaveAttribute("role");
  });

  it("stays a tab stop while focus moves between elements inside it", () => {
    const { container } = render(
      <ScrollArea label="Orders">
        <button type="button">One</button>
        <button type="button">Two</button>
      </ScrollArea>,
    );
    const vp = viewport(container);
    layout(vp, { scrollHeight: 400 });
    act(() => {
      screen.getByRole("button", { name: "One" }).focus();
    });
    layout(vp, {});
    act(() => {
      screen.getByRole("button", { name: "Two" }).focus();
    });
    expect(vp).toHaveAttribute("tabindex", "0");
    act(() => {
      screen.getByRole("button", { name: "Two" }).blur();
    });
    expect(vp).not.toHaveAttribute("tabindex");
  });

  it("is focusable but not a region when unnamed, and warns in development", () => {
    const { container } = render(
      <ScrollArea>
        <Rows />
      </ScrollArea>,
    );
    expect(warn).not.toHaveBeenCalled();
    layout(viewport(container), { scrollHeight: 400 });
    expect(viewport(container)).toHaveAttribute("tabindex", "0");
    expect(viewport(container)).not.toHaveAttribute("role");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ScrollArea"));
  });

  it("does not warn when the unnamed area is focusable=never", () => {
    const { container } = render(<ScrollArea focusable="never" />);
    layout(viewport(container), { scrollHeight: 400 });
    expect(warn).not.toHaveBeenCalled();
  });

  it("focusable=always is a named tab stop even when nothing overflows", () => {
    const { container } = render(<ScrollArea label="Log" focusable="always" />);
    layout(viewport(container), {});
    expect(screen.getByRole("region", { name: "Log" })).toHaveAttribute("tabindex", "0");
  });

  it("focusable=never is never a tab stop or a region", () => {
    const { container } = render(<ScrollArea label="Log" focusable="never" />);
    layout(viewport(container), { scrollHeight: 400 });
    expect(viewport(container)).not.toHaveAttribute("tabindex");
    expect(viewport(container)).not.toHaveAttribute("role");
    // Edge data still flows, for styling.
    expect(root(container)).toHaveAttribute("data-overflow-y");
  });

  it("counts only the axes that scroll", () => {
    const { container, rerender } = render(<ScrollArea label="Strip" />);
    // Vertical clips sideways overflow, it does not scroll it.
    layout(viewport(container), { scrollWidth: 900 });
    expect(viewport(container)).not.toHaveAttribute("tabindex");
    expect(root(container)).not.toHaveAttribute("data-overflow-x");

    rerender(<ScrollArea label="Strip" orientation="horizontal" />);
    expect(root(container)).toHaveAttribute("data-overflow-x");
    expect(viewport(container)).toHaveAttribute("tabindex", "0");

    layout(viewport(container), { scrollHeight: 400 });
    expect(root(container)).not.toHaveAttribute("data-overflow-y");
    expect(viewport(container)).not.toHaveAttribute("tabindex");

    rerender(<ScrollArea label="Strip" orientation="both" />);
    expect(root(container)).toHaveAttribute("data-overflow-y");
    expect(root(container)).not.toHaveAttribute("data-overflow-x");
  });
});

describe("ScrollArea keyboard", () => {
  it("Tab reaches the overflowing scroller and leaves it in one press", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <button type="button">Before</button>
        <ScrollArea label="Orders">
          <Rows />
        </ScrollArea>
        <button type="button">After</button>
      </>,
    );
    layout(viewport(container), { scrollHeight: 400 });
    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
    await user.tab();
    expect(viewport(container)).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(viewport(container)).toHaveFocus();
  });

  it("Tab skips a scroller that fits", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <button type="button">Before</button>
        <ScrollArea label="Orders">Short</ScrollArea>
        <button type="button">After</button>
      </>,
    );
    layout(viewport(container), {});
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("leaves arrow, Page, Space and Home/End keys to the browser", () => {
    const { container } = render(
      <ScrollArea label="Orders" orientation="both">
        <Rows />
      </ScrollArea>,
    );
    layout(viewport(container), { scrollHeight: 400, scrollWidth: 900 });
    const vp = viewport(container);
    vp.focus();
    for (const key of [
      "ArrowDown",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "PageDown",
      "PageUp",
      " ",
      "Home",
      "End",
    ]) {
      // fireEvent returns false when a handler called preventDefault.
      expect(fireEvent.keyDown(vp, { key })).toBe(true);
    }
    expect(vp).toHaveFocus();
  });
});

describe("ScrollArea edges", () => {
  it("tracks the vertical edges as the content scrolls", () => {
    const { container } = render(
      <ScrollArea label="Orders" hints>
        <Rows />
      </ScrollArea>,
    );
    const vp = viewport(container);
    const el = root(container);
    layout(vp, { scrollHeight: 300 });
    expect(el).toHaveAttribute("data-overflow-y", "");
    expect(el).not.toHaveAttribute("data-overflow-y-start");
    expect(el).toHaveAttribute("data-overflow-y-end", "");

    scrollTo(vp, { top: 100 });
    expect(el).toHaveAttribute("data-overflow-y-start", "");
    expect(el).toHaveAttribute("data-overflow-y-end", "");

    scrollTo(vp, { top: 200 });
    expect(el).toHaveAttribute("data-overflow-y-start", "");
    expect(el).not.toHaveAttribute("data-overflow-y-end");
  });

  it("tracks the horizontal edges in logical order, also in RTL", () => {
    const { container } = render(
      <div dir="rtl">
        <ScrollArea label="Strip" orientation="horizontal">
          <Rows />
        </ScrollArea>
      </div>,
    );
    const vp = viewport(container);
    const el = root(container);
    layout(vp, { scrollWidth: 900 });
    expect(el).not.toHaveAttribute("data-overflow-x-start");
    expect(el).toHaveAttribute("data-overflow-x-end", "");

    // In RTL scrollLeft runs from 0 towards -max.
    scrollTo(vp, { left: -600 });
    expect(el).toHaveAttribute("data-overflow-x-start", "");
    expect(el).not.toHaveAttribute("data-overflow-x-end");
  });

  it("marks the physical side where horizontal scrolling starts, for the hint lines", () => {
    const computed = { direction: "ltr", writingMode: "horizontal-tb" };
    vi.stubGlobal("getComputedStyle", () => computed);
    const { container, rerender } = render(<ScrollArea orientation="horizontal" hints />);
    const vp = viewport(container);
    layout(vp, {});
    expect(root(container)).not.toHaveClass("ol-scrollarea--start-right");

    computed.direction = "rtl";
    layout(vp, { scrollWidth: 900 });
    expect(root(container)).toHaveClass("ol-scrollarea--start-right");

    // Vertical writing ignores the direction: vertical-rl starts on the right, vertical-lr on the left.
    computed.writingMode = "vertical-lr";
    layout(vp, {});
    expect(root(container)).not.toHaveClass("ol-scrollarea--start-right");
    computed.writingMode = "vertical-rl";
    computed.direction = "ltr";
    layout(vp, { scrollWidth: 900 });
    expect(root(container)).toHaveClass("ol-scrollarea--start-right");
    computed.writingMode = "sideways-lr";
    layout(vp, {});
    expect(root(container)).not.toHaveClass("ol-scrollarea--start-right");

    // Only horizontal hints need it.
    computed.writingMode = "vertical-rl";
    layout(vp, { scrollWidth: 900 });
    rerender(<ScrollArea orientation="horizontal" />);
    expect(root(container)).not.toHaveClass("ol-scrollarea--start-right");
  });

  it("re-measures when the content changes size", () => {
    const { container } = render(
      <ScrollArea label="Orders">
        <Rows />
      </ScrollArea>,
    );
    const vp = viewport(container);
    layout(vp, {});
    expect(root(container)).not.toHaveAttribute("data-overflow-y");
    // The observer watches the scroller and its direct children.
    expect(FakeResizeObserver.instances.some((o) => o.observed.includes(vp))).toBe(true);
    const list = vp.firstElementChild;
    if (!list) throw new Error("no content");
    expect(FakeResizeObserver.instances.some((o) => o.observed.includes(list))).toBe(true);
    layout(vp, { scrollHeight: 500 });
    expect(root(container)).toHaveAttribute("data-overflow-y-end", "");
  });
});

describe("ScrollArea accessibility", () => {
  it("has no axe violations while it fits", async () => {
    const { container } = render(
      <ScrollArea label="Orders">
        <Rows />
      </ScrollArea>,
    );
    layout(viewport(container), {});
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations as a named, overflowing region", async () => {
    const { container } = render(
      <main>
        <ScrollArea label="Orders" bordered hints orientation="both">
          <Rows />
        </ScrollArea>
      </main>,
    );
    layout(viewport(container), { scrollHeight: 400, scrollWidth: 900 });
    expect(screen.getByRole("region")).toHaveAttribute("tabindex", "0");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations while unnamed and overflowing (tab stop, no region)", async () => {
    const { container } = render(
      <main>
        <ScrollArea>
          <Rows />
        </ScrollArea>
      </main>,
    );
    layout(viewport(container), { scrollHeight: 400 });
    expect(viewport(container)).toHaveAttribute("tabindex", "0");
    expect(viewport(container)).not.toHaveAttribute("role");
    // jsdom has no layout, so `scrollable-region-focusable` cannot fire here; the tab-stop
    // assertions above and the Storybook a11y run are the real guard for that rule.
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations with focusable=never around a focusable widget", async () => {
    const { container } = render(
      <ScrollArea focusable="never">
        <ul aria-label="Fruit">
          <li>
            <button type="button">Apple</button>
          </li>
          <li>
            <button type="button">Pear</button>
          </li>
        </ul>
      </ScrollArea>,
    );
    layout(viewport(container), { scrollHeight: 400 });
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
