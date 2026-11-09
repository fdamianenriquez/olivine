import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Ruby } from "./Ruby";

const css = readFileSync(resolve(process.cwd(), "src/components/Ruby/Ruby.css"), "utf8");

afterEach(() => vi.restoreAllMocks());

describe("Ruby", () => {
  it("renders group ruby by default and passes props through", () => {
    render(<Ruby base="今日" reading="きょう" className="x" data-testid="r" />);
    const el = screen.getByTestId("r");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("ol-ruby", "ol-ruby--body", "x");
    expect(el).toHaveAttribute("lang", "ja");
    expect(el).not.toHaveAttribute("tabindex");
    const units = el.querySelectorAll("ruby");
    expect(units).toHaveLength(1);
    expect(units[0]?.querySelector("rt")).toHaveTextContent("きょう");
    expect(el.textContent).toBe("今日(きょう)");
  });

  it("wraps each reading in rp fallbacks", () => {
    const { container } = render(<Ruby base="今日" reading="きょう" />);
    const rp = container.querySelectorAll("rp");
    expect(rp).toHaveLength(2);
    expect(rp[0]).toHaveTextContent("(");
    expect(rp[1]).toHaveTextContent(")");
  });

  it("renders one ruby unit per pair (mono ruby)", () => {
    const { container } = render(
      <Ruby
        pairs={[
          ["松", "まつ"],
          ["本", "もと"],
        ]}
      />,
    );
    const units = container.querySelectorAll("ruby");
    expect(units).toHaveLength(2);
    expect(units[0]).toHaveTextContent("松");
    expect(units[0]?.querySelector("rt")).toHaveTextContent("まつ");
    expect(units[1]?.querySelector("rt")).toHaveTextContent("もと");
  });

  it("lets pairs win over base and reading", () => {
    const { container } = render(<Ruby base="今日" reading="きょう" pairs={[["白", "しら"]]} />);
    expect(container.querySelectorAll("ruby")).toHaveLength(1);
    expect(container).not.toHaveTextContent("今日");
  });

  it("leaves a pair without a reading as plain text", () => {
    const { container } = render(
      <Ruby
        pairs={[
          ["乗", "の"],
          ["り", ""],
        ]}
      />,
    );
    expect(container.querySelectorAll("ruby")).toHaveLength(1);
    expect(container.querySelectorAll("rt")).toHaveLength(1);
    expect(container.textContent).toBe("乗(の)り");
  });

  it.each(["body", "kanji", "display"] as const)("maps size %s to its modifier", (size) => {
    render(<Ruby base="今日" reading="きょう" size={size} data-testid="r" />);
    expect(screen.getByTestId("r")).toHaveClass(`ol-ruby--${size}`);
  });

  it("applies the vertical modifier", () => {
    render(<Ruby base="今日" reading="きょう" vertical data-testid="r" />);
    expect(screen.getByTestId("r")).toHaveClass("ol-ruby--vertical");
  });

  it("stacks the Latin reading under the base, tagged ja-Latn, with hidden parentheses", () => {
    const { container } = render(<Ruby base="白樺" reading="しらかば" romaji="Shirakaba" />);
    const stack = container.querySelector(".ol-ruby__stack");
    expect(stack).not.toBeNull();
    const row = stack?.querySelector(".ol-ruby__row");
    expect(row?.querySelector("ruby")).not.toBeNull();
    const latin = stack?.querySelector(".ol-ruby__romaji");
    expect(latin).toHaveAttribute("lang", "ja-Latn");
    expect(latin?.textContent).toBe("(Shirakaba)");
    expect(latin?.querySelectorAll(".ol-sr")).toHaveLength(2);
    expect(row?.nextElementSibling).toBe(latin);
  });

  it("ignores the Latin reading in vertical text", () => {
    const { container } = render(
      <Ruby base="白樺" reading="しらかば" romaji="Shirakaba" vertical />,
    );
    expect(container.querySelector(".ol-ruby__stack")).toBeNull();
    expect(container).not.toHaveTextContent("Shirakaba");
  });

  it("keeps the Latin reading for mono ruby too", () => {
    const { container } = render(
      <Ruby
        pairs={[
          ["松", "まつ"],
          ["本", "もと"],
        ]}
        romaji="Matsumoto"
      />,
    );
    expect(container.querySelectorAll(".ol-ruby__row ruby")).toHaveLength(2);
    expect(container.querySelector(".ol-ruby__romaji")).toHaveTextContent("Matsumoto");
  });

  it("lets a passed lang win over the default", () => {
    render(<Ruby base="今日" reading="きょう" lang="ja-JP" data-testid="r" />);
    expect(screen.getByTestId("r")).toHaveAttribute("lang", "ja-JP");
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Ruby ref={ref} base="今日" reading="きょう" data-testid="r" />);
    expect(ref.current).toBe(screen.getByTestId("r"));
  });

  it("warns in development when there is nothing to annotate", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Ruby />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Ruby"));
  });

  describe("learner mode (reveal=hover)", () => {
    it("marks the word focusable and keeps every reading in the DOM", () => {
      render(<Ruby base="今日" reading="きょう" romaji="kyō" reveal="hover" data-testid="r" />);
      const el = screen.getByTestId("r");
      expect(el).toHaveClass("ol-ruby--reveal");
      expect(el).toHaveAttribute("tabindex", "0");
      expect(el.querySelector("rt")).toHaveTextContent("きょう");
      expect(el.querySelector(".ol-ruby__romaji")).toHaveTextContent("kyō");
    });

    it("is reachable with Tab and leaves with Tab", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Ruby base="今日" reading="きょう" reveal="hover" data-testid="r" />
          <button type="button">after</button>
        </>,
      );
      await user.tab();
      expect(screen.getByTestId("r")).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button")).toHaveFocus();
    });

    it("does not take focus in always mode", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Ruby base="今日" reading="きょう" />
          <button type="button">after</button>
        </>,
      );
      await user.tab();
      expect(screen.getByRole("button")).toHaveFocus();
    });

    it("has no axe violations while a word has focus", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Ruby base="今日" reading="きょう" romaji="kyō" reveal="hover" data-testid="r" />,
      );
      await user.tab();
      expect(screen.getByTestId("r")).toHaveFocus();
      expect((await runAxe(container)).violations).toEqual([]);
    });

    it("leaves a pair without a reading as plain text", () => {
      const { container } = render(
        <Ruby
          reveal="hover"
          data-testid="r"
          pairs={[
            ["乗", "の"],
            ["り", ""],
          ]}
        />,
      );
      expect(screen.getByTestId("r")).toHaveAttribute("tabindex", "0");
      expect(container.querySelectorAll("rt")).toHaveLength(1);
      expect(container.textContent).toBe("乗(の)り");
    });

    it("drops the Latin line in vertical text but stays focusable", () => {
      const { container } = render(
        <Ruby base="今日" reading="きょう" romaji="kyō" reveal="hover" vertical data-testid="r" />,
      );
      expect(container.querySelector(".ol-ruby__romaji")).toBeNull();
      expect(screen.getByTestId("r")).toHaveAttribute("tabindex", "0");
      expect(container.querySelector("rt")).toHaveTextContent("きょう");
    });

    it("keeps every reading in the DOM after hover and unhover", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Ruby base="今日" reading="きょう" romaji="kyō" reveal="hover" data-testid="r" />,
      );
      const el = screen.getByTestId("r");
      await user.hover(el);
      expect(container.querySelector("rt")).toHaveTextContent("きょう");
      await user.unhover(el);
      expect(container.querySelector("rt")).toHaveTextContent("きょう");
      expect(container.querySelector(".ol-ruby__romaji")).toHaveTextContent("kyō");
    });

    it("lets a passed tabIndex win", () => {
      render(<Ruby base="今日" reading="きょう" reveal="hover" tabIndex={-1} data-testid="r" />);
      expect(screen.getByTestId("r")).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("styles", () => {
    it("reveals readings on hover and focus through the motion tokens only", () => {
      expect(css).toMatch(/:is\(:hover, :focus-within\)/);
      expect(css).toMatch(/transition: opacity var\(--dur-s\) var\(--ease-effect\)/);
    });

    it("draws the focus ring with olivo and the focus tokens", () => {
      const block =
        /\.ol-ruby--reveal:focus-visible \{[^}]*outline: var\(--stroke-bold\) solid var\(--olivo\);[^}]*outline-offset: var\(--focus-offset\)/.exec(
          css,
        );
      expect(block).not.toBeNull();
    });

    it("keeps the dotted marker visible in forced colours", () => {
      expect(css).toMatch(
        /@media \(forced-colors: active\) \{[^}]*\{[^}]*text-decoration-color: CanvasText/,
      );
    });

    it("drops the fade under reduced motion", () => {
      const block = /@media \(prefers-reduced-motion: reduce\) \{[^}]*\{[^}]*transition: none/.exec(
        css,
      );
      expect(block).not.toBeNull();
    });
  });

  describe("a11y", () => {
    it("has no axe violations in the default state", async () => {
      const { container } = render(
        <p lang="ja">
          <Ruby base="今日" reading="きょう" /> は晴れです。
        </p>,
      );
      expect((await runAxe(container)).violations).toEqual([]);
    });

    it("has no axe violations in learner mode with a Latin reading and mono ruby", async () => {
      const { container } = render(
        <div>
          <Ruby
            pairs={[
              ["松", "まつ"],
              ["本", "もと"],
            ]}
            romaji="Matsumoto"
            reveal="hover"
          />
          <Ruby base="白樺" reading="しらかば" romaji="Shirakaba" size="display" />
          <Ruby base="今日" reading="きょう" vertical />
        </div>,
      );
      expect((await runAxe(container)).violations).toEqual([]);
    });
  });
});
