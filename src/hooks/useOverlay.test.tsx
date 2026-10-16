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
