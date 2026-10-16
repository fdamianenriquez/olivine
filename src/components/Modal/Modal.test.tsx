import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Dropdown } from "../Dropdown";
import { Root } from "../Root";
import { Modal } from "./Modal";

function Harness({ closeOnScrim = true }: { closeOnScrim?: boolean }) {
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
          setOpen(false);
        }}
        title="Start"
        closeOnScrim={closeOnScrim}
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

describe("Modal", () => {
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
    expect(screen.getByRole("dialog").className).toBe("ol-modal");
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

  it("opens, moves focus in and closes on Escape returning focus to the trigger", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes from the close button", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
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

  it("locks body scroll while open and releases it on close", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  it("makes the page behind inert while open", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(container).toHaveAttribute("inert");
    expect(document.querySelector(".ol-portal")).not.toHaveAttribute("inert");
    fireEvent.keyDown(document, { key: "Escape" });
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
      fireEvent.click(screen.getByRole("button", { name: "Open outer" }));
      const innerTrigger = screen.getByRole("button", { name: "Open inner" });
      innerTrigger.focus();
      fireEvent.click(innerTrigger);
      return { ...view, innerTrigger };
    }

    it("Escape closes only the inner modal and focus returns to the outer dialog", () => {
      const { container, innerTrigger } = openBoth();
      expect(screen.getAllByRole("dialog")).toHaveLength(2);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();
      expect(innerTrigger).toHaveFocus();
      expect(container).toHaveAttribute("inert");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(container).not.toHaveAttribute("inert");
    });

    it("keeps the page inert until both are closed, also when the outer closes first", () => {
      const { container } = openBoth();
      fireEvent.click(screen.getByRole("button", { name: "Done outer", hidden: true }));
      expect(screen.getByRole("dialog", { name: "Inner" })).toBeInTheDocument();
      expect(container).toHaveAttribute("inert");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(container).not.toHaveAttribute("inert");
      expect(document.body.style.overflow).toBe("");
    });
  });

  it("keeps focus in a Dropdown menu opened inside a Modal; Escape closes only the menu", async () => {
    render(
      <Modal open title="Menu" onClose={() => undefined}>
        <Dropdown label="Actions" items={[{ label: "Rename" }, { label: "Delete" }]} />
      </Modal>,
    );
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(menu.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement ?? menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
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
});
