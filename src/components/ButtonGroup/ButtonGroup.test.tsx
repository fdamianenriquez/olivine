import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { ButtonGroup } from "./ButtonGroup";

afterEach(() => vi.restoreAllMocks());

const group = (props = {}) => (
  <ButtonGroup label="View" data-testid="g" className="x" {...props}>
    <Button aria-pressed="true">Grid</Button>
    <Button aria-pressed="false">List</Button>
    <Button>Index</Button>
  </ButtonGroup>
);

describe("ButtonGroup", () => {
  it("renders a named group with root class and native props", () => {
    render(group());
    const el = screen.getByRole("group", { name: "View" });
    expect(el).toHaveClass("ol-btngroup", "x");
    expect(el).toHaveAttribute("data-testid", "g");
    expect(el).not.toHaveClass("ol-btngroup--v");
  });

  it("maps vertical", () => {
    render(group({ vertical: true }));
    expect(screen.getByRole("group")).toHaveClass("ol-btngroup--v");
  });

  it("exposes the pressed state for styling", () => {
    render(group());
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "false");
  });

  it("moves focus through the buttons with Tab", async () => {
    const user = userEvent.setup();
    render(group());
    await user.tab();
    expect(screen.getByRole("button", { name: "Grid" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "List" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Index" })).toHaveFocus();
  });

  it("forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ButtonGroup ref={ref} label="A">
        <Button>A</Button>
      </ButtonGroup>,
    );
    expect(ref.current).toBe(screen.getByRole("group"));
  });

  it("warns without an accessible name, but not with one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <ButtonGroup>
        <Button>A</Button>
      </ButtonGroup>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockClear();
    render(
      <ButtonGroup aria-labelledby="x">
        <Button>A</Button>
      </ButtonGroup>,
    );
    render(
      <ButtonGroup aria-label="y">
        <Button>A</Button>
      </ButtonGroup>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(group());
    expect(await runAxe(container)).toHaveNoViolations();
    const v = render(group({ vertical: true }));
    expect(await runAxe(v.container)).toHaveNoViolations();
  });
});
