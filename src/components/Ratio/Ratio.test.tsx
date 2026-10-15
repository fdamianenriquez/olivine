import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Ratio } from "./Ratio";

afterEach(() => vi.restoreAllMocks());

describe("Ratio", () => {
  it("defaults to 16 / 9 and passes className and native props through", () => {
    render(
      <Ratio className="x" data-testid="r" id="media">
        <span>child</span>
      </Ratio>,
    );
    const root = screen.getByTestId("r");
    expect(root).toHaveClass("ol-ratio", "x");
    expect(root).toHaveAttribute("id", "media");
    expect(root.style.getPropertyValue("--ol-ratio")).toBe("16 / 9");
  });

  it("sets a custom ratio", () => {
    render(<Ratio ratio="4/3" data-testid="r" />);
    expect(screen.getByTestId("r").style.getPropertyValue("--ol-ratio")).toBe("4 / 3");
  });

  it("accepts decimals and spaces", () => {
    render(<Ratio ratio="2.39 / 1" data-testid="r" />);
    expect(screen.getByTestId("r").style.getPropertyValue("--ol-ratio")).toBe("2.39 / 1");
  });

  it("renders its child and keeps a consumer style", () => {
    render(
      <Ratio style={{ maxWidth: 200 }} data-testid="r">
        <img alt="cover" src="data:," />
      </Ratio>,
    );
    expect(screen.getByAltText("cover")).toBeInTheDocument();
    expect(screen.getByTestId("r").style.maxWidth).toBe("200px");
  });

  it("warns and falls back for a malformed ratio", () => {
    const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);
    render(<Ratio ratio="wide" data-testid="r" />);
    expect(screen.getByTestId("r").style.getPropertyValue("--ol-ratio")).toBe("16 / 9");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Ratio"));
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Ratio ref={ref} data-testid="r" />);
    expect(ref.current).toBe(screen.getByTestId("r"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Ratio>
        <img alt="Kitchen" src="data:," />
      </Ratio>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("keeps the accessible name of an embed and has no axe violations", async () => {
    const { container } = render(
      <Ratio>
        <iframe title="Product video" src="about:blank" />
      </Ratio>,
    );
    // jsdom cannot message into frames, so axe checks the iframe element itself, not its document.
    expect(screen.getByTitle("Product video")).toBeInTheDocument();
    expect(await runAxe(container, { iframes: false })).toHaveNoViolations();
  });
});
