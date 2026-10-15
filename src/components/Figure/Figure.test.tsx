import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Figure } from "./Figure";

describe("Figure", () => {
  it("renders a figure with a caption and passes className and native props through", () => {
    render(
      <Figure className="x" id="f" caption="Kitchen 04, Meguro" data-testid="f">
        <img alt="Kitchen" src="data:," />
      </Figure>,
    );
    const root = screen.getByTestId("f");
    expect(root.tagName).toBe("FIGURE");
    expect(root).toHaveClass("ol-figure", "x");
    expect(root).toHaveAttribute("id", "f");
    expect(screen.getByRole("figure", { name: /Kitchen 04, Meguro/ })).toBe(root);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("zero-pads a numeric index and keeps a string as is", () => {
    const { rerender } = render(<Figure index={1} caption="One" />);
    expect(screen.getByText(/Fig\. 01/)).toBeInTheDocument();
    rerender(<Figure index="A-2" caption="One" />);
    expect(screen.getByText(/Fig\. A-2/)).toBeInTheDocument();
  });

  it("hides the decorative dash and leader from assistive technology", () => {
    const { container } = render(<Figure index={1} caption="One" credit="Studio" />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(2);
    expect(screen.getByRole("figure")).toHaveAccessibleName("Fig. 01 One Studio");
  });

  it("renders the credit", () => {
    render(<Figure caption="One" credit="Photo: Studio" />);
    expect(screen.getByText("Photo: Studio")).toHaveClass("ol-figure__credit");
  });

  it("omits the figcaption and leader without caption or credit", () => {
    const { container } = render(
      <Figure>
        <span>media</span>
      </Figure>,
    );
    expect(container.querySelector("figcaption")).toBeNull();
    expect(screen.getByRole("figure")).not.toHaveAttribute("aria-labelledby");
    expect(container.querySelector(".ol-figure__leader")).toBeNull();
  });

  it("renders only the prefix when there is just an index", () => {
    const { container } = render(<Figure index={7} />);
    expect(container.querySelector("figcaption")).toHaveTextContent("Fig. 07");
    expect(container.querySelector("[aria-hidden='true']")).toBeNull();
  });

  it("omits the leader when there is no credit", () => {
    const { container } = render(<Figure caption="One" />);
    expect(container.querySelector("figcaption")).not.toBeNull();
    expect(container.querySelector(".ol-figure__leader")).toBeNull();
  });

  it.each([
    ["en", "Fig. 01"],
    ["es", "Fig. 01"],
    ["ja", "図 01"],
  ] as const)("uses the %s prefix", (locale, expected) => {
    render(
      <Root locale={locale}>
        <Figure index={1} caption="Caption" />
      </Root>,
    );
    expect(screen.getByRole("figure")).toHaveTextContent(expected);
  });

  it("forwards the ref to the figure element", () => {
    const ref = createRef<HTMLElement>();
    render(<Figure ref={ref} caption="One" data-testid="f" />);
    expect(ref.current).toBe(screen.getByTestId("f"));
  });

  it("has no axe violations with only media", async () => {
    const { container } = render(
      <Figure>
        <img alt="Kitchen" src="data:," />
      </Figure>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations with a string index", async () => {
    const { container } = render(
      <Figure index="A-2" caption="Plan">
        <img alt="Plan" src="data:," />
      </Figure>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations in ja", async () => {
    const { container } = render(
      <Root locale="ja">
        <Figure index={1} caption="台所" credit="写真: スタジオ">
          <img alt="台所" src="data:," />
        </Figure>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Figure index={1} caption="Kitchen 04" credit="Photo: Studio">
        <img alt="Kitchen" src="data:," />
      </Figure>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
