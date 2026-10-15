import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Label } from "./Label";

describe("Label", () => {
  it("renders a span with the root class, className and native props", () => {
    render(
      <Label className="extra" data-testid="l">
        Archive
      </Label>,
    );
    const el = screen.getByTestId("l");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("ol-label", "extra");
  });

  it("maps dot and muted to modifiers", () => {
    render(
      <Label dot muted data-testid="l">
        Archive
      </Label>,
    );
    expect(screen.getByTestId("l")).toHaveClass("ol-label--dot", "ol-label--muted");
  });

  it("zero-pads a numeric index and keeps a string as is", () => {
    render(
      <>
        <Label index={1}>One</Label>
        <Label index="A.2">Two</Label>
      </>,
    );
    expect(screen.getByText("01")).toHaveClass("ol-label__index");
    expect(screen.getByText("A.2")).toHaveClass("ol-label__index");
  });

  it("hides the index separator from assistive tech", () => {
    render(<Label index={3}>Section</Label>);
    expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders as another element", () => {
    render(<Label as="p">Para</Label>);
    expect(screen.getByText("Para").tagName).toBe("P");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Label ref={ref} data-testid="l">
        Archive
      </Label>,
    );
    expect(ref.current).toBe(screen.getByTestId("l"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Label index={1} dot muted>
        Archive
      </Label>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("reads the index and the text as separate words", () => {
    render(
      <Label index={1} data-testid="l">
        Section
      </Label>,
    );
    const el = screen.getByTestId("l");
    expect(el).toHaveTextContent("01 — Section");
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[aria-hidden='true']").forEach((n) => {
      n.remove();
    });
    expect(clone.textContent.replace(/\s+/g, " ").trim()).toBe("01 Section");
    expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
  });

  it("has no axe violations when muted", async () => {
    const { container } = render(<Label muted>Archive</Label>);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations as a paragraph", async () => {
    const { container } = render(<Label as="p">Archive</Label>);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the sumi theme", async () => {
    const { container } = render(
      <div className="ol" data-theme="sumi">
        <Label index={2} dot>
          Archive
        </Label>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
