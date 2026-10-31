import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { VisuallyHidden } from "./VisuallyHidden";

describe("VisuallyHidden", () => {
  it("renders a span with .ol-sr that screen readers still name", () => {
    render(
      <button type="button">
        ×<VisuallyHidden>Close</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole("button", { name: "×Close" })).toBeInTheDocument();
    expect(screen.getByText("Close").tagName).toBe("SPAN");
    expect(screen.getByText("Close")).toHaveClass("ol-sr");
  });

  it("renders a focusable skip link with `as` and forwards the ref", async () => {
    const ref = createRef<HTMLAnchorElement>();
    const { container } = render(
      <main>
        <VisuallyHidden as="a" href="#main" focusable ref={ref} className="extra">
          Skip to content
        </VisuallyHidden>
      </main>,
    );
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link).toHaveClass("ol-sr", "ol-sr--focusable", "extra");
    expect(ref.current).toBe(link);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
