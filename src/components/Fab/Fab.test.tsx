import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Fab, type FabAction } from "./Fab";

const actions = (onSelect = vi.fn()): FabAction[] => [
  { label: "Start a build", glyph: "+", onSelect },
  { label: "Book a workshop visit", onSelect },
  { label: "Ask a luthier", glyph: "?", onSelect },
];

const fab = () => screen.getByRole("button", { name: "Start a build" });
const items = () => screen.getAllByRole("menuitem");

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  fireEvent.scroll(window);
}

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  });
}

afterEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  Reflect.deleteProperty(window, "matchMedia");
  vi.restoreAllMocks();
});

describe("Fab", () => {
  stubNoAnimations();

  describe("button", () => {
    it("renders in a portal with the wrapper class and the ref on the button", () => {
      const ref = createRef<HTMLButtonElement>();
      const { container } = render(
        <Fab ref={ref} label="Start a build" className="x" data-testid="t" />,
      );
      const button = fab();
      expect(ref.current).toBe(button);
      expect(container.contains(button)).toBe(false);
      expect(button.closest(".ol-portal")).not.toBeNull();
      expect(button.parentElement).toHaveClass("ol-fab-wrap", "ol-fab-wrap--end", "x");
      expect(button).toHaveClass("ol-fab", "ol-fab--accent", "ol-fab--m", "ol-fab--extended");
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveAttribute("data-testid", "t");
      expect(button).not.toHaveAttribute("aria-haspopup");
    });

    it("renders inline when contained", () => {
      const { container } = render(<Fab contained aria-label="Add" />);
      const button = screen.getByRole("button", { name: "Add" });
      expect(container.contains(button)).toBe(true);
      expect(button.parentElement).toHaveClass("ol-fab-wrap--contained");
    });

    it.each(["accent", "ink", "paper"] as const)("applies variant %s", (variant) => {
      render(<Fab aria-label="Add" variant={variant} />);
      expect(screen.getByRole("button")).toHaveClass(`ol-fab--${variant}`);
    });

    it.each(["s", "m", "l"] as const)("applies size %s", (size) => {
      render(<Fab aria-label="Add" size={size} />);
      expect(screen.getByRole("button")).toHaveClass(`ol-fab--${size}`);
    });

    it.each(["end", "start", "center"] as const)("applies placement %s", (placement) => {
      render(<Fab aria-label="Add" placement={placement} />);
      expect(screen.getByRole("button").parentElement).toHaveClass(`ol-fab-wrap--${placement}`);
    });

    it("draws the glyph as decoration and names the button from aria-label", () => {
      render(<Fab aria-label="New project" glyph="＋" />);
      const button = screen.getByRole("button", { name: "New project" });
      expect(button).not.toHaveClass("ol-fab--extended");
      const glyph = button.querySelector(".ol-fab__glyph");
      expect(glyph).toHaveAttribute("aria-hidden", "true");
      expect(glyph).toHaveTextContent("＋");
    });

    it("always sets aria-label to the label", () => {
      render(<Fab label="Start a build" />);
      expect(fab()).toHaveAttribute("aria-label", "Start a build");
    });

    it("lets aria-label replace the name only when it contains the label", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { unmount } = render(<Fab label="Start" aria-label="Start a guitar build" />);
      expect(screen.getByRole("button")).toHaveAccessibleName("Start a guitar build");
      expect(warn).not.toHaveBeenCalled();
      unmount();
      render(<Fab label="Start" aria-label="Begin" />);
      expect(screen.getByRole("button")).toHaveAccessibleName("Start");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("does not contain"));
    });

    it("calls onClick when there are no actions", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Fab label="Start a build" onClick={onClick} />);
      await user.click(fab());
      fab().focus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it("warns in development when it has no name", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      // @ts-expect-error -- a name is required
      render(<Fab />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));
    });

    it("renders no built-in words in any locale", () => {
      for (const locale of ["en", "es", "ja"] as const) {
        const { unmount } = render(
          <Root locale={locale}>
            <Fab contained aria-label="x" actions={[{ label: "y", glyph: "z" }]} defaultOpen />
          </Root>,
        );
        expect(screen.getByRole("button", { name: "x" })).toHaveTextContent(/^×$/);
        expect(screen.getByRole("menu")).toHaveTextContent(/^yz$/);
        unmount();
      }
    });
  });

  describe("menu", () => {
    it("wires menu-button semantics and opens on click without calling onClick", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <Fab
          label="Start a build"
          actions={actions()}
          onClick={onClick}
          onOpenChange={onOpenChange}
        />,
      );
      const button = fab();
      expect(button).toHaveAttribute("aria-haspopup", "menu");
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).not.toHaveAttribute("aria-controls");
      expect(screen.queryByRole("menu")).toBeNull();

      await user.click(button);
      const menu = screen.getByRole("menu");
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(button).toHaveAttribute("aria-controls", menu.id);
      expect(button).toHaveAttribute("data-state", "open");
      expect(onClick).not.toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(items()).toHaveLength(3);
      for (const item of items()) {
        expect(item.parentElement).toHaveAttribute("role", "none");
        expect(item.querySelector(".ol-fab__item-glyph")).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("names the menu after the Fab, or from menuLabel", () => {
      const { unmount } = render(<Fab label="Start a build" actions={actions()} defaultOpen />);
      expect(screen.getByRole("menu")).toHaveAttribute("aria-labelledby", fab().id);
      expect(screen.getByRole("menu")).toHaveAccessibleName("Start a build");
      unmount();
      render(<Fab label="Start a build" actions={actions()} menuLabel="Build" defaultOpen />);
      expect(screen.getByRole("menu")).toHaveAccessibleName("Build");
    });

    it("puts the button before the menu in the DOM", () => {
      render(<Fab label="Start a build" actions={actions()} defaultOpen />);
      const button = fab();
      const menu = screen.getByRole("menu");
      expect(button.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(menu).toHaveClass("ol-fab__menu", "ol-kakejiku");
      expect(menu).toHaveAttribute("data-side", "top");
    });

    it("swaps the glyph to a close mark while open", async () => {
      const user = userEvent.setup();
      render(<Fab label="Start a build" actions={actions()} />);
      const glyph = () => fab().querySelector(".ol-fab__glyph");
      expect(glyph()).toHaveTextContent("+");
      await user.click(fab());
      expect(glyph()).toHaveTextContent("×");
      expect(fab()).toHaveAccessibleName("Start a build");
    });

    it.each([
      ["{Enter}", 0],
      [" ", 0],
      ["{ArrowDown}", 0],
      ["{ArrowUp}", 2],
    ])("%s on the Fab opens and focuses item %i", async (key, index) => {
      const user = userEvent.setup();
      render(<Fab label="Start a build" actions={actions()} />);
      await user.tab();
      await user.keyboard(key);
      expect(items()[index]).toHaveFocus();
    });

    it("moves with the arrows (wrapping), Home and End", async () => {
      const user = userEvent.setup();
      render(<Fab label="Start a build" actions={actions()} />);
      await user.tab();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");
      expect(items()[1]).toHaveFocus();
      await user.keyboard("{End}");
      expect(items()[2]).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(items()[0]).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(items()[2]).toHaveFocus();
      await user.keyboard("{Home}");
      expect(items()[0]).toHaveFocus();
    });

    it("moves by typeahead", async () => {
      const user = userEvent.setup();
      render(<Fab label="Start a build" actions={actions()} />);
      await user.tab();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("a");
      expect(items()[2]).toHaveFocus();
    });

    it("focuses the menu itself on a pointer open", async () => {
      const user = userEvent.setup();
      render(<Fab label="Start a build" actions={actions()} />);
      await user.click(fab());
      expect(screen.getByRole("menu")).toHaveFocus();
    });

    it("closes on Shift+Tab from an item", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Fab label="Start a build" actions={actions()} onOpenChange={onOpenChange} />);
      await user.tab();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(fab()).toHaveAttribute("aria-expanded", "false");
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "tab");
    });

    it("chooses an item with Enter, closes and returns focus to the Fab", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<Fab label="Start a build" actions={actions(onSelect)} />);
      await user.tab();
      await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(fab()).toHaveFocus();
      expect(fab()).toHaveAttribute("aria-expanded", "false");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
    });

    it("chooses an item with Space and with a click", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<Fab label="Start a build" actions={actions(onSelect)} />);
      await user.tab();
      await user.keyboard("{ArrowDown} ");
      expect(onSelect).toHaveBeenCalledTimes(1);
      await user.click(fab());
      await user.click(screen.getByRole("menuitem", { name: /Ask a luthier/ }));
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it("closes on Escape from the menu and returns focus", async () => {
      const user = userEvent.setup();
      render(<Fab label="Start a build" actions={actions()} />);
      await user.tab();
      await user.keyboard("{ArrowDown}{Escape}");
      expect(fab()).toHaveFocus();
      expect(fab()).toHaveAttribute("aria-expanded", "false");
    });

    it("closes on Escape while focus is on the Fab", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Fab label="Start a build" actions={actions()} onOpenChange={onOpenChange} />);
      await user.tab();
      await user.keyboard("{ArrowDown}");
      fab().focus();
      await user.keyboard("{Escape}");
      expect(fab()).toHaveAttribute("aria-expanded", "false");
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "escape");
    });

    it("closes on Tab", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Fab label="Start a build" actions={actions()} onOpenChange={onOpenChange} />);
      await user.tab();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Tab}");
      expect(fab()).toHaveAttribute("aria-expanded", "false");
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "tab");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
    });

    it("closes on an outside press without moving focus to the Fab", async () => {
      const user = userEvent.setup();
      render(
        <>
          <p>Outside</p>
          <Fab label="Start a build" actions={actions()} />
        </>,
      );
      await user.click(fab());
      await user.click(screen.getByText("Outside"));
      expect(fab()).toHaveAttribute("aria-expanded", "false");
      expect(fab()).not.toHaveFocus();
    });

    it("closes when focus moves to another element", async () => {
      render(
        <>
          <button type="button">Elsewhere</button>
          <Fab label="Start a build" actions={actions()} />
        </>,
      );
      const user = userEvent.setup();
      await user.click(fab());
      act(() => {
        screen.getByRole("button", { name: "Elsewhere" }).focus();
      });
      expect(fab()).toHaveAttribute("aria-expanded", "false");
    });

    it("shows at most six actions and keeps End and ArrowUp on the last shown", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const user = userEvent.setup();
      const many = Array.from({ length: 8 }, (_, i) => ({ label: `Action ${String(i + 1)}` }));
      render(<Fab label="Start a build" actions={many} />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("first 6 actions"));
      await user.tab();
      await user.keyboard("{ArrowUp}");
      expect(items()).toHaveLength(6);
      expect(screen.getByRole("menuitem", { name: /Action 6/ })).toHaveFocus();
      await user.keyboard("{Home}{End}");
      expect(screen.getByRole("menuitem", { name: /Action 6/ })).toHaveFocus();
    });

    it("supports a controlled open state", async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [open, setOpen] = useState(true);
        return (
          <>
            <span data-testid="state">{String(open)}</span>
            <Fab label="Start a build" actions={actions()} open={open} onOpenChange={setOpen} />
          </>
        );
      }
      render(<Controlled />);
      expect(screen.getByRole("menu")).toBeInTheDocument();
      await user.click(fab());
      expect(screen.getByTestId("state")).toHaveTextContent("false");
      await user.click(fab());
      expect(screen.getByTestId("state")).toHaveTextContent("true");
    });

    it("stays shut when controlled closed", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Fab label="Start a build" actions={actions()} open={false} onOpenChange={onOpenChange} />,
      );
      await user.click(fab());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("composes the consumer's handlers instead of replacing the menu's", async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      render(
        <Fab
          label="Start a build"
          actions={actions()}
          onKeyDown={onKeyDown}
          aria-expanded={false}
        />,
      );
      await user.tab();
      await user.keyboard("{ArrowDown}");
      expect(onKeyDown).toHaveBeenCalled();
      expect(fab()).toHaveAttribute("aria-expanded", "true");
      expect(items()[0]).toHaveFocus();
    });
  });

  describe("exit", () => {
    it("keeps the menu inert while it rolls up", async () => {
      const pending = {
        effect: { getComputedTiming: () => ({ endTime: 300 }) },
        finished: new Promise<never>(() => undefined),
      };
      vi.spyOn(Element.prototype, "getAnimations").mockReturnValue([
        pending as unknown as Animation,
      ]);
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<Fab label="Start a build" actions={actions(onSelect)} />);
      await user.click(fab());
      const menu = screen.getByRole("menu");
      await user.click(fab());
      expect(menu).toHaveAttribute("data-state", "closing");
      expect(menu).toHaveAttribute("inert");
      fireEvent.click(within(menu).getByRole("menuitem", { name: /Ask a luthier/ }));
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe("collapse on scroll", () => {
    it("folds the label on scroll down and brings it back on scroll up", async () => {
      render(<Fab label="Start a build" collapseOnScroll />);
      setScrollY(100);
      await waitFor(() => {
        expect(fab().querySelector(".ol-fab__label")).toBeNull();
      });
      expect(fab()).not.toHaveClass("ol-fab--extended");
      expect(fab()).toHaveAccessibleName("Start a build");
      setScrollY(40);
      expect(fab().querySelector(".ol-fab__label")).toHaveAttribute("data-state", "open");
      expect(fab()).toHaveClass("ol-fab--extended");
    });

    it("ignores small scroll movements", () => {
      render(<Fab label="Start a build" collapseOnScroll />);
      setScrollY(2);
      expect(fab().querySelector(".ol-fab__label")).toHaveAttribute("data-state", "open");
    });

    it("watches the scrollTarget instead of the window", async () => {
      function Scroller() {
        const [node, setNode] = useState<HTMLDivElement | null>(null);
        return (
          <div ref={setNode} data-testid="scroller">
            {node && (
              <Fab label="Start a build" collapseOnScroll scrollTarget={{ current: node }} />
            )}
          </div>
        );
      }
      render(<Scroller />);
      const scroller = screen.getByTestId("scroller");
      scroller.scrollTop = 120;
      fireEvent.scroll(scroller);
      await waitFor(() => {
        expect(fab().querySelector(".ol-fab__label")).toBeNull();
      });
    });

    it("keeps the label under reduced motion", () => {
      mockReducedMotion(true);
      render(<Fab label="Start a build" collapseOnScroll />);
      setScrollY(100);
      expect(fab().querySelector(".ol-fab__label")).toHaveAttribute("data-state", "open");
    });

    it("keeps the label inside .ol-reduce-motion", () => {
      render(
        <div className="ol-reduce-motion">
          <Fab label="Start a build" collapseOnScroll />
        </div>,
      );
      expect(fab().closest(".ol-portal")).not.toBeNull();
      setScrollY(100);
      expect(fab().querySelector(".ol-fab__label")).toHaveAttribute("data-state", "open");
    });

    it("does not collapse while the menu is open", async () => {
      const user = userEvent.setup();
      render(<Fab label="Start a build" collapseOnScroll actions={actions()} />);
      await user.click(fab());
      setScrollY(100);
      expect(fab().querySelector(".ol-fab__label")).toHaveAttribute("data-state", "open");
    });

    it("warns when there is no label to collapse", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Fab aria-label="Add" collapseOnScroll />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("collapseOnScroll"));
    });
  });

  describe("accessibility", () => {
    it.each(["washi", "sumi"] as const)(
      "has no axe violations closed and open (%s)",
      async (theme) => {
        const user = userEvent.setup();
        render(
          <Root theme={theme}>
            <main>
              <Fab label="Start a build" actions={actions()} />
            </main>
          </Root>,
        );
        expect(await runAxe(document.body)).toHaveNoViolations();
        await user.click(fab());
        // The Fab is fixed and portalled to the body, outside the page's landmarks by design.
        expect(
          await runAxe(document.body, { rules: { region: { enabled: false } } }),
        ).toHaveNoViolations();
      },
    );

    it("keeps the language and direction of the place it was rendered", () => {
      render(
        <div lang="ar" dir="rtl">
          <Fab aria-label="Add" />
        </div>,
      );
      const layer = screen.getByRole("button").closest(".ol-portal");
      expect(layer).toHaveAttribute("lang", "ar");
      expect(layer).toHaveAttribute("dir", "rtl");
    });

    it.each(["en", "es", "ja"] as const)("carries the %s locale into the portal", (locale) => {
      render(
        <Root locale={locale}>
          <Fab aria-label="x" actions={[{ label: "y", glyph: "z" }]} defaultOpen />
        </Root>,
      );
      expect(screen.getByRole("button", { name: "x" }).closest(".ol-portal")).toHaveAttribute(
        "lang",
        locale,
      );
      expect(screen.getByRole("menu")).toHaveTextContent(/^yz$/);
    });

    it("is made inert by a Modal that opens after it", () => {
      function Page({ open }: { open: boolean }) {
        return (
          <>
            <Fab label="Start a build" />
            <Modal open={open} title="Details" onClose={() => undefined}>
              Body
            </Modal>
          </>
        );
      }
      const { rerender } = render(<Page open={false} />);
      const layer = fab().closest(".ol-portal");
      expect(layer).not.toHaveAttribute("inert");
      rerender(<Page open />);
      expect(layer).toHaveAttribute("inert");
      rerender(<Page open={false} />);
      expect(layer).not.toHaveAttribute("inert");
    });

    it("keeps the theme of the place it was rendered", () => {
      render(
        <Root theme="sumi">
          <Fab aria-label="Add" />
        </Root>,
      );
      expect(screen.getByRole("button").closest(".ol-portal")).toHaveAttribute(
        "data-theme",
        "sumi",
      );
    });
  });
});
