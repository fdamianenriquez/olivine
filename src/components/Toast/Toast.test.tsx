import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode, useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { PresenceState } from "../../motion";
import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { Root } from "../Root";
import { Toast } from "./Toast";
import { ToastItemContext } from "./ToastItemContext";
import { ToastPauseContext } from "./ToastPauseContext";
import { ToastStackContext } from "./ToastStackContext";

const noop = vi.fn();

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function pointer(
  target: Element,
  type: string,
  { x = 0, y = 0, pointerType = "touch" }: { x?: number; y?: number; pointerType?: string } = {},
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.assign(event, { pointerId: 1, pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
}

/** A horizontal touch swipe from 0 to `to`, released after a pause (no flick). */
function swipe(target: HTMLElement, to: number, axis: "x" | "y" = "x") {
  Object.defineProperty(target, "offsetWidth", { value: 300, configurable: true });
  Object.defineProperty(target, "offsetHeight", { value: 120, configurable: true });
  const at = (n: number) => (axis === "x" ? { x: n } : { y: n });
  pointer(target, "pointerdown");
  pointer(target, "pointermove", at(to / 4));
  pointer(target, "pointermove", at(to));
  advance(400);
  pointer(target, "pointerup", at(to));
}

const inStack = (
  ui: ReactNode,
  value: Partial<React.ContextType<typeof ToastStackContext>> = {},
) => (
  <ToastStackContext.Provider
    value={{ swipe: "right", hotkey: "F6", returnFocus: () => undefined, ...value }}
  >
    {ui}
  </ToastStackContext.Provider>
);

beforeAll(() => {
  Object.defineProperty(Element.prototype, "setPointerCapture", {
    value: () => undefined,
    configurable: true,
  });
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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

  it("dismisses with the button, reason dismiss", () => {
    const onClose = vi.fn();
    render(<Toast onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith("dismiss");
  });

  describe("auto-dismiss", () => {
    it("calls onClose('timeout') after duration and renders the timer bar", () => {
      const onClose = vi.fn();
      const { container } = render(<Toast duration={1000} onClose={onClose} />);
      expect(container.querySelector(".ol-toast__timer")).toBeInTheDocument();
      advance(999);
      expect(onClose).not.toHaveBeenCalled();
      advance(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledWith("timeout");
    });

    it("does nothing without onClose", () => {
      const { container } = render(<Toast duration={1000} />);
      advance(5000);
      expect(container.querySelector(".ol-toast__timer")).toBeNull();
    });

    it.each(["mouse", "pen"])(
      "pauses on a %s hover and resumes with the remaining time",
      (pointerType) => {
        const onClose = vi.fn();
        render(<Toast duration={1000} onClose={onClose} data-testid="t" />);
        const el = screen.getByTestId("t");
        advance(400);
        fireEvent.pointerEnter(el, { pointerType });
        expect(el).toHaveAttribute("data-state", "paused");
        advance(5000);
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.pointerLeave(el, { pointerType });
        expect(el).toHaveAttribute("data-state", "active");
        advance(599);
        expect(onClose).not.toHaveBeenCalled();
        advance(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      },
    );

    it("does not pause on a touch 'hover' (a tap never leaves)", () => {
      const onClose = vi.fn();
      render(<Toast duration={1000} onClose={onClose} data-testid="t" />);
      fireEvent.pointerEnter(screen.getByTestId("t"), { pointerType: "touch" });
      expect(screen.getByTestId("t")).toHaveAttribute("data-state", "active");
      advance(1000);
      expect(onClose).toHaveBeenCalledWith("timeout");
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

    it("restarts the countdown and the bar when the provider shows it again", () => {
      const onClose = vi.fn();
      const ui = (version: number) => (
        <ToastItemContext.Provider value={{ state: "open", setElement: () => undefined, version }}>
          <Toast duration={1000} onClose={onClose} />
        </ToastItemContext.Provider>
      );
      const { rerender, container } = render(ui(0));
      const bar = container.querySelector(".ol-toast__timer");
      advance(800);
      rerender(ui(1));
      expect(container.querySelector(".ol-toast__timer")).not.toBe(bar);
      advance(999);
      expect(onClose).not.toHaveBeenCalled();
      advance(1);
      expect(onClose).toHaveBeenCalledWith("timeout");
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

  it("shows closing and stops its countdown while the provider plays the exit", () => {
    const onClose = vi.fn();
    const ui = (state: PresenceState) => (
      <ToastItemContext.Provider value={{ state, setElement: () => undefined, version: 0 }}>
        <Toast duration={1000} onClose={onClose} data-testid="t" />
      </ToastItemContext.Provider>
    );
    const { rerender } = render(ui("open"));
    rerender(ui("closing"));
    expect(screen.getByTestId("t")).toHaveAttribute("data-state", "closing");
    advance(5000);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("puts the message before the head, and the action after it, in the DOM", () => {
    render(
      <Toast
        data-testid="t"
        title="Saved"
        duration={10000}
        onClose={noop}
        action={<Button size="s">Undo</Button>}
      >
        Body
      </Toast>,
    );
    const root = screen.getByTestId("t");
    const parts = [...root.children].map((n) => n.className);
    expect(parts).toEqual([
      "ol-toast__body",
      "ol-toast__head",
      "ol-toast__action",
      "ol-toast__timer",
    ]);
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

  describe("Escape", () => {
    it("closes the toast holding focus (reason escape) and defaults the event", () => {
      const onClose = vi.fn();
      render(<Toast onClose={onClose} />);
      const button = screen.getByRole("button", { name: "Dismiss" });
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        button.dispatchEvent(event);
      });
      expect(onClose).toHaveBeenCalledWith("escape");
      expect(event.defaultPrevented).toBe(true);
    });

    it("leaves Escape alone without onClose, when already handled, or while composing", () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <Toast data-testid="t" tabIndex={-1}>
          Text
        </Toast>,
      );
      const plain = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      screen.getByTestId("t").dispatchEvent(plain);
      expect(plain.defaultPrevented).toBe(false);

      rerender(
        <Toast
          data-testid="t"
          onClose={onClose}
          onKeyDown={(e) => {
            e.preventDefault();
          }}
        />,
      );
      fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
      rerender(<Toast data-testid="t" onClose={onClose} />);
      fireEvent.keyDown(screen.getByRole("button"), { key: "Escape", isComposing: true });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("priority", () => {
    it("makes a danger toast an alert by default", () => {
      render(<Toast tone="danger" title="Failed" data-testid="t" />);
      expect(screen.getByRole("alert")).toBe(screen.getByTestId("t"));
    });

    it.each([
      ["danger", "polite", false],
      ["warning", undefined, false],
      ["info", "assertive", true],
    ] as const)("tone %s with priority %s is an alert: %s", (tone, priority, alert) => {
      render(<Toast tone={tone} {...(priority ? { priority } : null)} title="T" />);
      expect(screen.queryByRole("alert") !== null).toBe(alert);
    });
  });

  describe("action", () => {
    it("renders one action after Dismiss in Tab order", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<Toast title="Removed" onClose={noop} action={<Button size="s">Undo</Button>} />);
      await user.tab();
      expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus();
    });

    it("adds the hidden hotkey hint inside a stack with a hotkey only", () => {
      const action = <Button size="s">Undo</Button>;
      const { rerender } = render(inStack(<Toast title="Removed" action={action} />));
      expect(screen.getByText("Press F6 to reach the action")).toHaveClass("ol-sr");
      rerender(inStack(<Toast title="Removed" action={action} />, { hotkey: null }));
      expect(screen.queryByText(/to reach the action/)).toBeNull();
      rerender(<Toast title="Removed" action={action} />);
      expect(screen.queryByText(/to reach the action/)).toBeNull();
      rerender(inStack(<Toast title="Saved" />));
      expect(screen.queryByText(/to reach the action/)).toBeNull();
    });

    it.each([
      ["es", "Pulsa F6 para ir a la acción"],
      ["ja", "F6 キーで操作に移動できます"],
    ] as const)("words the hint in %s", (locale, hint) => {
      render(
        <Root locale={locale}>
          {inStack(<Toast title="T" action={<Button size="s">Undo</Button>} />)}
        </Root>,
      );
      expect(screen.getByText(hint)).toBeInTheDocument();
    });

    it("warns in development when a timed action toast is shorter than 10 s", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const action = <Button size="s">Undo</Button>;
      const { rerender } = render(<Toast duration={10000} onClose={noop} action={action} />);
      expect(warn).not.toHaveBeenCalled();
      rerender(<Toast onClose={noop} action={action} />);
      expect(warn).not.toHaveBeenCalled();
      rerender(<Toast duration={5000} onClose={noop} action={action} />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("at least 10000 ms"));
    });
  });

  describe("seal", () => {
    it("draws kanji as a decorative olive hakubun seal that plays the hanko", () => {
      const { container } = render(<Toast tone="success" title="Paid" seal="済" />);
      const body = container.querySelector(".ol-toast__body");
      expect(body).toHaveClass("ol-toast__body--seal");
      const seal = container.querySelector(".ol-toast__seal > .ol-stamp");
      expect(seal).toHaveTextContent("済");
      expect(seal).toHaveAttribute("aria-hidden", "true");
      expect(seal).toHaveClass("ol-stamp--press");
    });

    it("renders a node as given", () => {
      const { container } = render(
        <Toast tone="success" title="Paid" seal={<i data-testid="own">x</i>} />,
      );
      expect(container.querySelector(".ol-toast__seal")).toContainElement(
        screen.getByTestId("own"),
      );
    });

    it("keeps the plain body without a seal", () => {
      const { container } = render(<Toast title="Paid" />);
      expect(container.querySelector(".ol-toast__body")).not.toHaveClass("ol-toast__body--seal");
    });
  });

  describe("swipe", () => {
    it("dismisses toward the stack's edge with reason swipe", () => {
      const onClose = vi.fn();
      render(inStack(<Toast title="Swipe" onClose={onClose} data-testid="t" />));
      const el = screen.getByTestId("t");
      expect(el).toHaveClass("ol-toast--swipe-x");
      swipe(el, 200);
      expect(onClose).toHaveBeenCalledWith("swipe");
      expect(el).toHaveAttribute("data-swipe", "out");
    });

    it("follows its own direction prop, vertical included", () => {
      const onClose = vi.fn();
      render(inStack(<Toast swipe="up" onClose={onClose} data-testid="t" />));
      const el = screen.getByTestId("t");
      expect(el).toHaveClass("ol-toast--swipe-y");
      swipe(el, -100, "y");
      expect(onClose).toHaveBeenCalledWith("swipe");
    });

    it("pauses the countdown while dragging", () => {
      const onClose = vi.fn();
      render(inStack(<Toast duration={1000} onClose={onClose} data-testid="t" />));
      const el = screen.getByTestId("t");
      pointer(el, "pointerdown");
      pointer(el, "pointermove", { x: 30 });
      expect(el).toHaveAttribute("data-state", "paused");
      advance(3000);
      expect(onClose).not.toHaveBeenCalled();
      pointer(el, "pointerup", { x: 30 });
      expect(el).toHaveAttribute("data-swipe", "return");
      advance(1000);
      expect(onClose).toHaveBeenCalledWith("timeout");
    });

    it("is off outside a stack, with swipe={false} and without onClose", () => {
      const onClose = vi.fn();
      const { rerender } = render(<Toast onClose={onClose} data-testid="t" />);
      swipe(screen.getByTestId("t"), 250);
      rerender(inStack(<Toast swipe={false} onClose={onClose} data-testid="t" />));
      swipe(screen.getByTestId("t"), 250);
      rerender(inStack(<Toast data-testid="t" />));
      expect(screen.getByTestId("t")).not.toHaveClass("ol-toast--swipe-x");
      swipe(screen.getByTestId("t"), 250);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("keeps the Dismiss button on a swipeable toast", () => {
      render(inStack(<Toast onClose={noop} />));
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    });
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
      inStack(
        <>
          <Toast title="Plain" />
          <Toast tone="danger" meta="Upload" title="File too large" duration={4000} onClose={noop}>
            Try a smaller file.
          </Toast>
          <Toast
            tone="success"
            meta="Removed"
            title="Ana Ruiz removed"
            seal="済"
            duration={10000}
            onClose={noop}
            action={
              <Button size="s" variant="outline">
                Undo
              </Button>
            }
          />
        </>,
      ),
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("warns in development when a seal sits on a toast that is not a success", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { rerender } = render(<Toast tone="success" title="Paid" seal="済" />);
    expect(warn).not.toHaveBeenCalled();
    rerender(<Toast tone="warning" title="Paid" seal="済" />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("success confirmations"));
  });

  describe("a focused control removed while the toast stays open", () => {
    const action = (
      <Button size="s" variant="outline">
        Retry
      </Button>
    );

    it("stops pausing and moves focus to the toast's own Dismiss", async () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <Toast data-testid="t" duration={1000} onClose={onClose} action={action} />,
      );
      act(() => {
        screen.getByRole("button", { name: "Retry" }).focus();
      });
      expect(screen.getByTestId("t")).toHaveAttribute("data-state", "paused");
      rerender(<Toast data-testid="t" duration={1000} onClose={onClose} />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
      // Focus is still inside, so the toast stays paused, as it would for any focused toast.
      act(() => {
        screen.getByRole("button", { name: "Dismiss" }).blur();
      });
      advance(1000);
      expect(onClose).toHaveBeenCalledWith("timeout");
    });

    it("hands focus to the stack when the toast has no control left", async () => {
      const returnFocus = vi.fn();
      const { rerender } = render(
        inStack(<Toast data-testid="t" action={action} />, { returnFocus }),
      );
      act(() => {
        screen.getByRole("button", { name: "Retry" }).focus();
      });
      rerender(inStack(<Toast data-testid="t" />, { returnFocus }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(returnFocus).toHaveBeenCalledWith(screen.getByTestId("t"));
    });
  });
});
