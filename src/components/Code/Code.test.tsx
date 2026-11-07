import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Code } from "./Code";

describe("Code", () => {
  it("renders a code element with the ol-code class", () => {
    render(<Code>npm install olivine</Code>);
    const el = screen.getByText("npm install olivine");
    expect(el.tagName).toBe("CODE");
    expect(el).toHaveClass("ol-code");
    expect(el).not.toHaveClass("ol-code--inverse");
  });

  it("is left to right and exempt from translation", () => {
    render(<Code>x</Code>);
    const el = screen.getByText("x");
    expect(el).toHaveAttribute("translate", "no");
    expect(el).toHaveAttribute("dir", "ltr");
  });

  it("passes className and native attributes through", () => {
    render(
      <Code className="extra" data-testid="c" lang="en" id="one">
        x
      </Code>,
    );
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("ol-code", "extra");
    expect(el).toHaveAttribute("id", "one");
    expect(el).toHaveAttribute("lang", "en");
  });

  it("maps inverse to its modifier", () => {
    render(<Code inverse>x</Code>);
    expect(screen.getByText("x")).toHaveClass("ol-code--inverse");
  });

  it("is not focusable and has no role of its own beyond code", () => {
    render(<Code>x</Code>);
    const el = screen.getByText("x");
    expect(el).not.toHaveAttribute("tabindex");
    expect(el).not.toHaveAttribute("role");
  });

  it("forwards the ref to the code element", () => {
    const ref = createRef<HTMLElement>();
    render(<Code ref={ref}>x</Code>);
    expect(ref.current).toBe(screen.getByText("x"));
  });

  it("has no axe violations, inside running text and inverse", async () => {
    const { container } = render(
      <p>
        Pass <Code>onChange</Code> to listen, or <Code inverse>--flag</Code> on the command line.
      </p>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
