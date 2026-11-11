import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { settleTarget, useSheetDrag } from "./useSheetDrag";

const onDismiss = vi.fn();
const onClick = vi.fn();
const POINTS = [200, 400, 600];

function Sheet({
  dismissible = true,
  canDragBody,
}: {
  dismissible?: boolean;
  canDragBody?: (direction: "up" | "down") => boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const { phase, handleProps, bodyProps } = useSheetDrag({
    panelRef,
    points: POINTS,
    index,
    dismissible,
    onSnap: setIndex,
    onDismiss,
    canDragBody,
  });
  return (
    <div
      ref={panelRef}
      data-testid="panel"
      data-index={index}
      data-swipe={phase === "idle" ? undefined : phase}
    >
      <button type="button" {...handleProps} onClick={onClick}>
        handle
      </button>
      <div data-testid="body" {...bodyProps}>
        <span>text</span>
        <button type="button">action</button>
      </div>
    </div>
  );
}

const panel = () => screen.getByTestId("panel");
const handle = () => screen.getByRole("button", { name: "handle" });

function drag(target: Element, dy: number, pointerType = "touch", steps = 4, stepMs = 50) {
  fireEvent.pointerDown(target, { pointerId: 1, pointerType, button: 0, clientX: 0, clientY: 500 });
  for (let i = 1; i <= steps; i += 1) {
    vi.advanceTimersByTime(stepMs);
    fireEvent.pointerMove(target, {
      pointerId: 1,
      pointerType,
      clientX: 0,
      clientY: 500 + (dy * i) / steps,
    });
  }
  vi.advanceTimersByTime(stepMs * 3);
  fireEvent.pointerUp(target, { pointerId: 1, pointerType, clientX: 0, clientY: 500 + dy });
}

beforeEach(() => {
  vi.useFakeTimers();
  onDismiss.mockClear();
  onClick.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useSheetDrag", () => {
  it("settles a slow drag up on the nearest point and swallows the handle's click", () => {
    render(<Sheet />);
    act(() => {
      drag(handle(), -210, "mouse");
    });
    expect(panel()).toHaveAttribute("data-index", "1");
    expect(panel()).toHaveAttribute("data-swipe", "return");
    expect(panel().style.getPropertyValue("--ol-swipe-y")).toBe("0px");
    fireEvent.click(handle(), { detail: 1 });
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(handle(), { detail: 1 });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("never swallows a keyboard click after a drag that ended without a click", () => {
    render(<Sheet />);
    act(() => {
      drag(handle(), -210, "touch");
    });
    fireEvent.click(handle(), { detail: 0 });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("clamps above the tallest point", () => {
    render(<Sheet />);
    fireEvent.pointerDown(handle(), {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 0,
      clientY: 900,
    });
    fireEvent.pointerMove(handle(), { pointerId: 1, pointerType: "mouse", clientX: 0, clientY: 0 });
    expect(panel().style.getPropertyValue("--ol-swipe-y")).toBe("-400px");
  });

  it("dismisses when the lowest point is pulled down past the threshold", () => {
    render(<Sheet />);
    act(() => {
      drag(screen.getByTestId("body"), 100);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(panel()).toHaveAttribute("data-swipe", "out");
    expect(panel().style.getPropertyValue("--ol-swipe-end-y")).toBe("200px");
  });

  it("returns instead when it cannot be dismissed", () => {
    render(<Sheet dismissible={false} />);
    act(() => {
      drag(screen.getByTestId("body"), 150);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(panel()).toHaveAttribute("data-index", "0");
  });

  it("ignores a mouse drag on the body, presses on controls, and canDragBody false", () => {
    const { rerender } = render(<Sheet />);
    act(() => {
      drag(screen.getByTestId("body"), -300, "mouse");
      drag(screen.getByRole("button", { name: "action" }), -300);
    });
    expect(panel()).toHaveAttribute("data-index", "0");
    rerender(<Sheet canDragBody={() => false} />);
    act(() => {
      drag(screen.getByTestId("body"), -300);
    });
    expect(panel()).toHaveAttribute("data-index", "0");
  });

  it("asks canDragBody for a body drag once it knows the direction, never for the handle", () => {
    const canDragBody = vi.fn((direction: "up" | "down") => direction === "down");
    render(<Sheet canDragBody={canDragBody} />);
    const body = screen.getByTestId("body");
    act(() => {
      drag(body, -300);
    });
    expect(canDragBody).toHaveBeenLastCalledWith("up");
    expect(panel()).toHaveAttribute("data-index", "0");
    expect(panel()).not.toHaveAttribute("data-swipe");
    act(() => {
      drag(body, 300);
    });
    expect(canDragBody).toHaveBeenLastCalledWith("down");
    expect(onDismiss).toHaveBeenCalledTimes(1);
    canDragBody.mockClear();
    act(() => {
      drag(handle(), -300);
    });
    expect(canDragBody).not.toHaveBeenCalled();
  });

  it("leaves a sideways press to scrolling", () => {
    render(<Sheet />);
    fireEvent.pointerDown(handle(), {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 0,
      clientY: 500,
    });
    fireEvent.pointerMove(handle(), {
      pointerId: 1,
      pointerType: "touch",
      clientX: 40,
      clientY: 505,
    });
    expect(panel()).not.toHaveAttribute("data-swipe");
  });
});

describe("settleTarget", () => {
  it("moves one point in the direction of a flick", () => {
    expect(settleTarget(POINTS, 1, 380, -1, true, true)).toBe(2);
    expect(settleTarget(POINTS, 1, 420, 1, true, true)).toBe(0);
    expect(settleTarget(POINTS, 0, 190, 1, true, true)).toBe("dismiss");
    expect(settleTarget(POINTS, 0, 190, 1, true, false)).toBe(0);
    expect(settleTarget(POINTS, 2, 610, -1, true, true)).toBe(2);
  });

  it("ignores a stale flick and picks the nearest point", () => {
    expect(settleTarget(POINTS, 0, 330, -1, false, true)).toBe(1);
    expect(settleTarget(POINTS, 0, 130, 0, false, true)).toBe(0);
    expect(settleTarget(POINTS, 0, 110, 0, false, true)).toBe("dismiss");
  });
});
