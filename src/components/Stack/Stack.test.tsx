import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Stack } from "./Stack";

describe("Stack", () => {
  it("renders a vertical div with gap 4 by default", () => {
    render(<Stack data-testid="s">x</Stack>);
    const el = screen.getByTestId("s");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("ol-stack");
    expect(el).not.toHaveClass("ol-stack--h");
    expect(el.style.getPropertyValue("--ol-gap")).toBe("var(--space-4)");
    expect(el.style.getPropertyValue("--ol-align")).toBe("");
    expect(el.style.getPropertyValue("--ol-justify")).toBe("");
  });

  it("adds the horizontal modifier", () => {
    render(
      <Stack data-testid="s" direction="h">
        x
      </Stack>,
    );
    expect(screen.getByTestId("s")).toHaveClass("ol-stack--h");
  });

  it("maps gap to a spacing token", () => {
    render(
      <Stack data-testid="s" gap={8}>
        x
      </Stack>,
    );
    expect(screen.getByTestId("s").style.getPropertyValue("--ol-gap")).toBe("var(--space-8)");
  });

  it("maps align and justify to custom properties", () => {
    render(
      <Stack data-testid="s" align="flex-end" justify="space-between">
        x
      </Stack>,
    );
    const el = screen.getByTestId("s");
    expect(el.style.getPropertyValue("--ol-align")).toBe("flex-end");
    expect(el.style.getPropertyValue("--ol-justify")).toBe("space-between");
  });

  it("renders the element given by as", () => {
    render(
      <Stack as="ul" data-testid="s">
        <li>one</li>
      </Stack>,
    );
    expect(screen.getByTestId("s").tagName).toBe("UL");
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("passes className, style and native attributes through", () => {
    render(
      <Stack data-testid="s" className="extra" style={{ color: "red" }} id="a" aria-label="Group">
        x
      </Stack>,
    );
    const el = screen.getByTestId("s");
    expect(el).toHaveClass("ol-stack", "extra");
    expect(el).toHaveAttribute("id", "a");
    expect(el).toHaveAttribute("aria-label", "Group");
    expect(el.style.color).toBe("red");
    expect(el.style.getPropertyValue("--ol-gap")).toBe("var(--space-4)");
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Stack ref={ref}>x</Stack>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("ol-stack");
  });

  it("does not set alignment on a nested Stack that omits it", () => {
    render(
      <Stack data-testid="outer" align="flex-end" justify="center">
        <Stack data-testid="inner" direction="h">
          x
        </Stack>
      </Stack>,
    );
    const inner = screen.getByTestId("inner");
    expect(inner.style.getPropertyValue("--ol-align")).toBe("");
    expect(inner.style.getPropertyValue("--ol-justify")).toBe("");
    expect(screen.getByTestId("outer").style.getPropertyValue("--ol-align")).toBe("flex-end");
  });

  it("has no axe violations on the default vertical div", async () => {
    const { container } = render(
      <Stack>
        <p>one</p>
        <p>two</p>
      </Stack>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Stack as="ul" direction="h">
        <li>one</li>
        <li>two</li>
      </Stack>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
