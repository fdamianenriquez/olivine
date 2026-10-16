import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders a status with the default label, root class, className and native attributes", () => {
    render(<Spinner className="extra" data-testid="s" />);
    const el = screen.getByRole("status");
    expect(el).toHaveClass("ol-spinner", "extra");
    expect(el).toHaveAttribute("data-testid", "s");
    expect(el).toHaveTextContent("Loading");
    expect(el.querySelector(".ol-sr")).not.toBeNull();
    expect(el.querySelector(".ol-spinner__mark")).toHaveAttribute("aria-hidden", "true");
  });

  it("maps size and variant to modifier classes", () => {
    const { rerender } = render(<Spinner />);
    const el = screen.getByRole("status");
    expect(el).not.toHaveClass("ol-spinner--l");
    expect(el).not.toHaveClass("ol-spinner--dots");
    rerender(<Spinner size="l" variant="dots" />);
    expect(el).toHaveClass("ol-spinner--l", "ol-spinner--dots");
    expect(el.querySelectorAll(".ol-spinner__dots i")).toHaveLength(3);
    expect(el.querySelector(".ol-spinner__mark")).toBeNull();
  });

  it("shows the label as visible text with showLabel", () => {
    render(<Spinner showLabel label="Thinking" />);
    const el = screen.getByRole("status");
    expect(el).toHaveTextContent("Thinking");
    expect(el.querySelector(".ol-sr")).toBeNull();
    expect(el.querySelector(".ol-label")).not.toBeNull();
  });

  it("translates the default label and lets a passed label win", () => {
    const { rerender } = render(
      <Root locale="es">
        <Spinner />
      </Root>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    rerender(
      <Root locale="ja">
        <Spinner />
      </Root>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("読み込み中");
    rerender(
      <Root locale="ja">
        <Spinner label="Custom" />
      </Root>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Custom");
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Spinner ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("status"));
  });

  it("has no axe violations in every variant", async () => {
    const { container } = render(
      <div>
        <Spinner />
        <Spinner size="l" showLabel />
        <Spinner variant="dots" showLabel label="Thinking" />
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
