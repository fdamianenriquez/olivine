import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Scaffold } from "./Scaffold";

describe("Scaffold", () => {
  it("renders its children", () => {
    render(<Scaffold>Olivine</Scaffold>);
    expect(screen.getByText("Olivine")).toBeInTheDocument();
  });

  it("merges className with the root class", () => {
    render(<Scaffold className="extra">Olivine</Scaffold>);
    expect(screen.getByText("Olivine")).toHaveClass("ol-scaffold", "extra");
  });

  it("forwards its ref and native props", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Scaffold ref={ref} data-testid="scaffold">
        Olivine
      </Scaffold>,
    );
    expect(ref.current).toBe(screen.getByTestId("scaffold"));
  });

  it("has no axe violations", async () => {
    const { container } = render(<Scaffold>Olivine</Scaffold>);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
