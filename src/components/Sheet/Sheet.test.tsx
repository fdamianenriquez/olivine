import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Sheet } from "./Sheet";

describe("Sheet", () => {
  it("renders a section with the root class, className and native props", () => {
    render(
      <Sheet className="extra" data-testid="s">
        Body
      </Sheet>,
    );
    const el = screen.getByTestId("s");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveClass("ol-sheet", "extra");
    expect(screen.getByText("Body")).toHaveClass("ol-sheet__body");
  });

  it("renders no bar without title or meta", () => {
    const { container } = render(<Sheet index={1}>Body</Sheet>);
    expect(container.querySelector(".ol-sheet__bar")).toBeNull();
  });

  it("renders the bar with title only", () => {
    const { container } = render(<Sheet title="Order">Body</Sheet>);
    expect(container.querySelector(".ol-sheet__bar")).toHaveClass("ol-label");
    expect(screen.getByText("Order")).toBeInTheDocument();
  });

  it("renders meta only", () => {
    const { container } = render(<Sheet meta="Rev 0.2">Body</Sheet>);
    expect(container.querySelector(".ol-sheet__bar")).not.toBeNull();
    expect(screen.getByText("Rev 0.2")).toBeInTheDocument();
  });

  it("zero-pads a numeric index and keeps a string as is", () => {
    const { rerender } = render(<Sheet index={1} title="One" />);
    expect(screen.getByText("01").tagName).toBe("B");
    rerender(<Sheet index="A.2" title="Two" />);
    expect(screen.getByText("A.2").tagName).toBe("B");
  });

  it("hides the separator from assistive tech", () => {
    render(<Sheet index={1} title="One" />);
    expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
  });

  it("adds the flush and crosshair classes", () => {
    render(
      <Sheet flush crosshair data-testid="s">
        Body
      </Sheet>,
    );
    expect(screen.getByTestId("s")).toHaveClass("ol-sheet--flush", "ol-crosshair");
  });

  it("renders as another element", () => {
    render(
      <Sheet as="article" data-testid="s">
        Body
      </Sheet>,
    );
    expect(screen.getByTestId("s").tagName).toBe("ARTICLE");
  });

  it("is a named region when it has a title", () => {
    render(
      <Sheet index={1} title="Order">
        Body
      </Sheet>,
    );
    expect(screen.getByRole("region", { name: "01 Order" })).toBeInTheDocument();
  });

  it("has no label without a title", () => {
    render(<Sheet data-testid="s">Body</Sheet>);
    expect(screen.getByTestId("s")).not.toHaveAttribute("aria-labelledby");
  });

  it("lets a passed aria-labelledby win", () => {
    render(
      <Sheet title="Order" aria-labelledby="other" data-testid="s">
        Body
      </Sheet>,
    );
    expect(screen.getByTestId("s")).toHaveAttribute("aria-labelledby", "other");
  });

  it("lets a passed aria-label win", () => {
    render(
      <Sheet title="Order" aria-label="Custom" data-testid="s">
        Body
      </Sheet>,
    );
    const el = screen.getByTestId("s");
    expect(el).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByRole("region", { name: "Custom" })).toBe(el);
  });

  it("adds role region on a generic element with a title", () => {
    render(
      <Sheet as="div" title="Order" data-testid="s">
        Body
      </Sheet>,
    );
    expect(screen.getByTestId("s")).toHaveAttribute("role", "region");
    expect(screen.getByRole("region", { name: "Order" })).toBeInTheDocument();
  });

  it("keeps a passed role and skips the role on sectioning elements", () => {
    render(
      <>
        <Sheet as="div" role="group" title="A" data-testid="a">
          Body
        </Sheet>
        <Sheet as="article" title="B" data-testid="b">
          Body
        </Sheet>
      </>,
    );
    expect(screen.getByTestId("a")).toHaveAttribute("role", "group");
    expect(screen.getByTestId("b")).not.toHaveAttribute("role");
  });

  it.each([
    ["untitled", <Sheet key="1">Body</Sheet>],
    [
      "flush",
      <Sheet key="2" flush title="Panel">
        Body
      </Sheet>,
    ],
    [
      "article with title",
      <Sheet key="3" as="article" title="Order">
        Body
      </Sheet>,
    ],
    [
      "div with title",
      <Sheet key="4" as="div" title="Order">
        Body
      </Sheet>,
    ],
    [
      "meta only",
      <Sheet key="5" meta="Rev 0.2">
        Body
      </Sheet>,
    ],
  ])("has no axe violations: %s", async (_name, ui) => {
    const { container } = render(ui);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Sheet ref={ref} data-testid="s">
        Body
      </Sheet>,
    );
    expect(ref.current).toBe(screen.getByTestId("s"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Sheet crosshair index={1} title="Order" meta="Rev 0.2">
        <p>Body</p>
      </Sheet>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
