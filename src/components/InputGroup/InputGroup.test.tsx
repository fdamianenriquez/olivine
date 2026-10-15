import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { FieldContext, type FieldContextValue } from "../../hooks/useFieldControl";
import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { Input } from "../Input";
import { Select } from "../Select";
import { InputGroup, InputGroupText } from "./InputGroup";

function makeField(): FieldContextValue {
  let owner: string | null = null;
  return {
    id: "field-1",
    describedBy: "field-1-hint",
    invalid: true,
    required: false,
    claim: (id) => {
      owner ??= id;
      return owner === id;
    },
  };
}

function inField(ui: ReactNode) {
  return render(<FieldContext.Provider value={makeField()}>{ui}</FieldContext.Provider>);
}

describe("InputGroup", () => {
  it("renders a div with the root class, className and native attributes", () => {
    render(
      <InputGroup className="extra" data-testid="g">
        <Input aria-label="Amount" />
      </InputGroup>,
    );
    const el = screen.getByTestId("g");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("ol-inputgroup", "extra");
    expect(el).not.toHaveAttribute("role");
  });

  it("is a group only when the consumer names it", () => {
    render(
      <InputGroup aria-label="Price">
        <Input aria-label="Amount" />
      </InputGroup>,
    );
    expect(screen.getByRole("group", { name: "Price" })).toBeInTheDocument();
  });

  it("keeps affixes and controls as direct children in order", () => {
    render(
      <InputGroup data-testid="g">
        <InputGroup.Text>¥</InputGroup.Text>
        <Input aria-label="Amount" />
        <InputGroup.Text>.00</InputGroup.Text>
      </InputGroup>,
    );
    const kids = Array.from(screen.getByTestId("g").children);
    expect(kids.map((k) => k.className)).toEqual([
      "ol-inputgroup__text",
      "ol-input",
      "ol-inputgroup__text",
    ]);
  });

  it("exposes Text as a static member and a named export, passing props through", () => {
    expect(InputGroup.Text).toBe(InputGroupText);
    render(
      <InputGroup>
        <InputGroup.Text id="cur" className="x">
          ¥
        </InputGroup.Text>
        <Input aria-label="Amount" aria-describedby="cur" />
      </InputGroup>,
    );
    expect(screen.getByText("¥")).toHaveClass("ol-inputgroup__text", "x");
    expect(screen.getByLabelText("Amount")).toHaveAccessibleDescription("¥");
  });

  it("joins an Input and a Button, and tabs through them in order", async () => {
    const user = userEvent.setup();
    render(
      <InputGroup>
        <Input aria-label="Search" />
        <Button>Go</Button>
      </InputGroup>,
    );
    await user.tab();
    expect(screen.getByLabelText("Search")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Go" })).toHaveFocus();
  });

  it("holds a Select next to an Input", async () => {
    const user = userEvent.setup();
    render(
      <InputGroup>
        <Select aria-label="Scheme" options={["https", "http"]} />
        <Input aria-label="Host" />
      </InputGroup>,
    );
    expect(screen.getByLabelText("Scheme").parentElement).toHaveClass("ol-selectwrap");
    await user.tab();
    expect(screen.getByLabelText("Scheme")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Host")).toHaveFocus();
  });

  it("inside a Field, the first control claims the id and all get the description", () => {
    inField(
      <InputGroup>
        <Input aria-label="First" />
        <Input aria-label="Second" />
      </InputGroup>,
    );
    const first = screen.getByLabelText("First");
    const second = screen.getByLabelText("Second");
    expect(first).toHaveAttribute("id", "field-1");
    expect(second).not.toHaveAttribute("id", "field-1");
    for (const el of [first, second]) {
      expect(el).toHaveAttribute("aria-describedby", "field-1-hint");
      expect(el).toHaveAttribute("aria-invalid", "true");
    }
  });

  it("forwards the ref to the root div", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <InputGroup ref={ref}>
        <Input aria-label="Amount" />
      </InputGroup>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("ol-inputgroup");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <InputGroup aria-label="Order">
        <InputGroup.Text id="cur">¥</InputGroup.Text>
        <Input aria-label="Amount" aria-describedby="cur" />
        <Select aria-label="Unit" options={["kg", "g"]} />
        <Button>Add</Button>
      </InputGroup>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
