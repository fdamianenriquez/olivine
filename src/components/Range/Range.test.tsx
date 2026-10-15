import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FieldContext, type FieldContextValue } from "../../hooks/useFieldControl";
import { runAxe } from "../../test/axe";
import { Range } from "./Range";

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
