import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Divider } from "./Divider";

describe("Divider", () => {
  it("renders an hr with the root class, className and native props", () => {
    render(<Divider className="extra" data-testid="d" />);
    const el = screen.getByTestId("d");
    expect(el.tagName).toBe("HR");
    expect(el).toHaveClass("ol-divider", "extra");
    expect(el).not.toHaveAttribute("aria-orientation");
  });

  it("maps weight to modifiers", () => {
    render(
      <>
        <Divider data-testid="hair" />
        <Divider weight="heavy" data-testid="heavy" />
        <Divider weight="soft" data-testid="soft" />
      </>,
    );
    expect(screen.getByTestId("hair")).not.toHaveClass("ol-divider--heavy", "ol-divider--soft");
    expect(screen.getByTestId("heavy")).toHaveClass("ol-divider--heavy");
    expect(screen.getByTestId("soft")).toHaveClass("ol-divider--soft");
  });

  it("renders a vertical separator", () => {
    render(<Divider vertical data-testid="d" />);
    const el = screen.getByTestId("d");
    expect(el).toHaveClass("ol-divider--v");
    expect(el).toHaveAttribute("aria-orientation", "vertical");
    expect(screen.getByRole("separator")).toBe(el);
  });

  it("renders a labelled marker that keeps its text accessible", () => {
    render(<Divider label="Selected works" index={2} data-testid="d" />);
    const el = screen.getByTestId("d");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("ol-divider", "ol-divider--labelled");
    expect(el).not.toHaveAttribute("role");
    expect(screen.getByText("Selected works")).toBeInTheDocument();
    expect(screen.getByText("02")).toHaveClass("ol-label__index");
    expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("keeps the weight on a labelled divider", () => {
    render(<Divider label="Works" weight="heavy" data-testid="d" />);
    expect(screen.getByTestId("d")).toHaveClass("ol-divider--labelled", "ol-divider--heavy");
  });

  it("ignores the label when vertical", () => {
    render(<Divider vertical label="Works" data-testid="d" />);
    expect(screen.getByTestId("d").tagName).toBe("HR");
    expect(screen.queryByText("Works")).toBeNull();
  });

  it("forwards its ref in both modes", () => {
    const hr = createRef<HTMLElement>();
    const div = createRef<HTMLElement>();
    render(
      <>
        <Divider ref={hr} data-testid="a" />
        <Divider ref={div} label="Works" data-testid="b" />
      </>,
    );
    expect(hr.current).toBe(screen.getByTestId("a"));
    expect(div.current).toBe(screen.getByTestId("b"));
  });

  it("has no axe violations in each mode", async () => {
    const { container } = render(
      <div>
        <Divider />
        <Divider weight="heavy" />
        <Divider weight="soft" />
        <Divider label="Selected works" index={2} />
        <div style={{ display: "flex" }}>
          <span>A</span>
          <Divider vertical />
          <span>B</span>
        </div>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
