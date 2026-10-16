import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Pagination } from "./Pagination";

const calls = (fn: { mock: { calls: unknown[][] } }) => fn.mock.calls.map((c) => c[0]);
const cells = (nav: HTMLElement) => [...nav.querySelectorAll("li")].map((li) => li.textContent);

describe("Pagination", () => {
  it("renders a named nav with root class and native props", () => {
    render(<Pagination total={5} className="x" data-testid="p" />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toHaveClass("ol-page", "x");
    expect(nav).toHaveAttribute("data-testid", "p");
    expect(nav).not.toHaveClass("ol-page--s");
  });

  it("maps size s", () => {
    render(<Pagination total={5} size="s" />);
    expect(screen.getByRole("navigation")).toHaveClass("ol-page--s");
  });

  it.each([
    [12, 5, 1, ["←", "01", "…", "04", "05", "06", "…", "12", "→"]],
    [12, 1, 1, ["←", "01", "02", "…", "12", "→"]],
    [12, 12, 1, ["←", "01", "…", "11", "12", "→"]],
    [12, 6, 2, ["←", "01", "…", "04", "05", "06", "07", "08", "…", "12", "→"]],
    [3, 2, 1, ["←", "01", "02", "03", "→"]],
    [1, 1, 1, ["←", "01", "→"]],
  ])("truncates total=%i page=%i siblings=%i", (total, page, siblings, expected) => {
    render(<Pagination total={total} page={page} siblings={siblings} />);
    expect(cells(screen.getByRole("navigation"))).toEqual(expected);
  });

  it("marks the current page and names pages from the locale", () => {
    render(<Pagination total={5} defaultPage={2} />);
    const current = screen.getByRole("button", { name: "Page 2" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Page 3" })).not.toHaveAttribute("aria-current");
  });

  it("hides ellipsis cells from assistive tech and focus", () => {
    render(<Pagination total={12} defaultPage={6} />);
    const gaps = document.querySelectorAll(".ol-page__gap");
    expect(gaps).toHaveLength(2);
    for (const g of gaps) expect(g.closest("li")).toHaveAttribute("aria-hidden", "true");
  });

  it("changes page uncontrolled on click and via prev/next", async () => {
    const onChange = vi.fn();
    render(<Pagination total={5} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(calls(onChange)).toEqual([2, 3, 2]);
  });

  it("stays on the controlled page and reports the request", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Pagination total={5} page={2} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    rerender(<Pagination total={5} page={3} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
  });

  it("disables prev at the start and next at the end", () => {
    const { rerender } = render(<Pagination total={5} page={1} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Next page" })).not.toHaveAttribute("aria-disabled");
    rerender(<Pagination total={5} page={5} />);
    expect(screen.getByRole("button", { name: "Previous page" })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(screen.getByRole("button", { name: "Next page" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("keeps focus on Next after reaching the last page", async () => {
    const onChange = vi.fn();
    render(<Pagination total={3} defaultPage={2} onChange={onChange} />);
    const next = screen.getByRole("button", { name: "Next page" });
    await userEvent.click(next);
    expect(next).toHaveFocus();
    expect(next).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(next);
    expect(calls(onChange)).toEqual([3]);
  });

  it("changes page from the keyboard", async () => {
    const onChange = vi.fn();
    render(<Pagination total={5} onChange={onChange} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Previous page" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveFocus();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await userEvent.tab();
    await userEvent.keyboard(" ");
    expect(calls(onChange)).toEqual([2, 3]);
  });

  it("clamps an out-of-range page", () => {
    render(<Pagination total={3} page={9} />);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["es", "Paginación", "Página anterior", "Página 1"],
    ["ja", "ページ送り", "前のページ", "1ページ"],
  ] as const)("localises names in %s", (locale, nav, prev, page) => {
    render(
      <Root locale={locale}>
        <Pagination total={3} />
      </Root>,
    );
    expect(screen.getByRole("navigation", { name: nav })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: prev })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: page })).toBeInTheDocument();
  });

  it("lets aria-label override the locale name", () => {
    render(<Pagination total={3} aria-label="Results" />);
    expect(screen.getByRole("navigation", { name: "Results" })).toBeInTheDocument();
  });

  it("forwards the ref to the nav", () => {
    const ref = createRef<HTMLElement>();
    render(<Pagination total={3} ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("navigation"));
  });

  it("has no axe violations", async () => {
    const { container } = render(<Pagination total={12} defaultPage={6} />);
    expect(await runAxe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole("button", { name: "Page 7" }));
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it.each([
    ["en", 1],
    ["en", 12],
    ["es", 6],
    ["ja", 6],
  ] as const)("has no axe violations in %s at page %i", async (locale, page) => {
    const { container } = render(
      <Root locale={locale}>
        <Pagination total={12} page={page} />
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  describe("with getHref", () => {
    const getHref = (p: number) => `/items?page=${String(p)}`;

    it("renders links with hrefs, names and padded figures", () => {
      render(<Pagination total={5} page={3} getHref={getHref} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      const link = screen.getByRole("link", { name: "Page 4" });
      expect(link).toHaveAttribute("href", "/items?page=4");
      expect(link).toHaveClass("ol-page__item");
      expect(link).toHaveTextContent("04");
      expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
        "href",
        "/items?page=4",
      );
      expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute(
        "href",
        "/items?page=2",
      );
    });

    it("marks the current page", () => {
      render(<Pagination total={5} page={3} getHref={getHref} />);
      expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Page 2" })).not.toHaveAttribute("aria-current");
    });

    it("makes prev and next non-navigable at the ends", async () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <Pagination total={5} page={1} getHref={getHref} onChange={onChange} />,
      );
      const prev = screen.getByRole("link", { name: "Previous page" });
      expect(prev).not.toHaveAttribute("href");
      expect(prev).toHaveAttribute("aria-disabled", "true");
      expect(prev).not.toHaveAttribute("tabindex");
      await userEvent.click(prev);
      expect(onChange).not.toHaveBeenCalled();
      rerender(<Pagination total={5} page={5} getHref={getHref} onChange={onChange} />);
      const next = screen.getByRole("link", { name: "Next page" });
      expect(next).not.toHaveAttribute("href");
      expect(next).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute("href");
    });

    it("still calls onChange and does not prevent navigation by itself", () => {
      const onChange = vi.fn();
      render(<Pagination total={5} page={3} getHref={getHref} onChange={onChange} />);
      const link = screen.getByRole("link", { name: "Page 4" });
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.addEventListener("click", (e) => {
        e.preventDefault(); // keep jsdom from navigating
      });
      link.dispatchEvent(event);
      expect(onChange).toHaveBeenCalledWith(4);
    });

    it("has no axe violations", async () => {
      const { container } = render(<Pagination total={12} page={1} getHref={getHref} />);
      expect(await runAxe(container)).toHaveNoViolations();
      const { container: c2 } = render(<Pagination total={12} page={6} getHref={getHref} />);
      expect(await runAxe(c2)).toHaveNoViolations();
    });
  });
});

describe("Pagination with getHref and modified clicks", () => {
  it("does not change the page when a link is opened in a new tab", async () => {
    const onChange = vi.fn();
    render(<Pagination total={5} getHref={(p) => `/page/${String(p)}`} onChange={onChange} />);
    const link = screen.getByRole("link", { name: "Page 2" });
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.setup().click(link);
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
