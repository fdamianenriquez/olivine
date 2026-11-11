import { readFileSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { readMeter } from "./bands";
import { Meter } from "./Meter";

const meter = () => screen.getByRole("meter");
const valuetext = () => meter().getAttribute("aria-valuetext");
const lit = (container: Element) => container.querySelectorAll(".ol-meter__seg--on").length;
const printed = (container: Element) => [...container.querySelectorAll(".ol-print-block")];

describe("readMeter", () => {
  it("uses the HTML meter defaults", () => {
    const r = readMeter(40);
    expect(r).toMatchObject({ value: 40, min: 0, max: 100, low: 0, high: 100, optimum: 50 });
    expect(r.fraction).toBe(0.4);
    expect(r.state).toBeUndefined();
  });

  it("clamps the value and fixes inverted bounds", () => {
    expect(readMeter(150).value).toBe(100);
    expect(readMeter(-5).value).toBe(0);
    expect(readMeter(5, { min: 10, max: 2 })).toMatchObject({ min: 10, max: 10, value: 10 });
    expect(readMeter(5, { min: 10, max: 2 }).fraction).toBe(0);
    expect(readMeter(50, { low: 70, high: 30 })).toMatchObject({ low: 70, high: 70 });
    expect(readMeter(50, { low: -10, high: 500, optimum: 900 })).toMatchObject({
      low: 0,
      high: 100,
      optimum: 100,
    });
  });

  it("reads a value that is not a finite number as min", () => {
    expect(readMeter(Number.NaN, { min: 5 }).value).toBe(5);
  });

  it("optimum inside [low, high]: the middle band is good, both ends fair, never poor", () => {
    const at = (v: number) => readMeter(v, { min: 0, max: 40, low: 18, high: 24, optimum: 21 });
    expect(at(18).state).toBe("good");
    expect(at(21).state).toBe("good");
    expect(at(24).state).toBe("good");
    expect(at(17).state).toBe("fair");
    expect(at(25).state).toBe("fair");
    expect(at(0).state).toBe("fair");
    expect(at(40).state).toBe("fair");
    expect(at(18)).toMatchObject({ goodFrom: 18 / 40, goodTo: 24 / 40 });
  });

  it("optimum below low: [min, low] good, (low, high] fair, (high, max] poor", () => {
    const at = (v: number) => readMeter(v, { low: 60, high: 85, optimum: 0 });
    expect(at(0).state).toBe("good");
    expect(at(60).state).toBe("good");
    expect(at(61).state).toBe("fair");
    expect(at(85).state).toBe("fair");
    expect(at(86).state).toBe("poor");
    expect(at(0)).toMatchObject({ goodFrom: 0, goodTo: 0.6 });
  });

  it("optimum above high: [high, max] good, [low, high) fair, [min, low) poor", () => {
    const at = (v: number) => readMeter(v, { low: 20, high: 50, optimum: 100 });
    expect(at(100).state).toBe("good");
    expect(at(50).state).toBe("good");
    expect(at(49).state).toBe("fair");
    expect(at(20).state).toBe("fair");
    expect(at(19).state).toBe("poor");
    expect(at(100)).toMatchObject({ goodFrom: 0.5, goodTo: 1 });
  });

  it("has bands as soon as one of low, high or optimum is given", () => {
    expect(readMeter(10, { optimum: 50 }).state).toBe("good");
    expect(readMeter(10, { low: 20 }).state).toBe("fair");
    expect(readMeter(90, { high: 80 }).state).toBe("fair");
  });
});

describe("Meter", () => {
  it("renders a meter with value attributes and passes props through", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Meter ref={ref} value={72} label="Disk used" className="x" id="d" data-testid="m" />);
    const root = screen.getByTestId("m");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("ol-meter", "x");
    expect(root).toHaveAttribute("id", "d");
    expect(root).not.toHaveAttribute("data-state");
    const m = screen.getByRole("meter", { name: "Disk used" });
    expect(m).toHaveAttribute("aria-valuemin", "0");
    expect(m).toHaveAttribute("aria-valuemax", "100");
    expect(m).toHaveAttribute("aria-valuenow", "72");
    expect(m).toHaveAttribute("aria-valuetext", "72%");
    expect(m.style.getPropertyValue("--ol-meter-n")).toBe("0.72");
    expect(screen.getByText("72%")).toHaveClass("ol-meter__value");
  });

  it("is neutral without low, high or optimum: no state word and no scale", () => {
    const { container } = render(<Meter value={72} label="Score" />);
    expect(container.querySelector(".ol-badge")).toBeNull();
    expect(container.querySelector(".ol-meter__scale")).toBeNull();
  });

  it("adds the band word to the Badge, data-state and aria-valuetext", () => {
    const { container } = render(
      <Meter value={72} label="Disk used" low={60} high={85} optimum={0} data-testid="m" />,
    );
    expect(screen.getByTestId("m")).toHaveAttribute("data-state", "fair");
    expect(valuetext()).toBe("72%, Fair");
    const badge = container.querySelector(".ol-meter__state");
    expect(badge).toHaveTextContent("Fair");
    expect(badge).toHaveClass("ol-badge", "ol-badge--warning", "ol-badge--dot");
    expect(badge).toHaveAttribute("aria-hidden", "true");
  });

  it("maps good, fair and poor to the success, warning and danger tones", () => {
    const { container, rerender } = render(
      <Meter value={90} label="Battery" low={20} high={50} optimum={100} />,
    );
    const badge = () => container.querySelector(".ol-meter__state");
    expect(badge()).toHaveClass("ol-badge--success");
    expect(valuetext()).toBe("90%, Good");
    rerender(<Meter value={10} label="Battery" low={20} high={50} optimum={100} />);
    expect(badge()).toHaveClass("ol-badge--danger");
    expect(valuetext()).toBe("10%, Poor");
  });

  it("keeps the fill ink in every band: no tone class reaches the gauge", () => {
    const { container } = render(<Meter value={10} label="Battery" low={20} optimum={100} />);
    const gauge = container.querySelector(".ol-meter__track");
    expect(gauge?.className).toBe("ol-meter__track");
    expect(container.querySelector(".ol-meter__fill")?.className).toBe("ol-meter__fill");
  });

  it("overrides the band words with labels, in the Badge and aria-valuetext alike", () => {
    render(
      <Meter
        value={30}
        label="Temperature"
        min={0}
        max={40}
        low={18}
        high={24}
        optimum={21}
        labels={{ fair: "Out of range" }}
        valueText="30 °C"
      />,
    );
    expect(screen.getByText("Out of range")).toBeInTheDocument();
    expect(valuetext()).toBe("30 °C, Out of range");
  });

  it("hides the Badge with showState={false} but keeps the word in aria-valuetext", () => {
    const { container } = render(
      <Meter value={72} label="Disk" low={60} optimum={0} showState={false} />,
    );
    expect(container.querySelector(".ol-meter__state")).toBeNull();
    expect(valuetext()).toBe("72%, Fair");
  });

  it("hides the printed value with showValue={false}", () => {
    const { container } = render(<Meter value={40} aria-label="Quiet" showValue={false} />);
    expect(container.querySelector(".ol-meter__value")).toBeNull();
    expect(container.querySelector(".ol-meter__top")).toBeNull();
    expect(valuetext()).toBe("40%");
  });

  it("formats with format, formatOptions and valueText", () => {
    const { rerender } = render(
      <Meter value={12} max={16} label="Memory" formatOptions={{ maximumFractionDigits: 0 }} />,
    );
    expect(screen.getByText("12")).toHaveClass("ol-meter__value");
    expect(valuetext()).toBe("12");
    rerender(
      <Meter
        value={12}
        max={16}
        label="Memory"
        formatOptions={{ style: "percent", minimumIntegerDigits: 3 }}
      />,
    );
    expect(screen.getByText("075%")).toBeInTheDocument();
    rerender(<Meter value={12} max={16} label="Memory" format={(v) => `${String(v)}/16`} />);
    expect(screen.getByText("12/16")).toBeInTheDocument();
    expect(valuetext()).toBe("12/16");
    rerender(
      <Meter
        value={12}
        max={16}
        label="Memory"
        format={(v) => `${String(v)}/16`}
        valueText="12 of 16 GB"
      />,
    );
    expect(valuetext()).toBe("12 of 16 GB");
  });

  it("formats with the component locale, then the Root locale", () => {
    const { rerender } = render(
      <Root locale="es">
        <Meter value={72} label="Disco" low={60} optimum={0} />
      </Root>,
    );
    expect(valuetext()).toBe("72 %, Regular");
    expect(screen.getByText("Regular")).toBeInTheDocument();
    rerender(
      <Root locale="ja">
        <Meter value={72} label="ディスク" low={60} optimum={0} />
      </Root>,
    );
    expect(valuetext()).toBe("72%、普通");
    rerender(
      <Root locale="ja">
        <Meter value={90} label="電池" low={20} high={50} optimum={100} />
      </Root>,
    );
    expect(valuetext()).toBe("90%、良好");
    rerender(
      <Root locale="ja">
        <Meter value={10} label="電池" low={20} high={50} optimum={100} />
      </Root>,
    );
    expect(valuetext()).toBe("10%、不良");
    rerender(
      <Root locale="es">
        <Meter value={10} label="Batería" low={20} high={50} optimum={100} locale="en" />
      </Root>,
    );
    expect(valuetext()).toBe("10%, Mal");
  });

  it("names the meter from aria-label or aria-labelledby, which win over label", () => {
    const { rerender } = render(<Meter value={1} label="Visible" aria-label="Custom" />);
    expect(screen.getByRole("meter", { name: "Custom" })).toBeInTheDocument();
    rerender(
      <>
        <span id="ext">External</span>
        <Meter value={1} label="Visible" aria-labelledby="ext" />
      </>,
    );
    expect(screen.getByRole("meter", { name: "External" })).toBeInTheDocument();
  });

  it("accepts a node as label", () => {
    render(<Meter value={1} label={<strong>Rich</strong>} />);
    expect(screen.getByRole("meter", { name: "Rich" })).toBeInTheDocument();
  });

  it("is not focusable and has no keyboard interaction", async () => {
    render(
      <>
        <button type="button">Before</button>
        <Meter value={50} label="Load" low={30} optimum={0} />
        <button type="button">After</button>
      </>,
    );
    expect(meter()).not.toHaveAttribute("tabindex");
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("is not a live region and hides the value, state and scale from assistive technology", () => {
    const { container } = render(<Meter value={72} label="Disk" low={60} high={85} optimum={0} />);
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(container.querySelector("[role=status]")).toBeNull();
    expect(container.querySelector(".ol-meter__value")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".ol-meter__scale")).toHaveAttribute("aria-hidden", "true");
    expect(meter().children).toHaveLength(2);
  });

  it("draws ticks only at thresholds strictly inside the range, and the good band", () => {
    const { container, rerender } = render(
      <Meter value={72} label="Disk" low={60} high={85} optimum={0} />,
    );
    const ticks = () =>
      [...container.querySelectorAll<HTMLElement>(".ol-meter__tick")].map((t) =>
        t.style.getPropertyValue("--ol-tick"),
      );
    expect(ticks()).toEqual(["0.6", "0.85"]);
    const band = container.querySelector<HTMLElement>(".ol-meter__band");
    expect(band?.style.getPropertyValue("--ol-band-from")).toBe("0");
    expect(band?.style.getPropertyValue("--ol-band-to")).toBe("0.6");
    rerender(<Meter value={72} label="Disk" low={0} high={85} optimum={0} />);
    expect(ticks()).toEqual(["0.85"]);
    rerender(<Meter value={72} label="Disk" optimum={20} />);
    expect(container.querySelector(".ol-meter__scale")).toBeNull();
  });

  it("maps size and variant to modifier classes", () => {
    const { rerender } = render(<Meter value={10} aria-label="m" data-testid="m" />);
    const root = screen.getByTestId("m");
    expect(root.className).toBe("ol-meter");
    rerender(<Meter value={10} aria-label="m" data-testid="m" size="s" variant="segments" />);
    expect(root).toHaveClass("ol-meter--s", "ol-meter--segments");
    rerender(<Meter value={10} aria-label="m" data-testid="m" size="l" />);
    expect(root).toHaveClass("ol-meter--l");
  });

  it("draws ten blocks by default and lights them by position", () => {
    const { container, rerender } = render(<Meter value={72} label="Disk" variant="segments" />);
    expect(container.querySelectorAll(".ol-meter__seg")).toHaveLength(10);
    expect(lit(container)).toBe(7);
    expect(container.querySelector(".ol-meter__fill")).toBeNull();
    rerender(<Meter value={3} max={4} label="Disk" variant="segments" segments={4} />);
    expect(container.querySelectorAll(".ol-meter__seg")).toHaveLength(4);
    expect(lit(container)).toBe(3);
  });

  it("caps segments at 20 with a dev warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = render(
      <Meter value={50} label="Disk" variant="segments" segments={40} />,
    );
    expect(container.querySelectorAll(".ol-meter__seg")).toHaveLength(20);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("capped at 20"));
    warn.mockRestore();
  });

  describe("motion", () => {
    it("prints nothing on mount", () => {
      const { container } = render(<Meter value={80} label="Disk" variant="segments" />);
      expect(printed(container)).toHaveLength(0);
    });

    it("prints only the blocks that turned on, staggered from the first new one", () => {
      const { container, rerender } = render(<Meter value={30} label="Disk" variant="segments" />);
      rerender(<Meter value={60} label="Disk" variant="segments" />);
      const blocks = printed(container);
      expect(blocks).toHaveLength(3);
      const all = [...container.querySelectorAll(".ol-meter__seg")];
      expect(blocks.map((b) => all.indexOf(b))).toEqual([3, 4, 5]);
      expect(blocks.map((b) => (b as HTMLElement).style.getPropertyValue("--ol-i"))).toEqual([
        "0",
        "1",
        "2",
      ]);
    });

    it("caps the stagger at six steps", () => {
      const { container, rerender } = render(<Meter value={0} label="Disk" variant="segments" />);
      rerender(<Meter value={100} label="Disk" variant="segments" />);
      const steps = printed(container).map((b) =>
        (b as HTMLElement).style.getPropertyValue("--ol-i"),
      );
      expect(steps).toEqual(["0", "1", "2", "3", "4", "5", "5", "5", "5", "5"]);
    });

    it("drops blocks at once when the value falls, and keeps state on a same-value render", () => {
      const { container, rerender } = render(<Meter value={30} label="Disk" variant="segments" />);
      rerender(<Meter value={60} label="Disk" variant="segments" />);
      rerender(<Meter value={60} label="Disk" variant="segments" className="again" />);
      expect(printed(container)).toHaveLength(3);
      rerender(<Meter value={20} label="Disk" variant="segments" />);
      expect(lit(container)).toBe(2);
      expect(printed(container)).toHaveLength(0);
    });

    it("moves the bar with one stepped transform from motion tokens, removed under reduced motion", () => {
      const css = readFileSync("src/components/Meter/Meter.css", "utf8");
      expect(css).toMatch(/transition: transform var\(--dur-s\) var\(--ease-print\)/);
      expect(css).not.toMatch(/transition:[^;]*(width|inset|left)/);
      expect(css).toMatch(
        /prefers-reduced-motion: reduce\)\s*\{\s*\.ol-meter__fill,\s*\.ol-meter__hand\s*\{\s*transition: none/,
      );
      expect(css).toMatch(/animation-delay: calc\(var\(--ol-i, 0\) \* var\(--stagger\)\)/);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\d+(ms|s)\b/i);
      expect(css).not.toMatch(/(^|[^-\w])\d+px/m);
    });

    it("mirrors the fill and needle in right-to-left text", () => {
      const css = readFileSync("src/components/Meter/Meter.css", "utf8");
      expect(css).toMatch(
        /\.ol-meter__track:dir\(rtl\)\s*\{\s*--ol-meter-shift: calc\(\(1 - var\(--ol-meter-n, 0\)\) \* 100%\)/,
      );
      expect(css).toMatch(/inset-inline-start: calc\(var\(--ol-tick, 0\) \* 100%\)/);
    });
  });

  describe("dev warnings", () => {
    it("warns when the meter has no name", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Meter value={10} />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs a name"));
      warn.mockRestore();
    });

    it("warns about a value that is not a number and reads it as min", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Meter value={Number.NaN} label="Disk" />);
      expect(meter()).toHaveAttribute("aria-valuenow", "0");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("not a number"));
      warn.mockRestore();
    });

    it("warns when formatOptions would write words in the figure face", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Meter
          value={12}
          max={16}
          label="Memory"
          formatOptions={{ style: "unit", unit: "gigabyte" }}
        />,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("digits and symbols only"));
      warn.mockRestore();
    });

    it("warns for long compact notation, which writes words", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Meter
          value={1200}
          max={5000}
          label="Visits"
          formatOptions={{ notation: "compact", compactDisplay: "long" }}
        />,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("digits and symbols only"));
      warn.mockRestore();
    });

    it("warns when format returns an element and no valueText is given", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Meter value={40} label="Disk" format={(v) => <b>{v}</b>} />);
      expect(valuetext()).toBe("40%");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("pass valueText"));
      warn.mockRestore();
    });

    it("stays quiet for a named, well-formed meter", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Meter value={40} label="Disk" low={20} optimum={0} variant="segments" />);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe("axe", () => {
    it.each([
      ["neutral bar", { value: 40 }],
      ["good bar", { value: 90, low: 20, high: 50, optimum: 100 }],
      ["fair bar", { value: 30, low: 20, high: 50, optimum: 100 }],
      ["poor bar", { value: 10, low: 20, high: 50, optimum: 100 }],
      ["good segments", { value: 90, low: 20, high: 50, optimum: 100, variant: "segments" }],
      ["fair segments", { value: 30, low: 20, high: 50, optimum: 100, variant: "segments" }],
      ["poor segments", { value: 10, low: 20, high: 50, optimum: 100, variant: "segments" }],
    ] as const)("has no violations: %s", async (_, props) => {
      const { container } = render(<Meter label="Battery" {...props} />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations when named by aria-label without visible chrome", async () => {
      const { container } = render(
        <Meter value={40} aria-label="Battery" size="s" showValue={false} low={20} />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  it("puts aria-describedby and aria-details on the meter, not the wrapper", () => {
    const { container } = render(
      <Meter value={0.5} label="Load" aria-describedby="hint" aria-details="more" />,
    );
    const node = screen.getByRole("meter");
    expect(node).toHaveAttribute("aria-describedby", "hint");
    expect(node).toHaveAttribute("aria-details", "more");
    expect(container.firstElementChild).not.toHaveAttribute("aria-describedby");
  });
});
