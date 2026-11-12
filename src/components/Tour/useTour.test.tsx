import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Tour, type TourStep } from "./Tour";
import { useTour, type UseTourOptions, type UseTourResult } from "./useTour";

stubNoAnimations();

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const box = this.isConnected
      ? { x: 100, y: 120, width: 80, height: 40 }
      : { x: 0, y: 0, width: 0, height: 0 };
    return {
      ...box,
      left: box.x,
      top: box.y,
      right: box.x + box.width,
      bottom: box.y + box.height,
      toJSON: () => box,
    };
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const STEPS: TourStep[] = [{ title: "One" }, { title: "Two" }, { title: "Three" }];

describe("useTour", () => {
  it("starts closed on step 0", () => {
    const { result } = renderHook(() => useTour());
    expect(result.current.open).toBe(false);
    expect(result.current.step).toBe(0);
    expect(result.current.props).toMatchObject({ open: false, step: 0 });
  });

  it("honours defaultOpen and defaultStep", () => {
    const { result } = renderHook(() => useTour({ defaultOpen: true, defaultStep: 2 }));
    expect(result.current.open).toBe(true);
    expect(result.current.step).toBe(2);
  });

  it("start opens on defaultStep or the given step; close ends; goTo moves", () => {
    const { result } = renderHook(() => useTour({ defaultStep: 1 }));
    act(() => {
      result.current.goTo(2);
    });
    expect(result.current).toMatchObject({ open: false, step: 2 });
    act(() => {
      result.current.start();
    });
    expect(result.current).toMatchObject({ open: true, step: 1 });
    act(() => {
      result.current.goTo(2.7);
    });
    expect(result.current.step).toBe(2);
    act(() => {
      result.current.goTo(-3);
    });
    expect(result.current.step).toBe(0);
    act(() => {
      result.current.close();
    });
    expect(result.current.open).toBe(false);
    act(() => {
      result.current.start(2);
    });
    expect(result.current).toMatchObject({ open: true, step: 2 });
    expect(result.current.props).toMatchObject({ open: true, step: 2 });
  });

  it("does not report the app's own moves to the callbacks", () => {
    const onOpenChange = vi.fn();
    const onStepChange = vi.fn();
    const { result } = renderHook(() => useTour({ onOpenChange, onStepChange }));
    act(() => {
      result.current.start();
      result.current.goTo(1);
      result.current.close();
    });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it("passes the tour's reasons through and follows them", () => {
    const onOpenChange = vi.fn();
    const onStepChange = vi.fn();
    const { result } = renderHook(() => useTour({ onOpenChange, onStepChange }));
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.props.onStepChange(1, "key");
    });
    expect(onStepChange).toHaveBeenCalledWith(1, "key");
    expect(result.current.step).toBe(1);
    act(() => {
      result.current.props.onOpenChange(false, "escape");
    });
    expect(onOpenChange).toHaveBeenCalledWith(false, "escape");
    expect(result.current.open).toBe(false);
  });

  it("keeps every function stable and calls the latest callbacks", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook((options: UseTourOptions) => useTour(options), {
      initialProps: { onOpenChange: first },
    });
    const before = result.current;
    rerender({ onOpenChange: second });
    act(() => {
      result.current.start();
    });
    const after = result.current;
    expect(after.start).toBe(before.start);
    expect(after.close).toBe(before.close);
    expect(after.goTo).toBe(before.goTo);
    expect(after.props.onOpenChange).toBe(before.props.onOpenChange);
    expect(after.props.onStepChange).toBe(before.props.onStepChange);
    act(() => {
      after.props.onOpenChange(false, "skip");
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(false, "skip");
  });

  it("keeps props identical while nothing changes", () => {
    const { result, rerender } = renderHook(() => useTour());
    const before = result.current.props;
    rerender();
    expect(result.current.props).toBe(before);
  });

  it("drives a Tour end to end", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onStepChange = vi.fn();
    function App() {
      const tour = useTour({ onOpenChange, onStepChange });
      return (
        <Root>
          <button
            type="button"
            onClick={() => {
              tour.start();
            }}
          >
            Take the tour
          </button>
          <output>{tour.open ? `On ${String(tour.step + 1)}` : "Off"}</output>
          <Tour {...tour.props} steps={STEPS} />
        </Root>
      );
    }
    render(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Take the tour" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("One");
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
    });
    expect(await runAxe(document.body)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onStepChange).toHaveBeenCalledWith(1, "next");
    expect(screen.getByRole("status")).toHaveTextContent("On 2");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, "finish");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Off");
    expect(screen.getByRole("button", { name: "Take the tour" })).toHaveFocus();
    // Starting again goes back to the first step.
    await user.click(screen.getByRole("button", { name: "Take the tour" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("One");
  });

  describe("moves made from code while the tour is shown", () => {
    let handle: UseTourResult | null = null;
    const onOpenChange = vi.fn();
    const onStepChange = vi.fn();
    function App() {
      const tour = useTour({ onOpenChange, onStepChange });
      handle = tour;
      return (
        <Root>
          <button
            type="button"
            onClick={() => {
              tour.start();
            }}
          >
            Take the tour
          </button>
          <Tour {...tour.props} steps={STEPS} />
        </Root>
      );
    }
    const tour = () => {
      if (!handle) throw new Error("not rendered");
      return handle;
    };
    const live = () => document.querySelector(".ol-tour__live");

    beforeEach(() => {
      handle = null;
      onOpenChange.mockClear();
      onStepChange.mockClear();
    });

    it("close() ends the tour and returns focus to the opener, without calling back", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("button", { name: "Take the tour" }));
      expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
      act(() => {
        tour().close();
      });
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
      expect(screen.getByRole("button", { name: "Take the tour" })).toHaveFocus();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("announces a goTo() like Back and Next, and is silent on open", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("button", { name: "Take the tour" }));
      expect(live()).toHaveTextContent("");
      act(() => {
        tour().goTo(2);
      });
      expect(screen.getByRole("dialog")).toHaveAccessibleName("Three");
      expect(live()).toHaveTextContent("Step 03 of 03: Three.");
      expect(onStepChange).not.toHaveBeenCalled();
    });

    it("moves focus to Next when a goTo() removes the focused Back", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("button", { name: "Take the tour" }));
      await user.click(screen.getByRole("button", { name: "Next" }));
      screen.getByRole("button", { name: "Back" }).focus();
      act(() => {
        tour().goTo(0);
      });
      expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
      expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
      expect(live()).toHaveTextContent("Step 01 of 03: One.");
    });

    it("keeps focus on a control that stays", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("button", { name: "Take the tour" }));
      await user.click(screen.getByRole("button", { name: "Next" }));
      const skip = screen.getByRole("button", { name: "Skip tour" });
      skip.focus();
      act(() => {
        tour().goTo(0);
      });
      expect(skip).toHaveFocus();
    });
  });
});
