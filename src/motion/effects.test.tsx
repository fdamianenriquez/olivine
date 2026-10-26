import { readFileSync } from "node:fs";

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../test/axe";
import { sideOf } from "./shapes";
import { replayAnimations, useEntrance } from "./useEntrance";
import { useIndicator } from "./useIndicator";
import { useInkWipe } from "./useInkWipe";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useInkWipe", () => {
  function Group({ active }: { active: number }) {
    const ink = useInkWipe(active);
    return (
      <div role="radiogroup" aria-label="Size">
        {["S", "M", "L"].map((label, index) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={index === active}
            className="ol-ink-wipe"
            {...ink(index)}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  const attrs = () =>
    screen.getAllByRole("radio").map((el) => [el.dataset.ink ?? "", el.dataset.inkDir ?? ""]);

  it("does not animate the first selection", () => {
    render(<Group active={1} />);
    expect(attrs()).toEqual([
      ["", ""],
      ["", ""],
      ["", ""],
    ]);
  });

  it("inks forward and back in the direction of travel", () => {
    const { rerender } = render(<Group active={0} />);
    rerender(<Group active={2} />);
    expect(attrs()).toEqual([
      ["leave", "forward"],
      ["", ""],
      ["enter", "forward"],
    ]);
    rerender(<Group active={1} />);
    expect(attrs()).toEqual([
      ["", ""],
      ["enter", "back"],
      ["leave", "back"],
    ]);
  });

  it("has no axe violations before and after a change, with the inked copy", async () => {
    function Copied({ active }: { active: number }) {
      const ink = useInkWipe(active);
      return (
        <main>
          <div role="radiogroup" aria-label="Size">
            {["S", "M", "L"].map((label, index) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={index === active}
                className="ol-ink-wipe"
                {...ink(index)}
              >
                {label}
                <span className="ol-ink-wipe__ink" aria-hidden="true">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </main>
      );
    }
    const { container, rerender } = render(<Copied active={0} />);
    expect(await runAxe(container)).toHaveNoViolations();
    rerender(<Copied active={2} />);
    expect(screen.getAllByRole("radio")[2]).toHaveAttribute("data-ink", "enter");
    expect(screen.getByRole("radio", { name: "L" })).toBeChecked();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("handles an empty selection on either side", () => {
    const { rerender } = render(<Group active={-1} />);
    rerender(<Group active={1} />);
    expect(attrs()).toEqual([
      ["", ""],
      ["enter", "forward"],
      ["", ""],
    ]);
    rerender(<Group active={-1} />);
    expect(attrs()).toEqual([
      ["", ""],
      ["leave", "back"],
      ["", ""],
    ]);
  });
});

describe("useIndicator", () => {
  function Tabs({ active, selector }: { active: number; selector?: string }) {
    const ref = useIndicator<HTMLDivElement>(active, selector ? { selector } : {});
    return (
      <div ref={ref} data-testid="list" role="tablist">
        {["One", "Two"].map((label, index) => (
          <button key={label} type="button" role="tab" aria-selected={index === active}>
            {label}
          </button>
        ))}
        <span className="ol-indicator" />
      </div>
    );
  }

  function place(el: Element, left: number, width: number) {
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ left, width } as DOMRect);
  }

  it("writes the active tab's position on the container and then turns on sliding", async () => {
    const observe = vi.fn();
    let resize: () => void = () => undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe = observe;
        disconnect = vi.fn();
      },
    );
    const { rerender } = render(<Tabs active={-1} />);
    const list = screen.getByTestId("list");
    const [one, two] = screen.getAllByRole("tab");
    place(list, 100, 300);
    if (one) place(one, 100, 80);
    if (two) place(two, 180, 120);

    rerender(<Tabs active={1} />);
    expect(list.style.getPropertyValue("--ol-indicator-x")).toBe("80px");
    expect(list.style.getPropertyValue("--ol-indicator-w")).toBe("120px");
    expect(list.style.getPropertyValue("--ol-indicator-track")).toBe("0px");
    expect(observe).toHaveBeenCalledWith(list);
    await waitFor(() => {
      expect(list).toHaveAttribute("data-indicator", "ready");
    });

    if (two) place(two, 180, 140);
    act(() => {
      resize();
    });
    expect(list.style.getPropertyValue("--ol-indicator-w")).toBe("140px");
  });

  it("hides the bar when nothing matches", () => {
    render(<Tabs active={0} selector="[aria-current]" />);
    expect(screen.getByTestId("list").style.getPropertyValue("--ol-indicator-w")).toBe("0px");
  });
});

describe("useEntrance", () => {
  function Section() {
    const { setElement, replay } = useEntrance({ threshold: 0.5 });
    return (
      <section ref={setElement} className="ol-johakyu" aria-label="Intro">
        <button type="button" onClick={replay}>
          Replay
        </button>
      </section>
    );
  }

  type Report = (entries: Partial<IntersectionObserverEntry>[]) => void;
  const entry = (isIntersecting: boolean, visible: number, height = 100, viewport = 800) => ({
    isIntersecting,
    boundingClientRect: { height } as DOMRectReadOnly,
    intersectionRect: { height: visible } as DOMRectReadOnly,
    rootBounds: { height: viewport } as DOMRectReadOnly,
  });

  it("waits until the element is in view, then plays once", () => {
    let report: Report = () => undefined;
    const disconnect = vi.fn();
    const options: unknown[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof report, init: unknown) {
          report = callback;
          options.push(init);
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    const { unmount } = render(<Section />);
    const section = screen.getByRole("region");
    expect(section).toHaveAttribute("data-enter", "wait");
    expect(options).toEqual([{ threshold: [0, 0.5] }]);

    report([entry(false, 0)]);
    expect(section).toHaveAttribute("data-enter", "wait");
    report([entry(true, 40)]);
    expect(section).toHaveAttribute("data-enter", "wait");
    report([entry(true, 50)]);
    expect(section).toHaveAttribute("data-enter", "in");
    expect(disconnect).toHaveBeenCalled();
    unmount();
  });

  it("opens an element far taller than the viewport once a fifth of the viewport shows it", () => {
    let report: Report = () => undefined;
    const options: { threshold: number[] }[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: Report, init: { threshold: number[] }) {
          report = callback;
          options.push(init);
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal("innerHeight", 800);
    function Tall() {
      const { setElement } = useEntrance();
      return <section ref={setElement} aria-label="Long read" className="ol-johakyu" />;
    }
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      height: 8000,
    } as DOMRect);
    render(<Tall />);
    const section = screen.getByRole("region");
    // 20% of the element (1600px) is more than the viewport: the bar is 20% of the viewport.
    expect(options[0]?.threshold).toEqual([0, 0.02]);
    report([entry(true, 150, 8000, 800)]);
    expect(section).toHaveAttribute("data-enter", "wait");
    report([entry(true, 160, 8000, 800)]);
    expect(section).toHaveAttribute("data-enter", "in");
  });

  it("prints held entrances in their end state", () => {
    // The core sheet turns every animation off in print, extras included.
    const css = readFileSync("src/styles/motion.css", "utf8");
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toMatch(/animation:\s*none !important/);
  });

  it("plays on mount without IntersectionObserver and replays every animation", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Section />);
    const section = screen.getByRole("region");
    expect(section).not.toHaveAttribute("data-enter");

    const running = { cancel: vi.fn(), play: vi.fn() };
    Object.defineProperty(section, "getAnimations", { value: () => [running] });
    screen.getByRole("button").click();
    expect(running.cancel).toHaveBeenCalled();
    expect(running.play).toHaveBeenCalled();
  });

  it("ignores elements that cannot replay", () => {
    expect(() => {
      replayAnimations(null);
      replayAnimations(document.createElement("div"));
    }).not.toThrow();
  });
});

describe("sideOf", () => {
  it("reads the side of a floating placement", () => {
    expect(sideOf("top-start")).toBe("top");
    expect(sideOf("bottom")).toBe("bottom");
    expect(sideOf("left-end")).toBe("left");
    expect(sideOf("right")).toBe("right");
    expect(sideOf("")).toBe("bottom");
  });
});
