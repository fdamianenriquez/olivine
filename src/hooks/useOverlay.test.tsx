import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useOverlay } from "./useOverlay";

function Demo({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOverlay({
    open,
    onClose: () => {
      onClose?.();
      setOpen(false);
    },
  });
  return (
    <>
      <main>
        <button
          onClick={() => {
            setOpen(true);
          }}
        >
          open
        </button>
      </main>
      {open && (
        <div ref={ref} role="dialog" tabIndex={-1} aria-label="demo">
          <button>first</button>
          <button>last</button>
        </div>
      )}
    </>
  );
}

describe("useOverlay", () => {
  it("moves focus in, traps Tab, closes on Escape and restores focus", () => {
    const onClose = vi.fn();
    render(<Demo onClose={onClose} />);
    const trigger = screen.getByText("open");
    trigger.focus();
    fireEvent.click(trigger);

    const first = screen.getByText("first");
    const last = screen.getByText("last");
    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(last, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("locks scroll and makes the rest of the page inert until it closes", () => {
    const host = document.createElement("div");
    document.body.append(host);
    render(<Demo />, { container: host });
    fireEvent.click(screen.getByText("open"));
    // The dialog lives in the same body child as the page here, so nothing else is inert,
    // but the scroll lock must be applied.
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
    host.remove();
  });

  it("marks body siblings of the dialog's layer inert and restores them", () => {
    const outside = document.createElement("div");
    document.body.append(outside);
    const { unmount } = render(<Demo />);
    fireEvent.click(screen.getByText("open"));
    expect(outside).toHaveAttribute("inert");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(outside).not.toHaveAttribute("inert");
    unmount();
    outside.remove();
  });
});

describe("useOverlay nesting and portal layers", () => {
  function Two() {
    const [a, setA] = useState(true);
    const [b, setB] = useState(true);
    const refA = useOverlay({ open: a });
    const refB = useOverlay({ open: b });
    return (
      <>
        {a && (
          <div ref={refA} role="dialog" aria-label="a" tabIndex={-1}>
            <button>a-btn</button>
          </div>
        )}
        {b && (
          <div ref={refB} role="dialog" aria-label="b" tabIndex={-1}>
            <button
              onClick={() => {
                setB(false);
              }}
            >
              close-b
            </button>
          </div>
        )}
        <button
          onClick={() => {
            setA(false);
          }}
        >
          close-a
        </button>
      </>
    );
  }

  it("keeps the page inert until the last overlay closes, in any order", () => {
    const outside = document.createElement("div");
    document.body.append(outside);
    const { unmount } = render(<Two />);
    expect(outside).toHaveAttribute("inert");
    // close A first while B stays open
    fireEvent.click(screen.getByText("close-a"));
    expect(outside).toHaveAttribute("inert");
    fireEvent.click(screen.getByText("close-b"));
    expect(outside).not.toHaveAttribute("inert");
    unmount();
    outside.remove();
  });

  it("lets focus move into a Portal layer opened from the dialog", () => {
    render(<Demo />);
    fireEvent.click(screen.getByText("open"));
    const layer = document.createElement("div");
    layer.className = "ol ol-portal";
    const menu = document.createElement("button");
    menu.textContent = "menu";
    layer.append(menu);
    document.body.append(layer);
    menu.focus();
    expect(menu).toHaveFocus();
    layer.remove();
  });

  it("leaves elements the app made inert untouched", () => {
    const outside = document.createElement("div");
    outside.setAttribute("inert", "");
    document.body.append(outside);
    render(<Demo />);
    fireEvent.click(screen.getByText("open"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(outside).toHaveAttribute("inert");
    outside.remove();
  });
});
