import { readFileSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Badge, type BadgeProps } from "./Badge";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Badge", () => {
  it("renders a neutral span with only the root class by default", () => {
    render(<Badge data-testid="b">Draft</Badge>);
    const el = screen.getByTestId("b");
    expect(el.tagName).toBe("SPAN");
    expect(el.className).toBe("ol-badge");
  });

  it("passes className and native props through", () => {
    render(
      <Badge className="extra" data-testid="b" title="Status">
        Draft
      </Badge>,
    );
    const el = screen.getByTestId("b");
    expect(el).toHaveClass("ol-badge", "extra");
    expect(el).toHaveAttribute("title", "Status");
  });

  it.each<NonNullable<BadgeProps["tone"]>>([
    "solid",
    "accent",
    "olivo",
    "info",
    "success",
    "warning",
    "danger",
  ])("maps tone %s to its modifier", (tone) => {
    render(
      <Badge tone={tone} data-testid="b">
        Word
      </Badge>,
    );
    expect(screen.getByTestId("b")).toHaveClass(`ol-badge--${tone}`);
  });

  it("maps dot and count to modifiers", () => {
    render(
      <Badge tone="solid" dot count data-testid="b">
        12
      </Badge>,
    );
    expect(screen.getByTestId("b")).toHaveClass("ol-badge--dot", "ol-badge--count");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Badge ref={ref} data-testid="b">
        Draft
      </Badge>,
    );
    expect(ref.current).toBe(screen.getByTestId("b"));
  });

  describe("development warning", () => {
    it("warns when a status tone has a dot but no children", () => {
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);
      render(<Badge tone="danger" dot />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Badge"));
    });

    it("warns when a status tone only holds a number", () => {
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);
      render(
        <Badge tone="info" count>
          {12}
        </Badge>,
      );
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it("does not warn for a status tone with a word, nested or not", () => {
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);
      render(
        <>
          <Badge tone="success" dot>
            Shipped
          </Badge>
          <Badge tone="warning">
            <b>Pending</b> 3
          </Badge>
        </>,
      );
      expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn for non-status tones without text", () => {
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);
      render(
        <>
          <Badge dot />
          <Badge tone="solid" count>
            12
          </Badge>
        </>,
      );
      expect(warn).not.toHaveBeenCalled();
    });
  });

  it("has no axe violations across tones", async () => {
    const { container } = render(
      <div>
        <Badge>Draft</Badge>
        <Badge tone="solid">v1.0</Badge>
        <Badge tone="accent">New</Badge>
        <Badge tone="olivo">Olive</Badge>
        <Badge tone="info" dot>
          Info
        </Badge>
        <Badge tone="danger" dot>
          Failed
        </Badge>
        <Badge tone="solid" count>
          12
          <span className="ol-sr"> unread</span>
        </Badge>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the sumi theme", async () => {
    const { container } = render(
      <div className="ol" data-theme="sumi">
        <Badge tone="success" dot>
          Shipped
        </Badge>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("Badge count context", () => {
  it("reads a count with hidden context words as one phrase", () => {
    render(
      <Badge count data-testid="b">
        12<span className="ol-sr"> unread</span>
      </Badge>,
    );
    expect(screen.getByTestId("b")).toHaveTextContent("12 unread");
  });

  it("counts hidden text as a word for status tones", () => {
    const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);
    render(
      <Badge tone="danger" count>
        3<span className="ol-sr"> failed</span>
      </Badge>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Badge forced colours", () => {
  const css = readFileSync("src/components/Badge/Badge.css", "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const forced = css.slice(css.indexOf("@media (forced-colors: active)"));

  function rule(selector: string): string {
    const start = forced.indexOf(selector);
    expect(start).toBeGreaterThan(-1);
    return forced.slice(start, forced.indexOf("}", start));
  }

  it("opts filled tones out of the text backplate and fills them with system colours", () => {
    const filled = rule(".ol-badge--olivo {");
    expect(forced).toMatch(/\.ol-badge--solid,\s*\.ol-badge--accent,\s*\.ol-badge--olivo \{/);
    expect(filled).toMatch(/forced-color-adjust: none/);
    expect(filled).toMatch(/background: CanvasText/);
    expect(filled).toMatch(/color: Canvas;/);
  });

  it("keeps the background-only dot painted", () => {
    const dot = rule(".ol-badge--dot::before {");
    expect(dot).toMatch(/forced-color-adjust: none/);
    expect(dot).toMatch(/background: currentcolor/);
  });

  it("uses only system colours inside the forced-colours block", () => {
    expect(forced).not.toMatch(/var\(--/);
  });
});
