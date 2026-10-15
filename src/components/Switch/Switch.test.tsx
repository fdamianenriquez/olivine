import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FieldContext } from "../../hooks/useFieldControl";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("renders a named switch with the root class, className and native props", () => {
    render(<Switch label="Notifications" className="extra" name="n" />);
    const input = screen.getByRole("switch", { name: "Notifications" });
    expect(input).toHaveAttribute("name", "n");
    expect(input.closest("label")).toHaveClass("ol-switch", "extra");
  });

  it("toggles on click and Space, exposing data-state", async () => {
    const user = userEvent.setup();
    render(<Switch label="Notifications" />);
    const input = screen.getByRole("switch");
    expect(input).toHaveAttribute("data-state", "off");
    await user.click(screen.getByText("Notifications"));
    expect(input).toBeChecked();
    expect(input).toHaveAttribute("data-state", "on");
    input.focus();
    await user.keyboard(" ");
    expect(input).not.toBeChecked();
  });

  it("supports uncontrolled defaultChecked and passes the native event", async () => {
    const user = userEvent.setup();
    const checkedValues: boolean[] = [];
    const onChange = vi.fn((e: React.ChangeEvent<HTMLInputElement>) => {
      checkedValues.push(e.target.checked);
    });
    render(<Switch label="Notifications" defaultChecked onChange={onChange} />);
    expect(screen.getByRole("switch")).toBeChecked();
    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(checkedValues).toEqual([false]);
    expect(screen.getByText("Off")).toBeInTheDocument();
  });

  it("supports controlled checked", async () => {
    const user = userEvent.setup();
    const seen: boolean[] = [];
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <Switch
          label="Notifications"
          checked={on}
          onChange={(e) => {
            seen.push(e.target.checked);
            setOn(e.target.checked);
          }}
        />
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeChecked();
    expect(seen).toEqual([true]);
  });

  it("stays put when controlled and the parent ignores the change", async () => {
    const user = userEvent.setup();
    render(<Switch label="Notifications" checked={false} onChange={vi.fn()} />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("shows the state word, hidden from assistive tech, and can hide it", () => {
    const { rerender } = render(<Switch label="Notifications" />);
    expect(screen.getByText("Off")).toHaveAttribute("aria-hidden", "true");
    rerender(<Switch label="Notifications" showState={false} />);
    expect(screen.queryByText("Off")).not.toBeInTheDocument();
  });

  it.each([
    ["es", "Sí", "No"],
    ["ja", "オン", "オフ"],
  ] as const)("translates the state word in %s", async (locale, on, off) => {
    const user = userEvent.setup();
    render(
      <Root locale={locale}>
        <Switch label="x" />
      </Root>,
    );
    expect(screen.getByText(off)).toBeInTheDocument();
    await user.click(screen.getByRole("switch"));
    expect(screen.getByText(on)).toBeInTheDocument();
  });

  it("can be disabled", async () => {
    const user = userEvent.setup();
    render(<Switch label="Notifications" disabled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("takes its description from a surrounding Field", () => {
    render(
      <FieldContext.Provider
        value={{ id: "f", describedBy: "d", invalid: false, required: false, claim: () => true }}
      >
        <p id="d">Help</p>
        <Switch label="Notifications" />
      </FieldContext.Provider>,
    );
    const input = screen.getByRole("switch");
    expect(input).toHaveAttribute("id", "f");
    expect(input).toHaveAccessibleDescription("Help");
  });

  it("accepts aria-label without a visible label", () => {
    render(<Switch aria-label="Notifications" />);
    expect(screen.getByRole("switch", { name: "Notifications" })).toBeInTheDocument();
  });

  it("requires an accessible name at the type level", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    // @ts-expect-error neither label nor aria-label
    render(<Switch />);
    render(<Switch label="" />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));
    warn.mockRestore();
  });

  it("forwards the ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Switch ref={ref} label="Notifications" />);
    expect(ref.current).toBe(screen.getByRole("switch"));
  });

  it("has no axe violations, off or on", async () => {
    const { container } = render(<Switch label="Notifications" />);
    await expect(runAxe(container)).resolves.toHaveNoViolations();
    await userEvent.click(screen.getByRole("switch"));
    await expect(runAxe(container)).resolves.toHaveNoViolations();
  });
});
