import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { FieldContext, type FieldContextValue } from "../../hooks/useFieldControl";
import { runAxe } from "../../test/axe";
import { Textarea } from "./Textarea";

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

describe("Textarea", () => {
  it("renders a textarea with 4 rows, the root class, className and native props", () => {
    render(<Textarea aria-label="Message" className="extra" data-testid="t" name="msg" />);
    const el = screen.getByTestId("t");
    expect(el.tagName).toBe("TEXTAREA");
    expect(el).toHaveClass("ol-textarea", "extra");
    expect(el).toHaveAttribute("rows", "4");
    expect(el).toHaveAttribute("name", "msg");
  });

  it("accepts a custom rows value", () => {
    render(<Textarea aria-label="Message" rows={8} />);
    expect(screen.getByLabelText("Message")).toHaveAttribute("rows", "8");
  });

  it("accepts typing and reports changes", async () => {
    const onChange = vi.fn();
    render(<Textarea aria-label="Message" onChange={onChange} />);
    const el = screen.getByLabelText("Message");
    await userEvent.type(el, "Hi{enter}there");
    expect(el).toHaveValue("Hi\nthere");
    expect(onChange).toHaveBeenCalled();
  });

  it("is disabled and ignores typing", async () => {
    render(<Textarea aria-label="Message" disabled />);
    const el = screen.getByLabelText("Message");
    await userEvent.type(el, "x");
    expect(el).toBeDisabled();
    expect(el).toHaveValue("");
  });

  it("forwards the ref to the textarea", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} aria-label="Message" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("takes id, description, validity and required from a surrounding Field", () => {
    inField(<Textarea aria-label="Message" />);
    const el = screen.getByLabelText("Message");
    expect(el).toHaveAttribute("id", "field-1");
    expect(el).toHaveAttribute("aria-describedby", "field-1-hint");
    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(el).toBeRequired();
  });

  it("lets explicit props win over the Field", () => {
    inField(<Textarea aria-label="Message" id="mine" aria-invalid={false} required={false} />);
    const el = screen.getByLabelText("Message");
    expect(el).toHaveAttribute("id", "mine");
    expect(el).toHaveAttribute("aria-invalid", "false");
    expect(el).not.toBeRequired();
  });

  it("has no axe violations with a label", async () => {
    const { container } = render(
      <>
        <label htmlFor="m">Message</label>
        <Textarea id="m" />
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
