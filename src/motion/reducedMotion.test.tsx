import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prefersReducedMotion, REDUCE_MOTION_CLASS, useReducedMotion } from "./reducedMotion";

function mockMatchMedia(initial: boolean) {
  let listener: (() => void) | null = null;
  const query = {
    matches: initial,
    addEventListener: vi.fn((_: string, fn: () => void) => {
      listener = fn;
    }),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => query) });
  return {
    query,
    set(matches: boolean) {
      query.matches = matches;
      listener?.();
    },
  };
}

function Probe() {
  return <span>{useReducedMotion() ? "reduce" : "full"}</span>;
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("reduced motion", () => {
  it("is false without matchMedia", () => {
    expect(prefersReducedMotion()).toBe(false);
    render(<Probe />);
    expect(screen.getByText("full")).toBeInTheDocument();
  });

  it("follows the media query", () => {
    const media = mockMatchMedia(false);
    const { unmount } = render(<Probe />);
    expect(screen.getByText("full")).toBeInTheDocument();
    act(() => {
      media.set(true);
    });
    expect(screen.getByText("reduce")).toBeInTheDocument();
    expect(prefersReducedMotion()).toBe(true);
    unmount();
    expect(media.query.removeEventListener).toHaveBeenCalled();
  });

  it("honours .ol-reduce-motion on an ancestor", () => {
    mockMatchMedia(false);
    const island = document.createElement("div");
    island.className = REDUCE_MOTION_CLASS;
    const child = document.createElement("span");
    island.append(child);
    document.body.append(island);
    expect(prefersReducedMotion(child)).toBe(true);
    expect(prefersReducedMotion(document.body)).toBe(false);
    expect(prefersReducedMotion()).toBe(false);
    island.remove();
  });
});
