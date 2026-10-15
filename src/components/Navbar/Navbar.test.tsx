import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Navbar } from "./Navbar";

const links = [
  { label: "Works", href: "/works", active: true },
  { label: "Studio", href: "/studio" },
];

const toggle = () =>
  screen.getByRole("button", { name: /^(menu|close|menú|cerrar|メニュー|閉じる)$/i });

describe("Navbar", () => {
  it("renders brand, links and the end cell", () => {
    render(
      <Navbar brand="Olivine" links={links} end={<span>End</span>} className="x" data-testid="n" />,
    );
    const root = screen.getByTestId("n");
    expect(root.tagName).toBe("HEADER");
    expect(root).toHaveClass("ol-navbar", "x");
    expect(screen.getByRole("link", { name: "Olivine" })).toHaveAttribute("href", "#");
    expect(screen.getByRole("navigation", { name: "Olivine" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("End")).toBeInTheDocument();
  });

  it("marks only the active link as the current page", () => {
    render(<Navbar brand="Olivine" links={links} />);
    expect(screen.getByRole("link", { name: "Works" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Studio" })).not.toHaveAttribute("aria-current");
  });

  it("names the landmark from the label prop", () => {
    render(<Navbar brand={<b>Olivine</b>} label="Main" links={links} />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("hides the kanji from assistive technology", () => {
    render(<Navbar brand="Olivine" kanji="橄" />);
    const k = screen.getByText("橄");
    expect(k).toHaveAttribute("aria-hidden", "true");
    expect(k).toHaveAttribute("lang", "ja");
    expect(screen.getByRole("link", { name: "Olivine" })).toBeInTheDocument();
  });

  it("applies the sticky modifier", () => {
    render(<Navbar brand="Olivine" sticky data-testid="n" />);
    expect(screen.getByTestId("n")).toHaveClass("ol-navbar--sticky");
  });

  it("wires the toggle with aria-expanded and aria-controls", async () => {
    const user = userEvent.setup();
    render(<Navbar brand="Olivine" links={links} data-testid="n" />);
    const nav = screen.getByRole("navigation");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveAttribute("aria-controls", nav.id);
    expect(toggle()).toHaveTextContent("Menu");
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(toggle()).toHaveTextContent("Close");
    expect(screen.getByTestId("n")).toHaveClass("ol-navbar--open");
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    const user = userEvent.setup();
    render(<Navbar brand="Olivine" links={links} />);
    await user.click(toggle());
    screen.getByRole("link", { name: "Studio" }).focus();
    await user.keyboard("{Escape}");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("closes when a link is chosen", async () => {
    const user = userEvent.setup();
    render(<Navbar brand="Olivine" links={links} />);
    await user.click(toggle());
    await user.click(screen.getByRole("link", { name: "Studio" }));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it.each([
    ["es", "Menú", "Cerrar"],
    ["ja", "メニュー", "閉じる"],
  ] as const)("translates the toggle in %s", async (locale, menu, close) => {
    const user = userEvent.setup();
    render(
      <Root locale={locale}>
        <Navbar brand="Olivine" links={links} />
      </Root>,
    );
    expect(toggle()).toHaveTextContent(menu);
    await user.click(toggle());
    expect(toggle()).toHaveTextContent(close);
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLElement>();
    render(<Navbar ref={ref} brand="Olivine" />);
    expect(ref.current).toBe(screen.getByRole("banner"));
  });

  it("has no axe violations closed or open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Navbar
        brand="Olivine"
        kanji="橄"
        links={links}
        end={<button type="button">Contact</button>}
      />,
    );
    expect(await runAxe(container)).toHaveNoViolations();
    await user.click(toggle());
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
