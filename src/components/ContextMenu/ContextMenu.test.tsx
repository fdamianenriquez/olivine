import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { ContextMenu, type ContextMenuItem, elementAnchor } from "./ContextMenu";
import { LONG_PRESS_MS, LONG_PRESS_TOLERANCE } from "./useContextMenuTrigger";

const items = (onSelect = vi.fn()): ContextMenuItem[] => [
  { label: "Open", kbd: "⌘O", onSelect },
  { label: "Rename", onSelect },
  { label: "Archive", disabled: true, onSelect },
  { divider: true },
  { label: "Delete", danger: true, onSelect },
];

const area = () => screen.getByTestId("area");
const menus = () => screen.queryAllByRole("menu");
const labels = () =>
  screen
    .queryAllByRole("menuitem")
    .map((el) => el.querySelector(".ol-dropdown__label")?.textContent);

/** A right-click at a point: React reads the point from the event. */
function rightClick(target: Element, x = 120, y = 80, init: MouseEventInit = {}) {
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 2,
    ...init,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function pointerDown(target: Element, init: PointerEventInit = {}) {
  const event = new MouseEvent("pointerdown", { bubbles: true, cancelable: true, ...init });
  Object.assign(event, {
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? "mouse",
    isPrimary: init.isPrimary ?? true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function pointerEvent(type: string, init: PointerEventInit & { target?: Element } = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.assign(event, {
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? "touch",
  });
  act(() => {
    (init.target ?? document).dispatchEvent(event);
  });
}

const touchDown = (target: Element, x = 40, y = 40) =>
  pointerDown(target, { pointerType: "touch", clientX: x, clientY: y });

const point = (el: HTMLElement) => ({
  x: el.style.getPropertyValue("--ol-float-x"),
  y: el.style.getPropertyValue("--ol-float-y"),
});

function Row({
  children = "report.md",
  ...rest
}: Partial<React.ComponentProps<typeof ContextMenu>>) {
  return (
    <ContextMenu items={items()} label="File actions" data-testid="area" {...rest}>
      <button type="button" data-testid="row">
        {children}
      </button>
    </ContextMenu>
  );
}

const SHIFT_F10 = "{Shift>}{F10}{/Shift}";

describe("ContextMenu", () => {
  stubNoAnimations();

  // jsdom has no viewport: give the positioning one, so nothing is clamped to its edges.
  const sizes: [string, PropertyDescriptor | undefined][] = [];
  beforeEach(() => {
    for (const key of ["clientWidth", "clientHeight"]) {
      sizes.push([key, Object.getOwnPropertyDescriptor(document.documentElement, key)]);
      Object.defineProperty(document.documentElement, key, {
        configurable: true,
        value: key === "clientWidth" ? 1000 : 800,
      });
    }
  });
  afterEach(() => {
    vi.useRealTimers();
    // A press that closed a menu leaves a one-shot click swallower until its click; the
    // document outlives the test, so consume it here.
    document.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    for (const [key, descriptor] of sizes.splice(0)) {
      if (descriptor) Object.defineProperty(document.documentElement, key, descriptor);
      else Reflect.deleteProperty(document.documentElement, key);
    }
  });

  describe("anatomy", () => {
    it("renders the area with no role and a closed state", () => {
      render(<Row className="x" id="a" />);
      expect(area()).toHaveClass("ol-context-menu", "x");
      expect(area().tagName).toBe("DIV");
      expect(area()).toHaveAttribute("data-state", "closed");
      expect(area()).not.toHaveAttribute("role");
      expect(area()).not.toHaveAttribute("aria-haspopup");
      expect(area()).not.toHaveAttribute("data-pressing");
      expect(area()).not.toHaveAttribute("data-disabled");
      expect(menus()).toHaveLength(0);
    });

    it("renders as another element and forwards the ref and other props", () => {
      const ref = createRef<HTMLTableRowElement>();
      render(
        <table>
          <tbody>
            <ContextMenu as="tr" ref={ref} items={items()} data-testid="area" tabIndex={0}>
              <td>cell</td>
            </ContextMenu>
          </tbody>
        </table>,
      );
      expect(area().tagName).toBe("TR");
      expect(ref.current).toBe(area());
      expect(area()).toHaveAttribute("tabindex", "0");
    });
  });

  describe("pointer", () => {
    it("opens at the pointer on a right-click and prevents the browser menu", async () => {
      render(<Row />);
      const event = rightClick(screen.getByTestId("row"));
      expect(event.defaultPrevented).toBe(true);
      const menu = await screen.findByRole("menu", { name: "File actions" });
      expect(area()).toHaveAttribute("data-state", "open");
      expect(labels()).toEqual(["Open", "Rename", "Archive", "Delete"]);
      expect(screen.getByRole("separator")).toBeInTheDocument();
      // The menu's corner sits on the point.
      await waitFor(() => expect(menu).toHaveAttribute("data-positioned"));
      expect(point(menu)).toEqual({ x: "120px", y: "80px" });
      expect(menu).toHaveAttribute("data-side", "right");
    });

    it("names the menu with the locale's default when no label is given", async () => {
      render(<ContextMenu items={items()} data-testid="area" />);
      rightClick(area());
      expect(await screen.findByRole("menu", { name: "Context menu" })).toBeInTheDocument();
    });

    it.each([
      ["es", "Menú contextual"],
      ["ja", "コンテキストメニュー"],
    ])("names the menu in %s", async (locale, name) => {
      render(
        <Root locale={locale}>
          <ContextMenu items={items()} data-testid="area" />
        </Root>,
      );
      rightClick(area());
      expect(await screen.findByRole("menu", { name })).toBeInTheDocument();
    });

    it("focuses the menu itself, with no item highlighted", async () => {
      render(<Row />);
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveFocus());
      expect(document.querySelector("[data-highlighted]")).toBeNull();
    });

    it("moves the open menu on a second right-click, with one menu in the DOM", async () => {
      const onOpenChange = vi.fn();
      render(<Row onOpenChange={onOpenChange} />);
      rightClick(screen.getByTestId("row"), 120, 80);
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveAttribute("data-positioned"));
      rightClick(screen.getByTestId("row"), 30, 10);
      await waitFor(() => {
        expect(point(menu)).toEqual({ x: "30px", y: "10px" });
      });
      expect(menus()).toHaveLength(1);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it("mirrors the placement in RTL", async () => {
      render(
        <div dir="rtl">
          <Row />
        </div>,
      );
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      expect(menu).toHaveAttribute("data-side", "left");
      expect(menu.closest("[dir]")).toHaveAttribute("dir", "rtl");
    });

    it("lets a secondary press inside the area alone, so the menu moves instead of closing", async () => {
      const onOpenChange = vi.fn();
      render(<Row onOpenChange={onOpenChange} />);
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      pointerDown(screen.getByTestId("row"), { button: 2 });
      expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything());
      expect(menus()).toHaveLength(1);
    });

    it("keeps the menu name in a menu opened at a point inside a sumi island", async () => {
      render(
        <div data-theme="sumi">
          <Row />
        </div>,
      );
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      expect(menu.closest("[data-theme]")).toHaveAttribute("data-theme", "sumi");
      expect(menu.parentElement?.parentElement).toBe(document.body);
    });
  });

  describe("keyboard", () => {
    it.each([
      ["Shift+F10", SHIFT_F10],
      ["the ContextMenu key", "{ContextMenu}"],
    ])("opens with %s on the first item and anchors to the focused element", async (_n, keys) => {
      const user = userEvent.setup();
      render(<Row />);
      const row = screen.getByTestId("row");
      row.getBoundingClientRect = () =>
        ({
          x: 50,
          y: 70,
          left: 50,
          top: 70,
          right: 150,
          bottom: 100,
          width: 100,
          height: 30,
        }) as DOMRect;
      await user.tab();
      expect(row).toHaveFocus();
      await user.keyboard(keys);
      const menu = await screen.findByRole("menu", { name: "File actions" });
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus());
      await waitFor(() => expect(menu).toHaveAttribute("data-positioned"));
      // Below the element, lined up with its start edge.
      expect(menu).toHaveAttribute("data-side", "bottom");
      expect(menu).toHaveAttribute("data-align", "start");
      expect(point(menu).x).toBe("50px");
    });

    it("prevents the key default and ignores the late contextmenu event of the same press", async () => {
      const user = userEvent.setup();
      render(<Row />);
      await user.tab();
      const onKey = vi.fn((event: KeyboardEvent) => event.defaultPrevented);
      document.addEventListener("keydown", onKey);
      await user.keyboard("{ContextMenu>}");
      document.removeEventListener("keydown", onKey);
      expect(onKey).toHaveReturnedWith(true);
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveAttribute("data-positioned"));
      const before = point(menu);
      // Windows fires it after the key goes up, aimed at the row that had focus.
      const late = rightClick(screen.getByTestId("row"), 7, 9);
      expect(late.defaultPrevented).toBe(true);
      await user.keyboard("{/ContextMenu}");
      expect(menus()).toHaveLength(1);
      expect(point(menu)).toEqual(before);
    });

    it("treats a contextmenu event at (0, 0) as keyboard origin", async () => {
      render(<Row />);
      const row = screen.getByTestId("row");
      row.focus();
      const event = rightClick(row, 0, 0, { button: 0 });
      expect(event.defaultPrevented).toBe(true);
      await screen.findByRole("menu");
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus());
    });

    it("treats a point outside the target's box as keyboard origin", async () => {
      render(<Row />);
      const row = screen.getByTestId("row");
      row.getBoundingClientRect = () =>
        ({ x: 0, y: 0, left: 0, top: 0, right: 20, bottom: 20, width: 20, height: 20 }) as DOMRect;
      rightClick(row, 300, 300);
      await screen.findByRole("menu");
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus());
    });

    it("anchors to the area itself when it is the focused element", async () => {
      const user = userEvent.setup();
      render(<Row tabIndex={0} />);
      await user.tab();
      expect(area()).toHaveFocus();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus());
    });

    it("does not react to F10 without Shift or to Shift+F10 with another modifier", async () => {
      const user = userEvent.setup();
      render(<Row />);
      await user.tab();
      await user.keyboard("{F10}");
      await user.keyboard("{Control>}{Shift>}{F10}{/Shift}{/Control}");
      expect(menus()).toHaveLength(0);
    });

    it("follows the focused element and stays when the page scrolls", async () => {
      const user = userEvent.setup();
      render(<Row />);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      fireEvent.scroll(document);
      fireEvent(window, new Event("resize"));
      expect(menus()).toHaveLength(1);
    });

    it("opens again from the keyboard while already open and takes the first item", async () => {
      const user = userEvent.setup();
      render(<Row />);
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveFocus());
      screen.getByTestId("row").focus();
      await user.keyboard(SHIFT_F10);
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus());
      expect(menus()).toHaveLength(1);
    });
  });

  describe("menu keys and focus return", () => {
    it("moves with the arrow keys, Home and End as Dropdown does", async () => {
      const user = userEvent.setup();
      render(<Row />);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus());
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
      await user.keyboard("{End}");
      expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
      await user.keyboard("{Home}");
      expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    });

    it("moves from the menu itself into the items with the arrow keys", async () => {
      const user = userEvent.setup();
      render(<Row />);
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveFocus());
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus();
    });

    it("jumps to an item by typing its first letters", async () => {
      const user = userEvent.setup();
      render(<Row />);
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveFocus());
      await user.keyboard("r");
      expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
    });

    it("closes on Escape and returns focus to the element that had it", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Row onOpenChange={onOpenChange} />);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await user.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "escape");
      expect(screen.getByTestId("row")).toHaveFocus();
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
      expect(area()).toHaveAttribute("data-state", "closed");
    });

    it("returns focus after a pointer open too", async () => {
      const user = userEvent.setup();
      render(<Row />);
      screen.getByTestId("row").focus();
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      await user.keyboard("{Escape}");
      expect(screen.getByTestId("row")).toHaveFocus();
    });

    it("choosing an item runs it, closes and returns focus", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();
      render(<Row items={items(onSelect)} onOpenChange={onOpenChange} />);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await user.keyboard("{ArrowDown}{Enter}");
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "select");
      expect(screen.getByTestId("row")).toHaveFocus();
    });

    it("Tab closes the menu and puts focus back before the browser moves on", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <>
          <Row onOpenChange={onOpenChange} />
          <button type="button">after</button>
        </>,
      );
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await user.tab();
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "tab");
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    });

    it("leaves focus where an outside press put it", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <>
          <Row onOpenChange={onOpenChange} />
          <button type="button">elsewhere</button>
        </>,
      );
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await user.click(screen.getByRole("button", { name: "elsewhere" }));
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "outside");
      expect(screen.getByRole("button", { name: "elsewhere" })).toHaveFocus();
    });

    it("returns focus to the area when nothing had it and the area is focusable", async () => {
      const user = userEvent.setup();
      render(<Row tabIndex={-1} />);
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      await user.keyboard("{Escape}");
      expect(area()).toHaveFocus();
    });

    it("restoreFocus false lets an item move focus itself", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Row
            restoreFocus={false}
            items={[
              {
                label: "Rename",
                onSelect: () => {
                  screen.getByLabelText("name").focus();
                },
              },
            ]}
          />
          <input aria-label="name" />
        </>,
      );
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await user.keyboard("{Enter}");
      expect(screen.getByLabelText("name")).toHaveFocus();
    });

    it("restoreFocus as a function decides per reason and may return an element", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Row restoreFocus={() => screen.getByLabelText("name")} />
          <input aria-label="name" />
        </>,
      );
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await user.keyboard("{Escape}");
      expect(screen.getByLabelText("name")).toHaveFocus();
    });

    it("works with checkable items, radios, icons and a submenu through MenuItems", async () => {
      const user = userEvent.setup();
      function Rich() {
        const [grid, setGrid] = useState(false);
        const [sort, setSort] = useState("name");
        return (
          <ContextMenu
            data-testid="area"
            label="View"
            items={[
              { label: "Show grid", checked: grid, onCheckedChange: setGrid, icon: "格" },
              {
                radios: {
                  label: "Sort by",
                  value: sort,
                  onValueChange: setSort,
                  options: [
                    { value: "name", label: "Name" },
                    { value: "date", label: "Date" },
                  ],
                },
              },
              { label: "Move to", items: [{ label: "Documents" }, { label: "Desktop" }] },
            ]}
          >
            <button type="button">canvas</button>
          </ContextMenu>
        );
      }
      render(<Rich />);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      const grid = await screen.findByRole("menuitemcheckbox", { name: /Show grid/ });
      expect(grid).toHaveAttribute("aria-checked", "false");
      await user.click(grid);
      expect(grid).toHaveAttribute("aria-checked", "true");
      expect(menus()).toHaveLength(1);
      await user.click(screen.getByRole("menuitemradio", { name: "Date" }));
      expect(screen.getByRole("menuitemradio", { name: "Date" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      const sub = screen.getByRole("menuitem", { name: /Move to/ });
      expect(sub).toHaveAttribute("aria-haspopup", "menu");
      sub.focus();
      await user.keyboard("{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: "Documents" })).toBeInTheDocument();
      expect(menus()).toHaveLength(2);
    });
  });

  describe("dismissal", () => {
    it("closes on a left press outside and swallows the click of that press", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const onClick = vi.fn();
      render(
        <>
          <Row onOpenChange={onOpenChange} />
          <button type="button" onClick={onClick}>
            under
          </button>
        </>,
      );
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      await user.click(screen.getByRole("button", { name: "under" }));
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "outside");
      expect(onClick).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
      // Only that one click: the next one goes through.
      await user.click(screen.getByRole("button", { name: "under" }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("stops swallowing after a press that never clicks", async () => {
      vi.useFakeTimers();
      const onClick = vi.fn();
      render(
        <>
          <Row />
          <button type="button" onClick={onClick}>
            under
          </button>
        </>,
      );
      rightClick(screen.getByTestId("row"));
      pointerDown(screen.getByRole("button", { name: "under" }));
      pointerEvent("pointerup", { pointerType: "mouse" });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      fireEvent.click(screen.getByRole("button", { name: "under" }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("closes on a left press inside the area", async () => {
      const onOpenChange = vi.fn();
      render(<Row onOpenChange={onOpenChange} />);
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      pointerDown(screen.getByTestId("row"), { button: 0 });
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "outside");
    });

    it("closes a pointer menu when the page scrolls, but not for a scroll inside the menu", async () => {
      const onOpenChange = vi.fn();
      render(<Row onOpenChange={onOpenChange} />);
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      fireEvent.scroll(menu);
      expect(menus()).toHaveLength(1);
      fireEvent.scroll(document);
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "outside");
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
    });

    it("closes a pointer menu on resize", async () => {
      const onOpenChange = vi.fn();
      render(<Row onOpenChange={onOpenChange} />);
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      fireEvent(window, new Event("resize"));
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "outside");
    });

    it("lets the next right-click elsewhere reach the page", async () => {
      render(
        <>
          <Row />
          <p data-testid="page">page</p>
        </>,
      );
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      pointerDown(screen.getByTestId("page"), { button: 2 });
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
      const event = rightClick(screen.getByTestId("page"));
      expect(event.defaultPrevented).toBe(false);
    });

    it("cancels the browser menu on top of its own", async () => {
      render(<Row />);
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      const event = rightClick(screen.getByRole("menuitem", { name: /Rename/ }));
      expect(event.defaultPrevented).toBe(true);
      expect(menu).toBeInTheDocument();
    });

    it("closes when it becomes disabled while open", async () => {
      const { rerender } = render(<Row />);
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      rerender(<Row disabled />);
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
    });
  });

  describe("when the browser menu stays", () => {
    it("does nothing when disabled", () => {
      render(<Row disabled />);
      expect(area()).toHaveAttribute("data-disabled");
      const event = rightClick(screen.getByTestId("row"));
      expect(event.defaultPrevented).toBe(false);
      expect(menus()).toHaveLength(0);
    });

    it("does nothing with no items", async () => {
      const user = userEvent.setup();
      render(<Row items={[]} />);
      const event = rightClick(screen.getByTestId("row"));
      expect(event.defaultPrevented).toBe(false);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      expect(menus()).toHaveLength(0);
    });

    it("leaves inputs, textareas, selects and contenteditable alone", () => {
      render(
        <ContextMenu items={items()} data-testid="area">
          <input aria-label="name" />
          <textarea aria-label="notes" />
          <select aria-label="kind">
            <option>a</option>
          </select>
          <div contentEditable suppressContentEditableWarning data-testid="editable">
            <span data-testid="inner">text</span>
          </div>
          <div contentEditable="false" data-testid="locked">
            locked
          </div>
        </ContextMenu>,
      );
      for (const el of [
        screen.getByLabelText("name"),
        screen.getByLabelText("notes"),
        screen.getByLabelText("kind"),
        screen.getByTestId("inner"),
      ]) {
        expect(rightClick(el).defaultPrevented).toBe(false);
      }
      expect(menus()).toHaveLength(0);
      expect(rightClick(screen.getByTestId("locked")).defaultPrevented).toBe(true);
    });

    it("ignores Shift+F10 in a text field", async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu items={items()} data-testid="area">
          <input aria-label="name" />
        </ContextMenu>,
      );
      await user.tab();
      await user.keyboard(SHIFT_F10);
      expect(menus()).toHaveLength(0);
    });

    it("honours a custom native selector", () => {
      render(
        <ContextMenu items={items()} native="a[href]" data-testid="area">
          <a href="#x">link</a>
          <input aria-label="name" />
        </ContextMenu>,
      );
      expect(rightClick(screen.getByRole("link")).defaultPrevented).toBe(false);
      // The default is replaced, not extended.
      expect(rightClick(screen.getByLabelText("name")).defaultPrevented).toBe(true);
    });

    it("keeps the browser menu on Shift+right-click but still opens with Shift+F10", async () => {
      const user = userEvent.setup();
      render(<Row />);
      const event = rightClick(screen.getByTestId("row"), 120, 80, { shiftKey: true });
      expect(event.defaultPrevented).toBe(false);
      expect(menus()).toHaveLength(0);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      expect(await screen.findByRole("menu")).toBeInTheDocument();
    });

    it("never prevents what starts or keeps a text selection", async () => {
      // jsdom collapses the selection on any focus() call, so what is checked is that the area
      // prevents none of the events a browser starts a selection with.
      render(
        <ContextMenu items={items()} data-testid="area">
          <p data-testid="text">Select this sentence</p>
        </ContextMenu>,
      );
      const text = screen.getByTestId("text");
      for (const type of ["pointerdown", "mousedown", "mouseup", "selectstart"]) {
        const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 });
        act(() => {
          text.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(false);
      }
      rightClick(text);
      await screen.findByRole("menu");
      const touch = pointerDown(text, { pointerType: "touch" });
      expect(touch.defaultPrevented).toBe(false);
    });
  });

  describe("nesting and portals", () => {
    it("opens only the innermost menu", async () => {
      const inner = vi.fn();
      const outer = vi.fn();
      render(
        <ContextMenu
          items={[{ label: "Outer action", onSelect: outer }]}
          label="Outer"
          data-testid="area"
        >
          <ContextMenu items={[{ label: "Inner action", onSelect: inner }]} label="Inner">
            <button type="button" data-testid="deep">
              deep
            </button>
          </ContextMenu>
        </ContextMenu>,
      );
      rightClick(screen.getByTestId("deep"));
      expect(await screen.findByRole("menu", { name: "Inner" })).toBeInTheDocument();
      expect(menus()).toHaveLength(1);
    });

    it("closes the outer menu when an inner area takes over", async () => {
      render(
        <ContextMenu items={[{ label: "Outer action" }]} label="Outer" data-testid="area">
          <p data-testid="own">own</p>
          <ContextMenu items={[{ label: "Inner action" }]} label="Inner">
            <button type="button" data-testid="deep">
              deep
            </button>
          </ContextMenu>
        </ContextMenu>,
      );
      rightClick(screen.getByTestId("own"));
      await screen.findByRole("menu", { name: "Outer" });
      pointerDown(screen.getByTestId("deep"), { button: 2 });
      rightClick(screen.getByTestId("deep"));
      expect(await screen.findByRole("menu", { name: "Inner" })).toBeInTheDocument();
      await waitFor(() => {
        expect(menus()).toHaveLength(1);
      });
    });

    it("ignores an event from a modal rendered by something inside the area", async () => {
      render(
        <ContextMenu items={items()} data-testid="area">
          <Modal open onClose={() => undefined} title="Details">
            <p data-testid="in-modal">modal text</p>
          </Modal>
        </ContextMenu>,
      );
      const event = rightClick(await screen.findByTestId("in-modal"));
      expect(event.defaultPrevented).toBe(false);
      expect(menus()).toHaveLength(0);
    });

    it("works inside a modal: Escape closes the menu first, the modal stays", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="Files">
          <Row />
        </Modal>,
      );
      rightClick(await screen.findByTestId("row"));
      const menu = await screen.findByRole("menu");
      // The menu stays reachable above the modal's inert page.
      expect(menu.closest(".ol-portal")).not.toBeNull();
      await waitFor(() => expect(menu).toHaveFocus());
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("lets the app's own handler cancel it first", () => {
      render(
        <Row
          onContextMenu={(event: React.MouseEvent) => {
            event.preventDefault();
          }}
        />,
      );
      rightClick(screen.getByTestId("row"));
      expect(menus()).toHaveLength(0);
    });

    it("runs the app's keydown and pointerdown handlers too", async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      const onPointerDown = vi.fn();
      render(<Row onKeyDown={onKeyDown} onPointerDown={onPointerDown} />);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      expect(onKeyDown).toHaveBeenCalled();
      pointerDown(screen.getByTestId("row"));
      expect(onPointerDown).toHaveBeenCalled();
    });
  });

  describe("long-press", () => {
    it("opens at the press point after 500 ms and marks the area while the touch is held", async () => {
      vi.useFakeTimers();
      render(<Row />);
      touchDown(screen.getByTestId("row"), 40, 60);
      expect(area()).toHaveAttribute("data-pressing");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS - 1);
      });
      expect(menus()).toHaveLength(0);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      const menu = screen.getByRole("menu");
      expect(area()).toHaveAttribute("data-state", "open");
      // Still held.
      expect(area()).toHaveAttribute("data-pressing");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(point(menu)).toEqual({ x: "40px", y: "60px" });
      pointerEvent("pointerup");
      expect(area()).not.toHaveAttribute("data-pressing");
    });

    it("also arms for a pen", async () => {
      vi.useFakeTimers();
      render(<Row />);
      pointerDown(screen.getByTestId("row"), { pointerType: "pen", clientX: 5, clientY: 5 });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS);
      });
      expect(menus()).toHaveLength(1);
    });

    it("does not arm for the mouse", async () => {
      vi.useFakeTimers();
      render(<Row />);
      pointerDown(screen.getByTestId("row"), { pointerType: "mouse" });
      expect(area()).not.toHaveAttribute("data-pressing");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS * 2);
      });
      expect(menus()).toHaveLength(0);
    });

    it("cancels when the finger moves further than the tolerance, not before", async () => {
      vi.useFakeTimers();
      render(<Row />);
      touchDown(screen.getByTestId("row"), 40, 40);
      pointerEvent("pointermove", { clientX: 40 + LONG_PRESS_TOLERANCE, clientY: 40 });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS);
      });
      expect(menus()).toHaveLength(1);
      pointerEvent("pointerup");

      touchDown(screen.getByTestId("row"), 40, 40);
      pointerEvent("pointermove", { clientX: 40 + LONG_PRESS_TOLERANCE + 1, clientY: 40 });
      expect(area()).not.toHaveAttribute("data-pressing");
    });

    it.each([
      [
        "pointercancel",
        () => {
          pointerEvent("pointercancel");
        },
      ],
      [
        "pointerup",
        () => {
          pointerEvent("pointerup");
        },
      ],
      [
        "a scroll",
        () => {
          act(() => {
            fireEvent.scroll(document);
          });
        },
      ],
      [
        "a second finger",
        () => {
          pointerEvent("pointerdown", { pointerId: 2 });
        },
      ],
    ])("cancels on %s", async (_name, cancel) => {
      vi.useFakeTimers();
      render(<Row items={items()} />);
      touchDown(screen.getByTestId("row"));
      cancel();
      expect(area()).not.toHaveAttribute("data-pressing");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS * 2);
      });
      expect(menus()).toHaveLength(0);
    });

    it("uses the native contextmenu event of the browser's own long-press, once", async () => {
      vi.useFakeTimers();
      render(<Row />);
      touchDown(screen.getByTestId("row"), 40, 40);
      const event = rightClick(screen.getByTestId("row"), 41, 41, { button: 0 });
      expect(event.defaultPrevented).toBe(true);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS * 2);
      });
      expect(menus()).toHaveLength(1);
    });

    it("swallows the click that follows the long-press", async () => {
      vi.useFakeTimers();
      const onClick = vi.fn();
      render(
        <ContextMenu items={items()} data-testid="area">
          <button type="button" data-testid="row" onClick={onClick}>
            x
          </button>
        </ContextMenu>,
      );
      touchDown(screen.getByTestId("row"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS);
      });
      pointerEvent("pointerup");
      fireEvent.click(screen.getByTestId("row"), { detail: 1 });
      expect(onClick).not.toHaveBeenCalled();
    });

    it("accepts a delay in ms", async () => {
      vi.useFakeTimers();
      render(<Row longPress={800} />);
      touchDown(screen.getByTestId("row"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS);
      });
      expect(menus()).toHaveLength(0);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(menus()).toHaveLength(1);
    });

    it("longPress false turns it off and keeps the browser's menu for touch", async () => {
      vi.useFakeTimers();
      render(<Row longPress={false} />);
      touchDown(screen.getByTestId("row"));
      expect(area()).not.toHaveAttribute("data-pressing");
      const event = rightClick(screen.getByTestId("row"), 41, 41, { button: 0 });
      expect(event.defaultPrevented).toBe(false);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS * 2);
      });
      expect(menus()).toHaveLength(0);
      // The mouse still works.
      pointerDown(screen.getByTestId("row"), { pointerType: "mouse" });
      expect(rightClick(screen.getByTestId("row")).defaultPrevented).toBe(true);
    });

    it("does not arm in a text field or when disabled, and only the innermost area arms", async () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <ContextMenu items={items()} data-testid="area">
          <input aria-label="name" />
        </ContextMenu>,
      );
      touchDown(screen.getByLabelText("name"));
      expect(area()).not.toHaveAttribute("data-pressing");
      rerender(<Row disabled />);
      touchDown(screen.getByTestId("row"));
      expect(area()).not.toHaveAttribute("data-pressing");

      rerender(
        <ContextMenu items={items()} label="Outer" data-testid="area">
          <ContextMenu items={[{ label: "Inner action" }]} label="Inner" data-testid="inner-area">
            <button type="button" data-testid="deep">
              deep
            </button>
          </ContextMenu>
        </ContextMenu>,
      );
      touchDown(screen.getByTestId("deep"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LONG_PRESS_MS);
      });
      expect(menus()).toHaveLength(1);
      expect(screen.getByRole("menu", { name: "Inner" })).toBeInTheDocument();
    });
  });

  describe("motion", () => {
    it("takes extra classes for the menu and carries the island's reduced-motion setting", async () => {
      render(
        <div className="ol-reduce-motion">
          <Row menuClassName="ol-motion-noren" />
        </div>,
      );
      rightClick(screen.getByTestId("row"));
      const menu = await screen.findByRole("menu");
      expect(menu).toHaveClass("ol-floating", "ol-dropdown__menu", "ol-motion-noren");
      expect(menu.closest(".ol-portal")).toHaveClass("ol-reduce-motion");
      await waitFor(() => expect(menu).toHaveAttribute("data-state", "open"));
    });

    it("keeps the menu mounted through its exit and unmounts it afterwards", async () => {
      const user = userEvent.setup();
      render(<Row />);
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
    });

    it("reopens in place if asked again during the exit", async () => {
      vi.useFakeTimers();
      render(<Row />);
      rightClick(screen.getByTestId("row"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      fireEvent.keyDown(document.body, { key: "Escape" });
      rightClick(screen.getByTestId("row"), 10, 10);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(menus()).toHaveLength(1);
      expect(screen.getByRole("menu")).toHaveAttribute("data-state", "open");
    });
  });

  describe("review fixes", () => {
    const box = (left: number, top: number, right: number, bottom: number) =>
      ({
        x: left,
        y: top,
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        toJSON: () => ({}),
      }) as DOMRect;

    it("keeps a real right-click outside its target's box as a pointer open", async () => {
      render(<Row />);
      const row = screen.getByTestId("row");
      row.getBoundingClientRect = () => box(0, 0, 20, 20);
      // A list marker or a thick stroke is hit outside the element's box, after a press.
      pointerDown(row, { button: 2 });
      rightClick(row, 300, 300);
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveFocus());
      expect(document.querySelector("[data-highlighted]")).toBeNull();
      expect(menu).toHaveAttribute("data-side", "right");
    });

    it("still treats the same point as keyboard origin when no press came before it", async () => {
      render(<Row />);
      const row = screen.getByTestId("row");
      row.getBoundingClientRect = () => box(0, 0, 20, 20);
      pointerDown(row, { button: 2 });
      rightClick(row, 5, 5);
      await screen.findByRole("menu");
      fireEvent.keyDown(document.body, { key: "Escape" });
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
      // A key press resets it: a stale press does not hide a keyboard event.
      fireEvent.keyDown(row, { key: "a" });
      rightClick(row, 300, 300);
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Open/ })).toHaveFocus());
    });

    it("forgets a handled key whose release never arrives when the window loses focus", async () => {
      const user = userEvent.setup();
      render(<Row />);
      await user.tab();
      await user.keyboard("{ContextMenu>}");
      await screen.findByRole("menu");
      fireEvent.blur(window);
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
      const event = rightClick(screen.getByTestId("row"), 60, 40);
      expect(event.defaultPrevented).toBe(true);
      const menu = await screen.findByRole("menu");
      await waitFor(() => {
        expect(point(menu).x).toBe("60px");
      });
    });

    it("does not swallow a click with no detail (a key or assistive technology)", async () => {
      const onClick = vi.fn();
      render(
        <>
          <Row />
          <button type="button" onClick={onClick}>
            under
          </button>
        </>,
      );
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      pointerDown(screen.getByRole("button", { name: "under" }));
      fireEvent.click(screen.getByRole("button", { name: "under" }), { detail: 0 });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("stops waiting for the click of a press after five seconds at most", async () => {
      vi.useFakeTimers();
      const onClick = vi.fn();
      render(
        <>
          <Row />
          <button type="button" onClick={onClick}>
            under
          </button>
        </>,
      );
      rightClick(screen.getByTestId("row"));
      // A press that is held for a long time and never released.
      pointerDown(screen.getByRole("button", { name: "under" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5001);
      });
      fireEvent.click(screen.getByRole("button", { name: "under" }), { detail: 1 });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("ignores scrolls that do not move the point and closes for the area's own scrollers", async () => {
      render(
        <>
          <div data-testid="log" />
          <div data-testid="scroller">
            <Row />
          </div>
        </>,
      );
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      fireEvent.scroll(screen.getByTestId("log"));
      expect(menus()).toHaveLength(1);
      fireEvent.scroll(screen.getByTestId("scroller"));
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
    });

    it("closes a keyboard-anchored menu when its element leaves the page", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      function Host({ shown }: { shown: boolean }) {
        return (
          <ContextMenu items={items()} label="Files" onOpenChange={onOpenChange}>
            {shown ? <button type="button">row</button> : null}
          </ContextMenu>
        );
      }
      const { rerender } = render(<Host shown />);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      rerender(<Host shown={false} />);
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenLastCalledWith(false, "outside");
      });
    });

    it("measures only the visible, top part of a tall focused element", () => {
      const tall = document.createElement("div");
      tall.getBoundingClientRect = () => box(50, -500, 400, 2000);
      const rect = elementAnchor(tall).getBoundingClientRect();
      // The viewport is 1000 x 800: the top third of it at most.
      expect([rect.left, rect.top, rect.right]).toEqual([50, 0, 400]);
      expect(rect.bottom).toBeCloseTo(800 / 3);

      const short = document.createElement("div");
      short.getBoundingClientRect = () => box(50, 100, 400, 140);
      const kept = elementAnchor(short).getBoundingClientRect();
      expect([kept.top, kept.bottom]).toEqual([100, 140]);

      const off = document.createElement("div");
      off.getBoundingClientRect = () => box(50, -900, 400, -500);
      const away = elementAnchor(off).getBoundingClientRect();
      expect([away.top, away.bottom]).toEqual([-900, -500]);
    });

    it("anchors a menu opened from a tall focused element inside the viewport", async () => {
      const user = userEvent.setup();
      render(<Row />);
      const row = screen.getByTestId("row");
      row.getBoundingClientRect = () => box(50, -500, 400, 2000);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      const menu = await screen.findByRole("menu");
      await waitFor(() => expect(menu).toHaveAttribute("data-positioned"));
      const y = Number.parseFloat(point(menu).y);
      expect(y).toBeGreaterThanOrEqual(0);
      // Hangs from the top part of what is visible, not from the element's own bottom (2000).
      expect(y).toBeLessThanOrEqual(800 / 3 + 8);
    });

    it("names the menu with the default when the label is empty", async () => {
      render(<ContextMenu items={items()} label="" data-testid="area" />);
      rightClick(area());
      expect(await screen.findByRole("menu", { name: "Context menu" })).toBeInTheDocument();
    });
  });

  describe("submenus", () => {
    const withSub = (onSelect = vi.fn()): ContextMenuItem[] => [
      { label: "Open" },
      {
        label: "Move to",
        items: [{ label: "Documents", onSelect }, { label: "Desktop" }],
      },
    ];

    async function openSub(user: ReturnType<typeof userEvent.setup>) {
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      await user.keyboard("{ArrowDown}{ArrowRight}");
      return screen.findByRole("menuitem", { name: "Documents" });
    }

    it("returns focus to the opener after choosing from a submenu", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();
      render(<Row items={withSub(onSelect)} onOpenChange={onOpenChange} />);
      await openSub(user);
      await waitFor(() =>
        expect(screen.getByRole("menuitem", { name: "Documents" })).toHaveFocus(),
      );
      await user.keyboard("{Enter}");
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "select");
      expect(screen.getByTestId("row")).toHaveFocus();
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
    });

    it("closes only the submenu on Escape, then the menu, and focus returns to the opener", async () => {
      const user = userEvent.setup();
      render(<Row items={withSub()} />);
      await openSub(user);
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(menus()).toHaveLength(1);
      });
      expect(screen.getByRole("menuitem", { name: /Move to/ })).toHaveFocus();
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
      expect(screen.getByTestId("row")).toHaveFocus();
    });

    it("closes the whole tree on Tab inside a submenu", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Row items={withSub()} onOpenChange={onOpenChange} />);
      await openSub(user);
      await user.keyboard("{Tab}");
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "tab");
      await waitFor(() => {
        expect(menus()).toHaveLength(0);
      });
    });

    it.each(["washi", "sumi"] as const)(
      "has no axe violations with a submenu open in %s",
      async (theme) => {
        const user = userEvent.setup();
        render(
          <Root theme={theme}>
            <Row items={withSub()} />
          </Root>,
        );
        await openSub(user);
        expect(menus()).toHaveLength(2);
        expect(
          await runAxe(document.body, { rules: { region: { enabled: false } } }),
        ).toHaveNoViolations();
      },
    );
  });

  describe("accessibility", () => {
    it("has no axe violations closed", async () => {
      const { container } = render(<Row />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it.each(["washi", "sumi"] as const)("has no axe violations open in %s", async (theme) => {
      render(
        <Root theme={theme}>
          <Row
            items={[
              { header: "File" },
              { label: "Open", kbd: "mod+o" },
              { label: "Show hidden", checked: true, onCheckedChange: () => undefined },
              { divider: true },
              { label: "Delete", danger: true },
            ]}
          />
        </Root>,
      );
      rightClick(screen.getByTestId("row"));
      await screen.findByRole("menu");
      expect(
        await runAxe(document.body, { rules: { region: { enabled: false } } }),
      ).toHaveNoViolations();
    });

    it("has no axe violations open from the keyboard", async () => {
      const user = userEvent.setup();
      render(<Row />);
      await user.tab();
      await user.keyboard(SHIFT_F10);
      await screen.findByRole("menu");
      expect(
        await runAxe(document.body, { rules: { region: { enabled: false } } }),
      ).toHaveNoViolations();
    });
  });
});
