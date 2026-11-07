import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Avatar } from "../Avatar";
import { Root } from "../Root";
import { InlineQuote, Quote } from "./Quote";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Quote", () => {
  it("renders a bare blockquote without attribution", () => {
    const { container } = render(<Quote className="x">Every board has an owner.</Quote>);
    const root = screen.getByRole("blockquote");
    expect(root.tagName).toBe("BLOCKQUOTE");
    expect(root).toHaveClass("ol-quote", "ol-quote--block", "ol-quote__body", "x");
    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelector("figcaption")).toBeNull();
    expect(root.querySelector("p")).toHaveTextContent("Every board has an owner.");
  });

  it("renders figure > blockquote + figcaption with attribution, outside the quoted text", () => {
    render(
      <Quote author="Head of timber" detail="North store" source="Timber journal">
        Every board has an owner.
      </Quote>,
    );
    const figure = screen.getByRole("figure");
    const blockquote = screen.getByRole("blockquote");
    const caption = figure.querySelector("figcaption");
    expect(figure.tagName).toBe("FIGURE");
    expect(figure).toHaveClass("ol-quote");
    expect(blockquote.parentElement).toBe(figure);
    expect(blockquote).toHaveClass("ol-quote__body");
    expect(caption).not.toBeNull();
    expect(blockquote.contains(caption)).toBe(false);
    expect(blockquote).toHaveTextContent(/^Every board has an owner\.$/);
    expect(caption).toHaveTextContent("Head of timber North store Timber journal");
  });

  it("leaves the figure's name to its figcaption (no aria-labelledby)", () => {
    // jsdom's name computation does not read figcaption for figure; browsers do (ARIA in HTML).
    const { container } = render(<Quote author="Head of timber">Every board has an owner.</Quote>);
    const figure = screen.getByRole("figure");
    expect(figure).not.toHaveAttribute("aria-labelledby");
    expect(figure).not.toHaveAttribute("aria-label");
    expect(container.querySelector("figure > figcaption")).toHaveTextContent("Head of timber");
  });

  it("renders source in a cite element and the other parts in spans", () => {
    const { container } = render(
      <Quote author="Ana" detail="North store" source="Timber journal">
        Text
      </Quote>,
    );
    const source = container.querySelector("cite");
    expect(source).toHaveClass("ol-quote__source");
    expect(source).toHaveTextContent("Timber journal");
    expect(container.querySelector(".ol-quote__author")?.tagName).toBe("SPAN");
    expect(container.querySelector(".ol-quote__detail")?.tagName).toBe("SPAN");
  });

  it("renders only the parts that are given", () => {
    const { container } = render(<Quote detail="Spring 2026">Text</Quote>);
    expect(container.querySelector(".ol-quote__author")).toBeNull();
    expect(container.querySelector(".ol-quote__source")).toBeNull();
    expect(container.querySelector(".ol-quote__detail")).toHaveTextContent("Spring 2026");
  });

  it("replaces author, detail and source with attribution", () => {
    const { container } = render(
      <Quote attribution={<strong>Custom caption</strong>} author="Ignored">
        Text
      </Quote>,
    );
    expect(container.querySelector("figcaption")).toHaveTextContent("Custom caption");
    expect(container.querySelector(".ol-quote__author")).toBeNull();
  });

  it("puts the cite URL on the blockquote as an attribute", () => {
    const { container } = render(
      <Quote cite="https://example.com/journal" author="Ana">
        Text
      </Quote>,
    );
    expect(screen.getByRole("blockquote")).toHaveAttribute("cite", "https://example.com/journal");
    expect(container.querySelector("figure")).not.toHaveAttribute("cite");
  });

  it("puts cite on a bare blockquote too", () => {
    render(<Quote cite="https://example.com">Text</Quote>);
    expect(screen.getByRole("blockquote")).toHaveAttribute("cite", "https://example.com");
  });

  it("puts lang on the blockquote only", () => {
    const { container } = render(
      <Quote lang="ja" author="Ana">
        木は生きている。
      </Quote>,
    );
    expect(screen.getByRole("blockquote")).toHaveAttribute("lang", "ja");
    expect(container.querySelector("figure")).not.toHaveAttribute("lang");
    expect(container.querySelector("figcaption")).not.toHaveAttribute("lang");
  });

  it("puts lang on a bare blockquote", () => {
    render(<Quote lang="es">Texto</Quote>);
    expect(screen.getByRole("blockquote")).toHaveAttribute("lang", "es");
  });

  it("shows marks by default on pull and not on block", () => {
    const { rerender } = render(<Quote variant="pull">Text</Quote>);
    expect(screen.getByRole("blockquote")).toHaveClass("ol-quote--pull", "ol-quote--marks");
    rerender(<Quote>Text</Quote>);
    expect(screen.getByRole("blockquote")).not.toHaveClass("ol-quote--marks");
  });

  it("honours marks on both variants", () => {
    const { rerender } = render(<Quote marks>Text</Quote>);
    expect(screen.getByRole("blockquote")).toHaveClass("ol-quote--marks");
    rerender(
      <Quote variant="pull" marks={false}>
        Text
      </Quote>,
    );
    expect(screen.getByRole("blockquote")).not.toHaveClass("ol-quote--marks");
  });

  it("never writes the marks into the DOM text", () => {
    render(
      <Quote variant="pull" author="Ana">
        Text
      </Quote>,
    );
    expect(screen.getByRole("blockquote")).toHaveTextContent(/^Text$/);
  });

  it("applies the size class on pull only", () => {
    const { rerender } = render(
      <Quote variant="pull" size="l">
        Text
      </Quote>,
    );
    expect(screen.getByRole("blockquote")).toHaveClass("ol-quote--size-l");
    rerender(
      <Quote variant="pull" size="m">
        Text
      </Quote>,
    );
    expect(screen.getByRole("blockquote")).not.toHaveClass("ol-quote--size-l");
  });

  it("warns and ignores size on block", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Quote size="l">Text</Quote>);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`size` only applies"));
    expect(screen.getByRole("blockquote")).not.toHaveClass("ol-quote--size-l");
  });

  it("does not warn for valid combinations", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Quote variant="pull" size="l" author="Ana" avatar={<Avatar name="Ana" />}>
        Text
      </Quote>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("adds the framed class", () => {
    render(<Quote framed>Text</Quote>);
    expect(screen.getByRole("blockquote")).toHaveClass("ol-quote--framed");
  });

  it("hides a repeated quote from assistive technology", () => {
    const { container, rerender } = render(
      <Quote variant="pull" repeated>
        Text
      </Quote>,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    rerender(
      <Quote variant="pull" repeated author="Ana">
        Text
      </Quote>,
    );
    expect(container.querySelector("figure")).toHaveAttribute("aria-hidden", "true");
    rerender(<Quote variant="pull">Text</Quote>);
    expect(container.firstElementChild).not.toHaveAttribute("aria-hidden");
  });

  it.each([
    [
      "source",
      () => (
        <Quote repeated author="Ana" source={<a href="/journal">Journal</a>}>
          Text
        </Quote>
      ),
    ],
    [
      "author",
      () => (
        <Quote repeated author={<a href="/ana">Ana</a>}>
          Text
        </Quote>
      ),
    ],
    [
      "detail",
      () => (
        <Quote repeated author="Ana" detail={<button type="button">Store</button>}>
          Text
        </Quote>
      ),
    ],
    [
      "attribution",
      () => (
        <Quote
          repeated
          attribution={
            <span>
              <a href="/x">Custom</a>
            </span>
          }
        >
          Text
        </Quote>
      ),
    ],
    [
      "children",
      () => (
        <Quote repeated author="Ana">
          <p>
            <a href="/x">Text</a>
          </p>
        </Quote>
      ),
    ],
  ])("warns about a link or control in a repeated quote: %s", (_name, ui) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(ui());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`repeated`"));
  });

  it("does not warn about links when the quote is not repeated", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Quote author="Ana" source={<a href="/journal">Journal</a>}>
        Text
      </Quote>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("keeps a caller's own aria-hidden when the quote is not repeated", () => {
    const { container } = render(
      <Quote aria-hidden="true" author="Ana">
        Text
      </Quote>,
    );
    expect(container.querySelector("figure")).toHaveAttribute("aria-hidden", "true");
    const bare = render(<Quote aria-hidden="true">Text</Quote>);
    expect(bare.container.querySelector("blockquote")).toHaveAttribute("aria-hidden", "true");
  });

  it("warns about an interactive avatar in a repeated quote", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Quote repeated author="Ana" avatar={<a href="/ana">Ana</a>}>
        Text
      </Quote>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`repeated`"));
  });

  it("does not let a native aria-hidden override repeated", () => {
    const { container } = render(
      <Quote repeated aria-hidden={false} author="Ana">
        Text
      </Quote>,
    );
    expect(container.querySelector("figure")).toHaveAttribute("aria-hidden", "true");
    const bare = render(
      <Quote repeated aria-hidden={false}>
        Text
      </Quote>,
    );
    expect(bare.container.querySelector("blockquote")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the same paragraph structure bare and in a figure", () => {
    const paragraphs = (
      <>
        <p>One.</p>
        <p>Two.</p>
        <p>Three.</p>
      </>
    );
    const bare = render(<Quote>{paragraphs}</Quote>);
    expect(bare.container.querySelectorAll("blockquote.ol-quote.ol-quote__body > p")).toHaveLength(
      3,
    );
    expect(bare.container.querySelector("figure")).toBeNull();
    bare.unmount();
    const withCaption = render(<Quote author="Ana">{paragraphs}</Quote>);
    expect(
      withCaption.container.querySelectorAll("figure > blockquote.ol-quote__body > p"),
    ).toHaveLength(3);
  });

  it("adds no built-in text in any locale", () => {
    for (const locale of ["en", "es", "ja"] as const) {
      const { container, unmount } = render(
        <Root locale={locale}>
          <Quote variant="pull" author="Ana" detail="North" source="Journal" avatar={<span />}>
            Text
          </Quote>
        </Root>,
      );
      expect(container.querySelector("blockquote")).toHaveTextContent(/^Text$/);
      expect(container.querySelector("figcaption")).toHaveTextContent(/^Ana North Journal$/);
      unmount();
    }
  });

  it("puts no own lang on a Latin quote inside a Japanese root", () => {
    // The brush face is tied to the quote's own lang="ja" ([lang|="ja"]), not to an inherited one.
    render(
      <Root locale="ja">
        <Quote variant="pull" author="Ana">
          Every board has an owner.
        </Quote>
      </Root>,
    );
    expect(screen.getByRole("blockquote")).not.toHaveAttribute("lang");
  });

  it("hides the avatar wrapper and warns when there is no author", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container, rerender } = render(<Quote avatar={<Avatar name="Ana" />}>Text</Quote>);
    expect(container.querySelector(".ol-quote__avatar")).toHaveAttribute("aria-hidden", "true");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`avatar`"));
    warn.mockClear();
    rerender(
      <Quote author="Ana" avatar={<Avatar name="Ana" />}>
        Text
      </Quote>,
    );
    expect(warn).not.toHaveBeenCalled();
    expect(container.querySelector(".ol-quote__who")).toHaveTextContent(/^Ana$/);
  });

  it("wraps a string in one p and keeps given paragraphs as they are", () => {
    const { container, rerender } = render(<Quote>One</Quote>);
    expect(container.querySelectorAll("p")).toHaveLength(1);
    rerender(
      <Quote>
        <p>One</p>
        <p>Two</p>
      </Quote>,
    );
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("never creates a heading, also in pull", () => {
    render(
      <Quote variant="pull" size="l" author="Ana">
        Text
      </Quote>,
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("has no tab stop; only a link inside is reached", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Quote author="Ana" source={<a href="/journal">Journal</a>}>
          Text
        </Quote>
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("link", { name: "Journal" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("is not focusable on its own", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Quote author="Ana">Text</Quote>
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("forwards the ref to the root, figure or blockquote", () => {
    const bare = createRef<HTMLElement>();
    const { rerender } = render(<Quote ref={bare}>Text</Quote>);
    expect(bare.current?.tagName).toBe("BLOCKQUOTE");
    const withCaption = createRef<HTMLElement>();
    rerender(
      <Quote ref={withCaption} author="Ana">
        Text
      </Quote>,
    );
    expect(withCaption.current?.tagName).toBe("FIGURE");
  });

  it("passes native attributes to the root", () => {
    render(
      <Quote id="q" data-testid="q" author="Ana">
        Text
      </Quote>,
    );
    expect(screen.getByTestId("q")).toHaveAttribute("id", "q");
    expect(screen.getByTestId("q").tagName).toBe("FIGURE");
  });

  describe("axe", () => {
    it.each([
      ["bare block", <Quote key="a">Every board has an owner.</Quote>],
      [
        "block with attribution and marks",
        <Quote key="b" marks author="Ana" detail="North store" source="Timber journal">
          Every board has an owner.
        </Quote>,
      ],
      [
        "multi-paragraph block",
        <Quote key="c" author="Ana">
          <p>One.</p>
          <p>Two.</p>
        </Quote>,
      ],
      [
        "pull m",
        <Quote key="d" variant="pull" author="Ana">
          Every board has an owner.
        </Quote>,
      ],
      [
        "pull l framed with avatar",
        <Quote key="e" variant="pull" size="l" framed author="Ana" avatar={<Avatar name="Ana" />}>
          Every board has an owner.
        </Quote>,
      ],
      [
        "pull with a link source",
        <Quote key="f" variant="pull" author="Ana" source={<a href="/journal">Journal</a>}>
          Every board has an owner.
        </Quote>,
      ],
      [
        "repeated",
        <Quote key="g" variant="pull" repeated author="Ana">
          Every board has an owner.
        </Quote>,
      ],
      [
        "block framed",
        <Quote key="i" framed author="Ana">
          Every board has an owner.
        </Quote>,
      ],
      [
        "spanish",
        <Quote key="j" variant="pull" lang="es" author="Marta">
          La mesa llegó con las vetas a la vista.
        </Quote>,
      ],
      [
        "bare multi-paragraph",
        <Quote key="k">
          <p>One.</p>
          <p>Two.</p>
        </Quote>,
      ],
      [
        "japanese",
        <Quote key="h" variant="pull" lang="ja" author="Ana">
          木は生きている。
        </Quote>,
      ],
    ])("has no violations: %s", async (_name, ui) => {
      for (const theme of ["washi", "sumi"] as const) {
        const { container, unmount } = render(
          <Root theme={theme}>
            <main>{ui}</main>
          </Root>,
        );
        expect(await runAxe(container)).toHaveNoViolations();
        unmount();
      }
    });
  });
});

describe("InlineQuote", () => {
  it("renders a q inside a sentence", () => {
    render(
      <p>
        She said <InlineQuote className="x">make it quiet</InlineQuote> twice.
      </p>,
    );
    const q = screen.getByText("make it quiet");
    expect(q.tagName).toBe("Q");
    expect(q).toHaveClass("ol-quote-inline", "x");
  });

  it("sets cite and lang on the q and forwards the ref", () => {
    const ref = createRef<HTMLQuoteElement>();
    render(
      <InlineQuote ref={ref} cite="https://example.com" lang="es">
        hecho a mano
      </InlineQuote>,
    );
    expect(ref.current).toBe(screen.getByText("hecho a mano"));
    expect(ref.current).toHaveAttribute("cite", "https://example.com");
    expect(ref.current).toHaveAttribute("lang", "es");
  });

  it("nests", () => {
    const { container } = render(
      <p>
        <InlineQuote>
          outer <InlineQuote>inner</InlineQuote>
        </InlineQuote>
      </p>,
    );
    expect(container.querySelectorAll("q q")).toHaveLength(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <main>
        <p>
          A line with <InlineQuote lang="ja">木は生きている</InlineQuote> inside.
        </p>
      </main>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
