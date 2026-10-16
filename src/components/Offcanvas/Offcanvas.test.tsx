import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Offcanvas, type OffcanvasPlacement } from "./Offcanvas";

function Harness({ placement = "end" }: { placement?: OffcanvasPlacement }) {
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

describe("Offcanvas", () => {
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
    expect(screen.getByText("Filters").id).toBe(dialog.getAttribute("aria-labelledby"));
    expect(document.querySelector(".ol-scrim")).toHaveClass("ol-scrim--edge");
  });

  it("defaults to the end placement", () => {
    render(<Offcanvas open title="T" />);
    expect(screen.getByRole("dialog")).toHaveClass("ol-offcanvas--end");
  });

  it.each(["end", "start", "bottom"] as const)("maps placement %s to its class", (placement) => {
    render(<Offcanvas open title="T" placement={placement} />);
    expect(screen.getByRole("dialog")).toHaveClass(`ol-offcanvas--${placement}`);
  });

  it("uses logical placement classes so start and end follow the direction", () => {
    render(
      <div dir="rtl">
        <Offcanvas open title="T" placement="start" />
      </div>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("ol-offcanvas--start");
    expect(document.querySelector(".ol-portal")).toBeInTheDocument();
  });

  it("renders into a portal outside the render container", () => {
    const { container } = render(<Offcanvas open title="T" />);
    expect(container.querySelector(".ol-offcanvas")).toBeNull();
    expect(document.body.querySelector(".ol-portal .ol-offcanvas")).not.toBeNull();
  });

  it("forwards the ref to the dialog", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Offcanvas ref={ref} open title="T" />);
    expect(ref.current).toBe(screen.getByRole("dialog"));
  });

  it("opens, moves focus in and closes on Escape returning focus to the trigger", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes from the close button and hides it without onClose", () => {
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    render(<Offcanvas open title="T" />);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("wraps Tab and Shift+Tab inside the panel", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
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

  it("locks body scroll and makes the page inert while open, then releases both", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.body.style.overflow).toBe("hidden");
    expect(container).toHaveAttribute("inert");
    expect(document.querySelector(".ol-portal")).not.toHaveAttribute("inert");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
    expect(container).not.toHaveAttribute("inert");
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

  it.each(["end", "start", "bottom"] as const)(
    "has no axe violations open (%s)",
    async (placement) => {
      render(<Harness placement={placement} />);
      fireEvent.click(screen.getByRole("button", { name: "Open" }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(await runAxe(screen.getByRole("dialog"))).toHaveNoViolations();
    },
  );

  it("has no axe violations closed", async () => {
    const { container } = render(<Harness />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
