import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { FieldContext, type FieldContextValue } from "../../hooks/useFieldControl";
import { runAxe } from "../../test/axe";
import { Input } from "./Input";

function makeField(overrides: Partial<FieldContextValue> = {}): FieldContextValue {
  let owner: string | null = null;
  return {
    id: "field-1",
    describedBy: "field-1-hint",
    invalid: true,
    required: true,
    claim: (id) => {
      owner ??= id;
      return owner === id;
    },
    ...overrides,
  };
}

function inField(ui: ReactNode, value = makeField()) {
  return render(<FieldContext.Provider value={value}>{ui}</FieldContext.Provider>);
}

describe("Input", () => {
  it("renders an input with the root class, className and native props", () => {
    render(<Input aria-label="Name" className="extra" data-testid="i" type="email" />);
    const el = screen.getByTestId("i");
    expect(el.tagName).toBe("INPUT");
    expect(el).toHaveClass("ol-input", "extra");
    expect(el).toHaveAttribute("type", "email");
    expect(el).not.toHaveClass("ol-input--s", "ol-input--l", "ol-input--line");
  });

  it("maps size and line to modifiers", () => {
    render(
      <>
        <Input aria-label="s" size="s" />
        <Input aria-label="l" size="l" />
        <Input aria-label="line" line />
      </>,
    );
    expect(screen.getByLabelText("s")).toHaveClass("ol-input--s");
    expect(screen.getByLabelText("l")).toHaveClass("ol-input--l");
    expect(screen.getByLabelText("line")).toHaveClass("ol-input--line");
  });

  it("does not forward size as the native attribute", () => {
    render(<Input aria-label="s" size="s" />);
    expect(screen.getByLabelText("s")).not.toHaveAttribute("size");
  });

  it("accepts typing and reports changes", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Name" onChange={onChange} />);
    const el = screen.getByLabelText("Name");
    await userEvent.type(el, "Ma");
    expect(el).toHaveValue("Ma");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("is disabled and ignores typing", async () => {
    render(<Input aria-label="Name" disabled />);
    const el = screen.getByLabelText("Name");
    await userEvent.type(el, "x");
    expect(el).toBeDisabled();
    expect(el).toHaveValue("");
  });

  it("forwards the ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input aria-label="Name" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText("Name"));
  });

  it("takes id, description, invalid and required from a Field", () => {
    inField(<Input aria-label="Name" />);
    const el = screen.getByLabelText("Name");
    expect(el).toHaveAttribute("id", "field-1");
    expect(el).toHaveAttribute("aria-describedby", "field-1-hint");
    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(el).toBeRequired();
  });

  it("merges aria-describedby and lets explicit props win", () => {
    inField(
      <Input
        aria-label="Name"
        id="mine"
        aria-describedby="extra"
        aria-invalid="false"
        required={false}
      />,
    );
    const el = screen.getByLabelText("Name");
    expect(el).toHaveAttribute("id", "mine");
    expect(el).toHaveAttribute("aria-describedby", "field-1-hint extra");
    expect(el).toHaveAttribute("aria-invalid", "false");
    expect(el).not.toBeRequired();
  });

  it("gives the field id to the first input only", () => {
    inField(
      <>
        <Input aria-label="first" />
        <Input aria-label="second" />
      </>,
    );
    expect(screen.getByLabelText("first")).toHaveAttribute("id", "field-1");
    expect(screen.getByLabelText("second")).not.toHaveAttribute("id", "field-1");
    expect(screen.getByLabelText("second")).toHaveAttribute("aria-describedby", "field-1-hint");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <label htmlFor="n">Name</label>
        <Input id="n" placeholder="Your name" />
        <Input aria-label="Disabled" disabled />
        <Input aria-label="Invalid" aria-invalid="true" />
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
