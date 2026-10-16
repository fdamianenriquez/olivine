import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

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

  it("renders the label as a heading when headingLevel is set", () => {
    render(<Divider label="Selected works" index={2} headingLevel={3} data-testid="d" />);
    const heading = screen.getByRole("heading", { level: 3, name: "02 Selected works" });
    expect(heading.tagName).toBe("H3");
    expect(heading).toHaveClass("ol-label", "ol-divider__heading");
    expect(within(screen.getByTestId("d")).getByRole("heading")).toBe(heading);
  });

  it("keeps the marker without a heading by default", () => {
    render(<Divider label="Selected works" index={2} />);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("warns and ignores headingLevel without a label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Divider headingLevel={2} data-testid="d" />);
    expect(screen.getByTestId("d").tagName).toBe("HR");
    expect(screen.queryByRole("heading")).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
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
        <Divider label="Selected works" index={2} headingLevel={2} />
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
