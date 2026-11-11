import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, type Ref, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { HoverCard, type HoverCardProps } from "./HoverCard";

const mouse = { pointerType: "mouse", button: 0 };
const touch = { pointerType: "touch", button: 0 };

const setup = (props: Partial<HoverCardProps> & { ref?: Ref<HTMLDivElement> } = {}) =>
  render(
    <Root>
      <main>
        <p>
          Designed by{" "}
          <HoverCard
            data-testid="card"
            trigger={<a href="/people/aiko">Aiko Tanaka</a>}
            content={
              <>
                <p>Furniture maker in Matsumoto.</p>
                <a href="/people/aiko/works">Works</a>
                <button type="button">Follow</button>
              </>
            }
            {...props}
          />
        </p>
        <button type="button">Elsewhere</button>
      </main>
    </Root>,
  );

const link = () => screen.getByRole("link", { name: "Aiko Tanaka" });
const card = () => screen.queryByTestId("card");
const shown = (): HTMLElement => {
  const node = card();
  if (!node) throw new Error("the card is not rendered");
  return node;
};
const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const hoverOpen = () => {
  fireEvent.pointerEnter(link(), mouse);
  advance(600);
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HoverCard", () => {
  it("leaves the link alone: no ARIA, only data-state", () => {
    setup();
    expect(link()).toHaveAttribute("data-state", "closed");
    expect(link()).not.toHaveAttribute("aria-describedby");
    expect(link()).not.toHaveAttribute("aria-expanded");
    expect(link()).not.toHaveAttribute("aria-haspopup");
    expect(card()).toBeNull();
  });

  it("opens after openDelay on mouse hover as a plain, unannounced div", () => {
    const ref = createRef<HTMLDivElement>();
    setup({ ref, className: "x" });
    fireEvent.pointerEnter(link(), mouse);
    advance(599);
    expect(card()).toBeNull();
    advance(1);
    const node = card();
    expect(node).not.toBeNull();
    expect(node).toHaveClass("ol-floating", "ol-hover-card", "x");
    expect(node).not.toHaveAttribute("role");
    expect(node).not.toHaveAttribute("aria-hidden");
    expect(node).not.toHaveAttribute("aria-live");
    expect(node?.querySelector(".ol-hover-card__body")).not.toBeNull();
    expect(ref.current).toBe(node);
    expect(link()).toHaveAttribute("data-state", "open");
    expect(link()).not.toHaveAttribute("aria-describedby");
  });

  it("closes closeDelay after the pointer leaves the link", () => {
    setup();
    hoverOpen();
    fireEvent.pointerLeave(link(), mouse);
    advance(299);
    expect(card()).not.toBeNull();
    advance(1);
    expect(card()).toBeNull();
  });

  it("keeps a 100 ms grace even with a zero closeDelay", () => {
    setup({ closeDelay: 0 });
    hoverOpen();
    fireEvent.pointerLeave(link(), mouse);
    advance(99);
    expect(card()).not.toBeNull();
    advance(1);
    expect(card()).toBeNull();
  });

  it("stays open while the pointer moves onto the card", () => {
    setup();
    hoverOpen();
    fireEvent.pointerLeave(link(), mouse);
    advance(50);
    fireEvent.pointerEnter(shown(), mouse);
    advance(1000);
    expect(card()).not.toBeNull();
    fireEvent.pointerLeave(shown(), mouse);
    advance(300);
    expect(card()).toBeNull();
  });

  it("never opens on touch", () => {
    setup();
    fireEvent.pointerEnter(link(), touch);
    fireEvent.pointerDown(link(), touch);
    advance(2000);
    expect(card()).toBeNull();
  });

  it("opens on keyboard focus after openDelay and keeps focus on the link", () => {
    setup();
    act(() => {
      link().focus();
    });
    advance(599);
    expect(card()).toBeNull();
    advance(1);
    expect(card()).not.toBeNull();
    expect(link()).toHaveFocus();
  });

  it("closes at once when focus leaves the link", () => {
    setup();
    act(() => {
      link().focus();
    });
    advance(600);
    act(() => {
      screen.getByRole("button", { name: "Elsewhere" }).focus();
    });
    expect(card()).toBeNull();
  });

  it("gives focus back to the link when it closes with focus inside", () => {
    setup();
    hoverOpen();
    fireEvent.pointerLeave(link(), mouse);
    fireEvent.pointerEnter(shown(), mouse);
    act(() => {
      screen.getByRole("button", { name: "Follow" }).focus();
    });
    fireEvent.pointerLeave(shown(), mouse);
    advance(300);
    expect(card()).toBeNull();
    expect(link()).toHaveFocus();
  });

  it("does not open on focus caused by a press", () => {
    setup();
    fireEvent.pointerDown(link(), mouse);
    act(() => {
      link().focus();
    });
    fireEvent.pointerUp(link(), mouse);
    advance(2000);
    expect(card()).toBeNull();
  });

  it("closes on Escape without moving focus", () => {
    setup();
    act(() => {
      link().focus();
    });
    advance(600);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(card()).toBeNull();
    expect(link()).toHaveFocus();
  });

  it("closes at once on a press on the link", () => {
    setup();
    hoverOpen();
    fireEvent.pointerDown(link(), mouse);
    expect(card()).toBeNull();
  });

  it("closes when the link is followed with Enter", () => {
    setup();
    act(() => {
      link().focus();
    });
    advance(600);
    // Enter on a link dispatches a click.
    fireEvent.click(link());
    expect(card()).toBeNull();
  });

  it("closes on an outside press and stays open on a press inside", () => {
    setup();
    hoverOpen();
    fireEvent.pointerEnter(shown(), mouse);
    fireEvent.pointerDown(shown(), mouse);
    fireEvent.pointerUp(shown(), mouse);
    expect(card()).not.toBeNull();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }), mouse);
    expect(card()).toBeNull();
  });

  it("stays open while text inside the card is selected", () => {
    setup();
    hoverOpen();
    const node = shown();
    fireEvent.pointerEnter(node, mouse);
    fireEvent.pointerDown(node, mouse);
    fireEvent.pointerLeave(link(), mouse);
    fireEvent.pointerLeave(node, mouse);
    advance(1000);
    expect(card()).not.toBeNull();

    const text = screen.getByText("Furniture maker in Matsumoto.").firstChild;
    if (!text) throw new Error("no text node");
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 9);
    act(() => {
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    });
    fireEvent.pointerUp(document, mouse);
    advance(1000);
    expect(card()).not.toBeNull();

    act(() => {
      window.getSelection()?.removeAllRanges();
      document.dispatchEvent(new Event("selectionchange"));
    });
    advance(300);
    expect(card()).toBeNull();
  });

  it("takes focusable content out of the tab order, including content added later", async () => {
    function Growing() {
      const [more, setMore] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setMore(true);
            }}
          >
            Grow
          </button>
          <HoverCard
            data-testid="card"
            defaultOpen
            trigger={<a href="/people/aiko">Aiko Tanaka</a>}
            content={
              <>
                <a href="/a">First</a>
                <button type="button">Act</button>
                <input aria-label="Note" />
                {more ? <a href="/b">Later</a> : null}
              </>
            }
          />
        </>
      );
    }
    render(<Growing />);
    const node = shown();
    for (const name of ["First", "Act"]) {
      expect(screen.getByRole(name === "Act" ? "button" : "link", { name })).toHaveAttribute(
        "tabindex",
        "-1",
      );
    }
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveAttribute("tabindex", "-1");
    expect(link()).not.toHaveAttribute("tabindex");

    fireEvent.click(screen.getByRole("button", { name: "Grow" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(node.querySelector('a[href="/b"]')).toHaveAttribute("tabindex", "-1");
  });

  it("never opens when disabled, and closes when it becomes disabled", () => {
    const { rerender } = render(
      <HoverCard data-testid="card" disabled trigger={<a href="/x">Aiko Tanaka</a>} content="c" />,
    );
    fireEvent.pointerEnter(link(), mouse);
    advance(2000);
    expect(card()).toBeNull();
    rerender(<HoverCard data-testid="card" trigger={<a href="/x">Aiko Tanaka</a>} content="c" />);
    fireEvent.pointerLeave(link(), mouse);
    fireEvent.pointerEnter(link(), mouse);
    advance(600);
    expect(card()).not.toBeNull();
    rerender(
      <HoverCard data-testid="card" disabled trigger={<a href="/x">Aiko Tanaka</a>} content="c" />,
    );
    expect(card()).toBeNull();
  });

  it("supports controlled state and reports only real changes", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <HoverCard
        data-testid="card"
        open={false}
        onOpenChange={onOpenChange}
        trigger={<a href="/x">Aiko Tanaka</a>}
        content="c"
      />,
    );
    // A quick pass over the link reports nothing.
    fireEvent.pointerEnter(link(), mouse);
    advance(100);
    fireEvent.pointerLeave(link(), mouse);
    advance(1000);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.pointerEnter(link(), mouse);
    advance(600);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(card()).toBeNull();
    rerender(
      <HoverCard
        data-testid="card"
        open
        onOpenChange={onOpenChange}
        trigger={<a href="/x">Aiko Tanaka</a>}
        content="c"
      />,
    );
    expect(card()).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it("keeps the link's own handlers and ref", () => {
    const onClick = vi.fn();
    const onFocus = vi.fn();
    const onPointerEnter = vi.fn();
    const ref = createRef<HTMLAnchorElement>();
    render(
      <HoverCard
        trigger={
          <a
            href="/x"
            ref={ref}
            onClick={onClick}
            onFocus={onFocus}
            onPointerEnter={onPointerEnter}
          >
            Aiko Tanaka
          </a>
        }
        content="c"
      />,
    );
    fireEvent.pointerEnter(link(), mouse);
    act(() => {
      link().focus();
    });
    fireEvent.click(link());
    expect(onPointerEnter).toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
    expect(ref.current).toBe(link());
  });

  it("warns in development when the trigger is not a link", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<HoverCard trigger={<button type="button">Aiko</button>} content="c" />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("HoverCard"));
    warn.mockClear();
    render(<HoverCard trigger={<a href="/x">Aiko</a>} content="c" />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("reports the side it opened on", () => {
    render(
      <HoverCard
        data-testid="card"
        defaultOpen
        placement="left"
        trigger={<a href="/x">Aiko Tanaka</a>}
        content="c"
      />,
    );
    expect(["left", "right"]).toContain(card()?.getAttribute("data-placement"));
  });

  it("has no axe violations closed and open", async () => {
    setup();
    vi.useRealTimers();
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
    vi.useFakeTimers();
    hoverOpen();
    vi.useRealTimers();
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
