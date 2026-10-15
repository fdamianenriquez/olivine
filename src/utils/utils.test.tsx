import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { devWarn } from "./dev";
import { pad } from "./pad";
import { forwardRefAs } from "./polymorphic";

describe("pad", () => {
  it("zero-pads to two digits by default", () => {
    expect(pad(1)).toBe("01");
    expect(pad(12)).toBe("12");
    expect(pad(7, 3)).toBe("007");
  });
});

describe("devWarn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns with the component name outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    devWarn("Text", "figure variants are for numbers");
    expect(warn).toHaveBeenCalledWith("[olivine] Text: figure variants are for numbers");
  });
});

describe("forwardRefAs", () => {
  const Box = forwardRefAs<"div", { tone?: "muted" }>(function Box(
    { as: As = "div", tone, ...rest },
    ref,
  ) {
    return <As ref={ref} data-tone={tone} {...rest} />;
  });

  it("renders the default element and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Box ref={ref}>box</Box>);
    expect(ref.current?.tagName).toBe("DIV");
  });

  it("renders the element passed in `as` with its native props", () => {
    render(
      <Box as="a" href="/works" tone="muted">
        link
      </Box>,
    );
    const link = screen.getByRole("link", { name: "link" });
    expect(link).toHaveAttribute("href", "/works");
    expect(link).toHaveAttribute("data-tone", "muted");
  });
});
