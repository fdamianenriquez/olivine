import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "./reducedMotion";
import { startViewTransition, useViewTransition, VIEW_TRANSITION_ATTR } from "./viewTransition";

type Start = (update: () => void) => { finished: Promise<void> };

function mockViewTransitions() {
  const finishers: (() => void)[] = [];
  const start = vi.fn<Start>((update) => {
    update();
    return {
      finished: new Promise<void>((resolve) => {
        finishers.push(resolve);
      }),
    };
  });
  Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
  return { start, finishers };
}

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  });
}

beforeEach(() => {
  mockReducedMotion(false);
});

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
  Reflect.deleteProperty(window, "matchMedia");
  document.documentElement.removeAttribute(VIEW_TRANSITION_ATTR);
  document.documentElement.classList.remove(REDUCE_MOTION_CLASS);
});

describe("startViewTransition", () => {
  it("runs the update directly where View Transitions are missing", async () => {
    const update = vi.fn();
    await startViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement).not.toHaveAttribute(VIEW_TRANSITION_ATTR);
  });

  it("marks the root with the direction while the transition runs", async () => {
    const { start, finishers } = mockViewTransitions();
    const update = vi.fn();
    const done = startViewTransition(update, { direction: "back" });
    expect(start).toHaveBeenCalledWith(update);
    expect(document.documentElement).toHaveAttribute(VIEW_TRANSITION_ATTR, "back");

    finishers[0]?.();
    await done;
    expect(document.documentElement).not.toHaveAttribute(VIEW_TRANSITION_ATTR);
  });

  it("defaults to forward and keeps the mark for a newer transition", async () => {
    const { finishers } = mockViewTransitions();
    const first = startViewTransition(vi.fn());
    expect(document.documentElement).toHaveAttribute(VIEW_TRANSITION_ATTR, "forward");
    const second = startViewTransition(vi.fn(), { direction: "back" });

    finishers[0]?.();
    await first;
    expect(document.documentElement).toHaveAttribute(VIEW_TRANSITION_ATTR, "back");

    finishers[1]?.();
    await second;
    expect(document.documentElement).not.toHaveAttribute(VIEW_TRANSITION_ATTR);
  });

  it("skips the transition under prefers-reduced-motion", async () => {
    const { start } = mockViewTransitions();
    mockReducedMotion(true);
    const update = vi.fn();
    await startViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("skips the transition inside .ol-reduce-motion", async () => {
    const { start } = mockViewTransitions();
    document.documentElement.classList.add(REDUCE_MOTION_CLASS);
    await startViewTransition(vi.fn());
    expect(start).not.toHaveBeenCalled();
  });

  it("skips the transition when the changing element sits in a .ol-reduce-motion subtree", async () => {
    const { start } = mockViewTransitions();
    const island = document.createElement("div");
    island.className = REDUCE_MOTION_CLASS;
    const page = document.createElement("div");
    island.append(page);
    document.body.append(island);
    const update = vi.fn();
    await startViewTransition(update, { element: page });
    expect(update).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();

    const outside = document.createElement("div");
    document.body.append(outside);
    void startViewTransition(vi.fn(), { element: outside });
    expect(start).toHaveBeenCalledTimes(1);
    island.remove();
    outside.remove();
  });
});

describe("useViewTransition", () => {
  function Pager() {
    const [page, setPage] = useState(1);
    const transition = useViewTransition();
    return (
      <button
        type="button"
        onClick={() => {
          void transition(() => {
            setPage((p) => p + 1);
          });
        }}
      >
        {`Page ${String(page)}`}
      </button>
    );
  }

  it("flushes React updates inside the transition", async () => {
    let seen = "";
    const start = vi.fn<Start>((update) => {
      update();
      seen = screen.getByRole("button").textContent;
      return { finished: Promise.resolve() };
    });
    Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });

    render(<Pager />);
    await act(async () => {
      screen.getByRole("button").click();
      await Promise.resolve();
    });
    expect(seen).toBe("Page 2");
  });
});
