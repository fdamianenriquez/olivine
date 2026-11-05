import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, createRef, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleContext } from "../../locale";
import { en } from "../../locale/en";
import { runAxe } from "../../test/axe";
import { Fab } from "../Fab";
import { Root } from "../Root";
import { BottomNav, type BottomNavItem } from "./BottomNav";

const items: BottomNavItem[] = [
  { key: "home", label: "Home", mark: "家", href: "#home" },
  { key: "orders", label: "Orders", mark: "注", badge: 3 },
  { key: "stock", label: "Stock", mark: "庫" },
  { key: "notes", label: "Notes", mark: "§" },
];

const bar = (props: Partial<ComponentProps<typeof BottomNav>> = {}) => (
  <BottomNav items={items} label="Main" {...props} />
);

const setScrollY = (value: number) => {
  Object.defineProperty(window, "scrollY", { value, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
};

const mockReducedMotion = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes("reduce") ? matches : false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
};

const nav = () => screen.getByRole("navigation");

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  setScrollY(0);
  document.documentElement.style.removeProperty("--ol-dock");
  vi.restoreAllMocks();
});

describe("BottomNav", () => {
  describe("structure", () => {
    it("renders a labelled nav landmark with one list item per destination", () => {
      render(<BottomNav items={items} label="Main" className="extra" data-x="1" />);
      expect(nav()).toHaveAccessibleName("Main");
      expect(nav()).toHaveClass("ol-bottomnav", "extra");
      expect(nav()).toHaveAttribute("data-x", "1");
      expect(nav()).toHaveAttribute("data-state", "visible");
      expect(within(nav()).getAllByRole("listitem")).toHaveLength(items.length);
    });

    it.each([3, 4, 5])("renders %i destinations without a warning", (count) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const many = Array.from({ length: count }, (_, i) => ({
        key: `k${String(i)}`,
        label: `Item ${String(i)}`,
        mark: "§",
      }));
      render(bar({ items: many }));
      expect(screen.getAllByRole("listitem")).toHaveLength(count);
      expect(warn).not.toHaveBeenCalled();
    });

    it("renders only five of six destinations and warns", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const six = Array.from({ length: 6 }, (_, i) => ({
        key: `k${String(i)}`,
        label: `Item ${String(i)}`,
        mark: "§",
      }));
      render(bar({ items: six }));
      expect(screen.getAllByRole("listitem")).toHaveLength(5);
      expect(screen.queryByText("Item 5")).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("first 5"));
    });

    it("warns with fewer than three destinations but still renders them", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(bar({ items: items.slice(0, 2) }));
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("at least 3"));
    });

    it("renders links for items with an href and buttons for the rest", () => {
      render(bar());
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "#home");
      expect(screen.getByRole("button", { name: "Orders, 3" })).toHaveAttribute("type", "button");
    });

    it("forwards its ref to the nav element", () => {
      const ref = createRef<HTMLElement>();
      render(bar({ ref }));
      expect(ref.current).toBe(nav());
    });

    it("hides the mark from assistive tech and tags kanji as Japanese", () => {
      render(bar());
      const marks = document.querySelectorAll(".ol-bottomnav__mark");
      expect([...marks].every((m) => m.getAttribute("aria-hidden") === "true")).toBe(true);
      expect(marks[0]).toHaveAttribute("lang", "ja");
      expect(marks[3]).not.toHaveAttribute("lang");
    });

    it("is not a tablist and does not move focus on mount", () => {
      render(bar({ active: "home" }));
      expect(screen.queryByRole("tablist")).toBeNull();
      expect(screen.queryByRole("tab")).toBeNull();
      expect(document.body).toHaveFocus();
    });

    it("styles each list item as a cell", () => {
      render(bar());
      for (const li of within(nav()).getAllByRole("listitem")) {
        expect(li).toHaveClass("ol-bottomnav__cell");
      }
    });

    it("is not portalled: it stays where it was rendered", () => {
      render(
        <div data-testid="host">
          {bar()}
          <p>After</p>
        </div>,
      );
      expect(screen.getByTestId("host")).toContainElement(nav());
    });

    it("adds the contained modifier", () => {
      render(bar({ contained: true }));
      expect(nav()).toHaveClass("ol-bottomnav--contained");
    });
  });

  describe("current destination", () => {
    it("marks only the active key with aria-current page, on buttons", () => {
      render(bar({ active: "orders" }));
      expect(screen.getByRole("button", { name: "Orders, 3" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
    });

    it("marks an active link with aria-current page", () => {
      render(bar({ active: "home" }));
      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    });

    it("marks nothing without an active key", () => {
      render(bar());
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(0);
    });
  });

  describe("badge", () => {
    it("reads the count after the label through a hidden separator", () => {
      render(bar());
      const badge = document.querySelector(".ol-bottomnav__badge");
      expect(badge).toHaveClass("ol-badge--accent");
      expect(badge?.textContent).toBe("3");
      expect(screen.getByRole("button", { name: "Orders, 3" })).toBeInTheDocument();
      const separator = document.querySelector(".ol-bottomnav__label .ol-sr");
      expect(separator?.textContent).toBe(",");
    });

    it("adds no separator to an item without a count", () => {
      render(bar());
      expect(screen.getByRole("button", { name: "Stock" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
      expect(document.querySelectorAll(".ol-bottomnav__label .ol-sr")).toHaveLength(1);
    });

    it("keeps a zero count", () => {
      render(bar({ items: [{ key: "a", label: "Inbox", mark: "受", badge: 0 }] }));
      expect(screen.getByRole("button", { name: "Inbox, 0" })).toBeInTheDocument();
    });

    it.each(["7", "42", "999", "99+"])("renders a %s count and reads it in the name", (badge) => {
      render(bar({ items: [{ key: "a", label: "Inbox", mark: "受", badge }, ...items.slice(1)] }));
      expect(screen.getByRole("button", { name: `Inbox, ${badge}` })).toBeInTheDocument();
      expect(document.querySelector(".ol-bottomnav__badge")).toHaveTextContent(badge);
    });
  });

  describe("selection", () => {
    it("calls onSelect with the key and the event", async () => {
      const onSelect = vi.fn();
      render(bar({ onSelect }));
      await userEvent.click(screen.getByRole("button", { name: "Stock" }));
      expect(onSelect).toHaveBeenCalledWith("stock", expect.objectContaining({ type: "click" }));
    });

    it("lets onSelect cancel a link's navigation", () => {
      const onSelect = vi.fn((_key: string, event: React.MouseEvent) => {
        event.preventDefault();
      });
      render(bar({ onSelect }));
      const link = screen.getByRole("link", { name: "Home" });
      const notPrevented = link.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      expect(onSelect).toHaveBeenCalledWith("home", expect.anything());
      expect(notPrevented).toBe(false);
    });

    it("works as a controlled switcher", async () => {
      function Harness() {
        const [current, setCurrent] = useState("home");
        return bar({ active: current, onSelect: setCurrent });
      }
      render(<Harness />);
      await userEvent.click(screen.getByRole("button", { name: "Stock" }));
      expect(screen.getByRole("button", { name: "Stock" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    });
  });

  describe("keyboard", () => {
    it("tabs through the destinations in DOM order, without arrow roving", async () => {
      render(bar());
      await userEvent.tab();
      expect(screen.getByRole("link", { name: "Home" })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole("button", { name: "Orders, 3" })).toHaveFocus();
      await userEvent.keyboard("{ArrowRight}");
      expect(screen.getByRole("button", { name: "Orders, 3" })).toHaveFocus();
      await userEvent.tab({ shift: true });
      expect(screen.getByRole("link", { name: "Home" })).toHaveFocus();
    });

    it("activates a destination button with Enter and Space", async () => {
      const onSelect = vi.fn();
      render(bar({ onSelect }));
      screen.getByRole("button", { name: "Stock" }).focus();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it("activates a link with Enter", async () => {
      const onSelect = vi.fn();
      render(bar({ onSelect }));
      screen.getByRole("link", { name: "Home" }).focus();
      await userEvent.keyboard("{Enter}");
      expect(onSelect).toHaveBeenCalledWith("home", expect.anything());
    });
  });

  describe("locale", () => {
    it("names the landmark from the dictionary by default", () => {
      render(<BottomNav items={items} />);
      expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    });

    it("reads the landmark name from a custom dictionary", () => {
      const dictionary = { ...en, bottomNavLabel: "Principal" };
      render(
        <LocaleContext.Provider value={dictionary}>
          <BottomNav items={items} />
        </LocaleContext.Provider>,
      );
      expect(screen.getByRole("navigation", { name: "Principal" })).toBeInTheDocument();
    });

    it.each([
      ["en", "Main"],
      ["es", "Principal"],
      ["ja", "メイン"],
    ])("speaks %s under Root", (locale, landmark) => {
      render(
        <Root locale={locale}>
          <BottomNav items={items} />
        </Root>,
      );
      expect(screen.getByRole("navigation", { name: landmark })).toBeInTheDocument();
    });

    it("lets the label prop override the dictionary", () => {
      render(
        <Root locale="es">
          <BottomNav items={items} label="Taller" />
        </Root>,
      );
      expect(screen.getByRole("navigation", { name: "Taller" })).toBeInTheDocument();
    });
  });

  describe("hide on scroll", () => {
    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(64);
    });

    it("stays visible when the feature is off", () => {
      render(bar());
      setScrollY(400);
      expect(nav()).toHaveAttribute("data-state", "visible");
    });

    it("hides on scroll down past its own height and shows on scroll up", () => {
      render(bar({ hideOnScroll: true }));
      setScrollY(200);
      expect(nav()).toHaveAttribute("data-state", "hidden");
      expect(nav()).toHaveClass("ol-bottomnav--hidden");
      setScrollY(150);
      expect(nav()).toHaveAttribute("data-state", "visible");
      setScrollY(300);
      expect(nav()).toHaveAttribute("data-state", "hidden");
    });

    it("does not hide while still within the bar's height of the top", () => {
      render(bar({ hideOnScroll: true }));
      setScrollY(40);
      expect(nav()).toHaveAttribute("data-state", "visible");
    });

    it("shows again at the top", () => {
      render(bar({ hideOnScroll: true }));
      setScrollY(200);
      setScrollY(0);
      expect(nav()).toHaveAttribute("data-state", "visible");
    });

    it("shows when focus enters it and hides again when focus leaves", () => {
      render(
        <>
          {bar({ hideOnScroll: true })}
          <button type="button">Outside</button>
        </>,
      );
      setScrollY(200);
      expect(nav()).toHaveAttribute("data-state", "hidden");
      act(() => {
        screen.getByRole("link", { name: "Home" }).focus();
      });
      expect(nav()).toHaveAttribute("data-state", "visible");
      act(() => {
        screen.getByRole("button", { name: "Outside" }).focus();
      });
      expect(nav()).toHaveAttribute("data-state", "hidden");
    });

    it("keeps its items in the tab order and the accessibility tree while hidden", () => {
      render(bar({ hideOnScroll: true }));
      setScrollY(200);
      expect(nav()).toHaveAttribute("data-state", "hidden");
      expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("tabindex", "-1");
      expect(nav()).not.toHaveAttribute("hidden");
      expect(nav()).not.toHaveAttribute("aria-hidden");
      expect(nav()).not.toHaveAttribute("inert");
    });

    it("never hides under reduced motion", () => {
      mockReducedMotion(true);
      render(bar({ hideOnScroll: true }));
      setScrollY(400);
      expect(nav()).toHaveAttribute("data-state", "visible");
    });

    it("never hides inside .ol-reduce-motion", () => {
      render(<div className="ol-reduce-motion">{bar({ hideOnScroll: true })}</div>);
      setScrollY(400);
      expect(nav()).toHaveAttribute("data-state", "visible");
    });

    it("watches the scrollTarget instead of the window", () => {
      function Page() {
        const ref = useRef<HTMLDivElement>(null);
        return (
          <div ref={ref} data-testid="scroller">
            {bar({ hideOnScroll: true, scrollTarget: ref })}
          </div>
        );
      }
      render(<Page />);
      setScrollY(400);
      expect(nav()).toHaveAttribute("data-state", "visible");
      const scroller = screen.getByTestId("scroller");
      scroller.scrollTop = 200;
      fireEvent.scroll(scroller);
      expect(nav()).toHaveAttribute("data-state", "hidden");
      scroller.scrollTop = 100;
      fireEvent.scroll(scroller);
      expect(nav()).toHaveAttribute("data-state", "visible");
    });
  });

  describe("--ol-dock", () => {
    let resize: (() => void) | undefined;
    let disconnect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(72);
      disconnect = vi.fn();
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(callback: () => void) {
            resize = callback;
          }
          observe = vi.fn();
          disconnect = disconnect;
        },
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      resize = undefined;
    });

    it("publishes the rendered height on the nearest .ol element and the document root", () => {
      render(<Root>{bar()}</Root>);
      const root = document.querySelector<HTMLElement>(".ol");
      expect(root?.style.getPropertyValue("--ol-dock")).toBe("72px");
      expect(document.documentElement.style.getPropertyValue("--ol-dock")).toBe("72px");
    });

    it("publishes only on the nearest .ol element when contained", () => {
      render(<Root>{bar({ contained: true })}</Root>);
      expect(document.querySelector<HTMLElement>(".ol")?.style.getPropertyValue("--ol-dock")).toBe(
        "72px",
      );
      expect(document.documentElement.style.getPropertyValue("--ol-dock")).toBe("");
    });

    it("follows the bar when it resizes", () => {
      render(<Root>{bar()}</Root>);
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(96);
      act(() => {
        resize?.();
      });
      expect(document.querySelector<HTMLElement>(".ol")?.style.getPropertyValue("--ol-dock")).toBe(
        "96px",
      );
    });

    it("is 0px while the bar is hidden by scroll and returns when it shows", () => {
      render(<Root>{bar({ hideOnScroll: true })}</Root>);
      const root = document.querySelector<HTMLElement>(".ol");
      setScrollY(300);
      expect(root?.style.getPropertyValue("--ol-dock")).toBe("0px");
      setScrollY(100);
      expect(root?.style.getPropertyValue("--ol-dock")).toBe("72px");
    });

    it("is cleared on unmount", () => {
      const { unmount } = render(<Root>{bar()}</Root>);
      const root = document.querySelector<HTMLElement>(".ol");
      unmount();
      expect(root?.style.getPropertyValue("--ol-dock")).toBe("");
      expect(document.documentElement.style.getPropertyValue("--ol-dock")).toBe("");
      expect(disconnect).toHaveBeenCalled();
    });

    it("keeps the value of a bar that stays when another one unmounts", () => {
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.getAttribute("aria-label") === "One" ? 80 : 72;
      });
      function Two({ both }: { both: boolean }) {
        return (
          <Root>
            <BottomNav items={items} label="One" />
            {both && <BottomNav items={items} label="Two" />}
          </Root>
        );
      }
      const { rerender } = render(<Two both={false} />);
      rerender(<Two both />);
      const root = document.querySelector<HTMLElement>(".ol");
      expect(root?.style.getPropertyValue("--ol-dock")).toBe("72px");
      rerender(<Two both={false} />);
      expect(root?.style.getPropertyValue("--ol-dock")).toBe("80px");
      expect(document.documentElement.style.getPropertyValue("--ol-dock")).toBe("80px");
    });

    it("is read by a Fab, which rides above the bar", () => {
      const css = readFileSync("src/components/Fab/Fab.css", "utf8");
      expect(css).toMatch(/translate: 0 calc\(-1 \* max\(var\(--ol-dock, 0px\)/);
      render(
        <Root>
          {bar()}
          <Fab aria-label="Add" />
        </Root>,
      );
      // The Fab renders in a portal in the body: the property it reads is on the document root.
      expect(screen.getByRole("button", { name: "Add" }).closest(".ol-portal")).not.toBeNull();
      expect(document.documentElement.style.getPropertyValue("--ol-dock")).toBe("72px");
    });
  });

  describe("accessibility", () => {
    it.each(["washi", "sumi"] as const)("has no axe violations (%s)", async (theme) => {
      render(
        <Root theme={theme}>
          <main>
            <h1>Orders</h1>
            {bar({ active: "orders" })}
          </main>
        </Root>,
      );
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("has no axe violations with a focused item and an active link", async () => {
      render(
        <Root>
          <main>
            <h1>Home</h1>
            {bar({ active: "home" })}
          </main>
        </Root>,
      );
      await userEvent.tab();
      expect(screen.getByRole("link", { name: "Home" })).toHaveFocus();
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("has no axe violations with three-digit counts", async () => {
      render(
        <Root>
          <main>
            <h1>Inbox</h1>
            {bar({ items: items.map((item) => ({ ...item, badge: "999" })), active: "orders" })}
          </main>
        </Root>,
      );
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("has no axe violations with the bar hidden by scroll", async () => {
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(64);
      render(
        <Root>
          <main>
            <h1>Orders</h1>
            {bar({ hideOnScroll: true })}
          </main>
        </Root>,
      );
      setScrollY(300);
      expect(nav()).toHaveAttribute("data-state", "hidden");
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("has no axe violations with a Japanese bar", async () => {
      render(
        <Root locale="ja" lang="ja">
          <main>
            <h1>注文</h1>
            <BottomNav
              active="orders"
              items={[
                { key: "home", label: "ホーム", mark: "家", href: "#home" },
                { key: "orders", label: "注文", mark: "注", badge: 3 },
                { key: "stock", label: "在庫", mark: "庫" },
              ]}
            />
          </main>
        </Root>,
      );
      expect(await runAxe(document.body)).toHaveNoViolations();
    });
  });

  describe("css", () => {
    const css = readFileSync("src/components/BottomNav/BottomNav.css", "utf8");

    it("inverts on hover only where a pointer can hover", () => {
      const hover = /@media \(hover: hover\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
      expect(hover).toMatch(/\.ol-bottomnav__item:hover \{[^}]*background: var\(--ink\)/);
      const outside = css.replace(hover, "").split("@media (forced-colors")[0] ?? "";
      expect(outside).not.toMatch(/:hover/);
    });

    it("inverts on press for touch", () => {
      expect(css).toMatch(
        /\.ol-bottomnav__item:active \{[^}]*background: var\(--ink\);[^}]*color: var\(--on-ink\)/,
      );
    });

    it("draws an on-ink band under the ring of an inverted, focused item", () => {
      expect(css).toMatch(
        /\.ol-bottomnav__item:hover:focus-visible \{[^}]*box-shadow: inset 0 0 0 var\(--stroke-bold\) var\(--on-ink\)/,
      );
      expect(css).toMatch(
        /\.ol-bottomnav__item:active:focus-visible \{[^}]*box-shadow: inset 0 0 0 var\(--stroke-bold\) var\(--on-ink\)/,
      );
    });

    it("hides in print and marks the current item without an outline in forced colours", () => {
      expect(css).toMatch(/@media print \{\s*\.ol-bottomnav \{\s*display: none/);
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).toMatch(/background: Highlight/);
      expect(forced).not.toMatch(/outline|HighlightText/);
    });

    it("uses no radius other than zero, no literal colours or lengths, and ink-3 never", () => {
      expect(css).not.toMatch(/border-radius: (?!var\(--radius-0\))/);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      expect(css).not.toMatch(/--ink-3/);
      expect(css.replace(/env\([^)]*\)/g, "")).not.toMatch(/\b\d+(\.\d+)?(px|rem|em)\b/);
    });

    it("moves only with motion tokens, on transform and colours", () => {
      const timings = css.match(/(animation|transition)[^;]*;/g) ?? [];
      for (const line of timings) expect(line).not.toMatch(/\d(ms|s)\b/);
      expect(css).not.toMatch(/cubic-bezier|steps\(|!important|opacity/);
      expect(css).toMatch(/transition: translate var\(--dur-m\) var\(--ease-move\)/);
      expect(css).toMatch(/transition: clip-path var\(--dur-s\) var\(--ease-move\)/);
    });

    it("clips labels to two lines and keeps cells at 64px", () => {
      expect(css).toMatch(/line-clamp: 2/);
      expect(css).toMatch(/min-block-size: var\(--space-16\)/);
    });

    it("uses logical properties and wipes the edge from the inline start in RTL", () => {
      expect(css).not.toMatch(/(^|[\s;{])(min-|max-)?(width|height|top|left|right|bottom):/m);
      expect(css).not.toMatch(/\b(margin|padding|border)-(left|right|top|bottom)/);
      expect(css).toMatch(
        /\.ol-bottomnav__item:dir\(rtl\)::before \{[^}]*clip-path: inset\(0 0 0 100%\)/,
      );
    });

    it("starts the content at the top of the cell so marks share one height", () => {
      expect(css).toMatch(/\.ol-bottomnav__item \{[^}]*justify-content: flex-start/);
    });

    it("styles cells by class, not by bare list items", () => {
      expect(css).not.toMatch(/> li/);
      expect(css).toMatch(/\.ol-bottomnav__cell \+ \.ol-bottomnav__cell/);
    });

    it("straddles the top edge with the badge so it never covers the mark", () => {
      expect(css).toMatch(
        /\.ol-bottomnav__badge \{[^}]*inset-block-start: calc\(var\(--badge-height\) \/ -2\)/,
      );
    });

    it("keeps equal columns that cannot overflow the bar", () => {
      expect(css).toMatch(/grid-auto-columns: minmax\(0, 1fr\)/);
    });

    it("pads for the safe area and sits at the sticky layer", () => {
      expect(css).toMatch(/padding-block-end: env\(safe-area-inset-bottom, 0\)/);
      expect(css).toMatch(/z-index: var\(--z-sticky\)/);
    });
  });
});
