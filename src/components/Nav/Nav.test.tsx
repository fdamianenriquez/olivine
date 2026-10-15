import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Nav, type NavItem } from "./Nav";

const links: NavItem[] = [
  { label: "Overview", href: "#a", active: true },
  { label: "Process", href: "#b" },
  { label: "Archive", href: "#c", disabled: true },
];
const buttons: NavItem[] = [
  { label: "All", key: "all", active: true },
  { label: "Identity", key: "id" },
  { label: "Locked", key: "lock", disabled: true },
];

describe("Nav", () => {
  it("renders a labelled nav landmark with a list, className and native props", () => {
    render(<Nav label="Sections" items={links} className="extra" data-x="1" />);
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav).toHaveClass("ol-nav", "ol-nav--line", "extra");
    expect(nav).toHaveAttribute("data-x", "1");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it.each(["line", "boxed", "vertical"] as const)("maps %s to its class", (variant) => {
    render(<Nav label="n" items={links} variant={variant} />);
    expect(screen.getByRole("navigation")).toHaveClass(`ol-nav--${variant}`);
  });

  it("marks the active link with aria-current page", () => {
    render(<Nav label="n" items={links} />);
    const active = screen.getByRole("link", { name: "Overview" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("ol-nav__link--active");
    expect(screen.getByRole("link", { name: "Process" })).not.toHaveAttribute("aria-current");
  });

  it("makes disabled links non-navigable", async () => {
    const onSelect = vi.fn();
    render(<Nav label="n" items={links} onSelect={onSelect} />);
    const el = screen.getByRole("link", { name: "Archive" });
    expect(el).toHaveAttribute("aria-disabled", "true");
    expect(el).not.toHaveAttribute("href");
    await userEvent.click(el);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders buttons for items without href and calls onSelect with the key", async () => {
    const onSelect = vi.fn();
    render(<Nav label="n" items={buttons} onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: "Identity" }));
    expect(onSelect).toHaveBeenCalledWith("id");
    expect(screen.getByRole("button", { name: "Locked" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Locked" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("falls back to the index when an item has no key", async () => {
    const onSelect = vi.fn();
    render(<Nav label="n" items={[{ label: "A" }, { label: "B" }]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("prefixes zero-padded indexes when indexed", () => {
    render(<Nav label="n" items={links} indexed />);
    const idx = document.querySelectorAll(".ol-nav__index");
    expect([...idx].map((n) => n.textContent)).toEqual(["01", "02", "03"]);
  });

  it("moves focus with Tab, skips disabled items and activates with Enter", async () => {
    const onSelect = vi.fn();
    render(<Nav label="n" items={buttons} onSelect={onSelect} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "All" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Identity" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("id");
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Identity" })).not.toHaveFocus();
  });

  it("forwards its ref to the nav element", () => {
    const ref = createRef<HTMLElement>();
    render(<Nav ref={ref} label="n" items={links} />);
    expect(ref.current).toBe(screen.getByRole("navigation"));
  });

  it.each(["line", "boxed", "vertical"] as const)("has no axe violations (%s)", async (variant) => {
    const { container } = render(<Nav label="n" items={links} variant={variant} indexed />);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations as a button switcher", async () => {
    const { container } = render(<Nav label="n" items={buttons} />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
