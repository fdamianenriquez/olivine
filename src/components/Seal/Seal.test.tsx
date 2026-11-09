import { readFileSync } from "node:fs";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Seal } from "./Seal";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("element not found");
  return value;
}

const motionCss = readFileSync("src/styles/motion.css", "utf8");

describe("Seal", () => {
  it("renders one span of real text with the stamp class and passes props through", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(
      <Seal ref={ref} className="x" data-testid="s" id="seal">
        Workshop
      </Seal>,
    );
    const el = screen.getByTestId("s");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("ol-stamp", "x");
    expect(el).toHaveAttribute("id", "seal");
    expect(el).toHaveTextContent("Workshop");
    expect(el.children).toHaveLength(0);
    expect(container.children).toHaveLength(1);
    expect(ref.current).toBe(el);
    // A plain seal adds nothing else to the class.
    expect(el.className).toBe("ol-stamp x");
  });

  it("maps variant, ink, shape and tilt to the utility classes", () => {
    render(
      <Seal variant="hakubun" ink="shu" shape="square" tilt data-testid="s" lang="ja">
        白樺楽器
      </Seal>,
    );
    expect(screen.getByTestId("s")).toHaveClass(
      "ol-stamp",
      "ol-stamp--negative",
      "ol-stamp--shu",
      "ol-stamp--square",
      "ol-stamp--tilt",
    );
    expect(screen.getByTestId("s")).not.toHaveClass("ol-stamp--press");
  });

  it.each([
    ["olivo", "ol-stamp--olivo"],
    ["shu", "ol-stamp--shu"],
  ] as const)("ink %s adds %s", (ink, cls) => {
    render(
      <Seal ink={ink} data-testid="s">
        Sold
      </Seal>,
    );
    expect(screen.getByTestId("s")).toHaveClass(cls);
  });

  it.each(["vertical", "round"] as const)("shape %s adds its class", (shape) => {
    render(
      <Seal shape={shape} data-testid="s" label="Done">
        済
      </Seal>,
    );
    expect(screen.getByTestId("s")).toHaveClass(`ol-stamp--${shape}`);
  });

  it("never uses the haku alias, wrappers or inline styles", () => {
    const { container } = render(
      <Seal variant="hakubun" shape="round" tilt press>
        Sold
      </Seal>,
    );
    expect(container.innerHTML).not.toContain("ol-stamp--haku ");
    expect(container.innerHTML).not.toContain("style=");
  });
});

describe("Seal accessible name", () => {
  it("Latin text has no role and no aria attributes: it is read as text", () => {
    render(<Seal data-testid="s">Workshop</Seal>);
    const el = screen.getByTestId("s");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-label");
    expect(el).not.toHaveAttribute("aria-hidden");
    expect(screen.getByText("Workshop")).toBe(el);
  });

  it("with a label the seal is an image named by it, and the characters are not exposed", () => {
    render(
      <Seal label="Inspected" data-testid="s">
        検品
      </Seal>,
    );
    const img = screen.getByRole("img", { name: "Inspected" });
    expect(img).toBe(screen.getByTestId("s"));
    expect(img).toHaveAttribute("lang", "ja");
    expect(screen.queryByRole("img", { name: "検品" })).toBeNull();
  });

  it("allows a label on Latin text", () => {
    render(<Seal label="Birch Instruments">BI</Seal>);
    expect(screen.getByRole("img", { name: "Birch Instruments" })).toHaveTextContent("BI");
  });

  it("decorative hides the seal and sets no role", () => {
    render(
      <Seal decorative data-testid="s">
        済
      </Seal>,
    );
    const el = screen.getByTestId("s");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).not.toHaveAttribute("role");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("decorative wins over label, with a development warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Seal decorative label="Done" data-testid="s">
        済
      </Seal>,
    );
    const el = screen.getByTestId("s");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).not.toHaveAttribute("aria-label");
    expect(el).not.toHaveAttribute("role");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`decorative` wins"));
  });

  it("controls role and aria attributes itself", () => {
    // The props are omitted from the type; JavaScript callers still cannot override them.
    const loose = { role: "button", "aria-label": "Press me", "aria-hidden": false } as const;
    render(
      <Seal {...loose} label="Done" data-testid="s">
        済
      </Seal>,
    );
    const el = screen.getByTestId("s");
    expect(el).toHaveAttribute("role", "img");
    expect(el).toHaveAttribute("aria-label", "Done");
    expect(el).not.toHaveAttribute("aria-hidden");
  });

  it("names a heading with the seal's text or its label", () => {
    render(
      <>
        <h2>
          <Seal>Sold</Seal>
        </h2>
        <h2>
          <Seal label="Inspected">検品</Seal>
        </h2>
      </>,
    );
    expect(screen.getByRole("heading", { name: "Sold" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inspected" })).toBeInTheDocument();
  });

  it("warns when kanji has neither a label nor decorative, and renders plain text", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Seal data-testid="s">検品</Seal>);
    const el = screen.getByTestId("s");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-hidden");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs `label`"));
  });

  it("does not warn for kanji with a label or decorative, or for plain Latin text", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <Seal label="Inspected">検品</Seal>
        <Seal decorative>済</Seal>
        <Seal>Sold out</Seal>
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Seal is not interactive", () => {
  it("has no tabindex, is skipped by Tab and ignores keys", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(
      <>
        <button type="button">Before</button>
        <Seal data-testid="s" label="Inspected" press onKeyDown={onKeyDown}>
          検品
        </Seal>
        <button type="button">After</button>
      </>,
    );
    const el = screen.getByTestId("s");
    expect(el).not.toHaveAttribute("tabindex");
    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    await user.keyboard("{Enter} ");
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(el).not.toHaveAttribute("aria-pressed");
    expect(screen.queryByRole("button", { name: "Inspected" })).toBeNull();
  });
});

describe("Seal lang", () => {
  it("defaults to ja for kanji and kana, and honours the lang prop", () => {
    render(
      <>
        <Seal data-testid="han" label="Done">
          済
        </Seal>
        <Seal data-testid="kana" label="Done">
          ありがとう
        </Seal>
        <Seal data-testid="own" label="Done" lang="ja-JP">
          済
        </Seal>
      </>,
    );
    expect(screen.getByTestId("han")).toHaveAttribute("lang", "ja");
    expect(screen.getByTestId("kana")).toHaveAttribute("lang", "ja");
    expect(screen.getByTestId("own")).toHaveAttribute("lang", "ja-JP");
  });

  it("leaves Latin text inherited outside a Japanese Root", () => {
    render(
      <>
        <Seal data-testid="none">Sold</Seal>
        <Root locale="es">
          <Seal data-testid="es">Vendido</Seal>
        </Root>
        <Root locale="en-GB">
          <Seal data-testid="en">Sold</Seal>
        </Root>
      </>,
    );
    expect(screen.getByTestId("none")).not.toHaveAttribute("lang");
    expect(screen.getByTestId("es")).not.toHaveAttribute("lang");
    expect(screen.getByTestId("en")).not.toHaveAttribute("lang");
  });

  it("sets en on Latin text under a Japanese Root so the Latin face is kept", () => {
    render(
      <Root locale="ja">
        <Seal data-testid="a">Sold</Seal>
        <Seal data-testid="b" lang="es">
          Vendido
        </Seal>
        <Seal data-testid="c" label="Done">
          済
        </Seal>
      </Root>,
    );
    expect(screen.getByTestId("a")).toHaveAttribute("lang", "en");
    expect(screen.getByTestId("b")).toHaveAttribute("lang", "es");
    expect(screen.getByTestId("c")).toHaveAttribute("lang", "ja");
  });

  it("tags Hangul as ko and warns that it is not supported", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Seal data-testid="s" label="Done">
        완료
      </Seal>,
    );
    expect(screen.getByTestId("s")).toHaveAttribute("lang", "ko");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Hangul"));
  });
});

describe("Seal development warnings", () => {
  const cases: [string, () => React.JSX.Element, string][] = [
    [
      "square with two characters",
      () => (
        <Seal shape="square" label="Done">
          検品
        </Seal>
      ),
      "three or four",
    ],
    [
      "square with five characters",
      () => (
        <Seal shape="square" label="Done">
          白樺楽器店
        </Seal>
      ),
      "three or four",
    ],
    [
      "vertical over four",
      () => (
        <Seal shape="vertical" label="Done">
          白樺楽器店
        </Seal>
      ),
      "four characters at most",
    ],
    [
      "round over two",
      () => (
        <Seal shape="round" label="Done">
          白樺楽
        </Seal>
      ),
      "one or two",
    ],
    ["Latin over three words", () => <Seal>Birch Instruments Workshop Ltd</Seal>, "three words"],
  ];

  it.each(cases)("warns for %s", (_name, element, message) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(element());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(message));
  });

  it("warns about mixed scripts and keeps the derived lang", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Seal data-testid="s" label="Sold">
        Sold 売
      </Seal>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("mixed scripts"));
    // The lang stays derived from the first character: Latin, so inherited.
    expect(screen.getByTestId("s")).not.toHaveAttribute("lang");
  });

  it("stays quiet for valid shapes and counts a surrogate-pair kanji as one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <Seal shape="square" label="Done">
          白樺楽器
        </Seal>
        <Seal shape="round" label="Done">
          𠮷済
        </Seal>
        <Seal shape="vertical" label="Done">
          検品
        </Seal>
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Seal press", () => {
  it("adds no press class by default or for false", () => {
    render(
      <>
        <Seal data-testid="a">Sold</Seal>
        <Seal data-testid="b" press={false}>
          Sold
        </Seal>
      </>,
    );
    expect(screen.getByTestId("a")).not.toHaveClass("ol-stamp--press");
    expect(screen.getByTestId("b")).not.toHaveClass("ol-stamp--press");
    expect(screen.getByTestId("a")).not.toHaveAttribute("data-enter");
  });

  it("adds the press class for true, with no entrance hold", () => {
    render(
      <Seal press data-testid="s">
        Sold
      </Seal>,
    );
    expect(screen.getByTestId("s")).toHaveClass("ol-stamp--press");
    expect(screen.getByTestId("s")).not.toHaveAttribute("data-enter");
  });

  it("plays on demand when press switches from false to true, without remounting", () => {
    const { rerender } = render(<Seal data-testid="s">Sold</Seal>);
    const el = screen.getByTestId("s");
    rerender(
      <Seal data-testid="s" press>
        Sold
      </Seal>,
    );
    expect(screen.getByTestId("s")).toBe(el);
    expect(el).toHaveClass("ol-stamp--press");
  });

  describe('"view"', () => {
    type Report = (entries: Partial<IntersectionObserverEntry>[]) => void;
    const entry = (isIntersecting: boolean, visible: number) => ({
      isIntersecting,
      boundingClientRect: { height: 100 } as DOMRectReadOnly,
      intersectionRect: { height: visible } as DOMRectReadOnly,
      rootBounds: { height: 800 } as DOMRectReadOnly,
    });

    function stubObserver() {
      const state: { report: Report } = { report: () => undefined };
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(callback: Report) {
            state.report = callback;
          }
          observe = vi.fn();
          disconnect = vi.fn();
        },
      );
      return state;
    }

    it("holds the seal until it is in view, then plays once", () => {
      const observer = stubObserver();
      render(
        <Seal press="view" data-testid="s">
          Sold
        </Seal>,
      );
      const el = screen.getByTestId("s");
      expect(el).toHaveClass("ol-stamp--press");
      expect(el).toHaveAttribute("data-enter", "wait");
      act(() => {
        observer.report([entry(false, 0)]);
      });
      expect(el).toHaveAttribute("data-enter", "wait");
      act(() => {
        observer.report([entry(true, 100)]);
      });
      expect(el).toHaveAttribute("data-enter", "in");
    });

    it("plays on mount without IntersectionObserver", () => {
      vi.stubGlobal("IntersectionObserver", undefined);
      render(
        <Seal press="view" data-testid="s">
          Sold
        </Seal>,
      );
      expect(screen.getByTestId("s")).toHaveClass("ol-stamp--press");
      expect(screen.getByTestId("s")).not.toHaveAttribute("data-enter");
    });

    it("lets go of the hold when press leaves view, and keeps the forwarded ref", () => {
      stubObserver();
      const ref = createRef<HTMLSpanElement>();
      const { rerender } = render(
        <Seal ref={ref} press="view" data-testid="s">
          Sold
        </Seal>,
      );
      const el = screen.getByTestId("s");
      expect(ref.current).toBe(el);
      expect(el).toHaveAttribute("data-enter", "wait");
      rerender(
        <Seal ref={ref} press data-testid="s">
          Sold
        </Seal>,
      );
      expect(ref.current).toBe(el);
      expect(el).not.toHaveAttribute("data-enter");
      expect(el).toHaveClass("ol-stamp--press");
    });

    it("never holds a seal that is not press view", () => {
      stubObserver();
      render(<Seal data-testid="s">Sold</Seal>);
      expect(screen.getByTestId("s")).not.toHaveAttribute("data-enter");
    });
  });

  it("does not restart on unrelated prop changes: the class stays, no new node", () => {
    const { rerender } = render(
      <Seal press ink="shu" data-testid="s">
        Sold
      </Seal>,
    );
    const el = screen.getByTestId("s");
    rerender(
      <Seal press ink="olivo" variant="hakubun" data-testid="s">
        Sold
      </Seal>,
    );
    expect(screen.getByTestId("s")).toBe(el);
  });

  it("reduced motion is CSS only: the hanko runs on --dur-m, which collapses to 1ms", () => {
    const rule = must(/\.ol-stamp--press\s*\{[^}]*\}/.exec(motionCss))[0];
    expect(rule).toContain("var(--dur-m)");
    expect(motionCss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*--dur-m:\s*1ms/);
    expect(motionCss).toMatch(/\.ol-reduce-motion\s*\{[^}]*--dur-m:\s*1ms/);
  });
});

describe("Seal SSR", () => {
  it("renders on the server without touching the document", () => {
    const html = renderToString(
      <Seal press="view" label="Inspected">
        検品
      </Seal>,
    );
    expect(html).toContain('class="ol-stamp ol-stamp--press"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Inspected"');
    expect(html).toContain('lang="ja"');
    expect(html).not.toContain("data-enter");
  });
});

describe("Seal axe", () => {
  const themes = ["washi", "sumi"] as const;

  it.each(themes)("has no violations across every variant in the %s theme", async (theme) => {
    const { container } = render(
      <Root theme={theme}>
        <Seal>Workshop</Seal>
        <Seal variant="hakubun" ink="shu" tilt>
          Approved
        </Seal>
        <Seal ink="olivo" press>
          Sold
        </Seal>
        <Seal label="Inspected" shape="vertical">
          検品
        </Seal>
        <Seal label="Birch instruments" shape="square" variant="hakubun" ink="shu">
          白樺楽器
        </Seal>
        <Seal label="Done" shape="round" ink="olivo">
          済
        </Seal>
        <Seal decorative shape="round">
          済
        </Seal>
        <h2>
          <Seal press="view">Sold</Seal>
        </h2>
        <p>
          Inspected <Seal decorative>済</Seal>
        </p>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no violations under a Japanese Root", async () => {
    const { container } = render(
      <Root locale="ja">
        <Seal>Sold</Seal>
        <Seal label="Inspected">検品</Seal>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
