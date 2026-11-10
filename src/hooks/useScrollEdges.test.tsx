import { act, render, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";

import { measureScrollEdges, type ScrollEdges, useScrollEdges } from "./useScrollEdges";

function box({ sw = 100, cw = 100, sh = 100, ch = 100, left = 0, top = 0 } = {}): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperties(el, {
    scrollWidth: { value: sw },
    clientWidth: { value: cw },
    scrollHeight: { value: sh },
    clientHeight: { value: ch },
  });
  el.scrollLeft = left;
  el.scrollTop = top;
  // jsdom clamps scroll positions to 0 without layout; define them directly.
  Object.defineProperty(el, "scrollLeft", { value: left, writable: true });
  Object.defineProperty(el, "scrollTop", { value: top, writable: true });
  return el;
}

describe("measureScrollEdges", () => {
  it("reports nothing when the content fits", () => {
    expect(measureScrollEdges(box())).toEqual({
      x: false,
      y: false,
      xStart: false,
      xEnd: false,
      yStart: false,
      yEnd: false,
    });
  });

  it("reports the end edge at the start of a tall scroller", () => {
    const edges = measureScrollEdges(box({ sh: 300 }));
    expect(edges).toMatchObject({ y: true, yStart: false, yEnd: true, x: false });
  });

  it("reports both edges in the middle and only the start at the end", () => {
    expect(measureScrollEdges(box({ sh: 300, top: 100 }))).toMatchObject({
      yStart: true,
      yEnd: true,
    });
    expect(measureScrollEdges(box({ sh: 300, top: 200 }))).toMatchObject({
      yStart: true,
      yEnd: false,
    });
  });

  it("treats a sub-pixel remainder as the edge", () => {
    expect(measureScrollEdges(box({ sh: 300, top: 199.5 }))).toMatchObject({ yEnd: false });
  });

  it("uses the distance from the start in RTL (negative scrollLeft)", () => {
    expect(measureScrollEdges(box({ sw: 300, left: -200 }))).toMatchObject({
      x: true,
      xStart: true,
      xEnd: false,
    });
  });
});

describe("useScrollEdges", () => {
  it("measures on mount and on scroll", async () => {
    let seen: ScrollEdges | undefined;
    let el: HTMLElement | null = null;
    function Probe() {
      const ref = useRef<HTMLDivElement | null>(null);
      seen = useScrollEdges(ref);
      return (
        <div
          ref={(node) => {
            ref.current = node;
            el = node;
            if (node) {
              Object.defineProperties(node, {
                scrollHeight: { value: 300, configurable: true },
                clientHeight: { value: 100, configurable: true },
              });
            }
          }}
        />
      );
    }
    render(<Probe />);
    expect(seen).toMatchObject({ y: true, yStart: false, yEnd: true });
    act(() => {
      Object.defineProperty(el, "scrollTop", { value: 200, configurable: true });
      el?.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() => {
      expect(seen).toMatchObject({ yStart: true, yEnd: false });
    });
  });
});
