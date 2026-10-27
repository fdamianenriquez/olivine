import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../test/axe";
import { foldOrigami, useOrigami } from "./origami";
import { REDUCE_MOTION_CLASS } from "./reducedMotion";
import { bindSumi, useSumi } from "./sumi";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function pointer(type: string, clientX = 0, clientY = 0) {
  return new MouseEvent(type, { bubbles: true, clientX, clientY });
}

describe("bindSumi", () => {
  it("blooms from the pointer and lifts on release", () => {
    const button = document.createElement("button");
    button.className = "ol-motion-sumi";
    document.body.append(button);
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({ left: 10, top: 20 } as DOMRect);
    const unbind = bindSumi(button);

    button.dispatchEvent(pointer("pointerdown", 40, 35));
    expect(button.dataset.press).toBe("down");
    expect(button.style.getPropertyValue("--ol-sumi-x")).toBe("30px");
    expect(button.style.getPropertyValue("--ol-sumi-y")).toBe("15px");

    button.dispatchEvent(pointer("pointerup"));
    expect(button.dataset.press).toBe("up");
    button.dispatchEvent(pointer("pointerleave"));
    expect(button.dataset.press).toBe("up");

    unbind();
    button.dispatchEvent(pointer("pointerdown"));
    expect(button.dataset.press).toBe("up");
  });

  it("blooms from the centre for Enter and Space and lifts after --dur-m", () => {
    vi.useFakeTimers();
    const button = document.createElement("button");
    button.style.setProperty("--dur-m", "300ms");
    document.body.append(button);
    bindSumi(button);

    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(button.dataset.press).toBeUndefined();
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(button.dataset.press).toBe("down");
    expect(button.style.getPropertyValue("--ol-sumi-x")).toBe("50%");
    button.dispatchEvent(new KeyboardEvent("keydown", { key: " ", repeat: true }));
    vi.advanceTimersByTime(269);
    expect(button.dataset.press).toBe("down");
    vi.advanceTimersByTime(1);
    expect(button.dataset.press).toBe("up");
  });

  it("lifts at once when --dur-m is missing", () => {
    vi.useFakeTimers();
    const button = document.createElement("button");
    bindSumi(button);
    button.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    vi.advanceTimersByTime(0);
    expect(button.dataset.press).toBe("up");
  });

  it("binds through a ref with useSumi", () => {
    function Press() {
      return (
        <button ref={useSumi<HTMLButtonElement>()} type="button" className="ol-motion-sumi">
          Pay
        </button>
      );
    }
    const { unmount } = render(<Press />);
    const button = screen.getByRole("button");
    button.dispatchEvent(pointer("pointerdown"));
    expect(button.dataset.press).toBe("down");
    unmount();
  });
});

describe("foldOrigami", () => {
  function title(text = "Fold, don't decorate.") {
    const heading = document.createElement("h2");
    heading.className = "ol-motion-origami";
    heading.textContent = text;
    document.body.append(heading);
    return heading;
  }

  function stubObserver() {
    let report: (entries: Partial<IntersectionObserverEntry>[]) => void = () => undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof report) {
          report = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    return (isIntersecting: boolean, visible = 40, height = 40) => {
      report([
        {
          isIntersecting,
          boundingClientRect: { height } as DOMRectReadOnly,
          intersectionRect: { height: visible } as DOMRectReadOnly,
        },
      ]);
    };
  }

  it("prints the title on a folded fan and keeps the real text", () => {
    stubObserver();
    const heading = title();
    foldOrigami(heading, { panels: 3 });

    expect(heading).toHaveAttribute("data-origami", "ready");
    expect(heading).toHaveAttribute("data-state", "folded");
    expect(heading).toHaveAccessibleName("Fold, don't decorate.");
    const sheet = heading.querySelector(".ol-motion-origami__sheet");
    expect(sheet).toHaveAttribute("aria-hidden", "true");
    const panels = heading.querySelectorAll<HTMLElement>(".ol-motion-origami__panel");
    expect(panels).toHaveLength(3);
    expect([...panels].map((p) => p.style.getPropertyValue("--ol-rel"))).toEqual([
      "0deg",
      "180deg",
      "-180deg",
    ]);
    expect(panels[2]?.parentElement).toBe(panels[1]);
    expect(heading.style.getPropertyValue("--ol-origami-last")).toBe("2");
    expect(heading.style.getPropertyValue("--ol-origami-panel")).toBe("2px");
  });

  it("opens when it enters the viewport", () => {
    const report = stubObserver();
    const heading = title();
    foldOrigami(heading);
    report(false, 0);
    expect(heading).toHaveAttribute("data-state", "folded");
    report(true, 20);
    expect(heading).toHaveAttribute("data-state", "folded");
    report(true, 36);
    expect(heading).toHaveAttribute("data-state", "open");
  });

  it("opens a title wider than the viewport once its height is in view", () => {
    const report = stubObserver();
    const heading = title();
    foldOrigami(heading);
    report(true, 0, 0);
    expect(heading).toHaveAttribute("data-state", "open");
  });

  it("opens at once under reduced motion or without IntersectionObserver", () => {
    stubObserver();
    const island = document.createElement("div");
    island.className = REDUCE_MOTION_CLASS;
    const heading = document.createElement("h2");
    heading.textContent = "Quiet";
    island.append(heading);
    document.body.append(island);
    foldOrigami(heading);
    expect(heading).toHaveAttribute("data-state", "open");

    vi.stubGlobal("IntersectionObserver", undefined);
    const plain = title("Plain");
    foldOrigami(plain);
    expect(plain).toHaveAttribute("data-state", "open");
  });

  it("folds, replays, rebuilds on new text and cleans up", async () => {
    stubObserver();
    const heading = title("One");
    const origami = foldOrigami(heading);
    origami.open();
    expect(heading).toHaveAttribute("data-state", "open");
    origami.fold();
    expect(heading).toHaveAttribute("data-state", "folded");

    origami.replay();
    expect(heading).toHaveAttribute("data-state", "folded");
    expect(heading).toHaveAttribute("data-origami", "ready");
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(heading).toHaveAttribute("data-state", "open");

    heading.firstChild?.replaceWith(document.createTextNode("Two"));
    await act(() => Promise.resolve());
    expect(heading.querySelector(".ol-motion-origami__text")?.textContent).toBe("Two");

    origami.destroy();
    expect(heading.querySelector(".ol-motion-origami__sheet")).toBeNull();
    expect(heading).not.toHaveAttribute("data-origami");
    expect(heading.getAttribute("style")).toBeFalsy();
  });

  it("measures with ResizeObserver and font loading where available", async () => {
    stubObserver();
    const observe = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe;
        disconnect = vi.fn();
      },
    );
    const ready = Promise.resolve();
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });
    const heading = title();
    vi.spyOn(heading, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 500,
      height: 60,
    } as DOMRect);
    foldOrigami(heading);
    await act(() => ready);
    expect(observe).toHaveBeenCalledWith(heading);
    expect(heading.style.getPropertyValue("--ol-origami-panel")).toBe("102px");
    expect(heading.style.getPropertyValue("--ol-origami-h")).toBe("60px");
    Reflect.deleteProperty(document, "fonts");
  });

  it("follows a theme switch after binding: nothing captures the ink", () => {
    stubObserver();
    const style = document.createElement("style");
    style.textContent = `
      [data-theme="washi"] { color: rgb(26, 24, 20); }
      [data-theme="sumi"] { color: rgb(236, 229, 214); }
    `;
    document.head.append(style);
    const root = document.createElement("div");
    root.dataset.theme = "washi";
    const heading = title();
    root.append(heading);
    document.body.append(root);
    foldOrigami(heading);
    const copy = heading.querySelector<HTMLElement>(".ol-motion-origami__text");
    expect(copy && getComputedStyle(copy).color).toBe("rgb(26, 24, 20)");

    root.dataset.theme = "sumi";
    expect(getComputedStyle(heading).color).toBe("rgb(236, 229, 214)");
    expect(copy && getComputedStyle(copy).color).toBe("rgb(236, 229, 214)");
    expect(heading.style.getPropertyValue("--ol-origami-ink")).toBe("");
    for (const node of heading.querySelectorAll<HTMLElement>("*")) {
      expect(node.style.color).toBe("");
    }
    style.remove();
  });

  it("hands the line back to the real text once the fold has opened", () => {
    vi.useFakeTimers();
    stubObserver();
    const heading = title();
    const origami = foldOrigami(heading, { panels: 3 });
    const panels = heading.querySelectorAll<HTMLElement>(".ol-motion-origami__panel");
    const last = panels[2];
    if (!last) throw new Error("No last panel");
    last.style.transitionDuration = "0.4s";
    last.style.transitionDelay = "200ms";

    origami.open();
    expect(heading).toHaveAttribute("data-origami", "ready");
    // A transitionend from another panel does not count.
    panels[1]?.dispatchEvent(
      Object.assign(new Event("transitionend", { bubbles: true }), { propertyName: "transform" }),
    );
    expect(heading).toHaveAttribute("data-origami", "ready");
    last.dispatchEvent(
      Object.assign(new Event("transitionend", { bubbles: true }), { propertyName: "transform" }),
    );
    expect(heading).toHaveAttribute("data-origami", "done");

    origami.fold();
    expect(heading).toHaveAttribute("data-origami", "ready");
    // The safety net waits the last panel's transition plus one --dur-s.
    heading.style.setProperty("--dur-s", "100ms");
    origami.open();
    vi.advanceTimersByTime(699);
    expect(heading).toHaveAttribute("data-origami", "ready");
    vi.advanceTimersByTime(1);
    expect(heading).toHaveAttribute("data-origami", "done");
    origami.destroy();
  });

  it("settles at once when nothing transitions (reduced motion)", () => {
    stubObserver();
    const island = document.createElement("div");
    island.className = REDUCE_MOTION_CLASS;
    const heading = title("Quiet");
    island.append(heading);
    document.body.append(island);
    foldOrigami(heading);
    expect(heading).toHaveAttribute("data-state", "open");
    expect(heading).toHaveAttribute("data-origami", "done");
  });

  it("has no axe violations folded or open", async () => {
    const report = stubObserver();
    const main = document.createElement("main");
    const heading = title();
    main.append(heading);
    document.body.append(main);
    foldOrigami(heading);
    expect(heading).toHaveAttribute("data-state", "folded");
    expect(await runAxe(document.body)).toHaveNoViolations();
    report(true, 40);
    expect(heading).toHaveAttribute("data-state", "open");
    expect(await runAxe(document.body)).toHaveNoViolations();
  });

  it("runs through useOrigami", async () => {
    stubObserver();
    function Title() {
      const ref = useRef<HTMLHeadingElement>(null);
      const replay = useOrigami(ref, { panels: 4 });
      return (
        <>
          <h2 ref={ref} className="ol-motion-origami">
            Craft
          </h2>
          <button type="button" onClick={replay}>
            Replay
          </button>
        </>
      );
    }
    const { unmount } = render(<Title />);
    const heading = screen.getByRole("heading");
    expect(heading.querySelectorAll(".ol-motion-origami__panel")).toHaveLength(4);
    screen.getByRole("button").click();
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(heading).toHaveAttribute("data-state", "open");
    unmount();
  });
});
