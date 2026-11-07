import { readFileSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { Link } from "../Link";
import { Root } from "../Root";
import {
  EmptyState,
  type EmptyStateAlign,
  type EmptyStateSize,
  type EmptyStateVariant,
} from "./EmptyState";

const css = readFileSync("src/components/EmptyState/EmptyState.css", "utf8");
const rule = (selector: string) => {
  const escaped = selector.replace(/[.\\^$*+?()[\]{}|]/g, "\\$&");
  return new RegExp(`${escaped} \\{([^}]*)\\}`).exec(css)?.[1] ?? "";
};

const variants: EmptyStateVariant[] = ["no-data", "no-results", "error"];
const sizes: EmptyStateSize[] = ["s", "m", "l"];

describe("EmptyState", () => {
  it("renders with defaults, root class, className, ref and native props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<EmptyState ref={ref} className="x" id="e" data-testid="e" />);
    const root = screen.getByTestId("e");
    expect(root).toHaveClass("ol-empty-state", "x");
    expect(root).not.toHaveClass("ol-empty-state--s", "ol-empty-state--l");
    expect(root).toHaveAttribute("id", "e");
    expect(root).toHaveAttribute("data-variant", "no-data");
    expect(ref.current).toBe(root);
  });

  it("passes a native title attribute apart from the heading", () => {
    render(<EmptyState data-testid="e" title="Heading" />);
    expect(screen.getByRole("heading")).toHaveTextContent("Heading");
  });

  describe("variants and default copy", () => {
    it.each([
      ["no-data", "Nothing here yet", null],
      ["no-results", "No results", "Try a different search or clear the filters."],
      ["error", "Could not load this", "Try again in a moment."],
    ] as const)("%s shows its English defaults", (variant, heading, text) => {
      render(<EmptyState variant={variant} data-testid="e" />);
      expect(screen.getByRole("heading")).toHaveTextContent(heading);
      expect(screen.getByTestId("e")).toHaveAttribute("data-variant", variant);
      const body = screen.getByTestId("e").querySelector(".ol-empty-state__text");
      if (text === null) expect(body).toBeNull();
      else expect(body).toHaveTextContent(text);
    });

    it.each([
      ["es", "no-results", "Sin resultados", "Prueba otra búsqueda o quita los filtros."],
      ["es", "error", "No se pudo cargar", "Inténtalo de nuevo en un momento."],
      ["es", "no-data", "Aún no hay nada", null],
      ["ja", "no-results", "結果がありません", "検索条件を変えるか、絞り込みを解除してください。"],
      ["ja", "error", "読み込めませんでした", "しばらくしてからもう一度お試しください。"],
      ["ja", "no-data", "まだ何もありません", null],
    ] as const)("%s %s uses the locale", (locale, variant, heading, text) => {
      render(
        <Root locale={locale}>
          <EmptyState variant={variant} data-testid="e" />
        </Root>,
      );
      expect(screen.getByRole("heading")).toHaveTextContent(heading);
      const body = screen.getByTestId("e").querySelector(".ol-empty-state__text");
      if (text === null) expect(body).toBeNull();
      else expect(body).toHaveTextContent(text);
    });

    it("lets label overrides replace a default", () => {
      const labels = { emptyNoResultsTitle: "Nothing matched" };
      render(
        <Root labels={labels}>
          <EmptyState variant="no-results" />
        </Root>,
      );
      expect(screen.getByRole("heading")).toHaveTextContent("Nothing matched");
    });

    it("gives all variants the same markup apart from copy", () => {
      const shape = (variant: EmptyStateVariant) => {
        const { container, unmount } = render(
          <EmptyState variant={variant} title="T" description="D" />,
        );
        const html = container.innerHTML.replace(/data-variant="[^"]+"/, "");
        unmount();
        return html;
      };
      expect(shape("no-results")).toBe(shape("no-data"));
      expect(shape("error")).toBe(shape("no-data"));
    });
  });

  describe("title and description", () => {
    it("title replaces the default and may be a node", () => {
      render(
        <EmptyState
          variant="error"
          title={
            <>
              Kitchen <em>04</em> is empty
            </>
          }
        />,
      );
      expect(screen.getByRole("heading")).toHaveTextContent("Kitchen 04 is empty");
      expect(screen.queryByText("Could not load this")).toBeNull();
    });

    it("description replaces the default", () => {
      render(<EmptyState variant="no-results" description="Nothing matches “oak”." />);
      expect(screen.getByText("Nothing matches “oak”.")).toBeInTheDocument();
      expect(screen.queryByText(/Try a different search/)).toBeNull();
    });

    it("description={null} hides the variant's default", () => {
      render(<EmptyState variant="error" description={null} data-testid="e" />);
      expect(screen.getByTestId("e").querySelector(".ol-empty-state__text")).toBeNull();
    });

    it("a description gives no-data a text, and may hold a link", () => {
      render(
        <EmptyState
          description={
            <>
              Add a kitchen or <Link href="#docs">read the guide</Link>.
            </>
          }
        />,
      );
      expect(screen.getByRole("link", { name: "read the guide" })).toBeInTheDocument();
    });

    it("renders the description as a div so it may hold inline and block content", () => {
      render(<EmptyState variant="error" data-testid="e" />);
      expect(screen.getByTestId("e").querySelector(".ol-empty-state__text")?.tagName).toBe("DIV");
    });
  });

  describe("heading", () => {
    it.each([1, 2, 3, 4, 5, 6] as const)(
      "headingLevel %s renders that heading element",
      (level) => {
        render(<EmptyState headingLevel={level} />);
        expect(screen.getByRole("heading", { level })).toHaveClass("ol-empty-state__title");
        expect(screen.getAllByRole("heading")).toHaveLength(1);
      },
    );

    it("defaults to level 2", () => {
      render(<EmptyState />);
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it.each([
      ["s", "ol-text--h3", "ol-text--body-s"],
      ["m", "ol-text--h2", "ol-text--body"],
      ["l", "ol-text--h1", "ol-text--body-l"],
    ] as const)("size %s sets the type styles", (size, title, text) => {
      render(<EmptyState size={size} variant="error" data-testid="e" />);
      expect(screen.getByRole("heading")).toHaveClass(title);
      const body = screen.getByTestId("e").querySelector(".ol-empty-state__text");
      expect(body).toHaveClass(text, "ol-text--muted");
    });

    it("keeps the style when the level changes", () => {
      render(<EmptyState size="l" headingLevel={4} />);
      expect(screen.getByRole("heading", { level: 4 })).toHaveClass("ol-text--h1");
    });
  });

  describe("size, align and frame classes", () => {
    it("adds a modifier for s and l only", () => {
      const { rerender } = render(<EmptyState size="s" data-testid="e" />);
      expect(screen.getByTestId("e")).toHaveClass("ol-empty-state--s");
      rerender(<EmptyState size="l" data-testid="e" />);
      expect(screen.getByTestId("e")).toHaveClass("ol-empty-state--l");
      expect(screen.getByTestId("e")).not.toHaveClass("ol-empty-state--s");
      rerender(<EmptyState size="m" data-testid="e" />);
      expect(screen.getByTestId("e").className).toBe("ol-empty-state");
    });

    it("adds center and framed modifiers", () => {
      render(<EmptyState align="center" framed data-testid="e" />);
      expect(screen.getByTestId("e")).toHaveClass(
        "ol-empty-state--center",
        "ol-empty-state--framed",
      );
    });

    it("is start-aligned and unframed by default", () => {
      render(<EmptyState data-testid="e" />);
      expect(screen.getByTestId("e")).not.toHaveClass(
        "ol-empty-state--center",
        "ol-empty-state--framed",
      );
    });
  });

  describe("media", () => {
    it("is hidden from assistive technology", () => {
      render(<EmptyState media="×" data-testid="e" />);
      const media = screen.getByTestId("e").querySelector(".ol-empty-state__media");
      expect(media).toHaveAttribute("aria-hidden", "true");
      expect(media).toHaveTextContent("×");
    });

    it("sits before the title", () => {
      render(<EmptyState media="×" data-testid="e" />);
      const root = screen.getByTestId("e");
      expect(root.firstElementChild).toHaveClass("ol-empty-state__media");
    });

    it("is not rendered when absent", () => {
      render(<EmptyState data-testid="e" />);
      expect(screen.getByTestId("e").querySelector(".ol-empty-state__media")).toBeNull();
    });

    it("keeps the media out of the accessible tree", () => {
      render(<EmptyState media={<span>kanji-only</span>} />);
      expect(screen.queryByText("kanji-only", { ignore: "[aria-hidden=true] *" })).toBeNull();
    });
  });

  describe("action and keyboard", () => {
    it("renders the action after the body", () => {
      render(<EmptyState action={<Button>Add a kitchen</Button>} data-testid="e" />);
      const action = screen.getByTestId("e").querySelector(".ol-empty-state__action");
      expect(action).toContainElement(screen.getByRole("button", { name: "Add a kitchen" }));
      expect(screen.getByTestId("e").lastElementChild).toBe(action);
    });

    it("is not rendered without an action", () => {
      render(<EmptyState data-testid="e" />);
      expect(screen.getByTestId("e").querySelector(".ol-empty-state__action")).toBeNull();
    });

    it("makes the action the only tab stop; the rest is not focusable", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">before</button>
          <EmptyState
            media="×"
            variant="error"
            action={<Button>Try again</Button>}
            data-testid="e"
          />
          <button type="button">after</button>
        </>,
      );
      await user.tab();
      expect(screen.getByRole("button", { name: "before" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus();
      expect(screen.getByTestId("e").querySelectorAll("[tabindex]")).toHaveLength(0);
    });

    it("activates a button action with Enter and Space", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<EmptyState action={<Button onClick={onClick}>Clear filters</Button>} />);
      await user.tab();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it("activates a link action with Enter", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn((e: { preventDefault: () => void }) => {
        e.preventDefault();
      });
      render(
        <EmptyState
          action={
            <Link href="#new" onClick={onClick}>
              Add a kitchen
            </Link>
          }
        />,
      );
      await user.tab();
      await user.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("never moves focus on mount or update", () => {
      const { rerender } = render(
        <>
          <button type="button">outside</button>
          <EmptyState announce="assertive" />
        </>,
      );
      screen.getByRole("button", { name: "outside" }).focus();
      rerender(
        <>
          <button type="button">outside</button>
          <EmptyState announce="assertive" title="Changed" />
        </>,
      );
      expect(screen.getByRole("button", { name: "outside" })).toHaveFocus();
    });
  });

  describe("landmarks and roles", () => {
    it("is a plain div: no landmark, no live role on the root or the body", () => {
      render(<EmptyState data-testid="e" variant="error" />);
      const root = screen.getByTestId("e");
      expect(root.tagName).toBe("DIV");
      expect(root).not.toHaveAttribute("role");
      expect(root.querySelector(".ol-empty-state__body")).not.toHaveAttribute("role");
      expect(screen.queryByRole("region")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("announce", () => {
    it("renders no live region unless asked", () => {
      render(<EmptyState data-testid="e" variant="no-results" />);
      expect(screen.getByTestId("e").querySelector(".ol-empty-state__live")).toBeNull();
    });

    it("polite renders a hidden status region with the title and description", () => {
      render(<EmptyState announce="polite" variant="no-results" />);
      const live = screen.getByRole("status");
      expect(live).toHaveClass("ol-empty-state__live", "ol-sr");
      expect(live).toHaveAttribute("aria-atomic", "true");
      expect(live).toHaveTextContent("No results Try a different search or clear the filters.");
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("assertive renders an alert region", () => {
      render(<EmptyState announce="assertive" variant="error" />);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not load this Try again in a moment.",
      );
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("announces the title alone when there is no description", () => {
      render(<EmptyState announce="polite" />);
      expect(screen.getByRole("status")).toHaveTextContent(/^Nothing here yet$/);
    });

    it("is rendered empty on the server and filled after mount", () => {
      const html = renderToString(<EmptyState announce="polite" />);
      expect(html).toMatch(/<span class="ol-empty-state__live ol-sr" role="status"[^>]*><\/span>/);
      render(<EmptyState announce="polite" />);
      expect(screen.getByRole("status")).toHaveTextContent("Nothing here yet");
    });

    it("does not add the live role to the visible body or the action", () => {
      render(<EmptyState announce="polite" action={<Button>Retry</Button>} data-testid="e" />);
      const root = screen.getByTestId("e");
      expect(root.querySelector(".ol-empty-state__body")).not.toHaveAttribute("role");
      expect(root.querySelector(".ol-empty-state__action")).not.toHaveAttribute("role");
      expect(root.querySelectorAll("[role=status]")).toHaveLength(1);
    });

    it("announces again when the title, description or variant change", () => {
      const { rerender } = render(<EmptyState announce="polite" title="One" />);
      expect(screen.getByRole("status")).toHaveTextContent("One");
      rerender(<EmptyState announce="polite" title="Two" description="More." />);
      expect(screen.getByRole("status")).toHaveTextContent("Two More.");
      rerender(<EmptyState announce="polite" variant="error" />);
      expect(screen.getByRole("status")).toHaveTextContent("Could not load this");
    });

    it("reads the text of nodes in the title and description", () => {
      render(
        <EmptyState
          announce="polite"
          title={
            <>
              No <em>oak</em> left
            </>
          }
          description={<Link href="#x">Browse maple</Link>}
        />,
      );
      expect(screen.getByRole("status")).toHaveTextContent("No oak left Browse maple");
    });

    it("announcement replaces the announced text", () => {
      render(
        <EmptyState
          announce="polite"
          announcement="0 results for oak"
          title={<span>No results</span>}
        />,
      );
      expect(screen.getByRole("status")).toHaveTextContent(/^0 results for oak$/);
    });

    it("removes the region when announce is turned off", () => {
      const { rerender } = render(<EmptyState announce="polite" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      rerender(<EmptyState />);
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("announces in the active locale", () => {
      render(
        <Root locale="es">
          <EmptyState announce="polite" variant="no-results" />
        </Root>,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Sin resultados Prueba otra búsqueda o quita los filtros.",
      );
    });
  });

  describe("reduced motion and motion", () => {
    it("does not animate, transition or move", () => {
      expect(css).not.toMatch(/transition|animation|@keyframes|transform|opacity/);
      expect(css).not.toMatch(/blur|bounce|overshoot|cubic-bezier|steps\(/);
    });

    it("adds no motion class", () => {
      render(<EmptyState data-testid="e" />);
      expect(screen.getByTestId("e").className).not.toMatch(/motion/);
    });
  });

  describe("styles", () => {
    it("draws the frame as one hairline rule box with square corners", () => {
      const framed = rule(".ol-empty-state--framed");
      expect(framed).toMatch(/border: var\(--stroke-hair\) solid var\(--rule\)/);
      expect(framed).toMatch(/background: var\(--paper\)/);
      expect(css).not.toMatch(/border-radius|box-shadow|shadow-/);
    });

    it("pads by size from the spacing scale", () => {
      expect(rule(".ol-empty-state")).toMatch(/padding: var\(--space-12\)/);
      expect(rule(".ol-empty-state--s")).toMatch(/padding: var\(--space-6\)/);
      expect(rule(".ol-empty-state--l")).toMatch(/padding: var\(--space-24\)/);
    });

    it("caps media images and keeps the body to a reading line", () => {
      expect(css).toMatch(/max-height: var\(--control-area\)/);
      expect(rule(".ol-empty-state__body")).toMatch(/max-width: 48ch/);
    });

    it("sets media in the mono face at the h1 size in secondary ink", () => {
      const media = rule(".ol-empty-state__media");
      expect(media).toMatch(/font-family: var\(--font-mono\)/);
      expect(media).toMatch(/font-size: var\(--text-h1-size\)/);
      expect(media).toMatch(/color: var\(--ink-2\)/);
    });

    it("has a forced-colours rule with system colours", () => {
      expect(css).toMatch(/@media \(forced-colors: active\)/);
      expect(css).toMatch(/border-color: CanvasText/);
    });

    it("uses tokens only: no literal colours, sizes or case changes", () => {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
      expect(css).not.toMatch(/\d+(\.\d+)?(px|rem|em)\b/);
      expect(css).not.toMatch(/text-transform|uppercase/);
      expect(css).not.toMatch(/beni|maple|shu\b|--ai\b|--danger|--warn|--ok\b/);
    });
  });

  describe("accessibility", () => {
    const aligns: EmptyStateAlign[] = ["start", "center"];

    it.each(
      variants.flatMap((variant) =>
        sizes.flatMap((size) => aligns.map((align) => [variant, size, align] as const)),
      ),
    )("has no axe violations: %s, size %s, %s", async (variant, size, align) => {
      const { container } = render(
        <main>
          <EmptyState
            variant={variant}
            size={size}
            align={align}
            framed={align === "center"}
            headingLevel={size === "l" ? 1 : 2}
            media={size === "m" ? "×" : undefined}
            action={size !== "s" ? <Button>Clear filters</Button> : undefined}
          />
        </main>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it.each(["polite", "assertive"] as const)(
      "has no axe violations with announce %s",
      async (announce) => {
        const { container } = render(
          <main>
            <EmptyState
              variant="error"
              announce={announce}
              media="!"
              action={<Button>Try again</Button>}
            />
          </main>,
        );
        expect(await runAxe(container)).toHaveNoViolations();
      },
    );

    it("has no axe violations framed, centered and announced together", async () => {
      const { container } = render(
        <main>
          <EmptyState
            framed
            align="center"
            variant="no-results"
            announce="polite"
            media="×"
            action={<Button>Clear filters</Button>}
          />
        </main>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations in ja with a kanji media and a link in the text", async () => {
      const { container } = render(
        <Root locale="ja">
          <main>
            <EmptyState
              variant="no-results"
              media={<span lang="ja">空</span>}
              description={<Link href="#x">絞り込みを解除</Link>}
            />
          </main>
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
