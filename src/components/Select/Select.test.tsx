import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { FieldContext, type FieldContextValue } from "../../hooks/useFieldControl";
import { runAxe } from "../../test/axe";
import { Select } from "./Select";

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

describe("Select", () => {
  it("renders a select with root class on the select and className", () => {
    render(<Select aria-label="S" className="extra" data-testid="s" options={["a"]} />);
    const el = screen.getByTestId("s");
    expect(el.tagName).toBe("SELECT");
    expect(el).toHaveClass("ol-select", "extra");
    expect(el.parentElement).toHaveClass("ol-selectwrap");
    expect(el).not.toHaveClass("ol-select--s");
  });

  it("renders string options", () => {
    render(<Select aria-label="S" options={["Identity", "Web"]} />);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Identity", "Web"]);
  });

  it("renders object options with labels and disabled", () => {
    render(
      <Select
        aria-label="S"
        options={[
          { value: "mx", label: "Mexico" },
          { value: "jp", label: "Japan", disabled: true },
        ]}
      />,
    );
    expect(screen.getByRole("option", { name: "Mexico" })).toHaveValue("mx");
    expect(screen.getByRole("option", { name: "Japan" })).toBeDisabled();
  });

  it("renders option children", () => {
    render(
      <Select aria-label="S">
        <option value="x">X</option>
      </Select>,
    );
    expect(screen.getByRole("option", { name: "X" })).toBeInTheDocument();
  });

  it("starts on a disabled placeholder when no value is given", () => {
    render(<Select aria-label="S" placeholder="Choose one" options={["a", "b"]} />);
    const select = screen.getByLabelText("S");
    expect(select).toHaveValue("");
    const ph = screen.getByText("Choose one");
    expect(ph).toHaveTextContent("Choose one");
    expect(ph).toBeDisabled();
    expect(ph).toHaveAttribute("hidden");
  });

  it("an explicit defaultValue wins over the placeholder", () => {
    render(<Select aria-label="S" placeholder="Choose" defaultValue="b" options={["a", "b"]} />);
    expect(screen.getByLabelText("S")).toHaveValue("b");
  });

  it("maps size s to modifiers and does not forward size", () => {
    render(<Select aria-label="S" size="s" options={["a"]} />);
    const el = screen.getByLabelText("S");
    expect(el).toHaveClass("ol-select--s");
    expect(el.parentElement).toHaveClass("ol-selectwrap--s");
    expect(el).not.toHaveAttribute("size");
  });

  it("changes through user selection (uncontrolled)", async () => {
    const onChange = vi.fn();
    render(<Select aria-label="S" options={["a", "b"]} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("S"), "b");
    expect(screen.getByLabelText("S")).toHaveValue("b");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("supports controlled value", async () => {
    render(<Select aria-label="S" value="a" onChange={vi.fn()} options={["a", "b"]} />);
    await userEvent.selectOptions(screen.getByLabelText("S"), "b");
    expect(screen.getByLabelText("S")).toHaveValue("a");
  });

  it("forwards the ref to the select", () => {
    const ref = createRef<HTMLSelectElement>();
    render(<Select ref={ref} aria-label="S" options={["a"]} />);
    expect(ref.current).toBe(screen.getByLabelText("S"));
  });

  it("takes id, description, invalid and required from a Field", () => {
    inField(<Select options={["a"]} />);
    const el = screen.getByRole("combobox");
    expect(el).toHaveAttribute("id", "field-1");
    expect(el).toHaveAttribute("aria-describedby", "field-1-hint");
    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(el).toBeRequired();
  });

  it("lets explicit props win over the Field", () => {
    inField(<Select id="mine" aria-invalid={false} options={["a"]} />);
    const el = screen.getByRole("combobox");
    expect(el).toHaveAttribute("id", "mine");
    expect(el).toHaveAttribute("aria-invalid", "false");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <label htmlFor="svc">Service</label>
        <Select
          id="svc"
          placeholder="Choose"
          options={["a", { value: "b", label: "B", disabled: true }]}
        />
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
