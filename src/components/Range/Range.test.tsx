import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { FieldContext, type FieldContextValue } from "../../hooks/useFieldControl";
import { LocaleContext, LocaleTagContext, makeLabels } from "../../locale";
import { runAxe } from "../../test/axe";
import { Field } from "../Field";
import { Range, type RangeValue } from "./Range";

const field: FieldContextValue = {
  id: "field-1",
  describedBy: "field-1-hint",
  invalid: false,
  required: false,
  claim: () => true,
};

describe("Range", () => {
  it("renders a range input with min 0, max 100 and the root class", () => {
    const { container } = render(<Range aria-label="Width" className="extra" data-testid="r" />);
    const el = screen.getByLabelText("Width");
    expect(el).toHaveAttribute("type", "range");
    expect(el).toHaveAttribute("min", "0");
    expect(el).toHaveAttribute("max", "100");
    expect(el).toHaveValue("0");
    expect(el).toHaveAttribute("data-testid", "r");
    expect(container.firstElementChild).toHaveClass("ol-range", "extra");
  });

  it("starts at defaultValue and updates the scale when uncontrolled", () => {
    const onChange = vi.fn();
    render(<Range aria-label="Width" defaultValue={20} onChange={onChange} />);
    const el = screen.getByLabelText("Width");
    expect(el).toHaveValue("20");
    fireEvent.change(el, { target: { value: "60" } });
    expect(el).toHaveValue("60");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".ol-range__current")).toHaveTextContent("60");
  });

  it("follows the value prop when controlled", () => {
    function Controlled() {
      const [v, setV] = useState(10);
      return (
        <Range
          aria-label="Width"
          value={v}
          onChange={(e) => {
            setV(+e.target.value);
          }}
        />
      );
    }
    render(<Controlled />);
    const el = screen.getByLabelText("Width");
    fireEvent.change(el, { target: { value: "40" } });
    expect(el).toHaveValue("40");
    expect(document.querySelector(".ol-range__current")).toHaveTextContent("40");
  });

  it("does not move when controlled and the parent ignores the change", () => {
    render(<Range aria-label="Width" value={10} onChange={vi.fn()} />);
    const el = screen.getByLabelText("Width");
    fireEvent.change(el, { target: { value: "40" } });
    expect(el).toHaveValue("10");
  });

  it("is reachable with Tab and reports native keyboard steps", async () => {
    const onChange = vi.fn();
    render(<Range aria-label="Width" defaultValue={50} step={10} onChange={onChange} />);
    const el = screen.getByLabelText("Width");
    await userEvent.tab();
    expect(el).toHaveFocus();
    // jsdom has no native range keyboard stepping, so the browser's step is simulated.
    fireEvent.change(el, { target: { value: "60" } });
    expect(el).toHaveValue("60");
    fireEvent.change(el, { target: { value: "0" } });
    expect(el).toHaveValue("0");
    fireEvent.change(el, { target: { value: "100" } });
    expect(el).toHaveValue("100");
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("shows min, current and max on a hidden scale", () => {
    const { container } = render(<Range aria-label="Width" min={10} max={90} defaultValue={30} />);
    const scale = container.querySelector(".ol-range__scale");
    expect(scale).toHaveAttribute("aria-hidden", "true");
    expect(scale).toHaveTextContent("103090");
    expect(scale?.children).toHaveLength(3);
  });

  it("hides the scale with scale={false}", () => {
    const { container } = render(<Range aria-label="Width" scale={false} />);
    expect(container.querySelector(".ol-range__scale")).toBeNull();
  });

  it("formats the scale and sets aria-valuetext", () => {
    const { container } = render(
      <Range aria-label="Width" max={240} defaultValue={120} format={(v) => String(v) + "cm"} />,
    );
    expect(container.querySelector(".ol-range__scale")).toHaveTextContent("0cm120cm240cm");
    expect(screen.getByLabelText("Width")).toHaveAttribute("aria-valuetext", "120cm");
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "30" } });
    expect(screen.getByLabelText("Width")).toHaveAttribute("aria-valuetext", "30cm");
  });

  it("sets units apart from the figures on the scale", () => {
    const { container } = render(
      <Range
        aria-label="Width"
        defaultValue={120}
        max={240}
        format={(v) => (
          <>
            {v}
            <span className="ol-range__unit">cm</span>
          </>
        )}
      />,
    );
    expect(container.querySelectorAll(".ol-range__unit")).toHaveLength(3);
    expect(container.querySelector(".ol-range__current")).toHaveTextContent("120cm");
    expect(screen.getByLabelText("Width")).not.toHaveAttribute("aria-valuetext");
  });

  it("keeps the single markup: one direct input, no group, no range attribute", () => {
    const { container } = render(
      <Range aria-label="Width" defaultValue={5} {...({ range: false } as object)} />,
    );
    const root = container.firstElementChild;
    expect(root).not.toHaveClass("ol-range--dual");
    expect(root).not.toHaveAttribute("role");
    expect(root?.querySelectorAll("input")).toHaveLength(1);
    expect(root?.firstElementChild?.tagName).toBe("INPUT");
    expect(screen.getByLabelText("Width")).not.toHaveAttribute("range");
  });

  it("omits aria-valuetext without format", () => {
    render(<Range aria-label="Width" />);
    expect(screen.getByLabelText("Width")).not.toHaveAttribute("aria-valuetext");
  });

  it("is disabled", () => {
    render(<Range aria-label="Width" disabled />);
    expect(screen.getByLabelText("Width")).toBeDisabled();
  });

  it("forwards the ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Range aria-label="Width" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText("Width"));
  });

  it("takes id and description from a Field", () => {
    render(
      <FieldContext.Provider value={field}>
        <Range aria-label="Width" />
      </FieldContext.Provider>,
    );
    const el = screen.getByLabelText("Width");
    expect(el).toHaveAttribute("id", "field-1");
    expect(el).toHaveAttribute("aria-describedby", "field-1-hint");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <label htmlFor="w">Width</label>
        <Range id="w" format={(v) => String(v) + "%"} />
        <Range aria-label="Off" disabled scale={false} />
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

/** jsdom has no layout: a 112px track with 12px blocks leaves 100px of travel from x = 6. */
function layout(container: HTMLElement) {
  const track = must(container.querySelector<HTMLElement>(".ol-range__track"));
  track.getBoundingClientRect = () => ({ left: 0, width: 112 }) as DOMRect;
  container.querySelectorAll<HTMLElement>(".ol-range__block").forEach((block) => {
    block.getBoundingClientRect = () => ({ width: 12 }) as DOMRect;
  });
  return track;
}

/** clientX of a value on the 0–100 test track. */
const x = (value: number) => 6 + value;

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing element");
  return value;
}

/** `Intl.NumberFormat#formatRange` (ES2023, not in this project's lib). */
const formatRange = (formatter: Intl.NumberFormat, start: number, end: number) =>
  (formatter as Intl.NumberFormat & { formatRange: (a: number, b: number) => string }).formatRange(
    start,
    end,
  );

const sliders = () => screen.getAllByRole<HTMLInputElement>("slider");
const thumbs = () => [must(sliders()[0]), must(sliders()[1])] as const;
const pair = () => sliders().map((s) => Number(s.value));

describe("Range with two thumbs", () => {
  beforeAll(() => {
    // jsdom has no pointer capture.
    for (const [key, value] of [
      ["setPointerCapture", () => undefined],
      ["hasPointerCapture", () => true],
      ["releasePointerCapture", () => undefined],
    ] as const) {
      Object.defineProperty(Element.prototype, key, { value, configurable: true });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("turns on with a pair, renders a named group with two sliders", () => {
    const { container } = render(
      <Range aria-label="Price" defaultValue={[20, 80]} className="extra" />,
    );
    const root = container.firstElementChild;
    expect(root).toHaveClass("ol-range", "ol-range--dual", "extra");
    expect(screen.getByRole("group", { name: "Price" })).toBe(root);
    const [low, high] = thumbs();
    expect(low).toHaveAccessibleName("Price, minimum");
    expect(high).toHaveAccessibleName("Price, maximum");
    expect(pair()).toEqual([20, 80]);
    expect(root).toHaveStyle("--ol-range-lo: 0.2");
    expect(root).toHaveStyle("--ol-range-hi: 0.8");
  });

  it("turns on with range and starts at [min, max]", () => {
    render(<Range aria-label="Price" range min={10} max={50} />);
    expect(pair()).toEqual([10, 50]);
  });

  it("names the thumbs in Spanish and Japanese", () => {
    const { unmount } = render(
      <LocaleContext.Provider value={makeLabels("es")}>
        <Range aria-label="Precio" range />
      </LocaleContext.Provider>,
    );
    expect(sliders()[0]).toHaveAccessibleName("Precio, mínimo");
    expect(sliders()[1]).toHaveAccessibleName("Precio, máximo");
    unmount();
    render(
      <LocaleContext.Provider value={makeLabels("ja")}>
        <Range range />
      </LocaleContext.Provider>,
    );
    expect(sliders()[0]).toHaveAccessibleName("最小値");
    expect(sliders()[1]).toHaveAccessibleName("最大値");
  });

  it("takes minLabel and maxLabel as the thumb names", () => {
    render(<Range aria-label="Price" range minLabel="From" maxLabel="To" />);
    expect(sliders()[0]).toHaveAccessibleName("From");
    expect(sliders()[1]).toHaveAccessibleName("To");
  });

  it("names the thumbs after aria-labelledby", () => {
    render(
      <>
        <span id="lbl">Height</span>
        <Range aria-labelledby="lbl" range />
      </>,
    );
    expect(screen.getByRole("group", { name: "Height" })).toBeInTheDocument();
    expect(sliders()[0]).toHaveAccessibleName("Height, minimum");
    expect(sliders()[1]).toHaveAccessibleName("Height, maximum");
  });

  it("warns without a name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Range range />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs a name"));
    expect(sliders()[0]).toHaveAccessibleName("Minimum");
  });

  it("is wired by a Field: label on the low thumb, description and validity on both", async () => {
    render(
      <Field label="Price" hint="In euros" error="Too wide" required>
        <Range range />
      </Field>,
    );
    const [low, high] = thumbs();
    expect(screen.getByRole("group", { name: /Price/ })).toBeInTheDocument();
    // The required asterisk is hidden from assistive tech, so it stays out of the name.
    expect(low).toHaveAccessibleName("Price, minimum");
    expect(high).toHaveAccessibleName("Price, maximum");
    for (const s of [low, high]) {
      expect(s).toHaveAccessibleDescription(/In euros/);
      expect(s).toHaveAttribute("aria-invalid", "true");
      expect(s).toHaveAttribute("required");
    }
    expect(low).toHaveAttribute("id");
    expect(high).not.toHaveAttribute("id");
    await userEvent.click(screen.getByText("Price"));
    expect(low).toHaveFocus();
  });

  it("puts id on the group", () => {
    const { container } = render(<Range id="budget" aria-label="Budget" range />);
    expect(container.firstElementChild).toHaveAttribute("id", "budget");
  });

  it("tabs low thumb then high thumb, with dynamic native limits", async () => {
    render(<Range aria-label="Price" defaultValue={[20, 80]} minDistance={10} />);
    const [low, high] = thumbs();
    await userEvent.tab();
    expect(low).toHaveFocus();
    await userEvent.tab();
    expect(high).toHaveFocus();
    expect(low).toHaveAttribute("min", "0");
    expect(low).toHaveAttribute("max", "70");
    expect(high).toHaveAttribute("min", "30");
    expect(high).toHaveAttribute("max", "100");
  });

  it("steps each thumb with arrows, Page keys, Home and End", async () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <Range
        aria-label="Price"
        defaultValue={[20, 80]}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    const [low, high] = thumbs();
    act(() => {
      low.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    expect(pair()).toEqual([21, 80]);
    expect(onValueChange).toHaveBeenLastCalledWith([21, 80]);
    expect(onValueCommit).toHaveBeenLastCalledWith([21, 80]);
    await userEvent.keyboard("{ArrowUp}{ArrowLeft}{ArrowDown}");
    expect(pair()).toEqual([20, 80]);
    await userEvent.keyboard("{PageUp}");
    expect(pair()).toEqual([30, 80]);
    await userEvent.keyboard("{PageDown}");
    expect(pair()).toEqual([20, 80]);
    // End stops at the other thumb, Home at the global minimum.
    await userEvent.keyboard("{End}");
    expect(pair()).toEqual([80, 80]);
    await userEvent.keyboard("{Home}");
    expect(pair()).toEqual([0, 80]);
    act(() => {
      high.focus();
    });
    await userEvent.keyboard("{Home}");
    expect(pair()).toEqual([0, 0]);
    await userEvent.keyboard("{End}");
    expect(pair()).toEqual([0, 100]);
    // At the limit nothing changes and nothing is reported.
    const calls = onValueChange.mock.calls.length;
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledTimes(calls);
    // Other keys are left alone.
    await userEvent.keyboard("a");
    expect(pair()).toEqual([0, 100]);
  });

  it("uses largeStep for Page keys", async () => {
    render(<Range aria-label="Price" defaultValue={[20, 80]} largeStep={25} />);
    act(() => {
      sliders()[0]?.focus();
    });
    await userEvent.keyboard("{PageUp}");
    expect(pair()).toEqual([45, 80]);
  });

  it("flips Left and Right in a right-to-left context", async () => {
    render(
      <div dir="rtl">
        <Range aria-label="Price" defaultValue={[20, 80]} />
      </div>,
    );
    act(() => {
      sliders()[1]?.focus();
    });
    await userEvent.keyboard("{ArrowLeft}");
    expect(pair()).toEqual([20, 81]);
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(pair()).toEqual([20, 79]);
    await userEvent.keyboard("{ArrowUp}");
    expect(pair()).toEqual([20, 80]);
  });

  it("never lets the thumbs cross and keeps minDistance", async () => {
    render(<Range aria-label="Price" defaultValue={[40, 60]} step={5} minDistance={12} />);
    const [low, high] = thumbs();
    // minDistance rounds up to 15.
    expect(low).toHaveAttribute("max", "45");
    act(() => {
      low.focus();
    });
    await userEvent.keyboard("{PageUp}");
    expect(pair()).toEqual([45, 60]);
    act(() => {
      high.focus();
    });
    await userEvent.keyboard("{Home}");
    expect(pair()).toEqual([45, 60]);
  });

  it("passes native changes from assistive tech through the same clamp", () => {
    const onValueCommit = vi.fn();
    render(<Range aria-label="Price" defaultValue={[20, 80]} onValueCommit={onValueCommit} />);
    const [low, high] = thumbs();
    fireEvent.change(low, { target: { value: "35" } });
    expect(pair()).toEqual([35, 80]);
    expect(onValueCommit).toHaveBeenLastCalledWith([35, 80]);
    fireEvent.change(high, { target: { value: "10" } });
    expect(pair()).toEqual([35, 35]);
  });

  it("follows value when controlled and stays put when the parent ignores changes", async () => {
    function Controlled() {
      const [v, setV] = useState<RangeValue>([10, 90]);
      return (
        <>
          <Range aria-label="Price" value={v} onValueChange={setV} />
          <output>{v.join("-")}</output>
        </>
      );
    }
    const { unmount } = render(<Controlled />);
    act(() => {
      sliders()[0]?.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("status")).toHaveTextContent("11-90");
    expect(pair()).toEqual([11, 90]);
    unmount();

    const onValueChange = vi.fn();
    render(<Range aria-label="Price" value={[10, 90]} onValueChange={onValueChange} />);
    act(() => {
      sliders()[0]?.focus();
    });
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(onValueChange).toHaveBeenNthCalledWith(1, [11, 90]);
    expect(onValueChange).toHaveBeenNthCalledWith(2, [11, 90]);
    expect(pair()).toEqual([10, 90]);
  });

  it("corrects an unsorted or out-of-range value with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Range aria-label="Price" value={[120, 30]} step={10} />);
    expect(pair()).toEqual([30, 100]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("was corrected to [30:100]"));
  });

  it("moves the nearest thumb when the track is pressed, then drags it", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = render(
      <Range
        aria-label="Price"
        defaultValue={[20, 80]}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    const track = layout(container);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: x(70) });
    expect(pair()).toEqual([20, 70]);
    expect(sliders()[1]).toHaveFocus();
    expect(container.querySelector(".ol-range__thumb--max")).toHaveAttribute("data-dragging");
    expect(onValueCommit).not.toHaveBeenCalled();
    fireEvent.pointerMove(track, { pointerId: 1, clientX: x(90) });
    fireEvent.pointerMove(track, { pointerId: 2, clientX: x(95) });
    expect(pair()).toEqual([20, 90]);
    // Dragging past the other thumb stops at it.
    fireEvent.pointerMove(track, { pointerId: 1, clientX: x(5) });
    expect(pair()).toEqual([20, 20]);
    fireEvent.pointerUp(track, { pointerId: 1, clientX: x(5) });
    expect(onValueCommit).toHaveBeenCalledTimes(1);
    expect(onValueCommit).toHaveBeenCalledWith([20, 20]);
    expect(container.querySelector("[data-dragging]")).toBeNull();
    // A press nearer the low thumb takes it.
    fireEvent.pointerDown(track, { pointerId: 3, button: 0, clientX: x(2) });
    fireEvent.pointerUp(track, { pointerId: 3 });
    expect(pair()).toEqual([2, 20]);
    expect(sliders()[0]).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith([2, 20]);
  });

  it("reads the track from the right in a right-to-left context", () => {
    const { container } = render(
      <div dir="rtl">
        <Range aria-label="Price" defaultValue={[20, 80]} />
      </div>,
    );
    const track = layout(container);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: x(90) });
    expect(pair()).toEqual([10, 80]);
  });

  it("drags a pressed thumb without jumping and ignores other buttons and disabled", () => {
    const { container, rerender } = render(<Range aria-label="Price" defaultValue={[20, 80]} />);
    const track = layout(container);
    const block = must(container.querySelector(".ol-range__thumb--min .ol-range__block"));
    fireEvent.pointerDown(block, { pointerId: 1, button: 0, clientX: x(23) });
    expect(pair()).toEqual([20, 80]);
    fireEvent.pointerMove(track, { pointerId: 1, clientX: x(30) });
    fireEvent.pointerCancel(track, { pointerId: 1 });
    expect(pair()).toEqual([30, 80]);
    fireEvent.pointerMove(track, { pointerId: 1, clientX: x(50) });
    expect(pair()).toEqual([30, 80]);
    fireEvent.pointerDown(track, { pointerId: 2, button: 2, clientX: x(50) });
    expect(pair()).toEqual([30, 80]);
    rerender(<Range aria-label="Price" defaultValue={[20, 80]} disabled />);
    fireEvent.pointerDown(track, { pointerId: 3, button: 0, clientX: x(50) });
    expect(pair()).toEqual([30, 80]);
  });

  it("breaks ties: equal distance takes the low thumb, shared values take the side pressed", () => {
    const { container, unmount } = render(<Range aria-label="Price" defaultValue={[40, 60]} />);
    let track = layout(container);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: x(50) });
    fireEvent.pointerUp(track, { pointerId: 1 });
    expect(pair()).toEqual([50, 60]);
    unmount();

    const shared = render(<Range aria-label="Price" defaultValue={[50, 50]} />);
    track = layout(shared.container);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: x(70) });
    fireEvent.pointerUp(track, { pointerId: 1 });
    expect(pair()).toEqual([50, 70]);
  });

  it("lets the first drag direction pick the thumb when both share the pressed value", () => {
    const onValueCommit = vi.fn();
    const { container } = render(
      <Range aria-label="Price" defaultValue={[50, 50]} onValueCommit={onValueCommit} />,
    );
    const track = layout(container);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: x(50) });
    fireEvent.pointerMove(track, { pointerId: 1, clientX: x(50) });
    expect(container.querySelector("[data-dragging]")).toBeNull();
    fireEvent.pointerMove(track, { pointerId: 1, clientX: x(30) });
    expect(pair()).toEqual([30, 50]);
    expect(sliders()[0]).toHaveFocus();
    fireEvent.pointerUp(track, { pointerId: 1 });
    expect(onValueCommit).toHaveBeenCalledWith([30, 50]);
    // A press and release without moving commits nothing.
    onValueCommit.mockClear();
    fireEvent.pointerDown(track, { pointerId: 2, button: 0, clientX: x(30) });
    fireEvent.pointerUp(track, { pointerId: 2 });
    expect(onValueCommit).not.toHaveBeenCalled();
  });

  it("draws the thumb that can move on top when both meet at an end", () => {
    const { container, rerender } = render(<Range aria-label="Price" value={[100, 100]} />);
    const top = () => container.querySelector("[data-active]");
    expect(top()).toHaveClass("ol-range__thumb--min");
    rerender(<Range aria-label="Price" value={[0, 0]} />);
    expect(top()).toHaveClass("ol-range__thumb--max");
    rerender(<Range aria-label="Price" value={[40, 40]} />);
    expect(top()).toHaveClass("ol-range__thumb--max");
  });

  it("picks the movable thumb when both share an end and the press lands on them", () => {
    const { container } = render(<Range aria-label="Price" defaultValue={[100, 100]} />);
    const track = layout(container);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: x(100) });
    fireEvent.pointerMove(track, { pointerId: 1, clientX: x(60) });
    fireEvent.pointerUp(track, { pointerId: 1 });
    expect(pair()).toEqual([60, 100]);
  });

  it("submits both values under one name or under a name each", () => {
    const { container, unmount } = render(
      <form>
        <Range aria-label="Price" name="price" defaultValue={[20, 80]} />
      </form>,
    );
    expect(new FormData(must(container.querySelector("form"))).getAll("price")).toEqual([
      "20",
      "80",
    ]);
    unmount();
    const tuple = render(
      <form>
        <Range aria-label="Price" name={["from", "to"]} defaultValue={[20, 80]} />
      </form>,
    );
    const data = new FormData(must(tuple.container.querySelector("form")));
    expect(data.get("from")).toBe("20");
    expect(data.get("to")).toBe("80");
  });

  it("fires bubbling input events so form-level onChange sees drags and keys", async () => {
    const onFormChange = vi.fn();
    const { container } = render(
      <form
        onChange={(e) => {
          onFormChange((e.target as unknown as HTMLInputElement).value);
        }}
      >
        <Range aria-label="Price" defaultValue={[20, 80]} />
      </form>,
    );
    const track = layout(container);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: x(70) });
    fireEvent.pointerMove(track, { pointerId: 1, clientX: x(75) });
    fireEvent.pointerUp(track, { pointerId: 1 });
    expect(onFormChange.mock.calls).toEqual([["70"], ["75"]]);
    act(() => {
      sliders()[0]?.focus();
    });
    await userEvent.keyboard("{ArrowRight}");
    expect(onFormChange).toHaveBeenLastCalledWith("21");
    expect(pair()).toEqual([21, 75]);
  });

  it("forwards the ref to the low thumb's input, as an object or a function", () => {
    const ref = createRef<HTMLInputElement>();
    const { unmount } = render(<Range aria-label="Price" range ref={ref} />);
    expect(ref.current).toBe(sliders()[0]);
    unmount();
    const fn = vi.fn();
    render(<Range aria-label="Price" range ref={fn} />);
    expect(fn).toHaveBeenCalledWith(sliders()[0]);
  });

  it("passes other input props to both inputs and runs their key handlers first", async () => {
    const onKeyDown = vi.fn((e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") e.preventDefault();
    });
    render(
      <Range
        aria-label="Price"
        range
        data-testid="t"
        onKeyDown={onKeyDown}
        defaultValue={[20, 80]}
      />,
    );
    expect(screen.getAllByTestId("t")).toHaveLength(2);
    act(() => {
      sliders()[0]?.focus();
    });
    await userEvent.keyboard("{ArrowLeft}");
    expect(onKeyDown).toHaveBeenCalled();
    expect(pair()).toEqual([20, 80]);
  });

  it("formats the scale and aria-valuetext with format", () => {
    const { container } = render(
      <Range aria-label="Price" defaultValue={[20, 80]} format={(v) => `${String(v)}%`} />,
    );
    expect(container.querySelector(".ol-range__scale")).toHaveTextContent("0%20% – 80%100%");
    expect(container.querySelector(".ol-range__scale")).toHaveAttribute("aria-hidden", "true");
    expect(sliders()[0]).toHaveAttribute("aria-valuetext", "20%");
    expect(sliders()[1]).toHaveAttribute("aria-valuetext", "80%");
  });

  it("leaves aria-valuetext out for node formats and plain numbers", () => {
    const { unmount } = render(<Range aria-label="Price" range format={(v) => <b>{v}</b>} />);
    expect(sliders()[0]).not.toHaveAttribute("aria-valuetext");
    unmount();
    render(<Range aria-label="Price" range />);
    expect(sliders()[0]).not.toHaveAttribute("aria-valuetext");
  });

  it("formats with Intl from formatOptions and the locale tag", () => {
    const { container, unmount } = render(
      <Range
        aria-label="Price"
        min={0}
        max={5000}
        step={250}
        defaultValue={[1250, 3000]}
        formatOptions={{ style: "currency", currency: "JPY" }}
        locale="ja-JP"
      />,
    );
    expect(sliders()[0]).toHaveAttribute("aria-valuetext", "￥1,250");
    expect(container.querySelector(".ol-range__current")).toHaveTextContent(
      formatRange(
        new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }),
        1250,
        3000,
      ),
    );
    unmount();
    render(
      <LocaleTagContext.Provider value="de-DE">
        <Range aria-label="Price" max={5000} defaultValue={[1250, 3000]} formatOptions={{}} />
      </LocaleTagContext.Provider>,
    );
    expect(sliders()[0]).toHaveAttribute("aria-valuetext", "1.250");
  });

  it("warns about formatOptions that write words", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Range aria-label="Width" range formatOptions={{ style: "unit", unit: "centimeter" }} />,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("digits and symbols only"));
  });

  it("hides the scale with scale={false} and disables both thumbs", () => {
    const { container } = render(<Range aria-label="Price" range scale={false} disabled />);
    expect(container.querySelector(".ol-range__scale")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-disabled");
    for (const s of sliders()) expect(s).toBeDisabled();
  });

  it("names thumbs in a Japanese Field with the same wording as aria-label", () => {
    render(
      <LocaleContext.Provider value={makeLabels("ja")}>
        <Field label="価格">
          <Range range />
        </Field>
      </LocaleContext.Provider>,
    );
    expect(sliders()[0]).toHaveAccessibleName("価格の最小値");
    expect(sliders()[1]).toHaveAccessibleName("価格の最大値");
  });

  it("joins the selected pair the locale's way and shows one figure when they meet", () => {
    const { container, rerender } = render(
      <LocaleTagContext.Provider value="ja">
        <Range aria-label="Price" value={[20, 80]} />
      </LocaleTagContext.Provider>,
    );
    const current = () => container.querySelector(".ol-range__current");
    expect(current()).toHaveTextContent(formatRange(new Intl.NumberFormat("ja"), 20, 80));
    rerender(
      <LocaleTagContext.Provider value="en">
        <Range aria-label="Price" value={[1250, 3000]} max={5000} />
      </LocaleTagContext.Provider>,
    );
    expect(current()).toHaveTextContent(/^1250.3000$/);
    rerender(<Range aria-label="Price" value={[40, 40]} />);
    expect(current()).toHaveTextContent(/^40$/);
  });

  it("marks the focused thumb so its block keeps a ring after a pointer press", () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const { container } = render(
      <Range aria-label="Price" defaultValue={[20, 80]} onFocus={onFocus} onBlur={onBlur} />,
    );
    const track = layout(container);
    fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: x(70) });
    fireEvent.pointerUp(track, { pointerId: 1 });
    const max = container.querySelector(".ol-range__thumb--max");
    expect(max).toHaveAttribute("data-focused");
    expect(onFocus).toHaveBeenCalledTimes(1);
    act(() => {
      sliders()[0]?.focus();
    });
    expect(max).not.toHaveAttribute("data-focused");
    expect(container.querySelector(".ol-range__thumb--min")).toHaveAttribute("data-focused");
    expect(onBlur).toHaveBeenCalledTimes(1);
    act(() => {
      sliders()[0]?.blur();
    });
    expect(container.querySelector("[data-focused]")).toBeNull();
  });

  it("has no axe violations after a keyboard step and in a right-to-left context", async () => {
    const { container } = render(
      <div dir="rtl">
        <Field label="Price">
          <Range defaultValue={[20, 80]} />
        </Field>
      </div>,
    );
    act(() => {
      sliders()[1]?.focus();
    });
    await userEvent.keyboard("{ArrowLeft}");
    expect(pair()).toEqual([20, 81]);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <Field label="Price" hint="In euros">
          <Range defaultValue={[20, 80]} formatOptions={{ style: "currency", currency: "EUR" }} />
        </Field>
        <Range aria-label="Width" range disabled />
        <span id="h">Height</span>
        <Range aria-labelledby="h" range scale={false} />
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
