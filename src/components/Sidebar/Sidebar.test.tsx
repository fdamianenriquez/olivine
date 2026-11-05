import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Sidebar, type SidebarSection } from "./Sidebar";

const sections: SidebarSection[] = [
  {
    key: "overview",
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", mark: "概", href: "#dashboard", badge: 3 },
      { key: "reports", label: "Reports", mark: "報" },
    ],
  },
  {
    key: "library",
    title: "Library",
    collapsible: true,
    items: [
      {
        key: "components",
        label: "Components",
        mark: "部",
        href: "#components",
        children: [
          { key: "buttons", label: "Buttons", href: "#buttons" },
          { key: "forms", label: "Forms", badge: 2 },
          { key: "tags", label: "Tags", disabled: true },
        ],
      },
      {
        key: "tokens",
        label: "Tokens",
        mark: "§",
        children: [
          { key: "colour", label: "Colour" },
          { key: "type", label: "Type" },
        ],
      },
      { key: "legacy", label: "Legacy", mark: "旧", href: "#legacy", disabled: true },
    ],
  },
  {
    key: "archive",
    title: "Archive",
    collapsible: true,
    items: [{ key: "old", label: "Old docs", href: "#old" }],
  },
];

type Props = Partial<React.ComponentProps<typeof Sidebar>>;

const sidebar = (props: Props = {}) => <Sidebar sections={sections} label="Docs" {...props} />;

/** Lets a closing list report its end at once: jsdom has no Web Animations. */
beforeEach(() => {
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, "getAnimations");
  Reflect.deleteProperty(window, "matchMedia");
});

function mockViewport(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  const matchMedia = vi.fn((media: string) => ({
    media,
    get matches() {
      return matches;
    },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));
  Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });
  return {
    matchMedia,
    set(next: boolean) {
      matches = next;
      act(() => {
        listeners.forEach((listener) => {
          listener();
        });
      });
    },
  };
}

/** A sidebar toggled by an app button, as the guideline describes. */
function Shell({
  initial = true,
  spy,
  ...props
}: Props & { initial?: boolean; spy?: (open: boolean) => void }) {
  const [open, setOpen] = useState(initial);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={props.id}
        onClick={() => {
          setOpen(!open);
        }}
      >
        Menu
      </button>
      <Sidebar
        sections={sections}
        label="Docs"
        {...props}
        open={open}
        onOpenChange={(next) => {
          spy?.(next);
          setOpen(next);
        }}
      />
    </>
  );
}

const nav = () => screen.getByRole("navigation", { name: "Docs" });
const dashboard = () => screen.getByRole("link", { name: /^Dashboard\s*,\s*3$/ });

describe("Sidebar", () => {
  describe("structure", () => {
    it("renders the destinations in one labelled nav landmark", () => {
      render(sidebar({ className: "extra", id: "docs", "data-x": "1" } as Props));
      const root = nav().closest(".ol-sidebar");
      expect(root).toHaveClass("ol-sidebar", "extra");
      expect(root).toHaveAttribute("id", "docs");
      expect(root).toHaveAttribute("data-x", "1");
      expect(screen.getAllByRole("navigation")).toHaveLength(1);
    });

    it("forwards its ref to the root element", () => {
      const ref = createRef<HTMLDivElement>();
      render(sidebar({ ref }));
      expect(ref.current).toBe(nav().closest(".ol-sidebar"));
    });

    it("names the landmark from the locale when no label is given", () => {
      render(<Sidebar items={[{ key: "a", label: "Alpha", href: "#a" }]} />);
      expect(screen.getByRole("navigation", { name: "Sidebar" })).toBeInTheDocument();
    });

    it("accepts a flat items list as one untitled section", () => {
      render(
        <Sidebar
          label="Docs"
          items={[
            { key: "a", label: "Alpha", href: "#a" },
            { key: "b", label: "Beta" },
          ]}
        />,
      );
      expect(screen.getByRole("link", { name: "Alpha" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Beta" })).toBeInTheDocument();
      expect(document.querySelector(".ol-sidebar__title")).toBeNull();
    });

    it("renders links for items with an href and buttons for the rest", () => {
      render(sidebar());
      expect(dashboard()).toHaveAttribute("href", "#dashboard");
      expect(screen.getByRole("button", { name: "Reports" })).toHaveAttribute("type", "button");
    });

    it("puts the header and the footer outside the navigation landmark", () => {
      render(sidebar({ header: <span>Brand</span>, footer: <span>Account</span> }));
      expect(within(nav()).queryByText("Brand")).toBeNull();
      expect(within(nav()).queryByText("Account")).toBeNull();
      expect(screen.getByText("Brand").parentElement).toHaveClass("ol-sidebar__header");
      expect(screen.getByText("Account").parentElement).toHaveClass("ol-sidebar__footer");
    });

    it("renders no header or footer without content", () => {
      render(sidebar());
      expect(document.querySelector(".ol-sidebar__header")).toBeNull();
      expect(document.querySelector(".ol-sidebar__footer")).toBeNull();
    });

    it("names a titled list by its title and leaves titles out of the heading outline", () => {
      render(sidebar());
      expect(screen.getByRole("list", { name: "Overview" })).toBeInTheDocument();
      expect(screen.getByRole("list", { name: "Library" })).toBeInTheDocument();
      expect(screen.queryAllByRole("heading")).toHaveLength(0);
    });

    it("leaves a list without a title unnamed", () => {
      render(<Sidebar label="Docs" items={[{ key: "a", label: "Alpha", href: "#a" }]} />);
      const list = document.querySelector(".ol-sidebar__list");
      expect(list).not.toHaveAttribute("aria-labelledby");
    });

    it("hides marks from assistive tech, tags kanji as Japanese and keeps the columns aligned", () => {
      render(sidebar());
      const marks = [...document.querySelectorAll(".ol-sidebar__mark")];
      expect(marks.every((mark) => mark.getAttribute("aria-hidden") === "true")).toBe(true);
      expect(marks[0]).toHaveAttribute("lang", "ja");
      const tokens = marks.find((mark) => mark.textContent === "§");
      expect(tokens).not.toHaveAttribute("lang");
    });

    it("renders no mark column when no item has a mark", () => {
      render(<Sidebar label="Docs" items={[{ key: "a", label: "Alpha", href: "#a" }]} />);
      expect(document.querySelector(".ol-sidebar__mark")).toBeNull();
    });

    it("reads a count after the label through a hidden separator", () => {
      render(sidebar());
      const badge = document.querySelector(".ol-sidebar__badge");
      expect(badge).toHaveClass("ol-badge--accent");
      expect(badge?.textContent).toBe(", 3");
      expect(badge?.querySelector(".ol-sr")?.textContent).toBe(", ");
    });
  });

  describe("current destination", () => {
    it("marks a link with aria-current page", () => {
      render(sidebar({ active: "dashboard" }));
      expect(dashboard()).toHaveAttribute("aria-current", "page");
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
    });

    it("marks a button item with aria-current page", () => {
      render(sidebar({ active: "reports" }));
      expect(screen.getByRole("button", { name: "Reports" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("marks a nested destination and never its ancestor", () => {
      render(sidebar({ active: "buttons", defaultExpanded: ["library", "components"] }));
      expect(screen.getByRole("link", { name: "Buttons" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Components" })).not.toHaveAttribute("aria-current");
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
    });

    it("marks a parent that is itself the destination", () => {
      render(sidebar({ active: "components" }));
      expect(screen.getByRole("link", { name: "Components" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("says that a folded section or parent contains the current page", async () => {
      render(sidebar({ active: "buttons" }));
      const parent = screen.getByRole("button", { name: "Components" });
      expect(parent).toHaveAttribute("aria-expanded", "true");
      expect(screen.queryByText(/contains the current page/)).toBeNull();

      await userEvent.click(parent);
      await waitFor(() => {
        expect(screen.queryByRole("link", { name: "Buttons" })).toBeNull();
      });
      const link = screen.getByRole("link", {
        name: /^Components\s*,\s*contains the current page$/,
      });
      expect(link).toHaveAttribute("data-within");
      expect(link).not.toHaveAttribute("aria-current");

      await userEvent.click(screen.getByRole("button", { name: "Library" }));
      await waitFor(() => {
        expect(screen.queryByRole("link", { name: "Components" })).toBeNull();
      });
      const title = screen.getByRole("button", {
        name: /^Library\s*,\s*contains the current page$/,
      });
      expect(title).toHaveAttribute("data-within");
    });

    it("does not say it while the section is open", () => {
      render(sidebar({ active: "buttons" }));
      expect(screen.queryByText(/contains the current page/)).toBeNull();
      expect(document.querySelector("[data-within]")).toBeNull();
    });
  });

  describe("disabled", () => {
    it("takes a disabled link out of the tab order and drops its href", () => {
      render(sidebar());
      const legacy = screen.getByRole("link", { name: "Legacy" });
      expect(legacy).toHaveAttribute("aria-disabled", "true");
      expect(legacy).not.toHaveAttribute("href");
      expect(legacy).not.toHaveAttribute("tabindex");
    });

    it("does not select a disabled destination", async () => {
      const onSelect = vi.fn();
      render(sidebar({ onSelect, defaultExpanded: ["library", "components"] }));
      await userEvent.click(screen.getByRole("link", { name: "Legacy" }));
      await userEvent.click(screen.getByRole("button", { name: "Tags" }));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("skips disabled rows with Tab", async () => {
      render(sidebar({ defaultExpanded: ["library", "tokens"] }));
      screen.getByRole("button", { name: "Type" }).focus();
      await userEvent.tab();
      expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus();
    });
  });

  describe("selection", () => {
    it("calls onSelect with the key and the event", async () => {
      const onSelect = vi.fn();
      render(sidebar({ onSelect }));
      await userEvent.click(screen.getByRole("button", { name: "Reports" }));
      expect(onSelect).toHaveBeenCalledWith("reports", expect.objectContaining({ type: "click" }));
    });

    it("lets onSelect cancel a link's navigation", () => {
      const onSelect = vi.fn((_key: string, event: React.MouseEvent) => {
        event.preventDefault();
      });
      render(sidebar({ onSelect }));
      const notPrevented = dashboard().dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      expect(onSelect).toHaveBeenCalledWith("dashboard", expect.anything());
      expect(notPrevented).toBe(false);
    });

    it("selects a nested destination", async () => {
      const onSelect = vi.fn();
      render(sidebar({ onSelect, defaultExpanded: ["library", "components"] }));
      await userEvent.click(screen.getByRole("link", { name: "Buttons" }));
      expect(onSelect).toHaveBeenCalledWith("buttons", expect.anything());
    });

    it("does not call onSelect for section titles or parent toggles", async () => {
      const onSelect = vi.fn();
      render(sidebar({ onSelect }));
      await userEvent.click(screen.getByRole("button", { name: "Archive" }));
      await userEvent.click(screen.getByRole("button", { name: "Tokens" }));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("works as a controlled switcher", async () => {
      function Harness() {
        const [current, setCurrent] = useState("dashboard");
        return sidebar({ active: current, onSelect: setCurrent });
      }
      render(<Harness />);
      await userEvent.click(screen.getByRole("button", { name: "Reports" }));
      expect(screen.getByRole("button", { name: "Reports" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(dashboard()).not.toHaveAttribute("aria-current");
    });
  });

  describe("sections and parents", () => {
    it("opens every collapsible section and closes every parent by default", () => {
      render(sidebar());
      expect(screen.getByRole("button", { name: "Library" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("button", { name: "Archive" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("button", { name: "Tokens" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.queryByRole("link", { name: "Buttons" })).toBeNull();
    });

    it("opens the ancestors of the current page by default", () => {
      render(sidebar({ active: "colour" }));
      expect(screen.getByRole("button", { name: "Tokens" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("button", { name: "Colour" })).toBeInTheDocument();
    });

    it("never renders a static title as a button", () => {
      render(sidebar());
      expect(screen.queryByRole("button", { name: "Overview" })).toBeNull();
      expect(screen.getByText("Overview").closest(".ol-sidebar__title")?.tagName).toBe("DIV");
    });

    it("ignores collapsible on a section without a title", () => {
      render(
        <Sidebar
          label="Docs"
          sections={[{ key: "a", collapsible: true, items: [{ key: "x", label: "Alpha" }] }]}
        />,
      );
      expect(screen.getByRole("button", { name: "Alpha" })).toBeInTheDocument();
      expect(document.querySelector(".ol-sidebar__title")).toBeNull();
    });

    it("folds a section shut and open from its title", async () => {
      const onExpandedChange = vi.fn();
      render(sidebar({ onExpandedChange }));
      const title = screen.getByRole("button", { name: "Archive" });
      expect(title).toHaveAttribute(
        "aria-controls",
        screen.getByRole("list", { name: "Archive" }).id,
      );
      expect(title).toHaveTextContent("−");

      await userEvent.click(title);
      expect(onExpandedChange).toHaveBeenLastCalledWith(["library"]);
      expect(title).toHaveAttribute("aria-expanded", "false");
      expect(title).toHaveTextContent("+");
      await waitFor(() => {
        expect(screen.queryByRole("link", { name: "Old docs" })).toBeNull();
      });
      expect(title).not.toHaveAttribute("aria-controls");

      await userEvent.click(title);
      expect(onExpandedChange).toHaveBeenLastCalledWith(["library", "archive"]);
      expect(screen.getByRole("link", { name: "Old docs" })).toBeInTheDocument();
    });

    it("toggles a parent without an href from the whole row and does not select", async () => {
      const onSelect = vi.fn();
      render(sidebar({ onSelect }));
      const parent = screen.getByRole("button", { name: "Tokens" });
      expect(parent).toHaveTextContent("+");
      await userEvent.click(parent);
      expect(parent).toHaveAttribute("aria-expanded", "true");
      expect(parent).toHaveAttribute("aria-controls", expect.stringContaining("list"));
      expect(parent).toHaveTextContent("−");
      expect(screen.getByRole("button", { name: "Colour" })).toBeInTheDocument();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("gives a parent with an href a link and a separate toggle", async () => {
      const onSelect = vi.fn();
      render(sidebar({ onSelect }));
      const link = screen.getByRole("link", { name: "Components" });
      const toggle = screen.getByRole("button", { name: "Components" });
      expect(toggle).toHaveAttribute("aria-labelledby", `${link.id}-label`);
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: "Buttons" })).toBeInTheDocument();

      await userEvent.click(link);
      expect(onSelect).toHaveBeenCalledWith("components", expect.anything());
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("names a parent's toggle by its label alone", () => {
      render(
        <Sidebar
          label="Docs"
          active="child"
          defaultExpanded={[]}
          items={[
            {
              key: "p",
              label: "Parent",
              href: "#p",
              badge: 5,
              children: [{ key: "child", label: "Child" }],
            },
          ]}
        />,
      );
      expect(
        screen.getByRole("link", { name: /^Parent\s*,\s*contains the current page\s*,\s*5$/ }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Parent" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("hands focus to the owning toggle when a list folds with focus inside", () => {
      const tree = (expanded: string[]) => sidebar({ expanded });
      const { rerender } = render(tree(["library", "tokens"]));
      screen.getByRole("button", { name: "Colour" }).focus();
      rerender(tree(["library"]));
      expect(screen.getByRole("button", { name: "Tokens" })).toHaveFocus();
    });

    it("hands focus to the section title when its list folds with focus inside", () => {
      const tree = (expanded: string[]) => sidebar({ expanded });
      const { rerender } = render(tree(["library", "archive"]));
      screen.getByRole("link", { name: "Old docs" }).focus();
      rerender(tree(["library"]));
      expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus();
    });

    it("hands focus to a parent link's toggle when its list folds with focus inside", () => {
      const tree = (expanded: string[]) => sidebar({ expanded });
      const { rerender } = render(tree(["library", "components"]));
      screen.getByRole("link", { name: "Buttons" }).focus();
      rerender(tree(["library"]));
      expect(screen.getByRole("button", { name: "Components" })).toHaveFocus();
    });

    it("keeps a nested list to one level", () => {
      render(sidebar({ defaultExpanded: ["library", "components"] }));
      const sub = document.querySelector(".ol-sidebar__sublist");
      expect(sub?.querySelector("ul")).toBeNull();
      expect(sub?.querySelectorAll(".ol-sidebar__item--sub")).toHaveLength(3);
    });

    it("honours defaultExpanded", () => {
      render(sidebar({ defaultExpanded: [] }));
      expect(screen.getByRole("button", { name: "Library" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.queryByRole("link", { name: "Old docs" })).toBeNull();
    });

    it("stays put when controlled until the parent changes it", async () => {
      const onExpandedChange = vi.fn();
      const { rerender } = render(sidebar({ expanded: ["library"], onExpandedChange }));
      await userEvent.click(screen.getByRole("button", { name: "Tokens" }));
      expect(onExpandedChange).toHaveBeenCalledWith(["library", "tokens"]);
      expect(screen.getByRole("button", { name: "Tokens" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      rerender(sidebar({ expanded: ["library", "tokens"], onExpandedChange }));
      expect(screen.getByRole("button", { name: "Tokens" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("button", { name: "Archive" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("opens the ancestors when the current page moves to a hidden item", () => {
      const onExpandedChange = vi.fn();
      const { rerender } = render(sidebar({ active: "dashboard", onExpandedChange }));
      expect(screen.queryByRole("button", { name: "Colour" })).toBeNull();
      rerender(sidebar({ active: "colour", onExpandedChange }));
      expect(screen.getByRole("button", { name: "Colour" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tokens" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(onExpandedChange).toHaveBeenCalledWith(["library", "archive", "tokens"]);
    });

    it("does not reopen a folded parent when it was not asked to", async () => {
      render(sidebar({ active: "colour" }));
      await userEvent.click(screen.getByRole("button", { name: "Tokens" }));
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "Colour" })).toBeNull();
      });
      await userEvent.click(screen.getByRole("button", { name: "Archive" }));
      expect(screen.getByRole("button", { name: /^Tokens/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("leaves the page it starts on to defaultExpanded", () => {
      render(sidebar({ active: "colour", defaultExpanded: [] }));
      expect(screen.queryByRole("button", { name: "Colour" })).toBeNull();
      expect(screen.getByRole("button", { name: /^Library/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("leaves a controlled sidebar closed when the current page moves", () => {
      const { rerender } = render(sidebar({ expanded: ["library"], active: "dashboard" }));
      rerender(sidebar({ expanded: ["library"], active: "colour" }));
      expect(screen.queryByRole("button", { name: "Colour" })).toBeNull();
    });
  });

  describe("folding motion", () => {
    it("does not play the unfold on first render", () => {
      render(sidebar({ defaultExpanded: ["library", "tokens"] }));
      expect(document.querySelector("[data-animate]")).toBeNull();
    });

    it("unfolds the rows of an opened list, staggered and capped at six", async () => {
      const many: SidebarSection[] = [
        {
          key: "many",
          title: "Many",
          collapsible: true,
          items: Array.from({ length: 9 }, (_, i) => ({
            key: `r${String(i)}`,
            label: `Row ${String(i)}`,
            href: `#r${String(i)}`,
          })),
        },
      ];
      render(<Sidebar sections={many} label="Docs" defaultExpanded={[]} />);
      await userEvent.click(screen.getByRole("button", { name: "Many" }));
      const list = screen.getByRole("list", { name: "Many" });
      expect(list).toHaveAttribute("data-animate");
      expect(list).toHaveAttribute("data-state", "open");
      const rows = [...list.children] as HTMLElement[];
      expect(rows.map((row) => row.style.getPropertyValue("--ol-i"))).toEqual([
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "6",
        "6",
      ]);
    });

    it("keeps a closing list mounted and inert until the exit ends", () => {
      render(sidebar());
      fireEvent.click(screen.getByRole("button", { name: "Archive" }));
      const list = screen.getByRole("list", { name: "Archive" });
      expect(list).toHaveAttribute("data-state", "closing");
      expect(list).toHaveAttribute("inert");
    });

    it("takes the links of a closed list out of the tab order", async () => {
      render(sidebar());
      await userEvent.click(screen.getByRole("button", { name: "Archive" }));
      await waitFor(() => {
        expect(screen.queryByRole("link", { name: "Old docs" })).toBeNull();
      });
      screen.getByRole("button", { name: "Archive" }).focus();
      await userEvent.tab();
      expect(document.body).toHaveFocus();
    });

    it("still folds when reduced motion is requested", async () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });
      render(<div className="ol-reduce-motion">{sidebar()}</div>);
      await userEvent.click(screen.getByRole("button", { name: "Archive" }));
      await waitFor(() => {
        expect(screen.queryByRole("link", { name: "Old docs" })).toBeNull();
      });
      await userEvent.click(screen.getByRole("button", { name: "Archive" }));
      expect(screen.getByRole("link", { name: "Old docs" })).toBeInTheDocument();
    });
  });

  describe("keyboard", () => {
    it("tabs through the header, the links and toggles in order and then the footer", async () => {
      render(
        sidebar({
          header: <button type="button">Switch</button>,
          footer: <button type="button">Account</button>,
          defaultExpanded: ["library"],
        }),
      );
      const order = [
        screen.getByRole("button", { name: "Switch" }),
        dashboard(),
        screen.getByRole("button", { name: "Reports" }),
        screen.getByRole("button", { name: "Library" }),
        screen.getByRole("link", { name: "Components" }),
        screen.getByRole("button", { name: "Components" }),
        screen.getByRole("button", { name: "Tokens" }),
        screen.getByRole("button", { name: "Archive" }),
      ];
      for (const element of order) {
        await userEvent.tab();
        expect(element).toHaveFocus();
      }
    });

    it("tabs to the footer after the last row", async () => {
      render(sidebar({ footer: <button type="button">Account</button>, defaultExpanded: [] }));
      screen.getByRole("button", { name: "Archive" }).focus();
      await userEvent.tab();
      expect(screen.getByRole("button", { name: "Account" })).toHaveFocus();
    });

    it("activates a link with Enter", async () => {
      const onSelect = vi.fn();
      render(sidebar({ onSelect }));
      dashboard().focus();
      await userEvent.keyboard("{Enter}");
      expect(onSelect).toHaveBeenCalledWith("dashboard", expect.anything());
    });

    it("activates a button item with Enter and Space", async () => {
      const onSelect = vi.fn();
      render(sidebar({ onSelect }));
      screen.getByRole("button", { name: "Reports" }).focus();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it("toggles a section title with Enter and Space and keeps focus on it", async () => {
      render(sidebar());
      const title = screen.getByRole("button", { name: "Archive" });
      title.focus();
      await userEvent.keyboard("{Enter}");
      expect(title).toHaveAttribute("aria-expanded", "false");
      await userEvent.keyboard(" ");
      expect(title).toHaveAttribute("aria-expanded", "true");
      expect(title).toHaveFocus();
    });

    it("toggles a parent with Enter and Space and keeps focus on it", async () => {
      render(sidebar());
      const toggle = screen.getByRole("button", { name: "Components" });
      toggle.focus();
      await userEvent.keyboard("{Enter}");
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      await userEvent.keyboard(" ");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveFocus();
    });

    it("ignores Escape in the standard variant", async () => {
      const onOpenChange = vi.fn();
      render(sidebar({ onOpenChange }));
      dashboard().focus();
      await userEvent.keyboard("{Escape}");
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dashboard()).toHaveFocus();
    });
  });

  describe("standard variant", () => {
    it("is open by default and sits in the flow", () => {
      render(sidebar());
      expect(nav().closest(".ol-sidebar")).not.toHaveAttribute("data-animate");
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("renders nothing while it starts closed", () => {
      render(sidebar({ defaultOpen: false }));
      expect(screen.queryByRole("navigation")).toBeNull();
    });

    it("slides out and unmounts when the app closes it, and slides in again", async () => {
      const { rerender } = render(sidebar({ open: true }));
      rerender(sidebar({ open: false }));
      const root = nav().closest(".ol-sidebar");
      expect(root).toHaveAttribute("data-state", "closing");
      expect(root).toHaveAttribute("data-animate");
      expect(root).toHaveAttribute("inert");
      await waitFor(() => {
        expect(screen.queryByRole("navigation")).toBeNull();
      });
      rerender(sidebar({ open: true }));
      expect(nav().closest(".ol-sidebar")).toHaveAttribute("data-state", "open");
      expect(nav().closest(".ol-sidebar")).toHaveAttribute("data-animate");
    });

    it("returns focus to the opener when it hides with focus inside", async () => {
      const tree = (open: boolean) => (
        <>
          <button type="button">Menu</button>
          {sidebar({ open })}
        </>
      );
      const { rerender } = render(tree(false));
      const opener = screen.getByRole("button", { name: "Menu" });
      opener.focus();
      rerender(tree(true));
      dashboard().focus();
      rerender(tree(false));
      expect(opener).toHaveFocus();
      await waitFor(() => {
        expect(screen.queryByRole("navigation")).toBeNull();
      });
    });

    it("follows an app toggle with aria-expanded", async () => {
      render(<Shell />);
      const menu = screen.getByRole("button", { name: "Menu" });
      expect(menu).toHaveAttribute("aria-expanded", "true");
      await userEvent.click(menu);
      expect(menu).toHaveAttribute("aria-expanded", "false");
      await waitFor(() => {
        expect(screen.queryByRole("navigation")).toBeNull();
      });
    });

    it("does not call onOpenChange when a destination is chosen", async () => {
      const onOpenChange = vi.fn();
      render(sidebar({ onOpenChange }));
      await userEvent.click(screen.getByRole("button", { name: "Reports" }));
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(nav()).toBeInTheDocument();
    });
  });

  describe("placement", () => {
    it("sits on the start edge by default and on the end edge on request", () => {
      const { rerender } = render(sidebar());
      expect(nav().closest(".ol-sidebar")).not.toHaveClass("ol-sidebar--end");
      rerender(sidebar({ placement: "end" }));
      expect(nav().closest(".ol-sidebar")).toHaveClass("ol-sidebar--end");
    });

    it("works under a right-to-left direction", async () => {
      render(<div dir="rtl">{sidebar({ active: "dashboard" })}</div>);
      expect(dashboard()).toHaveAttribute("aria-current", "page");
      await userEvent.click(screen.getByRole("button", { name: "Archive" }));
      expect(screen.getByRole("button", { name: "Archive" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  });

  describe("modal variant", () => {
    it("renders nothing in the page while closed", () => {
      render(sidebar({ variant: "modal" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("navigation")).toBeNull();
    });

    it("opens as a labelled dialog that holds the navigation", () => {
      render(sidebar({ variant: "modal", open: true, id: "docs" }));
      const dialog = screen.getByRole("dialog", { name: "Docs" });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveClass("ol-offcanvas", "ol-offcanvas--start", "ol-sidebar-drawer");
      expect(within(dialog).getByRole("navigation", { name: "Docs" })).toBeInTheDocument();
      expect(dialog.querySelector(".ol-sidebar")).toHaveClass("ol-sidebar--modal");
      expect(dialog.querySelector(".ol-sidebar")).toHaveAttribute("id", "docs");
    });

    it("uses the end edge for placement end", () => {
      render(sidebar({ variant: "modal", open: true, placement: "end" }));
      expect(screen.getByRole("dialog")).toHaveClass("ol-offcanvas--end");
    });

    it("forwards its ref to the sidebar inside the drawer", () => {
      const ref = createRef<HTMLDivElement>();
      render(sidebar({ variant: "modal", open: true, ref }));
      expect(ref.current).toHaveClass("ol-sidebar");
    });

    it("opens from the app toggle and closes with Escape, returning focus to the opener", async () => {
      const spy = vi.fn();
      render(<Shell variant="modal" initial={false} spy={spy} />);
      const menu = screen.getByRole("button", { name: "Menu" });
      await userEvent.click(menu);
      expect(screen.getByRole("dialog", { name: "Docs" })).toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      expect(spy).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(menu).toHaveFocus();
    });

    it("closes from the close button", async () => {
      const onOpenChange = vi.fn();
      render(sidebar({ variant: "modal", open: true, onOpenChange }));
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes after a destination is activated", async () => {
      const onSelect = vi.fn();
      const spy = vi.fn();
      render(<Shell variant="modal" initial onSelect={onSelect} spy={spy} />);
      await userEvent.click(screen.getByRole("button", { name: "Reports" }));
      expect(onSelect).toHaveBeenCalledWith("reports", expect.anything());
      expect(spy).toHaveBeenCalledWith(false);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("stays open after a destination when closeOnSelect is off", async () => {
      render(<Shell variant="modal" initial closeOnSelect={false} />);
      await userEvent.click(screen.getByRole("button", { name: "Reports" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("stays open when a section or parent is toggled", async () => {
      render(<Shell variant="modal" initial />);
      await userEvent.click(screen.getByRole("button", { name: "Tokens" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("keeps the folded sections across a close and reopen", async () => {
      render(<Shell variant="modal" initial />);
      await userEvent.click(screen.getByRole("button", { name: "Archive" }));
      await userEvent.click(screen.getByRole("button", { name: "Tokens" }));
      await userEvent.keyboard("{Escape}");
      await userEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getByRole("button", { name: "Archive" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.getByRole("button", { name: "Tokens" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });
  });

  describe("modalBelow", () => {
    it("builds a max-width query from the number", () => {
      const media = mockViewport(false);
      render(sidebar({ modalBelow: 1024 }));
      expect(media.matchMedia).toHaveBeenCalledWith("(max-width: 1023.98px)");
    });

    it("asks for no width when there is no breakpoint", () => {
      const media = mockViewport(false);
      render(sidebar());
      for (const [query] of media.matchMedia.mock.calls) expect(query).not.toMatch(/-\d/);
    });

    it("hands focus to the opener when the viewport narrows with focus inside", () => {
      const media = mockViewport(false);
      render(<Shell modalBelow={1024} id="docs-nav" />);
      dashboard().focus();
      media.set(true);
      expect(screen.queryByRole("navigation")).toBeNull();
      expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
    });

    it("leaves focus alone when the viewport narrows with focus elsewhere", () => {
      const media = mockViewport(false);
      render(
        <>
          <button type="button">Elsewhere</button>
          <Shell modalBelow={1024} id="docs-nav" />
        </>,
      );
      screen.getByRole("button", { name: "Elsewhere" }).focus();
      media.set(true);
      expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
    });

    it("stays standard on a wide viewport without calling onOpenChange", () => {
      mockViewport(false);
      const spy = vi.fn();
      render(<Shell modalBelow={1024} spy={spy} />);
      expect(nav()).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    });

    it("starts as a closed modal on a narrow viewport and tells the app", () => {
      mockViewport(true);
      const spy = vi.fn();
      render(<Shell modalBelow={1024} spy={spy} />);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("navigation")).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(false);
      expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("closes when the viewport narrows and opens again when it widens", async () => {
      const media = mockViewport(false);
      const spy = vi.fn();
      render(<Shell modalBelow={1024} spy={spy} />);

      media.set(true);
      expect(spy).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("navigation")).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getByRole("dialog", { name: "Docs" })).toBeInTheDocument();

      media.set(false);
      expect(spy).toHaveBeenLastCalledWith(true);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(nav()).toBeInTheDocument();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("never pops the drawer open when the viewport narrows", () => {
      const media = mockViewport(false);
      render(sidebar({ modalBelow: 1024 }));
      media.set(true);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("ignores the breakpoint when the variant is already modal", () => {
      mockViewport(true);
      const spy = vi.fn();
      render(<Shell variant="modal" initial modalBelow={1024} spy={spy} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("locale", () => {
    it.each([
      ["es", "Barra lateral", "contiene la página actual"],
      ["ja", "サイドバー", "現在のページを含む"],
    ])("speaks %s under Root", (locale, landmark, withinText) => {
      render(
        <Root locale={locale}>
          <Sidebar sections={sections} active="buttons" defaultExpanded={["library"]} />
        </Root>,
      );
      expect(screen.getByRole("navigation", { name: landmark })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: new RegExp(withinText) })).toBeInTheDocument();
    });

    it("lets the label prop override the locale", () => {
      render(
        <Root locale="es">
          <Sidebar sections={sections} label="Documentos" />
        </Root>,
      );
      expect(screen.getByRole("navigation", { name: "Documentos" })).toBeInTheDocument();
    });

    it("titles the modal drawer with the landmark name in the active language", () => {
      render(
        <Root locale="es">
          <Sidebar sections={sections} variant="modal" open />
        </Root>,
      );
      expect(screen.getByRole("dialog", { name: "Barra lateral" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    });
  });

  describe("styles", () => {
    const css = readFileSync("src/components/Sidebar/Sidebar.css", "utf8");
    const rule = (selector: string) =>
      new RegExp(`${selector.replace(/[.[\]()*+?^$|]/g, "\\$&")} \\{[^}]*\\}`).exec(css)?.[0] ?? "";

    it("draws the current item with an olivo edge on the inline start side", () => {
      expect(rule('.ol-sidebar__item[aria-current="page"]::before')).toMatch(
        /inset-inline-start: 0[\s\S]*width: var\(--stroke-heavy\)[\s\S]*background: var\(--olivo\)/,
      );
      expect(rule('.ol-sidebar__item[aria-current="page"]')).toMatch(
        /background: var\(--paper-2\)/,
      );
    });

    it("inverts a hovered row to ink on devices that hover", () => {
      expect(css).toMatch(
        /@media \(hover: hover\) \{\s*\.ol-sidebar__title--toggle:hover,[\s\S]*?background: var\(--ink\);\s*color: var\(--on-ink\)/,
      );
    });

    it("draws an on-ink band under the ring of a hovered, focused row", () => {
      expect(css).toMatch(
        /:focus-visible \{\s*outline-offset: calc\(var\(--stroke-bold\) \* -2\);\s*box-shadow: inset 0 0 0 var\(--stroke-bold\) var\(--on-ink\)/,
      );
    });

    it("draws the focus ring inside the row", () => {
      expect(css).toMatch(
        /\.ol-sidebar__item:focus-visible[\s\S]*?outline-offset: calc\(var\(--focus-offset\) \* -1\)/,
      );
    });

    it("keeps the current edge and fixes the focus ring in forced colours", () => {
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).toMatch(
        /aria-current="page"\]::before \{\s*forced-color-adjust: none;\s*background: Highlight/,
      );
      // The base ring stays the system's; the row itself is never opted out of the palette.
      expect(forced).not.toMatch(/HighlightText|:focus-visible/);
      expect(forced).not.toMatch(/aria-current="page"\] \{/);
      expect(forced).not.toMatch(/aria-current="page"\] \{[^}]*outline/);
      expect(forced).toMatch(/GrayText/);
    });

    it("uses ink-3 only for disabled text", () => {
      const uses = css.match(/[^\n]*var\(--ink-3\)[^\n]*/g) ?? [];
      expect(uses).toHaveLength(1);
      expect(css).toMatch(/\[aria-disabled="true"\],[\s\S]*?:disabled \{\s*color: var\(--ink-3\)/);
    });

    it("sets no literal colour, size or radius", () => {
      const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(declarations).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
      for (const radius of declarations.match(/border-radius:[^;]*;/g) ?? []) {
        expect(radius).toBe("border-radius: var(--radius-0);");
      }
      expect(declarations).not.toMatch(/(?:padding|margin|gap|width|height)[^;:]*:[^;]*\d+px/);
    });

    it("animates only clip-path and transform, with motion tokens only", () => {
      const timings = css.match(/(animation|transition)[^;]*;/g) ?? [];
      for (const line of timings) expect(line).not.toMatch(/\d(ms|s)\b/);
      expect(css).not.toMatch(/cubic-bezier|steps\(|!important/);
      for (const name of ["reveal-start", "reveal-end", "hide-start", "hide-end"]) {
        const frames =
          new RegExp(`@keyframes ol-sidebar-${name} \\{[\\s\\S]*?\\n\\}`).exec(css)?.[0] ?? "";
        expect(frames).toMatch(/clip-path/);
        expect(frames).not.toMatch(/width|height|margin|padding|opacity|blur|scale|rotate/);
      }
      for (const name of ["in-start", "in-end", "out-start", "out-end"]) {
        const frames =
          new RegExp(`@keyframes ol-sidebar-${name} \\{[\\s\\S]*?\\n\\}`).exec(css)?.[0] ?? "";
        expect(frames).toMatch(/transform/);
        expect(frames).not.toMatch(/clip-path|width|height|opacity/);
      }
      expect(rule(".ol-sidebar__list[data-animate] > li") || css).toMatch(
        /var\(--dur-m\) var\(--ease-move\)\s*calc\(var\(--ol-i, 0\) \* var\(--stagger\)\)/,
      );
      expect(css).toMatch(/animation: ol-sidebar-in-start var\(--motion-slow\)/);
    });

    it("plays every animation only when motion is not reduced", () => {
      const starts = [...css.matchAll(/^\s+animation(?:-name)?:/gm)].map((m) => m.index);
      const guard = css.indexOf("@media (prefers-reduced-motion: no-preference)");
      expect(guard).toBeGreaterThan(-1);
      for (const at of starts) expect(at).toBeGreaterThan(guard);
    });

    it("keeps the slide off in an in-app reduced-motion subtree", () => {
      const slides =
        css.match(/^\s+\.ol-sidebar(?:--end)?\[data-animate\]\[data-state="[a-z]+"\][^{]*\{/gm) ??
        [];
      expect(slides).toHaveLength(4);
      for (const selector of slides) {
        expect(selector).toContain(":not(.ol-reduce-motion, .ol-reduce-motion *)");
      }
    });

    it("sets the sign in the label weight", () => {
      expect(rule(".ol-sidebar__sign")).toMatch(/font-weight: var\(--text-label-l-weight\)/);
    });

    it("flips the slide and the clip edges under right-to-left", () => {
      expect(css).toMatch(/\.ol-sidebar:dir\(rtl\) \{\s*--ol-sidebar-dir: -1/);
      expect(css).toMatch(/--ol-clip-start: 0 0 0 100%/);
    });

    it("derives the width from tokens and sizes the drawer with it", () => {
      expect(css).toMatch(/--ol-sidebar-width: calc\(var\(--control-xl\) \* 3\.5\)/);
      expect(css).toMatch(
        /\.ol-offcanvas\.ol-sidebar-drawer \{\s*--ol-offcanvas-width: var\(--ol-sidebar-width\)/,
      );
    });
  });

  describe("accessibility", () => {
    it.each(["washi", "sumi"] as const)("has no axe violations in %s", async (theme) => {
      const { container } = render(
        <Root theme={theme}>
          {sidebar({
            active: "buttons",
            defaultExpanded: ["library", "components", "archive"],
            header: <span>Brand</span>,
            footer: <button type="button">Account</button>,
          })}
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations with sections and parents folded shut", async () => {
      const { container } = render(sidebar({ active: "buttons", defaultExpanded: [] }));
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations at the end edge", async () => {
      const { container } = render(sidebar({ placement: "end", active: "dashboard" }));
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations right-to-left", async () => {
      const { container } = render(
        <div dir="rtl" lang="ar">
          {sidebar({ active: "buttons", defaultExpanded: ["library", "components"] })}
        </div>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations with a parent folded shut around the current page in sumi", async () => {
      const { container } = render(
        <Root theme="sumi">{sidebar({ active: "buttons", defaultExpanded: ["library"] })}</Root>,
      );
      expect(screen.getByRole("link", { name: /contains the current page/ })).toBeInTheDocument();
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations under a breakpoint, standard and as a drawer", async () => {
      const media = mockViewport(false);
      const { container } = render(
        <Root theme="sumi">
          <Shell modalBelow={1024} id="docs-nav" />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
      media.set(true);
      await userEvent.click(screen.getByRole("button", { name: "Menu" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it.each(["washi", "sumi"] as const)("has no axe violations as a modal in %s", async (theme) => {
      render(
        <Root theme={theme}>{sidebar({ variant: "modal", open: true, active: "dashboard" })}</Root>,
      );
      expect(await runAxe(document.body)).toHaveNoViolations();
    });
  });
});
