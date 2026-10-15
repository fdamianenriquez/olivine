import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { CloseButton } from "./CloseButton";

describe("CloseButton", () => {
  it("renders a type=button button with root class and native props", () => {
    render(<CloseButton className="x" data-testid="c" />);
    const el = screen.getByRole("button", { name: "Close" });
    expect(el).toHaveClass("ol-close", "x");
    expect(el).toHaveAttribute("type", "button");
    expect(el).toHaveAttribute("data-testid", "c");
  });

  it("hides the glyph from assistive tech", () => {
    render(<CloseButton />);
    const glyph = screen.getByRole("button").querySelector("[aria-hidden='true']");
    expect(glyph).toHaveTextContent("×");
  });

  it.each([
    ["en", "Close"],
    ["es", "Cerrar"],
    ["ja", "閉じる"],
  ] as const)("uses the %s default label", (locale, name) => {
    render(
      <Root locale={locale}>
        <CloseButton />
      </Root>,
    );
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("lets label override the locale", () => {
    render(
      <Root locale="es">
        <CloseButton label="Dismiss" />
      </Root>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls onClick on click, Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CloseButton onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    screen.getByRole("button").focus();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CloseButton disabled onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("forwards the ref to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<CloseButton ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("button"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <CloseButton />
        <CloseButton disabled label="Dismiss" />
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
