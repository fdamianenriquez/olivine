import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Grid } from "../Grid";
import { Col } from "./Col";

const prop = (el: HTMLElement, name: string) => el.style.getPropertyValue(name);

describe("Col", () => {
  it("renders a div with the root class and no layout properties by default", () => {
    render(<Col data-testid="c">cell</Col>);
    const el = screen.getByTestId("c");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("ol-col");
    for (const name of ["base", "sm", "md", "lg", "xl"]) {
      expect(prop(el, `--ol-span-${name}`)).toBe("");
    }
    expect(prop(el, "--ol-start")).toBe("");
  });

  it("applies a plain number span from md up", () => {
    render(<Col data-testid="c" span={6} />);
    const el = screen.getByTestId("c");
    expect(prop(el, "--ol-span-md")).toBe("6");
    expect(prop(el, "--ol-span-base")).toBe("");
    expect(prop(el, "--ol-span-lg")).toBe("");
  });

  it("sets only the breakpoints given in an object span", () => {
    render(<Col data-testid="c" span={{ base: 12, md: 6, xl: 3 }} />);
    const el = screen.getByTestId("c");
    expect(prop(el, "--ol-span-base")).toBe("12");
    expect(prop(el, "--ol-span-sm")).toBe("");
    expect(prop(el, "--ol-span-md")).toBe("6");
    expect(prop(el, "--ol-span-lg")).toBe("");
    expect(prop(el, "--ol-span-xl")).toBe("3");
  });

  it("keeps the cell full width below the first breakpoint when base is missing", () => {
    render(<Col data-testid="c" span={{ lg: 4 }} />);
    const el = screen.getByTestId("c");
    expect(prop(el, "--ol-span-lg")).toBe("4");
    expect(prop(el, "--ol-span-base")).toBe("var(--ol-cols, 12)");
  });

  it("sets the start column", () => {
    render(<Col data-testid="c" span={4} start={9} />);
    expect(prop(screen.getByTestId("c"), "--ol-start")).toBe("9");
  });

  it("merges className, style and native props", () => {
    render(<Col data-testid="c" className="extra" style={{ color: "red" }} id="x" span={2} />);
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("ol-col", "extra");
    expect(el).toHaveAttribute("id", "x");
    expect(el.style.color).toBe("red");
    expect(prop(el, "--ol-span-md")).toBe("2");
  });

  it("renders another element with as", () => {
    render(<Col as="li" data-testid="c" />);
    expect(screen.getByTestId("c").tagName).toBe("LI");
  });

  it("forwards its ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Col ref={ref} data-testid="c" />);
    expect(ref.current).toBe(screen.getByTestId("c"));
  });

  it("has no axe violations inside a Grid", async () => {
    const { container } = render(
      <Grid>
        <Col span={{ base: 12, md: 6 }}>One</Col>
        <Col span={6} start={7}>
          Two
        </Col>
      </Grid>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
