import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FieldContext } from "../../hooks/useFieldControl";
import { runAxe } from "../../test/axe";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("renders a labelled checkbox with the root class, className and native props", () => {
    render(<Checkbox label="Kitchens" className="extra" data-testid="c" name="k" />);
    const input = screen.getByRole("checkbox", { name: "Kitchens" });
    expect(input).toHaveAttribute("name", "k");
    expect(input).toHaveAttribute("data-testid", "c");
    expect(input.closest("label")).toHaveClass("ol-check", "extra");
    expect(input.closest("label")).not.toHaveClass("ol-check--radio");
  });

  it("hides the decorative box from assistive tech", () => {
    const { container } = render(<Checkbox label="Kitchens" />);
    expect(container.querySelector(".ol-check__box")).toHaveAttribute("aria-hidden", "true");
  });

  it("toggles when the label is clicked", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Kitchens" />);
    await user.click(screen.getByText("Kitchens"));
    expect(screen.getByRole("checkbox")).toBeChecked();
    await user.click(screen.getByText("Kitchens"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("toggles with Space", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Kitchens" />);
    await user.tab();
    expect(screen.getByRole("checkbox")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("supports uncontrolled defaultChecked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="Kitchens" defaultChecked onChange={onChange} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("supports controlled checked", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <Checkbox
          label="Kitchens"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
          }}
        />
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).toBeChecked();
    render(<Checkbox label="Fixed" checked readOnly />);
    await user.click(screen.getByRole("checkbox", { name: "Fixed" }));
    expect(screen.getByRole("checkbox", { name: "Fixed" })).toBeChecked();
  });

  it("sets the indeterminate DOM property and the mixed state", () => {
    const { rerender } = render(<Checkbox label="All" indeterminate />);
    const input = screen.getByRole<HTMLInputElement>("checkbox");
    expect(input.indeterminate).toBe(true);
    expect(input).toBePartiallyChecked();
    expect(input.checked).toBe(false);
    rerender(<Checkbox label="All" />);
    expect(input.indeterminate).toBe(false);
  });

  it("associates the hint with the input", () => {
    render(<Checkbox label="Storage" hint="Shelving, wardrobes." />);
    const input = screen.getByRole("checkbox");
    expect(screen.getByRole("checkbox", { name: "Storage" })).toBe(input);
    expect(input).toHaveAccessibleDescription("Shelving, wardrobes.");
    const id = input.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(screen.getByText("Shelving, wardrobes.")).toHaveAttribute("id", id);
  });

  it("does not set aria-describedby without a hint", () => {
    render(<Checkbox label="Storage" />);
    expect(screen.getByRole("checkbox")).not.toHaveAttribute("aria-describedby");
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Unavailable" disabled />);
    await user.click(screen.getByText("Unavailable"));
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("takes id, description and validity from a surrounding Field", () => {
    const field = {
      id: "f1",
      describedBy: "f1-hint",
      invalid: true,
      required: true,
      claim: () => true,
    };
    render(
      <FieldContext.Provider value={field}>
        <Checkbox label="Terms" hint="Required." />
      </FieldContext.Provider>,
    );
    const input = screen.getByRole("checkbox");
    expect(input).toHaveAttribute("id", "f1");
    expect(input).toBeRequired();
    expect(input).toBeInvalid();
    expect(input.getAttribute("aria-describedby")).toMatch(/^f1-hint /);
  });

  it("lets explicit props win over the Field", () => {
    const field = {
      id: "f1",
      describedBy: undefined,
      invalid: false,
      required: false,
      claim: () => true,
    };
    render(
      <FieldContext.Provider value={field}>
        <Checkbox label="Terms" id="mine" />
      </FieldContext.Provider>,
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute("id", "mine");
  });

  it("forwards its ref to the input and keeps indeterminate working", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} label="All" indeterminate />);
    expect(ref.current).toBe(screen.getByRole("checkbox"));
    expect(ref.current?.indeterminate).toBe(true);
  });

  it("supports callback refs", () => {
    const ref = vi.fn();
    render(<Checkbox ref={ref} label="All" />);
    expect(ref).toHaveBeenCalledWith(screen.getByRole("checkbox"));
  });

  it("fires onChange on click", () => {
    const onChange = vi.fn();
    render(<Checkbox label="Kitchens" onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("lets explicit aria-label win over the visible label", () => {
    render(<Checkbox label="Visible" aria-label="Custom" />);
    expect(screen.getByRole("checkbox", { name: "Custom" })).toBeInTheDocument();
  });

  it("warns in development when nothing names the checkbox", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Checkbox />);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("keeps indeterminate after a click while the prop stays true", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="All" indeterminate />);
    const input = screen.getByRole<HTMLInputElement>("checkbox");
    await user.click(input);
    expect(input.indeterminate).toBe(true);
  });

  it("has no axe violations checked and indeterminate, focused", async () => {
    const user = userEvent.setup();
    const { container } = render(<Checkbox label="Both" defaultChecked indeterminate />);
    await user.tab();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations inside a Field", async () => {
    const field = {
      id: "f1",
      describedBy: "f1-hint",
      invalid: false,
      required: false,
      claim: () => true,
    };
    const { container } = render(
      <FieldContext.Provider value={field}>
        <Checkbox aria-label="Terms" hint="Required." />
        <p id="f1-hint">Hint</p>
      </FieldContext.Provider>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations by default", async () => {
    const { container } = render(<Checkbox label="Kitchens" />);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations checked, indeterminate, with hint and disabled", async () => {
    const { container } = render(
      <fieldset>
        <legend>Interests</legend>
        <Checkbox label="Kitchens" defaultChecked />
        <Checkbox label="Storage" hint="Shelving." />
        <Checkbox label="All" indeterminate />
        <Checkbox label="Unavailable" disabled />
      </fieldset>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
