import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Portal } from "../utils/Portal";
import { useDismiss } from "./useDismiss";
import { useFloating } from "./useFloating";

function Floating() {
  const [open, setOpen] = useState(false);
  const { reference, floating, style, positioned } = useFloating<HTMLButtonElement, HTMLDivElement>(
    { open },
  );
  return (
    <>
      <button
        ref={reference}
        onClick={() => {
          setOpen(true);
        }}
      >
        open
      </button>
      {open && (
        <div ref={floating} className="ol-floating" style={style} data-positioned={positioned}>
          menu
        </div>
      )}
    </>
  );
}

describe("useFloating", () => {
  it("positions the floating element with custom properties", async () => {
    render(<Floating />);
    fireEvent.click(screen.getByText("open"));
    await act(async () => {
      await Promise.resolve();
    });
    const menu = screen.getByText("menu");
    expect(menu.style.getPropertyValue("--ol-float-x")).toMatch(/px$/);
    expect(menu).toHaveAttribute("data-positioned", "true");
  });
});

describe("useDismiss", () => {
  function Dismissable({ onDismiss }: { onDismiss: (reason: string) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useDismiss(true, onDismiss, [ref]);
    return (
      <>
        <div ref={ref}>inside</div>
        <div>outside</div>
      </>
    );
  }

  it("dismisses on Escape and outside presses, not inside", () => {
    const onDismiss = vi.fn();
    render(<Dismissable onDismiss={onDismiss} />);
    fireEvent.pointerDown(screen.getByText("inside"));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(onDismiss).toHaveBeenCalledWith("outside");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledWith("escape");
  });
});

describe("Portal", () => {
  function Island() {
    const anchor = useRef<HTMLSpanElement>(null);
    return (
      <div data-theme="sumi">
        <span ref={anchor}>anchor</span>
        <Portal anchor={anchor}>
          <p>floated</p>
        </Portal>
      </div>
    );
  }

  it("renders into body inside an .ol layer that keeps the anchor's theme", () => {
    render(<Island />);
    const layer = screen.getByText("floated").parentElement;
    expect(layer).toHaveClass("ol", "ol-portal");
    expect(layer).toHaveAttribute("data-theme", "sumi");
    expect(layer?.parentElement).toBe(document.body);
  });
});
