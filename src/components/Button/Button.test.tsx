import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Button } from "./Button";

afterEach(() => vi.restoreAllMocks());

describe("Button", () => {
  it("renders a type=button button with root class and native props", () => {
    render(
      <Button className="x" data-testid="b">
        Save
      </Button>,
    );
    const el = screen.getByRole("button", { name: "Save" });
    expect(el).toHaveClass("ol-btn", "x");
    expect(el).toHaveAttribute("type", "button");
    expect(el).toHaveAttribute("data-testid", "b");
    expect(el.className).not.toMatch(/ol-btn--(s|l|solid)/);
  });

  it("allows type=submit", () => {
    render(<Button type="submit">Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it.each(["solid", "accent", "ghost", "danger"] as const)("maps variant %s", (variant) => {
    render(<Button variant={variant}>A</Button>);
    expect(screen.getByRole("button")).toHaveClass(`ol-btn--${variant}`);
  });

  it.each(["s", "l"] as const)("maps size %s", (size) => {
    render(<Button size={size}>A</Button>);
    expect(screen.getByRole("button")).toHaveClass(`ol-btn--${size}`);
  });

  it("maps block", () => {
    render(<Button block>A</Button>);
    expect(screen.getByRole("button")).toHaveClass("ol-btn--block");
  });

  it("renders aria-hidden brackets around the label", () => {
    render(<Button brackets>Send</Button>);
    const el = screen.getByRole("button");
    expect(el).toHaveAccessibleName("Send");
    const brackets = el.querySelectorAll(".ol-btn__br");
    expect(brackets).toHaveLength(2);
    brackets.forEach((b) => expect(b).toHaveAttribute("aria-hidden", "true"));
  });

  it("renders an arrow, default or custom, hidden from assistive tech", () => {
    const { rerender } = render(<Button arrow>Go</Button>);
    const arrow = () => document.querySelector(".ol-btn__arrow");
    expect(arrow()).toHaveTextContent("→");
    expect(arrow()).toHaveAttribute("aria-hidden", "true");
    rerender(<Button arrow="?">Go</Button>);
    expect(arrow()).toHaveTextContent("?");
    expect(screen.getByRole("button")).toHaveAccessibleName("Go");
  });

  it("renders an icon-only square button named by aria-label", () => {
    render(<Button icon="+" aria-label="Add" />);
    const el = screen.getByRole("button", { name: "Add" });
    expect(el).toHaveClass("ol-btn--square");
  });

  it("renders a square glyph button: glyph hidden, name from aria-label", () => {
    render(
      <Button square size="l" aria-label="Add a row" arrow brackets block>
        +
      </Button>,
    );
    const el = screen.getByRole("button", { name: "Add a row" });
    expect(el).toHaveClass("ol-btn--square", "ol-btn--l");
    expect(el).not.toHaveClass("ol-btn--block");
    expect(el.querySelector(".ol-btn__glyph")).toHaveAttribute("aria-hidden", "true");
    expect(el.querySelector(".ol-btn__arrow, .ol-btn__br")).toBeNull();
  });

  it("replaces the glyph with the loading mark in the same box", () => {
    render(
      <Button square aria-label="Add" loading>
        +
      </Button>,
    );
    const el = screen.getByRole("button", { name: /Add/ });
    expect(el).toHaveClass("ol-btn--square");
    expect(el.querySelector(".ol-btn__glyph")).toBeNull();
    expect(el.querySelector(".ol-btn__spin")).not.toBeNull();
  });

  it("requires a name for a square button in the types", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // @ts-expect-error -- a square button needs aria-label or aria-labelledby
    render(<Button square>+</Button>);
    render(
      <>
        <span id="lbl">Add</span>
        <Button square aria-labelledby="lbl">
          +
        </Button>
      </>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("warns for an icon-only button without a name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Button icon="+" />);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn when named or when it has a label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <Button icon="+" aria-label="Add" />
        <Button icon="+">Add</Button>
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("loading disables, sets aria-busy and announces", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );
    const el = screen.getByRole("button");
    expect(el).toBeDisabled();
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveAccessibleName(/Saving.*Loading/);
    expect(el.querySelector(".ol-btn__spin")).toHaveAttribute("aria-hidden", "true");
    await userEvent.click(el);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("localizes the loading text and lets the Root labels override it", () => {
    const { rerender } = render(
      <Root locale="es">
        <Button loading>A</Button>
      </Root>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Cargando");
    rerender(
      <Root locale="ja">
        <Button loading>A</Button>
      </Root>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("読み込み中");
    rerender(
      <Root locale="es" labels={{ loading: "Espera" }}>
        <Button loading>A</Button>
      </Root>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Espera");
  });

  it("renders an anchor with href", () => {
    render(<Button href="/x">Go</Button>);
    const el = screen.getByRole("link", { name: "Go" });
    expect(el).toHaveAttribute("href", "/x");
    expect(el).toHaveClass("ol-btn");
    expect(el).not.toHaveAttribute("type");
  });

  it("disabled anchor uses aria-disabled and does not run onClick", () => {
    const onClick = vi.fn();
    render(
      <Button href="/x" disabled onClick={onClick}>
        Go
      </Button>,
    );
    const el = screen.getByRole("link");
    expect(el).toHaveAttribute("aria-disabled", "true");
    const notPrevented = el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    expect(notPrevented).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders another element with as", () => {
    render(
      <Button as="span" role="button" tabIndex={0}>
        X
      </Button>,
    );
    expect(screen.getByRole("button").tagName).toBe("SPAN");
  });

  it("activates with Enter and Space and is skipped when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
    rerender(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    const aRef = createRef<HTMLAnchorElement>();
    render(
      <>
        <Button ref={ref}>A</Button>
        <Button ref={aRef} href="/x">
          B
        </Button>
      </>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(aRef.current).toBeInstanceOf(HTMLAnchorElement);
  });

  it("has no axe violations across states", async () => {
    const { container } = render(
      <main>
        <Button>Outline</Button>
        <Button variant="accent" brackets arrow>
          Send
        </Button>
        <Button loading>Saving</Button>
        <Button disabled>Off</Button>
        <Button icon="+" aria-label="Add" />
        <Button href="/x" disabled>
          Link
        </Button>
      </main>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
