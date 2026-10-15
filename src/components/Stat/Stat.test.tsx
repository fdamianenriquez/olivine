import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Stat } from "./Stat";

afterEach(() => vi.restoreAllMocks());

describe("Stat", () => {
  it("renders label, value, unit and delta with the large size by default", () => {
    render(
      <Stat
        label="Growth"
        value="064"
        unit="%"
        delta="vs. last year"
        className="x"
        data-testid="s"
      />,
    );
    const el = screen.getByTestId("s");
    expect(el).toHaveClass("ol-stat", "ol-stat--l", "x");
    expect(el).toHaveTextContent("Growth");
    expect(el).toHaveTextContent("064%");
    expect(el.querySelector(".ol-stat__unit")).toHaveTextContent("%");
    expect(el).toHaveTextContent("vs. last year");
    expect(el).not.toHaveClass("ol-stat--accent");
  });

  it.each(["m", "l", "xl"] as const)("maps size %s to its class", (size) => {
    render(<Stat value={1} size={size} data-testid="s" />);
    expect(screen.getByTestId("s")).toHaveClass(`ol-stat--${size}`);
  });

  it("applies the accent modifier", () => {
    render(<Stat value={1} accent data-testid="s" />);
    expect(screen.getByTestId("s")).toHaveClass("ol-stat--accent");
  });

  it("omits optional parts when not given", () => {
    const { container } = render(<Stat value={7} />);
    expect(container.querySelector(".ol-label")).toBeNull();
    expect(container.querySelector(".ol-stat__unit")).toBeNull();
    expect(container.querySelector(".ol-stat__delta")).toBeNull();
  });

  it("shows a hidden arrow and a spoken word for the trend", () => {
    render(
      <>
        <Stat value={1} delta="12%" trend="up" data-testid="up" />
        <Stat value={1} delta="3%" trend="down" data-testid="down" />
      </>,
    );
    const up = screen.getByTestId("up");
    expect(up.querySelector(".ol-stat__arrow")).toHaveTextContent("↑");
    expect(up.querySelector(".ol-stat__arrow")).toHaveAttribute("aria-hidden", "true");
    expect(up.querySelector(".ol-sr")).toHaveTextContent("up");
    expect(up.querySelector(".ol-stat__delta")).toHaveClass("ol-stat__delta--up");
    const down = screen.getByTestId("down");
    expect(down.querySelector(".ol-stat__arrow")).toHaveTextContent("↓");
    expect(down.querySelector(".ol-sr")).toHaveTextContent("down");
  });

  it("does not add a trend word without trend", () => {
    const { container } = render(<Stat value={1} delta="same" />);
    expect(container.querySelector(".ol-sr")).toBeNull();
  });

  it("translates the trend word", () => {
    const { rerender } = render(
      <Root locale="es">
        <Stat value={1} delta="x" trend="up" data-testid="s" />
      </Root>,
    );
    const spoken = () => screen.getByTestId("s").querySelector(".ol-sr")?.textContent;
    const es = spoken();
    expect(es).toBeTruthy();
    expect(es).not.toBe("up");
    rerender(
      <Root locale="ja">
        <Stat value={1} delta="x" trend="up" data-testid="s" />
      </Root>,
    );
    expect(spoken()).not.toBe(es);
  });

  it("warns when unit is a word", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Stat value={4} unit="pieces" />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("unit");
  });

  it("warns when value contains letters", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Stat value="twelve" />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("value");
  });

  it("does not warn for digits and symbols", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <Stat value="¥48,000" unit="×" />
        <Stat value={1284} unit="%" />
        <Stat value="064" unit="$" />
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Stat ref={ref} value={1} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("ol-stat");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <main>
        <Stat label="Orders" value="1,284" delta="12% vs. last month" trend="up" />
        <Stat label="Growth" value="064" unit="%" accent size="xl" />
        <Stat label="Total" value="¥48,000" size="m" delta="3 pieces" trend="down" />
      </main>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
