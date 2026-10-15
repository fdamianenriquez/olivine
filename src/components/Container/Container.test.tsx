import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Container } from "./Container";

describe("Container", () => {
  it("renders a div with the root class by default", () => {
    render(<Container data-testid="c">content</Container>);
    const el = screen.getByTestId("c");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("ol-container");
    expect(el).not.toHaveClass("ol-container--fluid");
  });

  it("adds the fluid modifier", () => {
    render(<Container data-testid="c" fluid />);
    expect(screen.getByTestId("c")).toHaveClass("ol-container", "ol-container--fluid");
  });

  it("renders another element with as", () => {
    render(<Container as="main" data-testid="c" />);
    expect(screen.getByTestId("c").tagName).toBe("MAIN");
  });

  it("merges className and passes native props", () => {
    render(<Container data-testid="c" className="extra" id="x" />);
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("ol-container", "extra");
    expect(el).toHaveAttribute("id", "x");
  });

  it("forwards its ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Container ref={ref} data-testid="c" />);
    expect(ref.current).toBe(screen.getByTestId("c"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Container as="main">
        <p>Content</p>
      </Container>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
