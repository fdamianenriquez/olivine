import { readFileSync } from "node:fs";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleContext } from "../../locale";
import { en } from "../../locale/en";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { NavigationRail, type NavigationRailItem } from "./NavigationRail";

const items: NavigationRailItem[] = [
  { key: "home", label: "Workshop", mark: "工", href: "#home" },
  { key: "orders", label: "Orders", mark: "注", badge: 3 },
  { key: "stock", label: "Stock", mark: "庫" },
  { key: "notes", label: "Notes", mark: "§" },
];

const labels = { expand: "Expand navigation", collapse: "Collapse navigation" };
const rail = (props: Partial<React.ComponentProps<typeof NavigationRail>> = {}) => (
  <NavigationRail items={items} label="Main" labels={labels} {...props} />
);

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("NavigationRail", () => {
  describe("structure", () => {
    it("renders a labelled nav landmark with one list item per destination", () => {
      render(
        <NavigationRail items={items} label="Main" labels={labels} className="extra" data-x="1" />,
      );
      const nav = screen.getByRole("navigation", { name: "Main" });
      expect(nav).toHaveClass("ol-rail", "extra");
      expect(nav).toHaveAttribute("data-x", "1");
      expect(nav).toHaveAttribute("data-state", "collapsed");
      expect(within(nav).getAllByRole("listitem")).toHaveLength(items.length);
    });

    it("renders links for items with an href and buttons for the rest", () => {
      render(rail());
      expect(screen.getByRole("link", { name: "Workshop" })).toHaveAttribute("href", "#home");
      expect(screen.getByRole("button", { name: /^Orders\s*,\s*3$/ })).toHaveAttribute(
        "type",
        "button",
      );
    });

    it("forwards its ref to the nav element", () => {
      const ref = createRef<HTMLElement>();
      render(rail({ ref }));
      expect(ref.current).toBe(screen.getByRole("navigation"));
    });

    it("hides the mark from assistive tech and tags kanji as Japanese", () => {
      render(rail());
      const marks = document.querySelectorAll(".ol-rail__mark");
      expect([...marks].every((m) => m.getAttribute("aria-hidden") === "true")).toBe(true);
      expect(marks[0]).toHaveAttribute("lang", "ja");
      expect(marks[3]).not.toHaveAttribute("lang");
    });

    it("renders children in the foot", () => {
      render(rail({ children: <span>Foot</span> }));
      expect(screen.getByText("Foot").parentElement).toHaveClass("ol-rail__foot");
    });
  });

  describe("current destination", () => {
    it("marks only the active key with aria-current page", () => {
      render(rail({ active: "orders" }));
      expect(screen.getByRole("button", { name: /^Orders\s*,\s*3$/ })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByRole("link", { name: "Workshop" })).not.toHaveAttribute("aria-current");
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
    });

    it("marks an active link with aria-current page", () => {
      render(rail({ active: "home" }));
      expect(screen.getByRole("link", { name: "Workshop" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("badge", () => {
    it("reads the count after the label through a hidden separator", () => {
      render(rail());
      const badge = document.querySelector(".ol-rail__badge");
      expect(badge).toHaveClass("ol-badge--accent");
      expect(badge?.textContent).toBe(", 3");
      expect(badge?.querySelector(".ol-sr")?.textContent).toBe(", ");
    });

    it("keeps a zero count", () => {
      render(rail({ items: [{ key: "a", label: "Inbox", mark: "受", badge: 0 }] }));
      expect(screen.getByRole("button", { name: /^Inbox\s*,\s*0$/ })).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onSelect with the key and the event", async () => {
      const onSelect = vi.fn();
      render(rail({ onSelect }));
      await userEvent.click(screen.getByRole("button", { name: "Stock" }));
      expect(onSelect).toHaveBeenCalledWith("stock", expect.objectContaining({ type: "click" }));
    });

    it("lets onSelect cancel a link's navigation", () => {
      const onSelect = vi.fn((_key: string, event: React.MouseEvent) => {
        event.preventDefault();
      });
      render(rail({ onSelect }));
      const link = screen.getByRole("link", { name: "Workshop" });
      const notPrevented = link.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      expect(onSelect).toHaveBeenCalledWith("home", expect.anything());
      expect(notPrevented).toBe(false);
    });

    it("works as a controlled switcher", async () => {
      function Harness() {
        const [current, setCurrent] = useState("home");
        return rail({ active: current, onSelect: setCurrent });
      }
      render(<Harness />);
      await userEvent.click(screen.getByRole("button", { name: "Stock" }));
      expect(screen.getByRole("button", { name: "Stock" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Workshop" })).not.toHaveAttribute("aria-current");
    });
  });

  describe("toggle", () => {
    it("starts collapsed, with aria-expanded false and the expand name", () => {
      render(rail());
      const toggle = screen.getByRole("button", { name: "Expand navigation" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveAttribute("aria-controls", screen.getByRole("list").id);
      expect(screen.getByRole("navigation")).not.toHaveClass("ol-rail--expanded");
    });

    it("expands and collapses uncontrolled, renaming the toggle", async () => {
      const onExpandedChange = vi.fn();
      render(rail({ onExpandedChange }));
      await userEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("ol-rail--expanded");
      expect(nav).toHaveAttribute("data-state", "expanded");
      const toggle = screen.getByRole("button", { name: "Collapse navigation" });
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(toggle).toHaveFocus();
      await userEvent.click(toggle);
      expect(onExpandedChange.mock.calls).toEqual([[true], [false]]);
      expect(nav).not.toHaveClass("ol-rail--expanded");
    });

    it("honours defaultExpanded", () => {
      render(rail({ defaultExpanded: true }));
      expect(screen.getByRole("navigation")).toHaveClass("ol-rail--expanded");
      expect(screen.getByRole("button", { name: "Collapse navigation" })).toBeInTheDocument();
    });

    it("stays put when controlled until the parent changes it", async () => {
      const onExpandedChange = vi.fn();
      const { rerender } = render(rail({ expanded: false, onExpandedChange }));
      await userEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
      expect(onExpandedChange).toHaveBeenCalledWith(true);
      expect(screen.getByRole("navigation")).not.toHaveClass("ol-rail--expanded");
      rerender(rail({ expanded: true, onExpandedChange }));
      expect(screen.getByRole("navigation")).toHaveClass("ol-rail--expanded");
    });

    it("keeps every destination in the DOM in both states", async () => {
      render(rail());
      expect(screen.getAllByRole("listitem")).toHaveLength(4);
      await userEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
      expect(screen.getAllByRole("listitem")).toHaveLength(4);
      expect(screen.getByRole("link", { name: "Workshop" })).toBeInTheDocument();
    });
  });

  describe("action", () => {
    it("is named by aria-label when collapsed and by its visible label when expanded", async () => {
      const onClick = vi.fn();
      render(rail({ action: { label: "New order", glyph: "+", onClick } }));
      const collapsed = screen.getByRole("button", { name: "New order" });
      expect(collapsed).toHaveAttribute("aria-label", "New order");
      expect(collapsed.querySelector(".ol-rail__action-label")).toBeNull();
      await userEvent.click(collapsed);
      expect(onClick).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
      const expanded = screen.getByRole("button", { name: "New order" });
      expect(expanded).not.toHaveAttribute("aria-label");
      expect(expanded.querySelector(".ol-rail__action-label")).toHaveTextContent("New order");
    });

    it("defaults its glyph to a plus and hides it from assistive tech", () => {
      render(rail({ action: { label: "New order" } }));
      const glyph = document.querySelector(".ol-rail__action-glyph");
      expect(glyph).toHaveTextContent("+");
      expect(glyph).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("keyboard", () => {
    it("tabs through toggle, action and destinations in order", async () => {
      render(rail({ action: { label: "New order" } }));
      await userEvent.tab();
      expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole("button", { name: "New order" })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole("link", { name: "Workshop" })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole("button", { name: /^Orders\s*,\s*3$/ })).toHaveFocus();
    });

    it("activates a destination button with Enter and Space", async () => {
      const onSelect = vi.fn();
      render(rail({ onSelect }));
      screen.getByRole("button", { name: "Stock" }).focus();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it("toggles with Enter and Space and keeps focus on the toggle", async () => {
      render(rail());
      await userEvent.tab();
      await userEvent.keyboard("{Enter}");
      expect(screen.getByRole("navigation")).toHaveClass("ol-rail--expanded");
      await userEvent.keyboard(" ");
      expect(screen.getByRole("navigation")).not.toHaveClass("ol-rail--expanded");
      expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveFocus();
    });

    it("activates a link with Enter", async () => {
      const onSelect = vi.fn();
      render(rail({ onSelect }));
      screen.getByRole("link", { name: "Workshop" }).focus();
      await userEvent.keyboard("{Enter}");
      expect(onSelect).toHaveBeenCalledWith("home", expect.anything());
    });
  });

  describe("locale", () => {
    it("reads the landmark and toggle names from the dictionary", async () => {
      const dictionary = {
        ...en,
        railLabel: "Principal",
        railExpand: "Abrir navegación",
        railCollapse: "Cerrar navegación",
      };
      render(
        <LocaleContext.Provider value={dictionary}>
          <NavigationRail items={items} />
        </LocaleContext.Provider>,
      );
      expect(screen.getByRole("navigation", { name: "Principal" })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Abrir navegación" }));
      expect(screen.getByRole("button", { name: "Cerrar navegación" })).toBeInTheDocument();
    });

    it.each([
      ["es", "Principal", "Expandir navegación"],
      ["ja", "メイン", "ナビゲーションを開く"],
    ])("speaks %s under Root", (locale, landmark, toggle) => {
      render(
        <Root locale={locale}>
          <NavigationRail items={items} />
        </Root>,
      );
      expect(screen.getByRole("navigation", { name: landmark })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: toggle })).toBeInTheDocument();
    });

    it("lets the labels prop override the dictionary", () => {
      render(rail({ labels: { expand: "Open" } }));
      expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    });
  });

  describe("focus on ink", () => {
    const css = readFileSync("src/components/NavigationRail/NavigationRail.css", "utf8");

    it("draws an on-ink band under the ring of a hovered, focused item", () => {
      expect(css).toMatch(
        /\.ol-rail__item:hover:focus-visible \{[^}]*box-shadow: inset 0 0 0 var\(--stroke-bold\) var\(--on-ink\)/,
      );
    });

    it("marks the current item without an outline in forced colours", () => {
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).not.toMatch(/aria-current="page"\] \{[^}]*outline/);
    });
  });

  describe("motion", () => {
    const css = readFileSync("src/components/NavigationRail/NavigationRail.css", "utf8");
    const motionCore = readFileSync("src/styles/motion.css", "utf8");

    it("wipes the label in with motion tokens only", () => {
      const rule = /\.ol-rail--expanded \.ol-rail__label \{[^}]*\}/.exec(css)?.[0] ?? "";
      expect(rule).toMatch(/animation: ol-rail-label var\(--dur-m\) var\(--ease-move\) both/);
      const timings = css.match(/(animation|transition)[^;]*;/g) ?? [];
      for (const line of timings) expect(line).not.toMatch(/\d(ms|s)\b/);
      expect(css).not.toMatch(/cubic-bezier|steps\(|!important/);
    });

    it("animates only clip-path, transform and colours", () => {
      const keyframes = /@keyframes ol-rail-label \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
      expect(keyframes).toMatch(/clip-path/);
      expect(keyframes).not.toMatch(/width|height|margin|padding/);
    });

    it("collapses the durations to 1ms for reduced motion, app-wide and per subtree", () => {
      expect(motionCore).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{[^}]*--dur-m: 1ms/,
      );
      expect(motionCore).toMatch(/\.ol-reduce-motion \{[^}]*--dur-m: 1ms/);
    });

    it("still toggles and keeps all labels when reduced motion is requested", async () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });
      render(<div className="ol-reduce-motion">{rail()}</div>);
      await userEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
      expect(screen.getByRole("navigation")).toHaveClass("ol-rail--expanded");
      expect(document.querySelectorAll(".ol-rail__label")).toHaveLength(4);
    });
  });

  describe("accessibility", () => {
    it.each([false, true])("has no axe violations (expanded: %s)", async (expanded) => {
      const { container } = render(
        rail({
          expanded,
          active: "orders",
          action: { label: "New order" },
          children: <span>Foot</span>,
        }),
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
