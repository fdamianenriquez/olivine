import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Text } from "./Text";

const variants = [
  ["display-xl", "H1"],
  ["display-l", "H1"],
  ["display-m", "H2"],
  ["h1", "H1"],
  ["h2", "H2"],
  ["h3", "H3"],
  ["figure-xl", "SPAN"],
  ["figure-l", "SPAN"],
  ["figure-m", "SPAN"],
  ["body-l", "P"],
  ["body", "P"],
  ["body-s", "P"],
  ["mono", "CODE"],
  ["kanji", "SPAN"],
] as const;

afterEach(() => vi.restoreAllMocks());

describe("Text", () => {
  it("renders a body paragraph by default and passes props through", () => {
    render(
      <Text className="x" data-testid="t">
        Hello
      </Text>,
    );
    const el = screen.getByTestId("t");
    expect(el.tagName).toBe("P");
    expect(el).toHaveClass("ol-text", "ol-text--body", "x");
  });

  it.each(variants)("maps %s to its class and default tag", (variant, tag) => {
    render(
      <Text variant={variant} data-testid="t">
        12
      </Text>,
    );
    const el = screen.getByTestId("t");
    expect(el).toHaveClass(`ol-text--${variant}`);
    expect(el.tagName).toBe(tag);
  });

  it("applies tone and vertical modifiers", () => {
    render(
      <Text tone="muted" vertical data-testid="t">
        a
      </Text>,
    );
    expect(screen.getByTestId("t")).toHaveClass("ol-text--muted", "ol-text--vertical");
    render(
      <Text tone="accent" data-testid="u">
        a
      </Text>,
    );
    expect(screen.getByTestId("u")).toHaveClass("ol-text--accent");
  });

  it("renders another element with as", () => {
    render(
      <Text as="a" href="/x" data-testid="t">
        link
      </Text>,
    );
    expect(screen.getByTestId("t").tagName).toBe("A");
  });

  it("forwards the ref", () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<Text ref={ref}>x</Text>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it("warns when a figure variant contains letters", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Text variant="figure-l">Twelve</Text>);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn for digits and symbols", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <Text variant="figure-l">¥48,000</Text>
        <Text variant="figure-m">02 / 03</Text>
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for letters in non-figure variants", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Text variant="h1">Words</Text>);
    expect(warn).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <main>
        <Text variant="display-xl">Title</Text>
        <Text variant="figure-l">48</Text>
        <Text variant="kanji" vertical lang="ja">
          静寂
        </Text>
      </main>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("lets as set the heading level of a display style", () => {
    render(
      <Text variant="display-xl" as="h3" data-testid="t">
        Title
      </Text>,
    );
    expect(screen.getByTestId("t").tagName).toBe("H3");
  });

  it("keeps lang and text on vertical kanji", () => {
    render(
      <Text variant="kanji" vertical lang="ja" data-testid="t">
        静寂
      </Text>,
    );
    const el = screen.getByTestId("t");
    expect(el).toHaveAttribute("lang", "ja");
    expect(el).toHaveTextContent("静寂");
  });

  it("has no axe violations with tones and a heading hierarchy", async () => {
    const { container } = render(
      <main>
        <Text variant="h1">One</Text>
        <Text variant="h2">Two</Text>
        <Text variant="h3">Three</Text>
        <Text tone="muted">Muted</Text>
        <Text tone="accent">Accent</Text>
      </main>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
