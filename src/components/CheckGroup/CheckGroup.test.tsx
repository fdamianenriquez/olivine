import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Checkbox } from "../Checkbox/Checkbox";
import { Field } from "../Field/Field";
import { Radio } from "../Radio/Radio";
import { CheckGroup } from "./CheckGroup";

describe("CheckGroup", () => {
  it("renders a fieldset named by its legend, with className and native props", () => {
    render(
      <CheckGroup legend="Notify me" className="extra" data-testid="g">
        <Checkbox label="Email" />
      </CheckGroup>,
    );
    const group = screen.getByRole("group", { name: "Notify me" });
    expect(group.tagName).toBe("FIELDSET");
    expect(group).toHaveClass("ol-checkgroup", "extra");
    expect(group).toHaveAttribute("data-testid", "g");
    expect(group).not.toHaveClass("ol-checkgroup--inline");
  });

  it("adds the inline modifier", () => {
    render(
      <CheckGroup legend="Notify me" inline>
        <Checkbox label="Email" />
      </CheckGroup>,
    );
    expect(screen.getByRole("group")).toHaveClass("ol-checkgroup--inline");
  });

  it("omits the legend when none is given", () => {
    const { container } = render(
      <CheckGroup aria-label="Options">
        <Checkbox label="Email" />
      </CheckGroup>,
    );
    expect(container.querySelector("legend")).toBeNull();
    expect(screen.getByRole("group", { name: "Options" })).toBeInTheDocument();
  });

  it("keeps arrow-key navigation between radios", async () => {
    const user = userEvent.setup();
    render(
      <CheckGroup legend="Delivery" inline>
        <Radio name="d" label="Pickup" defaultChecked />
        <Radio name="d" label="Courier" />
        <Radio name="d" label="Freight" disabled />
      </CheckGroup>,
    );
    screen.getByRole("radio", { name: "Pickup" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Courier" })).toBeChecked();
  });

  it("disables its children when the fieldset is disabled", () => {
    render(
      <CheckGroup legend="Notify me" disabled>
        <Checkbox label="Email" />
        <Radio name="x" label="SMS" />
      </CheckGroup>,
    );
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("radio")).toBeDisabled();
  });

  it("forwards the ref to the fieldset", () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(
      <CheckGroup ref={ref} legend="Notify me">
        <Checkbox label="Email" />
      </CheckGroup>,
    );
    expect(ref.current).toBeInstanceOf(HTMLFieldSetElement);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <CheckGroup legend="Notify me" inline>
        <Checkbox label="Email" defaultChecked />
        <Checkbox label="SMS" />
        <Checkbox label="Post" disabled />
      </CheckGroup>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations when disabled or as a radio group", async () => {
    const { container } = render(
      <>
        <CheckGroup legend="Notify me" disabled>
          <Checkbox label="Email" />
        </CheckGroup>
        <CheckGroup legend="Delivery">
          <Radio name="d" label="Pickup" defaultChecked />
          <Radio name="d" label="Courier" />
        </CheckGroup>
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("owns the Field description alone: options do not read the Field", async () => {
    const { container } = render(
      <Field hint="H" error="E" required>
        <CheckGroup legend="L">
          <Checkbox label="One" />
          <Checkbox label="Two" />
        </CheckGroup>
      </Field>,
    );
    const group = screen.getByRole("group", { name: "L" });
    const ids = group.getAttribute("aria-describedby") ?? "";
    expect(ids.split(" ")).toHaveLength(2);
    for (const id of ids.split(" ")) expect(container.querySelector(`[id="${id}"]`)).not.toBeNull();
    expect(group).toHaveAccessibleDescription(/H.*E|E.*H/);
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).not.toHaveAttribute("aria-invalid");
      expect(box).not.toBeRequired();
      expect(box.id).not.toBe(container.querySelector("label[for]")?.getAttribute("for"));
      expect(box).not.toHaveAttribute("aria-describedby");
    }
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
