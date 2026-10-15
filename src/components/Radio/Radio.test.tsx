import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Radio } from "./Radio";

function Group(props: { onChange?: () => void }) {
  return (
    <fieldset>
      <legend>Delivery</legend>
      <Radio name="d" label="Pickup" defaultChecked onChange={props.onChange} />
      <Radio name="d" label="Courier" hint="Next day." onChange={props.onChange} />
      <Radio name="d" label="Freight" disabled />
    </fieldset>
  );
}

describe("Radio", () => {
  it("renders a labelled radio with the round modifier, className and native props", () => {
    render(<Radio label="Pickup" className="extra" data-testid="r" name="d" />);
    const input = screen.getByRole("radio", { name: "Pickup" });
    expect(input).toHaveAttribute("name", "d");
    expect(input).toHaveAttribute("data-testid", "r");
    expect(input.closest("label")).toHaveClass("ol-check", "ol-check--radio", "extra");
  });

  it("selects on label click and unselects the others in the same group", async () => {
    const user = userEvent.setup();
    render(<Group />);
    expect(screen.getByRole("radio", { name: "Pickup" })).toBeChecked();
    await user.click(screen.getByText("Courier"));
    expect(screen.getByRole("radio", { name: /Courier/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pickup" })).not.toBeChecked();
  });

  it("moves the selection with the arrow keys inside the group, skipping disabled", async () => {
    const user = userEvent.setup();
    render(<Group />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Pickup" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /Courier/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Courier/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Pickup" })).toBeChecked();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: /Courier/ })).toBeChecked();
  });

  it("supports uncontrolled defaultChecked and fires onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Group onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: /Courier/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("supports a controlled group", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState("a");
      return (
        <>
          {["a", "b"].map((x) => (
            <Radio
              key={x}
              name="c"
              value={x}
              label={x.toUpperCase()}
              checked={v === x}
              onChange={() => {
                setV(x);
              }}
            />
          ))}
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("radio", { name: "B" }));
    expect(screen.getByRole("radio", { name: "B" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "A" })).not.toBeChecked();
  });

  it("associates the hint with the input", () => {
    render(<Group />);
    expect(screen.getByRole("radio", { name: /Courier/ })).toHaveAccessibleDescription("Next day.");
    expect(screen.getByRole("radio", { name: "Pickup" })).not.toHaveAttribute("aria-describedby");
  });

  it("does not select when disabled", async () => {
    const user = userEvent.setup();
    render(<Group />);
    await user.click(screen.getByText("Freight"));
    expect(screen.getByRole("radio", { name: "Freight" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Freight" })).not.toBeChecked();
  });

  it("forwards its ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Radio ref={ref} label="Pickup" />);
    expect(ref.current).toBe(screen.getByRole("radio"));
  });

  it("has no axe violations in a group", async () => {
    const { container } = render(<Group />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
