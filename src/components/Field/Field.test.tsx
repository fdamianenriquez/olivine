import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Checkbox } from "../Checkbox";
import { Input } from "../Input";
import { Select } from "../Select";
import { Switch } from "../Switch";
import { Textarea } from "../Textarea";
import { Field } from "./Field";

describe("Field", () => {
  it("renders the root class, className and native attributes", () => {
    render(
      <Field label="Name" className="extra" data-testid="f">
        <Input />
      </Field>,
    );
    const el = screen.getByTestId("f");
    expect(el).toHaveClass("ol-field", "extra");
  });

  it("names Input, Select and Textarea through the label", () => {
    render(
      <>
        <Field label="Name">
          <Input />
        </Field>
        <Field label="Service">
          <Select options={["Web"]} />
        </Field>
        <Field label="Message">
          <Textarea />
        </Field>
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Service" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message" })).toBeInTheDocument();
  });

  it("describes the control with hint, error and valid text", () => {
    const { rerender } = render(
      <Field label="Email" hint="We never share it.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("We never share it.");
    rerender(
      <Field label="Email" hint="We never share it." error="Enter a valid address.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "We never share it. Enter a valid address.",
    );
    rerender(
      <Field label="Email" valid="Available.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Available.");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid when there is an error, and prefers it over valid", () => {
    render(
      <Field label="Email" error="Enter a valid address." valid="Looks good.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Looks good.")).not.toBeInTheDocument();
  });

  it("marks the control required and hides the asterisk from the name", () => {
    render(
      <Field label="Name" required>
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toBeRequired();
    expect(document.querySelector(".ol-field__req")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the aside on the label row, even without a label", () => {
    render(
      <Field aside="MXN">
        <Input aria-label="Budget" />
      </Field>,
    );
    expect(screen.getByText("MXN")).toHaveClass("ol-field__aside");
  });

  it("clones a plain DOM child with id, description, validity and required", () => {
    render(
      <Field label="Plain" hint="Hint" error="Fix it." required>
        <input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: /Plain/ });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Hint Fix it.");
  });

  it("keeps the own id and describedby of a plain DOM child", () => {
    render(
      <Field label="Plain" hint="Hint">
        <input id="mine" aria-describedby="extra" />
      </Field>,
    );
    const input = screen.getByLabelText("Plain");
    expect(input).toHaveAttribute("id", "mine");
    expect(input.getAttribute("aria-describedby")).toMatch(/-hint extra$/);
  });

  it("supports Field.Control for components that forward props", () => {
    function Custom(props: React.ComponentProps<"input">) {
      return <input data-testid="custom" {...props} />;
    }
    render(
      <Field label="Custom" hint="Hint" error="Fix it." required>
        <Field.Control>{(p) => <Custom {...p} />}</Field.Control>
      </Field>,
    );
    const el = screen.getByRole("textbox", { name: /Custom/ });
    expect(el).toBeRequired();
    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(el).toHaveAccessibleDescription("Hint Fix it.");
  });

  it("gives the id to the first control only in a wrapper with two inputs", () => {
    render(
      <Field label="Range" hint="From and to">
        <span>
          <Input aria-label="From" data-testid="a" />
          <Input aria-label="To" data-testid="b" />
        </span>
      </Field>,
    );
    const a = screen.getByTestId("a");
    const b = screen.getByTestId("b");
    expect(a.id).not.toBe("");
    expect(b.id).toBe("");
    expect(screen.getByText("Range")).toHaveAttribute("for", a.id);
    expect(b).toHaveAccessibleDescription("From and to");
  });

  it("keeps a persistent polite live region for messages", () => {
    const { container, rerender } = render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    const region = container.querySelector(".ol-field__msg");
    expect(region).toHaveAttribute("aria-live", "polite");
    rerender(
      <Field label="Email" error="Enter a valid address.">
        <Input />
      </Field>,
    );
    expect(container.querySelector(".ol-field__msg")).toBe(region);
    expect(region).toHaveTextContent("Enter a valid address.");
  });

  it("forwards the ref to the root div", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Field ref={ref} label="Name">
        <Input />
      </Field>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("ol-field");
  });

  it.each([
    ["default", {}],
    ["error", { error: "Enter a valid address." }],
    ["valid", { valid: "Available." }],
  ])("has no axe violations (%s)", async (_name, props) => {
    const { container } = render(
      <Field label="Email" hint="Hint" required aside="EN" {...props}>
        <Input />
      </Field>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("keeps the id unique with a wrapper element and labels the first input", async () => {
    const { container } = render(
      <Field label="Range">
        <span>
          <Input data-testid="a" />
          <Input aria-label="To" />
        </span>
      </Field>,
    );
    const a = screen.getByTestId("a");
    expect(document.querySelectorAll(`[id="${a.id}"]`)).toHaveLength(1);
    expect(screen.getByLabelText("Range")).toBe(a);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("omits the message id from describedby when there is no message", () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-describedby");
  });

  it("moves from error to valid", () => {
    const { rerender } = render(
      <Field label="Email" error="Bad.">
        <Input />
      </Field>,
    );
    rerender(
      <Field label="Email" valid="Good.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Good.");
  });

  it("works around Checkbox and Switch without doubling the name", async () => {
    const { container } = render(
      <>
        <Field hint="Hint">
          <Checkbox label="Newsletter" />
        </Field>
        <Field error="Fix it.">
          <Switch label="Alerts" />
        </Field>
      </>,
    );
    expect(screen.getByRole("checkbox", { name: "Newsletter" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Alerts" })).toHaveAttribute("aria-invalid", "true");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations around Select, Textarea, a cloned input and Field.Control", async () => {
    const { container } = render(
      <>
        <Field label="A" error="Fix it.">
          <Select options={["x"]} />
        </Field>
        <Field label="B" hint="Hint">
          <Textarea />
        </Field>
        <Field label="C" valid="Ok.">
          <input />
        </Field>
        <Field label="D" hint="Hint">
          <Field.Control>{(p) => <input {...p} />}</Field.Control>
        </Field>
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
