import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Carousel } from "./Carousel";

const slides = ["One", "Two", "Three"].map((s) => <p key={s}>{s}</p>);
const counter = () => document.querySelector(".ol-carousel__count")?.textContent;
const tick = (n: number) => screen.getByRole("button", { name: `Go to slide ${String(n)}` });

function mockMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  mockMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Carousel", () => {
  it("renders a labelled carousel region with root class and native props", () => {
    render(<Carousel slides={slides} className="x" data-testid="c" />);
    const root = screen.getByTestId("c");
    expect(root.tagName).toBe("SECTION");
    expect(root).toHaveClass("ol-carousel", "x");
    expect(root).toHaveAttribute("aria-roledescription", "carousel");
    expect(root).toHaveAttribute("aria-label", "Carousel");
    expect(counter()).toBe("01 / 03");
  });

  it("uses the label prop over the locale", () => {
    render(<Carousel slides={slides} label="Gallery" />);
    expect(screen.getByRole("region", { name: "Gallery" })).toBeInTheDocument();
  });

  it("exposes slides as groups and makes inactive ones inert", () => {
    render(<Carousel slides={slides} />);
    const groups = document.querySelectorAll(".ol-carousel__slide");
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveAttribute("role", "group");
    expect(groups[0]).toHaveAttribute("aria-roledescription", "slide");
    expect(groups[0]).toHaveAttribute("aria-label", "1 of 3");
    expect(groups[0]).not.toHaveAttribute("aria-hidden");
    expect(groups[1]).toHaveAttribute("aria-hidden", "true");
    expect(groups[1]).toHaveAttribute("inert");
    expect(groups[0]).not.toHaveAttribute("inert");
  });

  it("keeps focusable content in inactive slides unreachable", () => {
    render(<Carousel slides={[<button key="a">A</button>, <button key="b">B</button>]} />);
    const groups = document.querySelectorAll(".ol-carousel__slide");
    expect(groups[1]).toHaveAttribute("inert");
    expect(groups[1]).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(groups[0]).toHaveAttribute("inert");
    expect(groups[1]).not.toHaveAttribute("inert");
    for (const g of document.querySelectorAll('[aria-hidden="true"].ol-carousel__slide'))
      expect(g).toHaveAttribute("inert");
  });

  it("ignores arrows from editable targets and with modifiers", () => {
    render(<Carousel slides={[<input key="i" aria-label="field" />, <p key="p">x</p>]} />);
    fireEvent.keyDown(screen.getByLabelText("field"), { key: "ArrowRight" });
    expect(counter()).toBe("01 / 02");
    fireEvent.keyDown(tick(1), { key: "ArrowRight", altKey: true });
    fireEvent.keyDown(tick(1), { key: "ArrowRight", shiftKey: true });
    expect(counter()).toBe("01 / 02");
    fireEvent.keyDown(tick(1), { key: "ArrowRight" });
    expect(counter()).toBe("02 / 02");
  });

  it("moves with next, prev and wraps around", () => {
    const onIndexChange = vi.fn();
    render(<Carousel slides={slides} onIndexChange={onIndexChange} />);
    const next = screen.getByRole("button", { name: "Next slide" });
    const prev = screen.getByRole("button", { name: "Previous slide" });
    fireEvent.click(prev);
    expect(counter()).toBe("03 / 03");
    fireEvent.click(next);
    expect(counter()).toBe("01 / 03");
    fireEvent.click(next);
    expect(counter()).toBe("02 / 03");
    expect(onIndexChange.mock.calls).toEqual([[2], [0], [1]]);
  });

  it("jumps with ticks and marks the current one", () => {
    render(<Carousel slides={slides} />);
    fireEvent.click(tick(3));
    expect(counter()).toBe("03 / 03");
    expect(tick(3)).toHaveAttribute("aria-current", "true");
    expect(tick(1)).not.toHaveAttribute("aria-current");
    expect(document.querySelector(".ol-carousel__track")).toHaveStyle("--ol-index: 2");
  });

  it("responds to arrow keys while focus is inside", () => {
    render(<Carousel slides={slides} />);
    tick(1).focus();
    fireEvent.keyDown(tick(1), { key: "ArrowRight" });
    expect(counter()).toBe("02 / 03");
    fireEvent.keyDown(tick(1), { key: "ArrowLeft" });
    fireEvent.keyDown(tick(1), { key: "ArrowLeft" });
    expect(counter()).toBe("03 / 03");
  });

  it("supports a controlled index", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(
      <Carousel slides={slides} index={1} onIndexChange={onIndexChange} />,
    );
    expect(counter()).toBe("02 / 03");
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(onIndexChange).toHaveBeenCalledWith(2);
    expect(counter()).toBe("02 / 03");
    rerender(<Carousel slides={slides} index={2} onIndexChange={onIndexChange} />);
    expect(counter()).toBe("03 / 03");
  });

  it("honours defaultIndex", () => {
    render(<Carousel slides={slides} defaultIndex={2} />);
    expect(counter()).toBe("03 / 03");
  });

  describe("autoplay", () => {
    it("is off without interval: no play button, polite live region", () => {
      render(<Carousel slides={slides} />);
      expect(screen.queryByRole("button", { name: /pause|play/i })).toBeNull();
      expect(document.querySelector(".ol-carousel__viewport")).toHaveAttribute(
        "aria-live",
        "polite",
      );
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(counter()).toBe("01 / 03");
    });

    it("advances on the interval, wraps, and silences the live region", () => {
      render(<Carousel slides={slides} interval={1000} />);
      expect(document.querySelector(".ol-carousel__viewport")).toHaveAttribute("aria-live", "off");
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(counter()).toBe("02 / 03");
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(counter()).toBe("01 / 03");
    });

    it("pauses on hover and resumes on leave", () => {
      render(<Carousel slides={slides} interval={1000} data-testid="c" />);
      const root = screen.getByTestId("c");
      fireEvent.mouseEnter(root);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(counter()).toBe("01 / 03");
      expect(document.querySelector(".ol-carousel__viewport")).toHaveAttribute(
        "aria-live",
        "polite",
      );
      fireEvent.mouseLeave(root);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(counter()).toBe("02 / 03");
    });

    it("pauses while focus is inside and resumes on blur", () => {
      render(<Carousel slides={slides} interval={1000} />);
      const next = screen.getByRole("button", { name: "Next slide" });
      act(() => {
        next.focus();
      });
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(counter()).toBe("01 / 03");
      act(() => {
        next.blur();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(counter()).toBe("02 / 03");
    });

    it("toggles with the play/pause button", () => {
      render(<Carousel slides={slides} interval={1000} />);
      const pause = screen.getByRole("button", { name: "Pause" });
      fireEvent.click(pause);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(counter()).toBe("01 / 03");
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(counter()).toBe("02 / 03");
    });

    it("restarts the delay after a manual change", () => {
      render(<Carousel slides={slides} interval={1000} />);
      act(() => {
        vi.advanceTimersByTime(900);
      });
      fireEvent.click(tick(3));
      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(counter()).toBe("03 / 03");
    });

    it("does not autoplay under reduced motion until the user presses play", () => {
      mockMotion(true);
      render(<Carousel slides={slides} interval={1000} />);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(counter()).toBe("01 / 03");
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(counter()).toBe("02 / 03");
    });
  });

  it("switches built-in strings with the locale", () => {
    const { rerender } = render(
      <Root locale="es">
        <Carousel slides={slides} interval={1000} />
      </Root>,
    );
    expect(screen.getByRole("region", { name: "Carrusel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diapositiva siguiente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir a la diapositiva 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
    rerender(
      <Root locale="ja">
        <Carousel slides={slides} interval={1000} />
      </Root>,
    );
    expect(screen.getByRole("region", { name: "カルーセル" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次のスライド" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "スライド2へ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "一時停止" })).toBeInTheDocument();
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLElement>();
    render(<Carousel slides={slides} ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("region"));
  });

  it("is polite after pausing with the button", () => {
    render(<Carousel slides={slides} interval={1000} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(document.querySelector(".ol-carousel__viewport")).toHaveAttribute("aria-live", "polite");
  });

  it("has no axe violations in manual, paused and reduced-motion states", async () => {
    vi.useRealTimers();
    const manual = render(<Carousel slides={slides} />);
    expect(await runAxe(manual.container)).toHaveNoViolations();
    manual.unmount();
    const paused = render(<Carousel slides={slides} interval={1000} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(await runAxe(paused.container)).toHaveNoViolations();
    paused.unmount();
    mockMotion(true);
    const reduced = render(<Carousel slides={slides} interval={1000} />);
    expect(await runAxe(reduced.container)).toHaveNoViolations();
  });

  it("has no axe violations", async () => {
    vi.useRealTimers();
    const { container } = render(<Carousel slides={slides} interval={1000} />);
    expect(await runAxe(container)).toHaveNoViolations();
    fireEvent.click(tick(2));
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
