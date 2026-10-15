import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Link } from "./Link";

describe("Link", () => {
  it("renders an anchor with the root class, className and native props", () => {
    render(
      <Link href="/a" className="extra" title="T">
        Docs
      </Link>,
    );
    const el = screen.getByRole("link", { name: "Docs" });
    expect(el.tagName).toBe("A");
    expect(el).toHaveClass("ol-link", "extra");
    expect(el).toHaveAttribute("href", "/a");
    expect(el).not.toHaveClass("ol-link--plain");
    expect(el).not.toHaveAttribute("target");
  });

  it("maps plain to its modifier", () => {
    render(
      <Link plain href="#">
        Docs
      </Link>,
    );
    expect(screen.getByRole("link")).toHaveClass("ol-link--plain");
  });

  it("opens external links in a new tab with noreferrer", () => {
    render(
      <Link external href="https://example.com">
        Site
      </Link>,
    );
    const el = screen.getByRole("link");
    expect(el).toHaveAttribute("target", "_blank");
    expect(el).toHaveAttribute("rel", "noreferrer");
    expect(el.querySelector(".ol-link__arrow")).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveTextContent("Site↗ (opens in a new tab)");
  });

  it("merges a user rel without duplicates", () => {
    render(
      <Link external rel="nofollow noreferrer" href="#">
        Site
      </Link>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("rel", "noreferrer nofollow");
  });

  it.each([
    ["en", "opens in a new tab"],
    ["es", "se abre en una pestaña nueva"],
    ["ja", "新しいタブで開きます"],
  ] as const)("announces the new tab in %s", (locale, text) => {
    render(
      <Root locale={locale}>
        <Link external href="#">
          Site
        </Link>
      </Root>,
    );
    expect(screen.getByRole("link")).toHaveTextContent(text);
    expect(document.querySelector(".ol-sr")).toHaveTextContent(text);
  });

  it("forwards its ref to the anchor", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Link ref={ref} href="#">
        Docs
      </Link>,
    );
    expect(ref.current).toBe(screen.getByRole("link"));
  });

  it("renders another element through as", () => {
    render(
      <Link as="button" type="button">
        Act
      </Link>,
    );
    expect(screen.getByRole("button")).toHaveClass("ol-link");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <p>
        Read the <Link href="#">docs</Link>, the{" "}
        <Link plain href="#">
          guide
        </Link>{" "}
        or{" "}
        <Link external href="https://example.com">
          the site
        </Link>
        .
      </p>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("is focusable with Tab and Enter fires click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: React.MouseEvent) => {
      e.preventDefault();
    });
    render(
      <Link href="#x" onClick={onClick}>
        Docs
      </Link>,
    );
    await user.tab();
    expect(screen.getByRole("link")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each(["es", "ja"] as const)("has no axe violations for external in %s", async (locale) => {
    const { container } = render(
      <Root locale={locale}>
        <Link external href="https://example.com">
          Site
        </Link>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("passes target and rel through a router-like component", () => {
    const Router = ({ to, children, ...props }: { to: string } & React.ComponentProps<"a">) => (
      <a href={to} {...props}>
        {children}
      </a>
    );
    render(
      <Link as={Router} to="/x" external rel="nofollow">
        Out
      </Link>,
    );
    const el = screen.getByRole("link");
    expect(el).toHaveAttribute("target", "_blank");
    expect(el).toHaveAttribute("rel", "noreferrer nofollow");
  });

  it("lets a caller target win and skips target and rel on non-anchor elements", () => {
    render(
      <>
        <Link external target="_self" href="#">
          A
        </Link>
        <Link as="button" external type="button">
          B
        </Link>
      </>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("target", "_self");
    const btn = screen.getByRole("button");
    expect(btn).not.toHaveAttribute("target");
    expect(btn).not.toHaveAttribute("rel");
  });
});
