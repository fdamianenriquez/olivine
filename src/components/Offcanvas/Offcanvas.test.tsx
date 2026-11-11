import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Offcanvas, type OffcanvasPlacement, type OffcanvasProps } from "./Offcanvas";
import { indexOfPoint, resolvePoints, toPx } from "./snapPoints";

function Harness({
  placement = "end",
  ...props
}: { placement?: OffcanvasPlacement } & Partial<OffcanvasProps>) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </button>
      <Offcanvas
        open={open}
        placement={placement}
        onClose={() => {
          setOpen(false);
        }}
        title="Filters"
        {...props}
      >
        <button>Apply</button>
      </Offcanvas>
    </div>
  );
}

const scrimOf = () => {
  const el = document.querySelector<HTMLElement>(".ol-scrim");
  if (!el) throw new Error("no scrim");
  return el;
};

/** The panel, also while it is closing (inert). */
const panelEl = () => {
  const el = document.querySelector<HTMLElement>(".ol-offcanvas");
  if (!el) throw new Error("no panel");
  return el;
};

const gone = () =>
  waitFor(() => {
    expect(document.querySelector(".ol-offcanvas")).toBeNull();
  });

const openHarness = () => {
  const trigger = screen.getByRole("button", { name: "Open" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};

/** jsdom has no layout: the available height is the window height (768px). */
const SHEET = { placement: "bottom", snapPoints: [0.5, 1] } as const;

const part = (name: string) => {
  const el = document.querySelector<HTMLElement>(`.ol-offcanvas__${name}`);
  if (!el) throw new Error(`no ${name}`);
  return el;
};
const headOf = () => part("head");
const bodyOf = () => part("body");

const handleOf = () => screen.getByRole("button", { name: /panel$/ });

function drag(target: Element, dy: number, pointerType = "touch", dx = 0) {
  fireEvent.pointerDown(target, { pointerId: 1, pointerType, button: 0, clientX: 0, clientY: 500 });
  for (let i = 1; i <= 4; i += 1) {
    vi.advanceTimersByTime(50);
    fireEvent.pointerMove(target, {
      pointerId: 1,
      pointerType,
      clientX: (dx * i) / 4,
      clientY: 500 + (dy * i) / 4,
    });
  }
  vi.advanceTimersByTime(200);
  fireEvent.pointerUp(target, { pointerId: 1, pointerType, clientX: dx, clientY: 500 + dy });
}

describe("Offcanvas", () => {
  // jsdom has no animations: a closing panel unmounts on the next microtask.
  stubNoAnimations();

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders nothing while closed", () => {
    render(<Offcanvas open={false} title="Hi" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".ol-scrim")).toBeNull();
  });

  it("renders a labelled modal dialog with className and native props", () => {
    render(
      <Offcanvas open title="Filters" className="x" data-testid="o">
        Body
      </Offcanvas>,
    );
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveClass("ol-offcanvas", "x");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-testid", "o");
    expect(dialog).toHaveAttribute("data-state", "open");
    const heading = screen.getByRole("heading", { level: 2, name: "Filters" });
    expect(heading.id).toBe(dialog.getAttribute("aria-labelledby"));
    expect(document.querySelector(".ol-scrim")).toHaveClass("ol-scrim--edge");
    expect(scrimOf()).toHaveAttribute("data-state", "open");
  });

  it("defaults to the end placement", () => {
    render(<Offcanvas open title="T" />);
    expect(screen.getByRole("dialog")).toHaveClass("ol-offcanvas--end");
  });

  it.each([
    ["end", "ol-kakejiku--from-end"],
    ["start", "ol-kakejiku--from-start"],
  ] as const)("unrolls the %s panel with the logical kakejiku class", (placement, motion) => {
    render(<Offcanvas open title="T" placement={placement} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass(`ol-offcanvas--${placement}`, "ol-kakejiku", motion);
  });

  it("unrolls the bottom sheet with plain kakejiku and no rod", () => {
    render(<Offcanvas open title="T" placement="bottom" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("ol-offcanvas--bottom", "ol-kakejiku");
    expect(dialog.className).not.toMatch(/ol-kakejiku--from/);
  });

  it("renders into a portal outside the render container", () => {
    const { container } = render(<Offcanvas open title="T" />);
    expect(container.querySelector(".ol-offcanvas")).toBeNull();
    expect(document.body.querySelector(".ol-portal .ol-offcanvas")).not.toBeNull();
  });

  it("forwards the ref to the dialog and merges the style", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Offcanvas ref={ref} open title="T" style={{ color: "red" }} />);
    expect(ref.current).toBe(screen.getByRole("dialog"));
    expect(ref.current?.style.color).toBe("red");
  });

  it("warns in development when the dialog has no accessible name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Offcanvas open />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));
  });

  it("opens, moves focus in and closes on Escape returning focus to the trigger", async () => {
    render(<Harness />);
    const trigger = openHarness();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
    await gone();
  });

  it("keeps the panel mounted and inert while it rolls up, then unmounts", async () => {
    render(<Harness />);
    openHarness();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(panelEl()).toHaveAttribute("data-state", "closing");
    expect(panelEl()).toHaveAttribute("inert");
    expect(scrimOf()).toHaveAttribute("data-state", "closing");
    await gone();
  });

  it("hides the close button without onClose or with closeButton={false}", () => {
    const { rerender } = render(<Offcanvas open title="T" />);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    rerender(<Offcanvas open title="T" onClose={() => undefined} closeButton={false} />);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("wraps Tab and Shift+Tab inside the panel", () => {
    render(<Harness />);
    openHarness();
    const last = screen.getByRole("button", { name: "Apply" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("closes when a click both starts and ends on the scrim", () => {
    const onClose = vi.fn();
    render(<Offcanvas open title="T" onClose={onClose} />);
    fireEvent.pointerDown(scrimOf());
    fireEvent.click(scrimOf());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when the press started inside the panel", () => {
    const onClose = vi.fn();
    render(<Offcanvas open title="T" onClose={onClose} />);
    fireEvent.pointerDown(screen.getByRole("dialog"));
    fireEvent.click(scrimOf());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores the scrim with closeOnScrim={false}", () => {
    const onClose = vi.fn();
    render(<Offcanvas open title="T" onClose={onClose} closeOnScrim={false} />);
    fireEvent.pointerDown(scrimOf());
    fireEvent.click(scrimOf());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks body scroll and makes the page inert while open, then releases both", () => {
    const { container } = render(<Harness />);
    openHarness();
    expect(document.body.style.overflow).toBe("hidden");
    expect(container).toHaveAttribute("inert");
    expect(document.querySelector(".ol-portal")).not.toHaveAttribute("inert");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
    expect(container).not.toHaveAttribute("inert");
  });

  describe("non-modal", () => {
    it("has no scrim, no aria-modal, no inert page, no scroll lock and leaves focus alone", () => {
      const { container } = render(<Harness modal={false} />);
      const trigger = openHarness();
      const dialog = screen.getByRole("dialog");
      expect(document.querySelector(".ol-scrim")).toBeNull();
      expect(dialog).not.toHaveAttribute("aria-modal");
      expect(container).not.toHaveAttribute("inert");
      expect(document.body.style.overflow).toBe("");
      expect(trigger).toHaveFocus();
      expect(screen.getByRole("button", { name: "Close" })).not.toHaveAttribute("data-autofocus");
    });

    it("closes on Escape only while focus is inside, then returns focus", async () => {
      render(<Harness modal={false} />);
      const trigger = openHarness();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      screen.getByRole("button", { name: "Apply" }).focus();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(trigger).toHaveFocus();
      await gone();
    });

    it("does not trap Tab", () => {
      render(<Harness modal={false} />);
      openHarness();
      const last = screen.getByRole("button", { name: "Apply" });
      last.focus();
      const event = fireEvent.keyDown(document, { key: "Tab" });
      expect(event).toBe(true);
    });
  });

  describe("bottom sheet", () => {
    it("shows a decorative handle when it can only be swiped away", () => {
      render(<Offcanvas open title="T" placement="bottom" onClose={() => undefined} />);
      const bar = document.querySelector(".ol-offcanvas__handle");
      expect(bar?.tagName).toBe("SPAN");
      expect(bar).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByRole("dialog")).toHaveClass("ol-offcanvas--draggable");
    });

    it("has no handle when it cannot be dragged, or with handle={false}", () => {
      const { rerender } = render(<Offcanvas open title="T" placement="bottom" />);
      expect(document.querySelector(".ol-offcanvas__handle")).toBeNull();
      expect(screen.getByRole("dialog")).not.toHaveClass("ol-offcanvas--draggable");
      rerender(<Offcanvas open title="T" {...SHEET} handle={false} />);
      expect(document.querySelector(".ol-offcanvas__handle")).toBeNull();
    });

    it("never shows a handle on the side panels", () => {
      render(<Offcanvas open title="T" placement="end" onClose={() => undefined} handle />);
      expect(document.querySelector(".ol-offcanvas__handle")).toBeNull();
    });

    it("sizes the box to the tallest point and moves it down to the lowest", () => {
      render(<Offcanvas open title="T" {...SHEET} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog.style.getPropertyValue("--ol-sheet-height")).toBe("768px");
      expect(dialog.style.getPropertyValue("--ol-sheet-rest")).toBe("384px");
      expect(dialog).toHaveAttribute("data-snap-index", "0");
      expect(dialog).not.toHaveAttribute("data-snap-top");
      // Nothing travels until the sheet is moved.
      expect(dialog).not.toHaveAttribute("data-travel");
    });

    it("gives the handle a name that flips with the position and controls the body", () => {
      render(<Offcanvas open title="T" {...SHEET} />);
      const handle = screen.getByRole("button", { name: "Expand panel" });
      expect(handle).toHaveAttribute(
        "aria-controls",
        document.querySelector(".ol-offcanvas__body")?.id,
      );
      fireEvent.click(handle);
      expect(screen.getByRole("button", { name: "Collapse panel" })).toBe(handle);
      expect(screen.getByRole("dialog")).toHaveAttribute("data-snap-top");
    });

    it("cycles the points on click and wraps to the lowest, announcing each size", () => {
      const onSnapChange = vi.fn();
      render(
        <Offcanvas
          open
          title="T"
          placement="bottom"
          snapPoints={[1, "200px", 0.5]}
          onSnapChange={onSnapChange}
        />,
      );
      const status = screen.getByRole("status");
      expect(status).toBeEmptyDOMElement();
      const handle = handleOf();
      fireEvent.click(handle);
      expect(onSnapChange).toHaveBeenLastCalledWith(0.5, "handle");
      expect(status).toHaveTextContent("Size 2 of 3");
      fireEvent.click(handle);
      expect(onSnapChange).toHaveBeenLastCalledWith(1, "handle");
      expect(screen.getByRole("dialog").style.getPropertyValue("--ol-sheet-rest")).toBe("0px");
      fireEvent.click(handle);
      expect(onSnapChange).toHaveBeenLastCalledWith("200px", "handle");
      expect(screen.getByRole("dialog").style.getPropertyValue("--ol-sheet-rest")).toBe("568px");
      expect(status).toHaveTextContent("Size 1 of 3");
    });

    it("cycles on Enter and Space", async () => {
      const user = userEvent.setup();
      const onSnapChange = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} onSnapChange={onSnapChange} />);
      handleOf().focus();
      await user.keyboard("{Enter}");
      expect(onSnapChange).toHaveBeenLastCalledWith(1, "handle");
      await user.keyboard(" ");
      expect(onSnapChange).toHaveBeenLastCalledWith(0.5, "handle");
    });

    it("steps with the arrows without wrapping and jumps with Home and End", () => {
      const onSnapChange = vi.fn();
      render(
        <Offcanvas
          open
          title="T"
          placement="bottom"
          snapPoints={[0.25, 0.5, 1]}
          onSnapChange={onSnapChange}
        />,
      );
      const handle = handleOf();
      fireEvent.keyDown(handle, { key: "ArrowDown" });
      expect(onSnapChange).not.toHaveBeenCalled();
      fireEvent.keyDown(handle, { key: "ArrowUp" });
      expect(onSnapChange).toHaveBeenLastCalledWith(0.5, "keyboard");
      fireEvent.keyDown(handle, { key: "End" });
      expect(onSnapChange).toHaveBeenLastCalledWith(1, "keyboard");
      fireEvent.keyDown(handle, { key: "ArrowUp" });
      expect(onSnapChange).toHaveBeenCalledTimes(2);
      fireEvent.keyDown(handle, { key: "ArrowDown" });
      expect(onSnapChange).toHaveBeenLastCalledWith(0.5, "keyboard");
      fireEvent.keyDown(handle, { key: "Home" });
      expect(onSnapChange).toHaveBeenLastCalledWith(0.25, "keyboard");
      expect(screen.getByRole("dialog")).toHaveAttribute("data-travel", "move");
    });

    it("follows a controlled snap and reports without moving on its own", () => {
      const onSnapChange = vi.fn();
      const { rerender } = render(
        <Offcanvas open title="T" {...SHEET} snap={1} onSnapChange={onSnapChange} />,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("data-snap-index", "1");
      fireEvent.click(handleOf());
      expect(onSnapChange).toHaveBeenCalledWith(0.5, "handle");
      expect(dialog).toHaveAttribute("data-snap-index", "1");
      rerender(<Offcanvas open title="T" {...SHEET} snap={0.5} onSnapChange={onSnapChange} />);
      expect(dialog).toHaveAttribute("data-snap-index", "0");
      expect(dialog).toHaveAttribute("data-travel", "move");
    });

    it("starts at defaultSnap, and again each time it opens", async () => {
      const { rerender } = render(<Offcanvas open title="T" {...SHEET} defaultSnap={1} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("data-snap-index", "1");
      fireEvent.click(handleOf());
      expect(screen.getByRole("dialog")).toHaveAttribute("data-snap-index", "0");
      rerender(<Offcanvas open={false} title="T" {...SHEET} defaultSnap={1} />);
      await gone();
      rerender(<Offcanvas open title="T" {...SHEET} defaultSnap={1} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("data-snap-index", "1");
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("resolves content, px and rem points and drops duplicates", () => {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(150);
      render(
        <Offcanvas
          open
          title="T"
          placement="bottom"
          snapPoints={["content", "20rem", "content", "320px", 1]}
          defaultSnap={1}
        />,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog.style.getPropertyValue("--ol-sheet-height")).toBe("768px");
      fireEvent.keyDown(handleOf(), { key: "Home" });
      expect(dialog.style.getPropertyValue("--ol-sheet-rest")).toBe("618px");
      fireEvent.keyDown(handleOf(), { key: "ArrowUp" });
      expect(dialog.style.getPropertyValue("--ol-sheet-rest")).toBe("448px");
      fireEvent.keyDown(handleOf(), { key: "ArrowUp" });
      expect(dialog).toHaveAttribute("data-snap-top");
      expect(screen.getByRole("status")).toHaveTextContent("Size 3 of 3");
    });

    it("moves the first focus past the handle when there is no close button", () => {
      render(<Harness {...SHEET} closeButton={false} />);
      openHarness();
      expect(screen.getByRole("button", { name: "Apply" })).toHaveFocus();
    });

    it("raises the sheet when focus moves to something a lower point hides", () => {
      const onSnapChange = vi.fn();
      render(
        <Offcanvas
          open
          title="T"
          placement="bottom"
          snapPoints={[0.25, 0.5, 1]}
          onSnapChange={onSnapChange}
        >
          <button>Low</button>
          <button>Deep</button>
        </Offcanvas>,
      );
      const dialog = screen.getByRole("dialog");
      vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({ top: 0 } as DOMRect);
      const low = screen.getByRole("button", { name: "Low" });
      const deep = screen.getByRole("button", { name: "Deep" });
      vi.spyOn(low, "getBoundingClientRect").mockReturnValue({ bottom: 150 } as DOMRect);
      vi.spyOn(deep, "getBoundingClientRect").mockReturnValue({ bottom: 300 } as DOMRect);
      act(() => {
        low.focus();
      });
      expect(onSnapChange).not.toHaveBeenCalled();
      act(() => {
        deep.focus();
      });
      expect(onSnapChange).toHaveBeenCalledWith(0.5, "focus");
      expect(dialog).toHaveAttribute("data-snap-index", "1");
      expect(screen.getByRole("status")).toHaveTextContent("Size 2 of 3");
    });

    it("keeps a focused body control shown when the sheet moves to a lower point", () => {
      const onSnapChange = vi.fn();
      render(
        <Offcanvas
          open
          title="T"
          placement="bottom"
          snapPoints={[0.25, 0.5, 1]}
          defaultSnap={1}
          onSnapChange={onSnapChange}
        >
          <button>Deep</button>
        </Offcanvas>,
      );
      const dialog = screen.getByRole("dialog");
      vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({ top: 0 } as DOMRect);
      const deep = screen.getByRole("button", { name: "Deep" });
      vi.spyOn(deep, "getBoundingClientRect").mockReturnValue({ bottom: 300 } as DOMRect);
      act(() => {
        deep.focus();
      });
      fireEvent.keyDown(handleOf(), { key: "Home" });
      expect(onSnapChange).toHaveBeenNthCalledWith(1, 0.25, "keyboard");
      expect(onSnapChange).toHaveBeenNthCalledWith(2, 0.5, "focus");
      expect(dialog).toHaveAttribute("data-snap-index", "1");
    });

    it("drags up from the handle with a mouse and swallows the click", () => {
      vi.useFakeTimers();
      const onSnapChange = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} onSnapChange={onSnapChange} />);
      act(() => {
        drag(handleOf(), -380, "mouse");
      });
      fireEvent.click(handleOf(), { detail: 1 });
      expect(onSnapChange).toHaveBeenCalledTimes(1);
      expect(onSnapChange).toHaveBeenCalledWith(1, "drag");
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("data-swipe", "return");
      expect(dialog).toHaveAttribute("data-travel", "release");
    });

    it("drags the head with touch, but never the body with a mouse", () => {
      vi.useFakeTimers();
      const onSnapChange = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} onSnapChange={onSnapChange} />);
      const body = bodyOf();
      act(() => {
        drag(body, -380, "mouse");
      });
      expect(onSnapChange).not.toHaveBeenCalled();
      act(() => {
        drag(headOf(), -380);
      });
      expect(onSnapChange).toHaveBeenCalledWith(1, "drag");
    });

    it("leaves an overflowing body at the tallest point to scrolling, but a pull down from its top drags", () => {
      vi.useFakeTimers();
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
      const scrollTop = vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockReturnValue(0);
      const onSnapChange = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} defaultSnap={1} onSnapChange={onSnapChange} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("data-overflow");
      const body = bodyOf();
      // Up from the top scrolls the content.
      act(() => {
        drag(body, -380);
      });
      expect(onSnapChange).not.toHaveBeenCalled();
      // Down once the content is scrolled scrolls it back.
      scrollTop.mockReturnValue(120);
      act(() => {
        drag(body, 380);
      });
      expect(onSnapChange).not.toHaveBeenCalled();
      // Down from the top drags the sheet to the lower point.
      scrollTop.mockReturnValue(0);
      act(() => {
        drag(body, 380);
      });
      expect(onSnapChange).toHaveBeenCalledWith(0.5, "drag");
      expect(dialog).toHaveAttribute("data-swipe", "return");
    });

    it("dismisses with a pull down from the top of an overflowing body", () => {
      vi.useFakeTimers();
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
      const onClose = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} defaultSnap={1} onClose={onClose} />);
      act(() => {
        drag(bodyOf(), 700);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog")).toHaveAttribute("data-swipe", "out");
    });

    it("drags the head of an overflowing sheet in both directions", () => {
      vi.useFakeTimers();
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
      vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockReturnValue(120);
      const onSnapChange = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} defaultSnap={1} onSnapChange={onSnapChange} />);
      act(() => {
        drag(headOf(), 380);
      });
      expect(onSnapChange).toHaveBeenCalledWith(0.5, "drag");
    });

    it("keeps a pull down from the top of an overflowing body from scrolling the content", () => {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
      const scrollTop = vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockReturnValue(0);
      render(
        <Offcanvas open title="T" {...SHEET} defaultSnap={1} onClose={() => undefined}>
          <p>Text</p>
          <button>Apply</button>
        </Offcanvas>,
      );
      const body = bodyOf();
      const touch = (target: Element, dy: number, dx = 0) => {
        fireEvent.touchStart(target, { touches: [{ clientX: 0, clientY: 500 }] });
        const first = fireEvent.touchMove(target, {
          touches: [{ clientX: dx, clientY: 500 + dy }],
        });
        // Once the gesture is the sheet's, it keeps it in both directions.
        const second = fireEvent.touchMove(target, { touches: [{ clientX: dx, clientY: 500 }] });
        fireEvent.touchEnd(target, { touches: [] });
        return [first, second];
      };
      const text = screen.getByText("Text");
      // fireEvent returns false when the default (native scrolling) was prevented.
      expect(touch(text, 20)).toEqual([false, false]);
      expect(touch(text, -20)).toEqual([true, true]);
      expect(touch(text, 10, 30)).toEqual([true, true]);
      expect(touch(screen.getByRole("button", { name: "Apply" }), 20)).toEqual([true, true]);
      expect(body).toHaveAttribute("data-scroll-start");
      scrollTop.mockReturnValue(120);
      fireEvent.scroll(body);
      expect(body).not.toHaveAttribute("data-scroll-start");
      expect(touch(text, 20)).toEqual([true, true]);
    });

    it("waits for the slop before taking a pull, and never takes a two-finger touch", () => {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
      vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockReturnValue(0);
      render(
        <Offcanvas open title="T" {...SHEET} defaultSnap={1} onClose={() => undefined}>
          <p>Text</p>
        </Offcanvas>,
      );
      const text = screen.getByText("Text");
      fireEvent.touchStart(text, { touches: [{ clientX: 0, clientY: 500 }] });
      expect(fireEvent.touchMove(text, { touches: [{ clientX: 0, clientY: 504 }] })).toBe(true);
      expect(fireEvent.touchMove(text, { touches: [{ clientX: 0, clientY: 520 }] })).toBe(false);
      fireEvent.touchEnd(text, { touches: [] });
      const two = [
        { clientX: 0, clientY: 500 },
        { clientX: 80, clientY: 500 },
      ];
      fireEvent.touchStart(text, { touches: two });
      expect(
        fireEvent.touchMove(text, {
          touches: two.map((t) => ({ ...t, clientY: 540 })),
        }),
      ).toBe(true);
      fireEvent.touchEnd(text, { touches: [] });
      // A second finger joining a pull is left to the browser (pinch zoom).
      fireEvent.touchStart(text, { touches: [two[0]] });
      expect(
        fireEvent.touchMove(text, {
          touches: two.map((t) => ({ ...t, clientY: 540 })),
        }),
      ).toBe(true);
      fireEvent.touchEnd(text, { touches: [] });
    });

    it("lets the browser pan only upward at the top of the body and contains its overscroll", () => {
      const css = readFileSync(
        join(process.cwd(), "src/components/Offcanvas/Offcanvas.css"),
        "utf8",
      );
      expect(css).toMatch(/\.ol-offcanvas__body \{[^}]*overscroll-behavior: contain/);
      expect(css).toMatch(
        /@supports \(touch-action: pan-down\)[^}]*\[data-overflow\] \.ol-offcanvas__body\[data-scroll-start\] \{\s*touch-action: pan-down pinch-zoom;/,
      );
    });

    it("dismisses on a swipe down past the lowest point and runs out from there", () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} onClose={onClose} />);
      act(() => {
        drag(headOf(), 300);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("data-swipe", "out");
      expect(dialog.style.getPropertyValue("--ol-swipe-end-y")).toBe("384px");
    });

    it("does not dismiss by swipe with closeOnSwipe={false}", () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} onClose={onClose} closeOnSwipe={false} />);
      act(() => {
        drag(headOf(), 300);
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("keeps dragging under reduced motion", () => {
      vi.useFakeTimers();
      const onSnapChange = vi.fn();
      render(
        <div className={REDUCE_MOTION_CLASS}>
          <Offcanvas open title="T" {...SHEET} onSnapChange={onSnapChange} />
        </div>,
      );
      act(() => {
        drag(handleOf(), -380, "mouse");
      });
      expect(onSnapChange).toHaveBeenCalledWith(1, "drag");
    });
  });

  describe("scrim fade", () => {
    const fade = () => scrimOf().style.getPropertyValue("--ol-scrim-fade");
    const press = (target: Element) => {
      fireEvent.pointerDown(target, {
        pointerId: 1,
        pointerType: "touch",
        button: 0,
        clientX: 0,
        clientY: 500,
      });
    };
    const moveTo = (target: Element, dy: number) => {
      vi.advanceTimersByTime(50);
      fireEvent.pointerMove(target, {
        pointerId: 1,
        pointerType: "touch",
        clientX: 0,
        clientY: 500 + dy,
      });
    };
    const release = (target: Element, dy: number) => {
      vi.advanceTimersByTime(200);
      fireEvent.pointerUp(target, {
        pointerId: 1,
        pointerType: "touch",
        clientX: 0,
        clientY: 500 + dy,
      });
    };

    it("follows a drag below the lowest point and comes back on a release that keeps the sheet", () => {
      vi.useFakeTimers();
      render(<Offcanvas open title="T" {...SHEET} onClose={() => undefined} />);
      const head = headOf();
      act(() => {
        press(head);
        moveTo(head, 96);
      });
      // 384px lowest point, 288px still shown.
      expect(fade()).toBe("0.75");
      expect(scrimOf()).toHaveAttribute("data-swipe", "drag");
      act(() => {
        moveTo(head, 192);
      });
      expect(fade()).toBe("0.5");
      act(() => {
        moveTo(head, 40);
        release(head, 40);
      });
      expect(fade()).toBe("1");
      expect(scrimOf()).toHaveAttribute("data-swipe", "return");
    });

    it("keeps its faded value when the release dismisses, so the exit continues it", () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      render(<Offcanvas open title="T" {...SHEET} onClose={onClose} />);
      act(() => {
        drag(headOf(), 300);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(fade()).toBe("0.219");
      expect(scrimOf()).toHaveAttribute("data-swipe", "out");
    });

    it("stays full for upward drags and drags between the points", () => {
      vi.useFakeTimers();
      render(<Offcanvas open title="T" {...SHEET} defaultSnap={1} onClose={() => undefined} />);
      const head = headOf();
      act(() => {
        press(head);
        moveTo(head, 300);
      });
      expect(fade()).toBe("1");
      act(() => {
        release(head, 300);
      });
      expect(screen.getByRole("dialog")).toHaveAttribute("data-snap-index", "0");
      act(() => {
        press(head);
        moveTo(head, -200);
      });
      expect(fade()).toBe("1");
    });

    it("fades the tint layer only, with the return timing tokens and no transition while dragging", () => {
      const css = readFileSync(
        join(process.cwd(), "src/components/Offcanvas/Offcanvas.css"),
        "utf8",
      );
      expect(css).toMatch(/\.ol-scrim\.ol-scrim--edge \{\s*background: none;/);
      expect(css).toMatch(
        /\.ol-scrim--edge::before \{[^}]*background: var\(--scrim\);[^}]*opacity: var\(--ol-scrim-fade, 1\);/,
      );
      expect(css).toMatch(
        /\.ol-scrim--edge\[data-swipe="return"\]::before \{\s*transition: opacity var\(--dur-m\) var\(--ease-standard\);/,
      );
      // The only transition on the tint is the return one.
      expect(css.match(/::before \{[^}]*transition/g)).toHaveLength(1);
    });

    it("follows the drag under reduced motion too", () => {
      vi.useFakeTimers();
      render(
        <div className={REDUCE_MOTION_CLASS}>
          <Offcanvas open title="T" {...SHEET} onClose={() => undefined} />
        </div>,
      );
      const head = headOf();
      act(() => {
        press(head);
        moveTo(head, 192);
      });
      expect(fade()).toBe("0.5");
    });

    it("has no axe violations mid-drag, with the scrim faded", async () => {
      render(
        <Offcanvas open title="T" {...SHEET} onClose={() => undefined}>
          <button>Apply</button>
        </Offcanvas>,
      );
      const head = headOf();
      const at = (clientY: number) => ({ pointerId: 1, pointerType: "touch", clientX: 0, clientY });
      fireEvent.pointerDown(head, { ...at(500), button: 0 });
      fireEvent.pointerMove(head, at(600));
      fireEvent.pointerMove(head, at(692));
      expect(scrimOf()).toHaveAttribute("data-swipe", "drag");
      expect(fade()).toBe("0.5");
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("is not written without a scrim", () => {
      vi.useFakeTimers();
      render(<Offcanvas open title="T" {...SHEET} modal={false} onClose={() => undefined} />);
      act(() => {
        drag(headOf(), 100);
      });
      expect(document.querySelector(".ol-scrim")).toBeNull();
    });
  });

  describe("software keyboard", () => {
    class FakeViewport extends EventTarget {
      height = window.innerHeight;
      offsetTop = 0;
      scale = 1;
    }
    let viewport: FakeViewport;

    const install = () => {
      viewport = new FakeViewport();
      Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    };
    afterEach(() => {
      Reflect.deleteProperty(window, "visualViewport");
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    });

    const inset = () => panelEl().style.getPropertyValue("--ol-keyboard-inset");
    const keyboard = (height: number, offsetTop = 0, type = "resize") => {
      viewport.height = height;
      viewport.offsetTop = offsetTop;
      act(() => {
        viewport.dispatchEvent(new Event(type));
      });
    };

    it("lifts the sheet above the keyboard, shrinks its points to fit and keeps the field in view", async () => {
      install();
      const scrollIntoView = vi.fn();
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: scrollIntoView,
      });
      render(
        <Offcanvas open title="T" {...SHEET} defaultSnap={1}>
          <input aria-label="Search" />
        </Offcanvas>,
      );
      const dialog = screen.getByRole("dialog");
      expect(inset()).toBe("");
      expect(dialog.style.getPropertyValue("--ol-sheet-height")).toBe("768px");
      const field = screen.getByRole("textbox", { name: "Search" });
      field.focus();
      keyboard(468);
      expect(inset()).toBe("300px");
      expect(dialog.style.getPropertyValue("--ol-sheet-height")).toBe("468px");
      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
      });
      expect(scrollIntoView.mock.contexts[0]).toBe(field);
      // The visual viewport scrolled down within the page: less of it is covered.
      keyboard(468, 100, "scroll");
      expect(inset()).toBe("200px");
      keyboard(window.innerHeight);
      expect(inset()).toBe("0px");
      expect(dialog.style.getPropertyValue("--ol-sheet-height")).toBe("768px");
    });

    it("never writes a negative inset", () => {
      install();
      render(<Offcanvas open title="T" placement="bottom" />);
      keyboard(window.innerHeight + 40);
      expect(inset()).toBe("");
    });

    it("stops listening and clears the inset on unmount", () => {
      install();
      const remove = vi.spyOn(viewport, "removeEventListener");
      const { rerender } = render(<Offcanvas open title="T" placement="bottom" />);
      keyboard(468);
      expect(inset()).toBe("300px");
      const panel = panelEl();
      rerender(<Offcanvas open title="T" placement="end" />);
      expect(panel.style.getPropertyValue("--ol-keyboard-inset")).toBe("");
      expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
      expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    });

    it("leaves side panels alone", () => {
      install();
      const add = vi.spyOn(viewport, "addEventListener");
      render(<Offcanvas open title="T" placement="end" />);
      keyboard(468);
      expect(add).not.toHaveBeenCalled();
      expect(inset()).toBe("");
    });

    it("lifts a non-modal sheet only while focus is inside it", async () => {
      install();
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn(),
      });
      render(
        <>
          <input aria-label="Page field" />
          <Offcanvas open title="T" {...SHEET} modal={false}>
            <input aria-label="Sheet field" />
          </Offcanvas>
        </>,
      );
      act(() => {
        screen.getByRole("textbox", { name: "Page field" }).focus();
      });
      keyboard(468);
      // The page field keeps the strip above the keyboard.
      expect(inset()).toBe("");
      act(() => {
        screen.getByRole("textbox", { name: "Sheet field" }).focus();
      });
      await waitFor(() => {
        expect(inset()).toBe("300px");
      });
      act(() => {
        screen.getByRole("textbox", { name: "Page field" }).focus();
      });
      await waitFor(() => {
        expect(inset()).toBe("0px");
      });
    });

    it("does not take a pinch zoom for a keyboard", () => {
      install();
      render(<Offcanvas open title="T" {...SHEET} />);
      const dialog = screen.getByRole("dialog");
      viewport.scale = 2;
      keyboard(window.innerHeight / 2, 100);
      expect(inset()).toBe("");
      expect(dialog.style.getPropertyValue("--ol-sheet-height")).toBe("768px");
      // Back at scale 1 the keyboard counts again; a later zoom keeps that value.
      viewport.scale = 1;
      keyboard(468);
      expect(inset()).toBe("300px");
      viewport.scale = 1.5;
      keyboard(200, 40, "scroll");
      expect(inset()).toBe("300px");
    });

    it("has no axe violations with the keyboard up", async () => {
      install();
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn(),
      });
      render(
        <Offcanvas open title="T" {...SHEET} onClose={() => undefined}>
          <input aria-label="Search" />
        </Offcanvas>,
      );
      screen.getByRole("textbox", { name: "Search" }).focus();
      keyboard(468);
      expect(inset()).toBe("300px");
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("does nothing without visualViewport", () => {
      Reflect.deleteProperty(window, "visualViewport");
      render(<Offcanvas open title="T" {...SHEET} />);
      expect(inset()).toBe("");
      expect(screen.getByRole("dialog").style.getPropertyValue("--ol-sheet-height")).toBe("768px");
    });

    it("lowers the sheet's height cap and drops the home-indicator inset by the keyboard", () => {
      const css = readFileSync(
        join(process.cwd(), "src/components/Offcanvas/Offcanvas.css"),
        "utf8",
      );
      expect(css).toMatch(/inset-block-end: var\(--ol-keyboard-inset, 0\);/);
      expect(css).toMatch(/max-height: calc\([^;]*- var\(--ol-keyboard-inset, 0px\)\s*\);/);
      expect(css).toMatch(
        /max\(env\(safe-area-inset-bottom, 0px\) - var\(--ol-keyboard-inset, 0px\), 0px\)/,
      );
      expect(css).toMatch(
        /\.ol-offcanvas__body :focus \{\s*scroll-margin-block: var\(--space-2\);/,
      );
    });
  });

  describe("side swipe", () => {
    it.each([
      ["end", "ltr", 300],
      ["start", "ltr", -300],
      ["end", "rtl", -300],
      ["start", "rtl", 300],
    ] as const)("swipes the %s panel (%s) toward its edge to close", (placement, dir, dx) => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(320);
      render(
        <div dir={dir}>
          <Offcanvas open title="T" placement={placement} onClose={onClose} />
        </div>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("ol-offcanvas--swipe");
      act(() => {
        drag(dialog, 0, "touch", -dx);
      });
      expect(onClose).not.toHaveBeenCalled();
      act(() => {
        drag(dialog, 0, "touch", dx);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(dialog).toHaveAttribute("data-swipe", "out");
    });

    it("does not swipe with closeOnSwipe={false} or without onClose", () => {
      const { rerender } = render(
        <Offcanvas open title="T" onClose={() => undefined} closeOnSwipe={false} />,
      );
      expect(screen.getByRole("dialog")).not.toHaveClass("ol-offcanvas--swipe");
      rerender(<Offcanvas open title="T" />);
      expect(screen.getByRole("dialog")).not.toHaveClass("ol-offcanvas--swipe");
    });

    it("still calls the app's own pointer handlers", () => {
      const onPointerDown = vi.fn();
      render(<Offcanvas open title="T" onClose={() => undefined} onPointerDown={onPointerDown} />);
      fireEvent.pointerDown(screen.getByRole("dialog"), { pointerType: "touch" });
      expect(onPointerDown).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the theme and language of the surrounding Root", () => {
    render(
      <Root theme="sumi" locale="es">
        <Offcanvas open title="T" onClose={() => undefined} />
      </Root>,
    );
    const layer = document.querySelector(".ol-portal");
    expect(layer).toHaveAttribute("data-theme", "sumi");
    expect(layer).toHaveAttribute("lang", "es");
  });

  it("localises the close label and lets aria-label win over the title", () => {
    const { rerender } = render(
      <Root locale="es">
        <Offcanvas open title="T" onClose={() => undefined} />
      </Root>,
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    rerender(
      <Root locale="ja">
        <Offcanvas open title="T" onClose={() => undefined} aria-label="Custom" />
      </Root>,
    );
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Custom" })).toBeInTheDocument();
  });

  it.each([
    ["en", "Expand panel", "Collapse panel", "Size 2 of 2"],
    ["es", "Ampliar panel", "Contraer panel", "Tamaño 2 de 2"],
    ["ja", "パネルを展開", "パネルを折りたたむ", "サイズ 2/2"],
  ] as const)("localises the handle and the status (%s)", (locale, expand, collapse, size) => {
    render(
      <Root locale={locale}>
        <Offcanvas open title="T" {...SHEET} />
      </Root>,
    );
    fireEvent.click(screen.getByRole("button", { name: expand }));
    expect(screen.getByRole("button", { name: collapse })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(size);
  });

  it("takes every duration and curve from the motion tokens", () => {
    const css = readFileSync(join(process.cwd(), "src/components/Offcanvas/Offcanvas.css"), "utf8");
    expect(css).not.toMatch(/\d(ms|s)\b/);
    expect(css).not.toMatch(/cubic-bezier|ease-in|ease-out|linear\b/);
    expect(css).not.toMatch(/--motion-(slow|base)/);
    expect(css).toMatch(/\[data-travel\][^}]*var\(--dur-m\) var\(--ease-move\)/);
    expect(css).toMatch(/\[data-travel="release"\][^}]*var\(--ease-standard\)/);
    const modal = readFileSync(join(process.cwd(), "src/components/Modal/Modal.css"), "utf8");
    expect(modal).not.toMatch(/ol-scrim-in|--motion-base/);
  });

  describe("axe", () => {
    it.each(["end", "start", "bottom"] as const)(
      "has no violations open (%s)",
      async (placement) => {
        render(<Harness placement={placement} />);
        openHarness();
        await act(async () => {
          await Promise.resolve();
        });
        expect(await runAxe(screen.getByRole("dialog"))).toHaveNoViolations();
      },
    );

    it.each([false, true])(
      "has no violations as a sheet at a partial and the tallest point (modal %s)",
      async (modal) => {
        render(
          <Root theme="sumi">
            <Offcanvas open title="T" {...SHEET} modal={modal} onClose={() => undefined}>
              <button>Apply</button>
            </Offcanvas>
          </Root>,
        );
        expect(await runAxe(document.body)).toHaveNoViolations();
        fireEvent.click(handleOf());
        expect(await runAxe(document.body)).toHaveNoViolations();
      },
    );

    it("has no violations closed", async () => {
      const { container } = render(<Harness />);
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});

describe("snap points", () => {
  const context = { available: 800, rem: 16, content: 240 };

  it("resolves shares, lengths and content, clamped to the available height", () => {
    expect(toPx(0.5, context)).toBe(400);
    expect(toPx(1, context)).toBe(800);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(toPx(300, context)).toBe(800);
    expect(toPx(-1, context)).toBe(0);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("snap point 300"));
    warn.mockRestore();
    expect(toPx("2000px", context)).toBe(800);
    expect(toPx("10rem", context)).toBe(160);
    expect(toPx("content", context)).toBe(240);
    expect(toPx("nopx" as "1px", context)).toBe(0);
  });

  it("sorts ascending and drops duplicates by value or height", () => {
    const points = resolvePoints([1, "content", 0.5, "240px", 0.5], context);
    expect(points.map((p) => p.value)).toEqual(["content", 0.5, 1]);
    expect(indexOfPoint(points, "240px", context)).toBe(0);
    expect(indexOfPoint(points, 1, null)).toBe(2);
    expect(indexOfPoint(points, undefined, context)).toBe(-1);
  });
});
