import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Grid } from "./Grid";

describe("Grid", () => {
  it("renders a div with the root class and 12 columns by default", () => {
    render(<Grid data-testid="g">cell</Grid>);
    const el = screen.getByTestId("g");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("ol-grid");
    expect(el).not.toHaveClass("ol-grid--ruled");
    expect(el.style.getPropertyValue("--ol-cols")).toBe("12");
    expect(el.style.getPropertyValue("--ol-gap")).toBe("");
  });

  it("sets cols and gap custom properties", () => {
    render(
      <Grid data-testid="g" cols={4} gap={8}>
        cell
      </Grid>,
    );
    const el = screen.getByTestId("g");
    expect(el.style.getPropertyValue("--ol-cols")).toBe("4");
    expect(el.style.getPropertyValue("--ol-gap")).toBe("var(--space-8)");
  });

  it("adds the ruled modifier", () => {
    render(<Grid data-testid="g" ruled />);
    expect(screen.getByTestId("g")).toHaveClass("ol-grid--ruled");
  });

  it("renders another element with as", () => {
    render(<Grid as="ul" data-testid="g" />);
    expect(screen.getByTestId("g").tagName).toBe("UL");
  });

  it("merges className and style and passes native props", () => {
    render(<Grid data-testid="g" className="extra" style={{ color: "red" }} id="x" />);
    const el = screen.getByTestId("g");
    expect(el).toHaveClass("ol-grid", "extra");
    expect(el).toHaveAttribute("id", "x");
    expect(el.style.color).toBe("red");
    expect(el.style.getPropertyValue("--ol-cols")).toBe("12");
  });

  it("forwards its ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Grid ref={ref} data-testid="g" />);
    expect(ref.current).toBe(screen.getByTestId("g"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Grid ruled>
        <div>One</div>
        <div>Two</div>
      </Grid>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
