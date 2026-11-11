import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { type SwipeDirection, useSwipeDismiss } from "./useSwipeDismiss";

const onDismiss = vi.fn();
const onSwipingChange = vi.fn();

function Probe({
  direction = "right",
  size = 200,
}: {
  direction?: SwipeDirection | false;
  size?: number;
}) {
  const { phase, handlers } = useSwipeDismiss<HTMLDivElement>({
    direction,
    onDismiss,
    onSwipingChange,
  });
  return (
    <div
      data-testid="el"
      data-swipe={phase === "idle" ? undefined : phase}
      ref={(node) => {
        if (!node) return;
        Object.defineProperty(node, "offsetWidth", { value: size, configurable: true });
        Object.defineProperty(node, "offsetHeight", { value: size / 2, configurable: true });
      }}
      {...handlers}
    >
      <span>text</span>
      <button type="button">Dismiss</button>
    </div>
  );
}

function pointer(
  target: Element,
  type: string,
  { x = 0, y = 0, pointerType = "touch", id = 1 }: Record<string, unknown> = {},
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x as number,
    clientY: y as number,
  });
  Object.assign(event, { pointerId: id, pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
}

/** Presses at the origin, moves through each x (or y) with `step` ms between, and releases. */
function swipe(
  target: Element,
  points: [number, number][],
  { pointerType = "touch", step = 50, release = true } = {},
) {
  pointer(target, "pointerdown", { pointerType });
  for (const [x, y] of points) {
    vi.advanceTimersByTime(step);
    pointer(target, "pointermove", { x, y, pointerType });
  }
  if (release) {
    const [x, y] = points[points.length - 1] ?? [0, 0];
    pointer(target, "pointerup", { x, y, pointerType });
  }
}

beforeAll(() => {
  // jsdom has no pointer capture.
  Object.defineProperty(Element.prototype, "setPointerCapture", {
    value: () => undefined,
    configurable: true,
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  onDismiss.mockReset();
  onSwipingChange.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useSwipeDismiss", () => {
  it("follows the pointer and dismisses past 40% of the width", () => {
    render(<Probe />);
    const el = screen.getByTestId("el");
    swipe(
      el,
      [
        [20, 0],
        [50, 0],
        [90, 0],
      ],
      { release: false },
    );
    expect(el).toHaveAttribute("data-swipe", "drag");
    expect(el.style.getPropertyValue("--ol-swipe-x")).toBe("90px");
    expect(el.style.getPropertyValue("--ol-swipe-y")).toBe("0px");
    expect(onSwipingChange).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(500);
    pointer(el, "pointerup", { x: 90 });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onSwipingChange).toHaveBeenLastCalledWith(false);
    expect(el).toHaveAttribute("data-swipe", "out");
    expect(el.style.getPropertyValue("--ol-swipe-end-x")).toBe("290px");
  });

  it("returns to rest under the threshold", () => {
    render(<Probe />);
    const el = screen.getByTestId("el");
    swipe(el, [
      [20, 0],
      [40, 0],
    ]);
    // Slow release (20px per 50ms = 0.4px/ms) under 40% of 200px.
    expect(onDismiss).not.toHaveBeenCalled();
    expect(el).toHaveAttribute("data-swipe", "return");
    expect(el.style.getPropertyValue("--ol-swipe-x")).toBe("0px");
  });

  it("dismisses a short fast flick", () => {
    render(<Probe />);
    const el = screen.getByTestId("el");
    swipe(
      el,
      [
        [10, 0],
        [50, 0],
      ],
      { step: 20 },
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not count a flick when the release comes after a stop", () => {
    render(<Probe />);
    const el = screen.getByTestId("el");
    swipe(
      el,
      [
        [10, 0],
        [50, 0],
      ],
      { step: 20, release: false },
    );
    vi.advanceTimersByTime(300);
    pointer(el, "pointerup", { x: 50 });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("clamps movement against the direction at 0", () => {
    render(<Probe />);
    const el = screen.getByTestId("el");
    swipe(
      el,
      [
        [20, 0],
        [-60, 0],
      ],
      { release: false },
    );
    expect(el.style.getPropertyValue("--ol-swipe-x")).toBe("0px");
  });

  it("leaves a press that moves across the axis first to scrolling", () => {
    render(<Probe />);
    const el = screen.getByTestId("el");
    swipe(el, [
      [2, 30],
      [120, 30],
    ]);
    expect(el).not.toHaveAttribute("data-swipe");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("ignores the mouse by default and presses on a control", () => {
    render(<Probe />);
    const el = screen.getByTestId("el");
    swipe(
      el,
      [
        [60, 0],
        [150, 0],
      ],
      { pointerType: "mouse" },
    );
    swipe(screen.getByRole("button"), [
      [60, 0],
      [150, 0],
    ]);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("accepts the pen", () => {
    render(<Probe />);
    swipe(
      screen.getByTestId("el"),
      [
        [60, 0],
        [150, 0],
      ],
      { pointerType: "pen" },
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["left", [-120, 0], "--ol-swipe-x", "-120px"],
    ["up", [0, -80], "--ol-swipe-y", "-80px"],
    ["down", [0, 80], "--ol-swipe-y", "80px"],
  ] as const)("swipes %s along its own axis", (direction, [x, y], prop, value) => {
    render(<Probe direction={direction} />);
    const el = screen.getByTestId("el");
    swipe(
      el,
      [
        [x / 4, y / 4],
        [x, y],
      ],
      { release: false },
    );
    expect(el.style.getPropertyValue(prop)).toBe(value);
    vi.advanceTimersByTime(500);
    pointer(el, "pointerup", { x, y });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("returns on pointercancel without dismissing", () => {
    render(<Probe />);
    const el = screen.getByTestId("el");
    swipe(
      el,
      [
        [60, 0],
        [150, 0],
      ],
      { release: false },
    );
    pointer(el, "pointercancel", { x: 150 });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(el).toHaveAttribute("data-swipe", "return");
  });

  it("does nothing when off", () => {
    render(<Probe direction={false} />);
    const el = screen.getByTestId("el");
    swipe(el, [
      [60, 0],
      [150, 0],
    ]);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(el).not.toHaveAttribute("data-swipe");
  });
});
