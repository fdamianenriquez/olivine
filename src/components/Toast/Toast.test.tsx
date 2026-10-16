import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Toast } from "./Toast";
import { ToastPauseContext } from "./ToastPauseContext";

const noop = vi.fn();

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Toast", () => {
  it("renders with defaults, className and native props", () => {
    render(
      <Toast className="x" data-testid="t" title="Saved">
        Body
      </Toast>,
    );
    const el = screen.getByTestId("t");
    expect(el).toHaveClass("ol-toast", "ol-toast--accent", "x");
    expect(screen.getByText("Saved")).toHaveClass("ol-toast__title");
    expect(screen.getByText("Body")).toHaveClass("ol-toast__text");
    expect(screen.getByText("Now")).toHaveClass("ol-toast__meta");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has no live region of its own", () => {
    render(<Toast data-testid="t" title="Saved" />);
    const el = screen.getByTestId("t");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-live");
  });

  it.each(["accent", "info", "success", "warning", "danger", "neutral"] as const)(
    "maps tone %s to its modifier and keeps the meta text",
    (tone) => {
      render(<Toast tone={tone} meta="Order" data-testid="t" />);
      expect(screen.getByTestId("t")).toHaveClass(`ol-toast--${tone}`);
      expect(screen.getByText("Order")).toBeInTheDocument();
    },
  );

  it("forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Toast ref={ref} data-testid="t" />);
    expect(ref.current).toBe(screen.getByTestId("t"));
  });

  it("dismisses with the button", () => {
    const onClose = vi.fn();
    render(<Toast onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("auto-dismiss", () => {
    it("calls onClose after duration and renders the timer bar", () => {
      const onClose = vi.fn();
      const { container } = render(<Toast duration={1000} onClose={onClose} />);
      expect(container.querySelector(".ol-toast__timer")).toBeInTheDocument();
      advance(999);
      expect(onClose).not.toHaveBeenCalled();
      advance(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does nothing without onClose", () => {
      const { container } = render(<Toast duration={1000} />);
      advance(5000);
      expect(container.querySelector(".ol-toast__timer")).toBeNull();
    });

    it("pauses on hover and resumes with the remaining time", () => {
      const onClose = vi.fn();
      render(<Toast duration={1000} onClose={onClose} data-testid="t" />);
      const el = screen.getByTestId("t");
      advance(400);
      fireEvent.mouseEnter(el);
      expect(el).toHaveAttribute("data-state", "paused");
      advance(5000);
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.mouseLeave(el);
      expect(el).toHaveAttribute("data-state", "active");
      advance(599);
      expect(onClose).not.toHaveBeenCalled();
      advance(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("pauses while focus is inside and resumes on blur", () => {
      const onClose = vi.fn();
      render(<Toast duration={1000} onClose={onClose} data-testid="t" />);
      const el = screen.getByTestId("t");
      const button = screen.getByRole("button");
      act(() => {
        button.focus();
      });
      expect(el).toHaveAttribute("data-state", "paused");
      advance(5000);
      expect(onClose).not.toHaveBeenCalled();
      act(() => {
        button.blur();
      });
      advance(1000);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not restart when the parent re-renders with a new inline onClose", () => {
      const calls: string[] = [];
      function Host() {
        const [n, setN] = useState(0);
        return (
          <>
            <button
              onClick={() => {
                setN(n + 1);
              }}
            >
              rerender
            </button>
            <Toast duration={1000} onClose={() => calls.push(`closed-${String(n)}`)} />
          </>
        );
      }
      render(<Host />);
      advance(600);
      fireEvent.click(screen.getByText("rerender"));
      advance(399);
      expect(calls).toEqual([]);
      advance(1);
      expect(calls).toEqual(["closed-1"]);
    });

    it("keeps dismissing when the user prefers reduced motion", () => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn().mockReturnValue({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );
      const onClose = vi.fn();
      render(<Toast duration={500} onClose={onClose} />);
      advance(500);
      expect(onClose).toHaveBeenCalledTimes(1);
      vi.unstubAllGlobals();
    });
  });

  it("pauses from the stack context and resumes with the remaining time", async () => {
    const onClose = vi.fn();
    const ui = (paused: boolean) => (
      <ToastPauseContext.Provider value={paused}>
        <Toast duration={1000} onClose={onClose} data-testid="t" />
      </ToastPauseContext.Provider>
    );
    const { rerender } = render(ui(false));
    advance(400);
    rerender(ui(true));
    expect(screen.getByTestId("t")).toHaveAttribute("data-state", "paused");
    advance(5000);
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
    expect(await runAxe(screen.getByTestId("t"))).toHaveNoViolations();
    vi.useFakeTimers();
    rerender(ui(false));
    expect(screen.getByTestId("t")).toHaveAttribute("data-state", "active");
    advance(599);
    expect(onClose).not.toHaveBeenCalled();
    advance(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("puts the message before the head in the DOM", () => {
    render(
      <Toast data-testid="t" title="Saved" onClose={noop}>
        Body
      </Toast>,
    );
    const root = screen.getByTestId("t");
    const body = root.querySelector(".ol-toast__body");
    const head = root.querySelector(".ol-toast__head");
    expect(body?.compareDocumentPosition(head as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("dismisses with Enter and Space on the button", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Toast onClose={onClose} />);
    screen.getByRole("button", { name: "Dismiss" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["en", "Now", "Dismiss"],
    ["es", "Ahora", "Descartar"],
    ["ja", "今", "閉じる"],
  ] as const)("uses %s built-in strings", (locale, now, dismiss) => {
    render(
      <Root locale={locale}>
        <Toast onClose={noop} />
      </Root>,
    );
    expect(screen.getByText(now)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dismiss })).toBeInTheDocument();
  });

  it("lets meta override the default", () => {
    render(
      <Root locale="es">
        <Toast meta="Saved" />
      </Root>,
    );
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.queryByText("Ahora")).toBeNull();
  });

  it("has no axe violations", async () => {
    vi.useRealTimers();
    const { container } = render(
      <>
        <Toast title="Plain" />
        <Toast tone="danger" meta="Upload" title="File too large" duration={4000} onClose={noop}>
          Try a smaller file.
        </Toast>
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
