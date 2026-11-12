import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Dropdown } from "../Dropdown";
import { Root } from "../Root";
import { Modal } from "./Modal";

function Harness({
  closeOnScrim = true,
  closeButton,
  onClose,
}: {
  closeOnScrim?: boolean;
  closeButton?: boolean;
  onClose?: () => void;
}) {
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
      <Modal
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="Start"
        closeOnScrim={closeOnScrim}
        {...(closeButton === undefined ? null : { closeButton })}
        footer={<button>Send</button>}
      >
        <input aria-label="Email" />
      </Modal>
    </div>
  );
}

const scrimOf = () => {
  const el = document.querySelector<HTMLElement>(".ol-scrim");
  if (!el) throw new Error("no scrim");
  return el;
};

/** The dialog element, also while it is closing (inert). */
const dialogEl = () => document.querySelector<HTMLElement>(".ol-modal");

/** Waits for the exit to finish and the dialog to unmount. */
const gone = () =>
  waitFor(() => {
    expect(dialogEl()).toBeNull();
  });

const openHarness = () => {
  const trigger = screen.getByRole("button", { name: "Open" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};

describe("Modal", () => {
  // jsdom has no animations: a closing dialog unmounts on the next microtask.
  stubNoAnimations();

  it("renders nothing while closed", () => {
    render(<Modal open={false} title="Hi" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".ol-scrim")).toBeNull();
  });

  it("renders a labelled modal dialog with className and native props", () => {
    render(
      <Modal open title="Start" index={3} className="x" data-testid="m">
        Body
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Start" });
    expect(dialog).toHaveClass("ol-modal", "x");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(dialog).toHaveAttribute("data-testid", "m");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Start");
    expect(screen.getByText("03")).toHaveClass("ol-modal__index");
    expect(dialog.getAttribute("aria-labelledby")).toBe(screen.getByRole("heading").id);
  });

  it("keeps a string index as is and renders the footer", () => {
    render(
      <Modal open title="T" index="03 — Inquiry" footer={<button>Go</button>}>
        x
      </Modal>,
    );
    expect(screen.getByText("03 — Inquiry")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go" }).parentElement).toHaveClass("ol-modal__foot");
  });

  it.each([
    ["s", "ol-modal--s"],
    ["l", "ol-modal--l"],
    ["full", "ol-modal--full"],
  ] as const)("maps size %s to %s", (size, cls) => {
    render(<Modal open title="T" size={size} />);
    expect(screen.getByRole("dialog")).toHaveClass(cls);
  });

  it("has no size modifier by default", () => {
    render(<Modal open title="T" />);
    expect(screen.getByRole("dialog").className).toBe("ol-modal ol-kakejiku");
  });

  it("renders into a portal outside the render container", () => {
    const { container } = render(<Modal open title="T" />);
    expect(container.querySelector(".ol-modal")).toBeNull();
    expect(document.body.querySelector(".ol-portal .ol-modal")).not.toBeNull();
  });

  it("forwards the ref to the dialog", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Modal ref={ref} open title="T" />);
    expect(ref.current).toBe(screen.getByRole("dialog"));
  });

  it("opens, moves focus in and closes on Escape returning focus to the trigger", async () => {
    render(<Harness />);
    const trigger = openHarness();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
    await gone();
    expect(trigger).toHaveFocus();
  });

  it("closes from the close button", async () => {
    render(<Harness />);
    openHarness();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await gone();
  });

  it("hides the close button without onClose", () => {
    render(<Modal open title="T" />);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("wraps Tab and Shift+Tab inside the dialog", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const last = screen.getByRole("button", { name: "Send" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("closes when a click both starts and ends on the scrim", () => {
    const onClose = vi.fn();
    render(<Modal open title="T" onClose={onClose} />);
    fireEvent.pointerDown(scrimOf());
    fireEvent.click(scrimOf());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when the press started inside the dialog", () => {
    const onClose = vi.fn();
    render(<Modal open title="T" onClose={onClose} />);
    fireEvent.pointerDown(screen.getByRole("dialog"));
    fireEvent.click(scrimOf());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on a click inside the dialog", () => {
    const onClose = vi.fn();
    render(<Modal open title="T" onClose={onClose} />);
    fireEvent.pointerDown(screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores the scrim when closeOnScrim is false", () => {
    render(<Harness closeOnScrim={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.pointerDown(scrimOf());
    fireEvent.click(scrimOf());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("locks body scroll while open and releases it as soon as it starts closing", () => {
    render(<Harness />);
    openHarness();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(dialogEl()).not.toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("makes the page behind inert while open and frees it as soon as it starts closing", () => {
    const { container } = render(<Harness />);
    openHarness();
    expect(container).toHaveAttribute("inert");
    expect(document.querySelector(".ol-portal")).not.toHaveAttribute("inert");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(dialogEl()).not.toBeNull();
    expect(container).not.toHaveAttribute("inert");
  });

  it("keeps the theme and language of the surrounding Root", () => {
    render(
      <Root theme="sumi" locale="es">
        <Modal open title="T" onClose={() => undefined} />
      </Root>,
    );
    const layer = document.querySelector(".ol-portal");
    expect(layer).toHaveAttribute("data-theme", "sumi");
    expect(layer).toHaveAttribute("lang", "es");
  });

  it("localises the close label and lets aria-label on the dialog win over the title", () => {
    const { rerender } = render(
      <Root locale="es">
        <Modal open title="T" onClose={() => undefined} />
      </Root>,
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    rerender(
      <Root locale="ja">
        <Modal open title="T" onClose={() => undefined} aria-label="Custom" />
      </Root>,
    );
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Custom" })).toBeInTheDocument();
  });

  it("has no axe violations open", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(await runAxe(screen.getByRole("dialog"))).toHaveNoViolations();
  });

  it("has no axe violations closed", async () => {
    const { container } = render(<Harness />);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("warns in development when the dialog has no accessible name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { rerender } = render(<Modal open>x</Modal>);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));
    warn.mockClear();
    rerender(
      <Modal open aria-label="Named">
        x
      </Modal>,
    );
    rerender(
      <Modal open title="Named">
        x
      </Modal>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns in development when only Escape can close the dialog", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { rerender } = render(
      <Modal open title="Locked" closeButton={false} closeOnScrim={false}>
        x
      </Modal>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("only Escape"));
    warn.mockClear();
    rerender(
      <Modal
        open
        title="Locked"
        closeButton={false}
        closeOnScrim={false}
        footer={<button>Done</button>}
      >
        x
      </Modal>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  describe("nested", () => {
    function Nested() {
      const [outer, setOuter] = useState(false);
      const [inner, setInner] = useState(false);
      return (
        <div>
          <button
            onClick={() => {
              setOuter(true);
            }}
          >
            Open outer
          </button>
          <Modal
            open={outer}
            title="Outer"
            onClose={() => {
              setOuter(false);
            }}
          >
            <button
              onClick={() => {
                setInner(true);
              }}
            >
              Open inner
            </button>
            <button
              onClick={() => {
                setOuter(false);
              }}
            >
              Done outer
            </button>
          </Modal>
          <Modal
            open={inner}
            title="Inner"
            onClose={() => {
              setInner(false);
            }}
          >
            <input aria-label="Inner field" />
          </Modal>
        </div>
      );
    }

    function openBoth() {
      const view = render(<Nested />);
      const outerTrigger = screen.getByRole("button", { name: "Open outer" });
      outerTrigger.focus();
      fireEvent.click(outerTrigger);
      const innerTrigger = screen.getByRole("button", { name: "Open inner" });
      innerTrigger.focus();
      fireEvent.click(innerTrigger);
      return { ...view, innerTrigger };
    }

    const inner = () => document.querySelector<HTMLElement>('[aria-label="Inner field"]');

    it("Escape closes only the inner modal and focus returns to the outer dialog", async () => {
      const { container, innerTrigger } = openBoth();
      expect(screen.getAllByRole("dialog")).toHaveLength(2);
      expect(inner()).not.toBeNull();
      fireEvent.keyDown(document, { key: "Escape" });
      // Focus is back in the outer dialog while the inner one is still rolling up.
      expect(screen.getByRole("dialog", { name: "Inner" })).toHaveAttribute(
        "data-state",
        "closing",
      );
      expect(innerTrigger).toHaveFocus();
      expect(
        screen.getByRole("dialog", { name: "Outer" }).closest(".ol-portal"),
      ).not.toHaveAttribute("inert");
      await waitFor(() => {
        expect(screen.getAllByRole("dialog")).toHaveLength(1);
      });
      expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();
      expect(innerTrigger).toHaveFocus();
      expect(container).toHaveAttribute("inert");
      fireEvent.keyDown(document, { key: "Escape" });
      await gone();
      expect(container).not.toHaveAttribute("inert");
    });

    it("a second Escape during the inner exit closes the outer modal", async () => {
      const { container } = openBoth();
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.keyDown(document, { key: "Escape" });
      for (const dialog of document.querySelectorAll(".ol-modal")) {
        expect(dialog).toHaveAttribute("data-state", "closing");
      }
      expect(screen.getByRole("button", { name: "Open outer" })).toHaveFocus();
      await gone();
      expect(container).not.toHaveAttribute("inert");
      expect(document.body.style.overflow).toBe("");
    });

    it("keeps the page inert until both are closed, also when the outer closes first", async () => {
      const { container } = openBoth();
      fireEvent.click(screen.getByRole("button", { name: "Done outer", hidden: true }));
      expect(screen.getByRole("dialog", { name: "Inner" })).toBeInTheDocument();
      expect(container).toHaveAttribute("inert");
      fireEvent.keyDown(document, { key: "Escape" });
      await gone();
      expect(container).not.toHaveAttribute("inert");
      expect(document.body.style.overflow).toBe("");
    });
  });

  it("keeps focus in a Dropdown menu opened inside a Modal; Escape closes only the menu", async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Menu" onClose={onClose}>
        <Dropdown label="Actions" items={[{ label: "Rename" }, { label: "Delete" }]} />
      </Modal>,
    );
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(menu.contains(document.activeElement)).toBe(true);
    // jsdom reports no animations, so the closing menu unmounts on the next microtask.
    Object.defineProperty(menu, "getAnimations", { value: () => [] });
    fireEvent.keyDown(document.activeElement ?? menu, { key: "Escape" });
    expect(menu).toHaveAttribute("inert");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("scrollbar compensation", () => {
    afterEach(() => {
      vi.restoreAllMocks();
      document.body.style.paddingRight = "";
    });

    it("pads the body by the scrollbar width and restores it", () => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1009);
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: "Open" }));
      expect(document.body.style.paddingRight).toBe("15px");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(document.body.style.paddingRight).toBe("");
    });
  });

  it("has no axe violations in the full size with a footer", async () => {
    render(
      <Modal
        open
        size="full"
        title="Full"
        index={1}
        onClose={() => undefined}
        footer={<button>Save</button>}
      >
        <p>Body</p>
      </Modal>,
    );
    expect(await runAxe(screen.getByRole("dialog"))).toHaveNoViolations();
  });

  describe("closeButton", () => {
    it("hides the close button when false even with onClose; Escape still closes", async () => {
      const onClose = vi.fn();
      render(<Harness closeButton={false} onClose={onClose} />);
      const trigger = openHarness();
      expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
      // Focus lands on the first field instead of the missing button.
      expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(trigger).toHaveFocus();
      await gone();
    });

    it("still closes on the scrim when false", () => {
      const onClose = vi.fn();
      render(<Modal open title="T" closeButton={false} onClose={onClose} />);
      fireEvent.pointerDown(scrimOf());
      fireEvent.click(scrimOf());
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("shows the close button by default and when true", () => {
      const { rerender } = render(<Modal open title="T" onClose={() => undefined} />);
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
      rerender(<Modal open title="T" closeButton onClose={() => undefined} />);
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("drops the head when there is no title, index or close button", () => {
      render(
        <Modal open aria-label="Plain" closeButton={false} onClose={() => undefined}>
          Body
        </Modal>,
      );
      expect(screen.getByRole("dialog", { name: "Plain" })).toBeInTheDocument();
      expect(document.querySelector(".ol-modal__head")).toBeNull();
    });

    it("has no axe violations without the close button", async () => {
      render(
        <Modal
          open
          title="Discard draft?"
          closeButton={false}
          onClose={() => undefined}
          footer={<button>Cancel</button>}
        >
          <p>Body</p>
        </Modal>,
      );
      expect(await runAxe(document.body)).toHaveNoViolations();
    });
  });

  describe("motion", () => {
    /** Reports one running exit animation per element until `end()` is called. */
    function holdAnimations() {
      let end: () => void = () => undefined;
      const finished = new Promise<undefined>((resolve) => {
        end = () => {
          resolve(undefined);
        };
      });
      const animation = {
        effect: { getComputedTiming: () => ({ endTime: 400 }) },
        finished,
      } as unknown as Animation;
      const spy = vi.spyOn(Element.prototype, "getAnimations").mockReturnValue([animation]);
      return {
        end: async () => {
          await act(async () => {
            end();
            await finished;
          });
        },
        restore: () => {
          spy.mockRestore();
        },
      };
    }

    it("unrolls with kakejiku and puts the state on the dialog and the scrim", () => {
      render(<Harness />);
      openHarness();
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("ol-kakejiku");
      expect(dialog).toHaveAttribute("data-state", "open");
      expect(dialog).not.toHaveAttribute("data-side");
      expect(scrimOf()).toHaveAttribute("data-state", "open");
    });

    it("keeps the dialog mounted and inert while it rolls up, then unmounts", async () => {
      const held = holdAnimations();
      render(<Harness />);
      const trigger = openHarness();
      fireEvent.keyDown(document, { key: "Escape" });
      const dialog = dialogEl();
      expect(dialog).toHaveAttribute("data-state", "closing");
      expect(dialog).toHaveAttribute("inert");
      expect(scrimOf()).toHaveAttribute("data-state", "closing");
      // The trap is released: focus is on the trigger and Tab is left to the page.
      expect(trigger).toHaveFocus();
      expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(true);
      expect(trigger).toHaveFocus();
      await held.end();
      held.restore();
      await gone();
      expect(document.querySelector(".ol-scrim")).toBeNull();
      expect(trigger).toHaveFocus();
    });

    it("calls onExited once the roll-up has finished, not before", async () => {
      const held = holdAnimations();
      const onExited = vi.fn();
      const { rerender } = render(
        <Modal open title="Exit" onClose={() => undefined} onExited={onExited}>
          Body
        </Modal>,
      );
      rerender(
        <Modal open={false} title="Exit" onClose={() => undefined} onExited={onExited}>
          Body
        </Modal>,
      );
      expect(onExited).not.toHaveBeenCalled();
      await held.end();
      held.restore();
      await gone();
      expect(onExited).toHaveBeenCalledTimes(1);
    });

    it("ignores Escape and the scrim during the exit", async () => {
      const held = holdAnimations();
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      openHarness();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.pointerDown(scrimOf());
      fireEvent.click(scrimOf());
      expect(onClose).toHaveBeenCalledTimes(1);
      await held.end();
      held.restore();
      await gone();
    });

    it("reopens mid-exit: open again, no longer inert and focus back inside", async () => {
      const held = holdAnimations();
      const { container } = render(<Harness />);
      const trigger = openHarness();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(dialogEl()).toHaveAttribute("data-state", "closing");
      fireEvent.click(trigger);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("data-state", "open");
      expect(dialog).not.toHaveAttribute("inert");
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
      expect(container).toHaveAttribute("inert");
      await held.end();
      held.restore();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("unmounts on animationend where getAnimations is missing", async () => {
      // Removed again by stubNoAnimations after the test.
      Object.defineProperty(Element.prototype, "getAnimations", {
        configurable: true,
        value: undefined,
      });
      render(<Harness />);
      openHarness();
      fireEvent.keyDown(document, { key: "Escape" });
      const dialog = dialogEl();
      expect(dialog).not.toBeNull();
      if (dialog) fireEvent.animationEnd(dialog);
      await gone();
    });

    it("unmounts after the safety timeout when no end is reported", () => {
      vi.useFakeTimers();
      try {
        // Removed again by stubNoAnimations after the test.
        Object.defineProperty(Element.prototype, "getAnimations", {
          configurable: true,
          value: undefined,
        });
        render(<Harness />);
        openHarness();
        fireEvent.keyDown(document, { key: "Escape" });
        expect(dialogEl()).not.toBeNull();
        act(() => {
          vi.advanceTimersByTime(2000);
        });
        expect(dialogEl()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("opens and closes under reduced motion, with the setting carried into the layer", async () => {
      render(
        <div className={REDUCE_MOTION_CLASS}>
          <Harness />
        </div>,
      );
      const trigger = openHarness();
      expect(screen.getByRole("dialog")).toHaveClass("ol-kakejiku");
      await waitFor(() => {
        expect(document.querySelector(".ol-portal")).toHaveClass(REDUCE_MOTION_CLASS);
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(trigger).toHaveFocus();
      await gone();
    });

    it("takes every duration and curve from the motion tokens", () => {
      const css = readFileSync(join(process.cwd(), "src/components/Modal/Modal.css"), "utf8");
      expect(css).not.toMatch(/\d(ms|s)\b/);
      expect(css).not.toMatch(/cubic-bezier|ease-in|ease-out|linear\b/);
      expect(css).not.toMatch(/ol-modal-in|--motion-slow/);
      expect(css).toMatch(/\.ol-scrim\[data-state\][^}]*var\(--dur-s\)/);
      expect(css).toMatch(/\.ol-scrim\[data-state="closing"\][^}]*var\(--dur-l\)/);
    });
  });

  it("has no axe violations open in the sumi theme", async () => {
    render(
      <Root theme="sumi">
        <Modal open title="Sumi" index={2} onClose={() => undefined} footer={<button>Save</button>}>
          <p>Body</p>
        </Modal>
      </Root>,
    );
    expect(await runAxe(document.body)).toHaveNoViolations();
  });
});
