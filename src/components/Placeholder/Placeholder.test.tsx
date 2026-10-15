import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Placeholder } from "./Placeholder";

const bars = (root: HTMLElement) => root.querySelectorAll(".ol-ph__bar");

describe("Placeholder", () => {
  it("renders a single text bar with the wave by default and passes props through", () => {
    render(<Placeholder data-testid="p" className="x" id="sk" />);
    const root = screen.getByTestId("p");
    expect(root).toHaveClass("ol-ph", "ol-ph--text", "ol-ph--wave", "x");
    expect(root).toHaveAttribute("id", "sk");
    expect(bars(root)).toHaveLength(1);
  });

  it("maps the block shape to its modifier", () => {
    render(<Placeholder shape="block" data-testid="p" />);
    const root = screen.getByTestId("p");
    expect(root).toHaveClass("ol-ph--block");
    expect(bars(root)).toHaveLength(1);
  });

  it("repeats text bars and shortens the last one", () => {
    render(<Placeholder lines={4} data-testid="p" />);
    const list = bars(screen.getByTestId("p"));
    expect(list).toHaveLength(4);
    expect(list[3]).toHaveClass("ol-ph__bar--last");
    expect(list[0]).not.toHaveClass("ol-ph__bar--last");
  });

  it("keeps a lone bar full width and ignores lines for blocks", () => {
    const { rerender } = render(<Placeholder lines={1} data-testid="p" />);
    expect(bars(screen.getByTestId("p"))[0]).not.toHaveClass("ol-ph__bar--last");
    rerender(<Placeholder shape="block" lines={5} data-testid="p" />);
    expect(bars(screen.getByTestId("p"))).toHaveLength(1);
  });

  it("sets width and height as custom properties", () => {
    render(<Placeholder shape="block" width="40%" height={120} data-testid="p" />);
    const root = screen.getByTestId("p");
    expect(root.style.getPropertyValue("--ol-ph-width")).toBe("40%");
    expect(root.style.getPropertyValue("--ol-ph-height")).toBe("120px");
  });

  it("removes the wave class when wave is false", () => {
    render(<Placeholder wave={false} data-testid="p" />);
    expect(screen.getByTestId("p")).not.toHaveClass("ol-ph--wave");
    expect(screen.getByTestId("p")).toHaveAttribute("data-wave", "false");
  });

  it("hides the bars from assistive technology", () => {
    render(<Placeholder lines={3} data-testid="p" />);
    for (const bar of bars(screen.getByTestId("p")))
      expect(bar).toHaveAttribute("aria-hidden", "true");
  });

  it("renders no text unless label is passed", () => {
    render(<Placeholder data-testid="p" />);
    expect(screen.getByTestId("p")).toHaveTextContent("");
  });

  it("announces the localised word when label is true, and a custom label wins", () => {
    const { rerender } = render(
      <Root locale="es">
        <Placeholder label data-testid="p" />
      </Root>,
    );
    expect(screen.getByTestId("p")).toHaveTextContent("Cargando");
    rerender(
      <Root locale="ja">
        <Placeholder label data-testid="p" />
      </Root>,
    );
    expect(screen.getByTestId("p")).toHaveTextContent("読み込み中");
    rerender(
      <Root locale="ja">
        <Placeholder label="Fetching" data-testid="p" />
      </Root>,
    );
    expect(screen.getByTestId("p")).toHaveTextContent("Fetching");
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Placeholder ref={ref} data-testid="p" />);
    expect(ref.current).toBe(screen.getByTestId("p"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div aria-busy="true">
        <Placeholder shape="block" height={80} />
        <Placeholder lines={3} label />
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
