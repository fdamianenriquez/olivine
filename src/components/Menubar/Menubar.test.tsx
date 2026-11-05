import { readFileSync } from "node:fs";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Menubar, type MenubarChangeReason, type MenubarItem, type MenubarProps } from "./Menubar";

const css = readFileSync("src/components/Menubar/Menubar.css", "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

interface BarProps extends Partial<MenubarProps> {
  onNew?: () => void;
  onRecent?: () => void;
  onHelp?: () => void;
  onGrid?: (checked: boolean) => void;
}

function Bar({ onNew, onRecent, onHelp, onGrid, ...props }: BarProps) {
  const [grid, setGrid] = useState(false);
  const [theme, setTheme] = useState("washi");
  const items: MenubarItem[] = [
    {
      label: "File",
      items: [
        { label: "New", kbd: "mod+n", ...(onNew ? { onSelect: onNew } : null) },
        {
          label: "Open recent",
          items: [
            { label: "report.md", ...(onRecent ? { onSelect: onRecent } : null) },
            { label: "notes.md" },
          ],
        },
        { divider: true },
        { label: "Quit" },
      ],
    },
    { label: "Edit", items: [{ label: "Undo" }, { label: "Redo" }] },
    {
      label: "View",
      items: [
        {
          label: "Show grid",
          checked: grid,
          onCheckedChange: (next) => {
            setGrid(next);
            onGrid?.(next);
          },
        },
        {
          radios: {
            label: "Theme",
            value: theme,
            onValueChange: setTheme,
            options: [
              { value: "washi", label: "Washi" },
              { value: "sumi", label: "Sumi" },
            ],
          },
        },
      ],
    },
    { label: "Help", ...(onHelp ? { onSelect: onHelp } : null) },
  ];
  return <Menubar items={items} {...props} />;
}

const entry = (name: string) => screen.getByRole("menuitem", { name });
const bar = () => screen.getByRole("menubar");

async function focusBar(user: ReturnType<typeof userEvent.setup>) {
  await user.tab();
  return entry("File");
}

describe("Menubar", () => {
  stubNoAnimations();

  it("renders the bar and its entries with menu semantics and no menu", () => {
    render(<Bar className="x" data-testid="t" />);
    expect(bar()).toHaveClass("ol-menubar", "x");
    expect(bar()).toHaveAttribute("data-testid", "t");
    expect(screen.getAllByRole("menuitem").map((el) => el.textContent)).toEqual([
      "File",
      "Edit",
      "View",
      "Help",
    ]);
    expect(entry("File")).toHaveAttribute("aria-haspopup", "menu");
    expect(entry("File")).toHaveAttribute("aria-expanded", "false");
    expect(entry("File")).not.toHaveAttribute("aria-controls");
    expect(entry("Help")).not.toHaveAttribute("aria-haspopup");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("names the bar from the locale, and from label", () => {
    const { rerender } = render(<Bar />);
    expect(screen.getByRole("menubar", { name: "Menu bar" })).toBeInTheDocument();
    rerender(<Bar label="Editor" />);
    expect(screen.getByRole("menubar", { name: "Editor" })).toBeInTheDocument();
  });

  it.each([
    ["en", "Menu bar"],
    ["es", "Barra de menús"],
    ["ja", "メニューバー"],
  ] as const)("takes the default name from the %s locale", (locale, name) => {
    render(
      <Root locale={locale}>
        <Bar />
      </Root>,
    );
    expect(screen.getByRole("menubar", { name })).toBeInTheDocument();
  });

  it("points ref to the bar", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Menubar ref={ref} items={[{ label: "Help" }]} />);
    expect(ref.current).toBe(bar());
  });

  describe("bar keyboard", () => {
    it("is one tab stop on the first enabled entry", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">before</button>
          <Bar />
          <button type="button">after</button>
        </>,
      );
      const tabindexes = screen.getAllByRole("menuitem").map((el) => el.getAttribute("tabindex"));
      expect(tabindexes).toEqual(["0", "-1", "-1", "-1"]);
      await user.tab();
      await user.tab();
      expect(entry("File")).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(entry("File")).toHaveFocus();
    });

    it("remembers the last focused entry as the tab stop", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard("{ArrowRight}{ArrowRight}");
      expect(entry("View")).toHaveFocus();
      expect(entry("View")).toHaveAttribute("tabindex", "0");
      expect(entry("File")).toHaveAttribute("tabindex", "-1");
    });

    it("moves with Left and Right, wrapping, and with Home and End", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard("{ArrowLeft}");
      expect(entry("Help")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(entry("File")).toHaveFocus();
      await user.keyboard("{End}");
      expect(entry("Help")).toHaveFocus();
      await user.keyboard("{Home}");
      expect(entry("File")).toHaveFocus();
    });

    it("skips disabled entries, and entries with no items", async () => {
      const user = userEvent.setup();
      render(
        <Menubar
          items={[
            { label: "File", items: [{ label: "New" }] },
            { label: "Edit", disabled: true, items: [{ label: "Undo" }] },
            { label: "View", items: [] },
            { label: "Help" },
          ]}
        />,
      );
      await user.tab();
      await user.keyboard("{ArrowRight}");
      expect(entry("Help")).toHaveFocus();
      expect(entry("Edit")).toHaveAttribute("aria-disabled", "true");
      expect(entry("Edit")).toHaveAttribute("data-disabled");
      expect(entry("View")).toHaveAttribute("aria-disabled", "true");
    });

    it("moves to the entry that starts with the typed letters, ignoring accents and case", async () => {
      const user = userEvent.setup();
      render(
        <Menubar
          items={[
            { label: "Archivo", items: [{ label: "Nuevo" }] },
            { label: "Édición", items: [{ label: "Deshacer" }] },
            { label: "Ver", items: [{ label: "Rejilla" }] },
          ]}
        />,
      );
      await user.tab();
      await user.keyboard("E");
      expect(screen.getByRole("menuitem", { name: "Édición" })).toHaveFocus();
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("types a prefix and cycles repeated letters", async () => {
      const user = userEvent.setup();
      render(
        <Menubar
          items={[
            { label: "Save", items: [{ label: "Now" }] },
            { label: "Search", items: [{ label: "Find" }] },
            { label: "Settings", items: [{ label: "Open" }] },
          ]}
        />,
      );
      await user.tab();
      await user.keyboard("se");
      expect(screen.getByRole("menuitem", { name: "Search" })).toHaveFocus();
    });

    it("reads textValue when the label is not plain text", async () => {
      const user = userEvent.setup();
      render(
        <Menubar
          items={[
            { label: "File", items: [{ label: "New" }] },
            { label: <b>表示</b>, textValue: "ひょうじ", items: [{ label: "Grid" }] },
            { label: "Help" },
          ]}
        />,
      );
      await user.tab();
      await user.keyboard("ひ");
      expect(screen.getByRole("menuitem", { name: "表示" })).toHaveFocus();
    });

    it("skips disabled entries when typing", async () => {
      const user = userEvent.setup();
      render(
        <Menubar
          items={[
            { label: "File", items: [{ label: "New" }] },
            { label: "Edit", disabled: true, items: [{ label: "Undo" }] },
            { label: "Export", items: [{ label: "PNG" }] },
          ]}
        />,
      );
      await user.tab();
      await user.keyboard("e");
      expect(screen.getByRole("menuitem", { name: "Export" })).toHaveFocus();
    });

    it("leaves typeahead alone while composing", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      fireEvent.keyDown(entry("File"), { key: "v", isComposing: true });
      expect(entry("File")).toHaveFocus();
    });
  });

  describe("opening", () => {
    it("opens with ArrowDown and Enter on the first item, ArrowUp on the last", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard("{ArrowDown}");
      const menu = await screen.findByRole("menu", { name: "File" });
      expect(entry("File")).toHaveAttribute("aria-expanded", "true");
      expect(entry("File")).toHaveAttribute("aria-controls", menu.id);
      expect(entry("File")).toHaveAttribute("data-state", "open");
      expect(entry("New")).toHaveFocus();
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(entry("File")).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(await screen.findByRole("menuitem", { name: "Quit" })).toHaveFocus();
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      await user.keyboard("{Enter}");
      expect(await screen.findByRole("menuitem", { name: "New" })).toHaveFocus();
    });

    it("opens with Space on the first item", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard(" ");
      expect(await screen.findByRole("menuitem", { name: "New" })).toHaveFocus();
    });

    it("opens on a click with focus on the menu, and a second click closes it", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await user.click(entry("File"));
      const menu = await screen.findByRole("menu", { name: "File" });
      expect(menu).toHaveFocus();
      await user.click(entry("File"));
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(entry("File")).toHaveAttribute("aria-expanded", "false");
    });

    it("hangs the menus above the bar with up", async () => {
      const user = userEvent.setup();
      render(<Bar up />);
      await user.click(entry("File"));
      expect(await screen.findByRole("menu")).toHaveAttribute("data-side", "top");
    });

    it("passes menuClassName to every menu", async () => {
      const user = userEvent.setup();
      render(<Bar menuClassName="ol-motion-noren" />);
      await user.click(entry("File"));
      expect(await screen.findByRole("menu")).toHaveClass(
        "ol-dropdown__menu",
        "ol-menubar__menu",
        "ol-motion-noren",
      );
    });

    it("never opens a disabled entry or one with empty items", async () => {
      const user = userEvent.setup();
      render(
        <Menubar
          items={[
            { label: "Edit", disabled: true, items: [{ label: "Undo" }] },
            { label: "View", items: [] },
          ]}
        />,
      );
      await user.click(entry("Edit"));
      await user.click(entry("View"));
      fireEvent.keyDown(entry("Edit"), { key: "ArrowDown" });
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });

  describe("pressing a cell that does nothing", () => {
    it("closes the open menu on a press on a disabled entry", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Menubar
          onValueChange={onValueChange}
          items={[
            { label: "File", items: [{ label: "New" }] },
            { label: "Edit", disabled: true, items: [{ label: "Undo" }] },
            { label: "Help", disabled: true },
          ]}
        />,
      );
      await user.click(entry("File"));
      await screen.findByRole("menu", { name: "File" });
      fireEvent.pointerDown(entry("Edit"));
      expect(onValueChange).toHaveBeenLastCalledWith(null, "outside");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
    });

    it("leaves the open menu alone when the pointer only moves over a disabled or action cell", async () => {
      const user = userEvent.setup();
      render(
        <Menubar
          items={[
            { label: "File", items: [{ label: "New" }] },
            { label: "Edit", disabled: true, items: [{ label: "Undo" }] },
            { label: "Help" },
          ]}
        />,
      );
      await user.click(entry("File"));
      await screen.findByRole("menu", { name: "File" });
      await user.hover(entry("Edit"));
      await user.hover(entry("Help"));
      expect(screen.getByRole("menu", { name: "File" })).toBeInTheDocument();
    });
  });

  describe("action entries", () => {
    it("runs onSelect on click, Enter and Space", async () => {
      const user = userEvent.setup();
      const onHelp = vi.fn();
      render(<Bar onHelp={onHelp} />);
      await user.click(entry("Help"));
      expect(onHelp).toHaveBeenCalledTimes(1);
      entry("Help").focus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
      expect(onHelp).toHaveBeenCalledTimes(3);
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("does not run a disabled action", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<Menubar items={[{ label: "Help", disabled: true, onSelect }]} />);
      await user.click(entry("Help"));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("closes the open menu when an action entry is chosen", async () => {
      const user = userEvent.setup();
      const onHelp = vi.fn();
      render(<Bar onHelp={onHelp} />);
      await user.click(entry("File"));
      await screen.findByRole("menu");
      await user.click(entry("Help"));
      expect(onHelp).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
    });
  });

  describe("switching menus", () => {
    it("switches on hover only while a menu is open", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await user.hover(entry("Edit"));
      expect(screen.queryByRole("menu")).toBeNull();
      await user.click(entry("File"));
      await screen.findByRole("menu", { name: "File" });
      await user.hover(entry("Edit"));
      const edit = await screen.findByRole("menu", { name: "Edit" });
      expect(edit).toHaveFocus();
      expect(entry("Edit")).toHaveAttribute("aria-expanded", "true");
      await waitFor(() => {
        expect(screen.queryByRole("menu", { name: "File" })).toBeNull();
      });
    });

    it("does not switch on a touch pointer", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await user.click(entry("File"));
      await screen.findByRole("menu", { name: "File" });
      fireEvent.pointerEnter(entry("Edit"), { pointerType: "touch" });
      fireEvent.pointerOver(entry("Edit"), { pointerType: "touch" });
      expect(screen.queryByRole("menu", { name: "Edit" })).toBeNull();
      expect(screen.getByRole("menu", { name: "File" })).toBeInTheDocument();
    });

    it("switches with a tap on another entry, which is not an outside press", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Bar onValueChange={onValueChange} />);
      await user.click(entry("File"));
      await screen.findByRole("menu", { name: "File" });
      fireEvent.pointerDown(entry("View"), { pointerType: "touch" });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      fireEvent.click(entry("View"), { detail: 1 });
      expect(await screen.findByRole("menu", { name: "View" })).toBeInTheDocument();
      expect(onValueChange.mock.calls).toEqual([
        ["0", "open"],
        ["2", "switch"],
      ]);
      await waitFor(() => {
        expect(screen.queryByRole("menu", { name: "File" })).toBeNull();
      });
    });

    it("closes an entry opened by hover when it is clicked", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await user.click(entry("File"));
      await screen.findByRole("menu", { name: "File" });
      await user.click(entry("Edit"));
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(entry("Edit")).toHaveAttribute("aria-expanded", "false");
    });

    it("marks the leaving and the arriving menu as instant, and the curtain plays otherwise", async () => {
      const user = userEvent.setup();
      render(<Bar menuClassName="ol-motion-noren" />);
      await user.click(entry("File"));
      const file = await screen.findByRole("menu", { name: "File" });
      expect(file).not.toHaveAttribute("data-instant");
      await user.hover(entry("Edit"));
      const edit = await screen.findByRole("menu", { name: "Edit" });
      expect(edit).toHaveAttribute("data-instant");
      await waitFor(() => {
        expect(file).not.toBeInTheDocument();
      });
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(edit).not.toHaveAttribute("data-instant");
      });
    });

    it("switches with Right and Left from a menu, wrapping, focusing the first item", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menuitem", { name: "New" });
      await user.keyboard("{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: "Undo" })).toHaveFocus();
      expect(screen.queryByRole("menu", { name: "File" })).toBeNull();
      await user.keyboard("{ArrowDown}{ArrowLeft}");
      expect(await screen.findByRole("menuitem", { name: "New" })).toHaveFocus();
      await user.keyboard("{ArrowLeft}");
      // Help is an action entry: the neighbour with a menu is View.
      expect(await screen.findByRole("menuitemcheckbox", { name: /Show grid/ })).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: "New" })).toHaveFocus();
    });

    it("skips disabled entries when switching from a menu", async () => {
      const user = userEvent.setup();
      render(
        <Menubar
          items={[
            { label: "File", items: [{ label: "New" }] },
            { label: "Edit", disabled: true, items: [{ label: "Undo" }] },
            { label: "View", items: [{ label: "Grid" }] },
          ]}
        />,
      );
      await user.tab();
      await user.keyboard("{ArrowDown}{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: "Grid" })).toHaveFocus();
    });

    it("opens a submenu with Right on its parent, and switches from a submenu leaf", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(entry("Open recent")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: "report.md" })).toHaveFocus();
      expect(screen.getByRole("menu", { name: "File" })).toBeInTheDocument();
      await user.keyboard("{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: "Undo" })).toHaveFocus();
      await waitFor(() => {
        expect(screen.queryByRole("menuitem", { name: "report.md" })).toBeNull();
      });
      expect(screen.queryByRole("menu", { name: "File" })).toBeNull();
    });

    it("closes a submenu with Left before it leaves the menu", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowRight}");
      await screen.findByRole("menuitem", { name: "report.md" });
      await user.keyboard("{ArrowLeft}");
      await waitFor(() => {
        expect(screen.queryByRole("menuitem", { name: "report.md" })).toBeNull();
      });
      expect(entry("Open recent")).toHaveFocus();
      expect(screen.getByRole("menu", { name: "File" })).toBeInTheDocument();
    });

    it("moves the open menu with the focus when arrows move along the bar", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await user.click(entry("File"));
      await screen.findByRole("menu", { name: "File" });
      entry("File").focus();
      await user.keyboard("{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: "Undo" })).toHaveFocus();
    });
  });

  describe("closing", () => {
    it("closes on Escape and returns focus to the entry", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menu");
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(entry("File")).toHaveFocus();
    });

    it("closes only the submenu on the first Escape", async () => {
      const user = userEvent.setup();
      render(<Bar />);
      await focusBar(user);
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowRight}");
      await screen.findByRole("menuitem", { name: "report.md" });
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("menuitem", { name: "report.md" })).toBeNull();
      });
      expect(screen.getByRole("menu", { name: "File" })).toBeInTheDocument();
    });

    it("closes every menu on Tab and moves on", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Bar />
          <button type="button">after</button>
        </>,
      );
      await focusBar(user);
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menu");
      await user.keyboard("{Tab}");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    });

    it("closes on Tab from the bar entry too", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <Bar onValueChange={onValueChange} />
          <button type="button">after</button>
        </>,
      );
      await user.click(entry("File"));
      await screen.findByRole("menu");
      entry("File").focus();
      await user.keyboard("{Tab}");
      expect(onValueChange).toHaveBeenLastCalledWith(null, "tab");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
    });

    it("closes on an outside press without taking focus back", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <Bar onValueChange={onValueChange} />
          <button type="button">elsewhere</button>
        </>,
      );
      await user.click(entry("File"));
      await screen.findByRole("menu");
      await user.click(screen.getByRole("button", { name: "elsewhere" }));
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(onValueChange).toHaveBeenLastCalledWith(null, "outside");
      expect(screen.getByRole("button", { name: "elsewhere" })).toHaveFocus();
    });

    it("chooses an item, closes the tree and returns focus to the bar entry", async () => {
      const user = userEvent.setup();
      const onNew = vi.fn();
      const onValueChange = vi.fn();
      render(<Bar onNew={onNew} onValueChange={onValueChange} />);
      await user.click(entry("File"));
      await user.click(await screen.findByRole("menuitem", { name: /New/ }));
      expect(onNew).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(entry("File")).toHaveFocus();
      expect(onValueChange).toHaveBeenLastCalledWith(null, "select");
    });

    it("chooses a submenu item and closes the whole tree", async () => {
      const user = userEvent.setup();
      const onRecent = vi.fn();
      render(<Bar onRecent={onRecent} />);
      await user.click(entry("File"));
      await user.click(await screen.findByRole("menuitem", { name: "Open recent" }));
      await user.click(await screen.findByRole("menuitem", { name: "report.md" }));
      expect(onRecent).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(entry("File")).toHaveFocus();
    });

    it("keeps focus where the app puts it when restoreFocus is false", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Bar
            restoreFocus={false}
            onNew={() => {
              screen.getByRole("textbox", { name: "document" }).focus();
            }}
          />
          <textarea aria-label="document" />
        </>,
      );
      await user.click(entry("File"));
      await user.click(await screen.findByRole("menuitem", { name: /New/ }));
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(screen.getByRole("textbox", { name: "document" })).toHaveFocus();
    });

    it("sends focus to the element restoreFocus returns", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Bar restoreFocus={() => document.querySelector<HTMLElement>("textarea")} />
          <textarea aria-label="document" />
        </>,
      );
      await user.click(entry("File"));
      await user.click(await screen.findByRole("menuitem", { name: /New/ }));
      await waitFor(() => {
        expect(screen.getByRole("textbox", { name: "document" })).toHaveFocus();
      });
    });

    it("keeps a checkable item's menu open", async () => {
      const user = userEvent.setup();
      const onGrid = vi.fn();
      render(<Bar onGrid={onGrid} />);
      await user.click(entry("View"));
      const grid = await screen.findByRole("menuitemcheckbox", { name: /Show grid/ });
      expect(grid).toHaveAttribute("aria-checked", "false");
      await user.click(grid);
      expect(onGrid).toHaveBeenCalledWith(true);
      expect(screen.getByRole("menuitemcheckbox", { name: /Show grid/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await user.click(screen.getByRole("menuitemradio", { name: "Sumi" }));
      expect(screen.getByRole("menuitemradio", { name: "Sumi" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(screen.getByRole("menu", { name: "View" })).toBeInTheDocument();
    });
  });

  describe("value", () => {
    it("opens the entry named by defaultValue", async () => {
      render(<Bar defaultValue="1" />);
      expect(await screen.findByRole("menu", { name: "Edit" })).toBeInTheDocument();
      expect(entry("Edit")).toHaveAttribute("aria-expanded", "true");
    });

    it("keys an entry by its id", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Menubar
          onValueChange={onValueChange}
          items={[{ id: "file", label: "File", items: [{ label: "New" }] }]}
        />,
      );
      await user.click(entry("File"));
      expect(onValueChange).toHaveBeenCalledWith("file", "open");
    });

    it("follows a controlled value and reports the changes it asks for", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn<(value: string | null, reason: MenubarChangeReason) => void>();
      const { rerender } = render(<Bar value={null} onValueChange={onValueChange} />);
      await user.click(entry("File"));
      expect(onValueChange).toHaveBeenCalledWith("0", "open");
      expect(screen.queryByRole("menu")).toBeNull();
      rerender(<Bar value="2" onValueChange={onValueChange} />);
      expect(await screen.findByRole("menu", { name: "View" })).toBeInTheDocument();
      rerender(<Bar value="1" onValueChange={onValueChange} />);
      expect(await screen.findByRole("menu", { name: "Edit" })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole("menu", { name: "View" })).toBeNull();
      });
      await user.keyboard("{Escape}");
      expect(onValueChange).toHaveBeenLastCalledWith(null, "escape");
      expect(screen.getByRole("menu", { name: "Edit" })).toBeInTheDocument();
      rerender(<Bar value={null} onValueChange={onValueChange} />);
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
    });

    it("opens a menu a controlled value names from outside, with focus on the menu, and closes on null", async () => {
      const { rerender } = render(<Bar value={null} />);
      expect(screen.queryByRole("menu")).toBeNull();
      rerender(<Bar value="2" />);
      const view = await screen.findByRole("menu", { name: "View" });
      expect(view).toHaveFocus();
      rerender(<Bar value="1" />);
      const edit = await screen.findByRole("menu", { name: "Edit" });
      expect(edit).toHaveFocus();
      rerender(<Bar value={null} />);
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
    });

    it("reports Escape and switches with their reasons", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Bar onValueChange={onValueChange} />);
      await focusBar(user);
      await user.keyboard("{ArrowDown}{ArrowRight}{Escape}");
      expect(onValueChange.mock.calls).toEqual([
        ["0", "open"],
        ["1", "switch"],
        [null, "escape"],
      ]);
    });
  });

  describe("direction", () => {
    it("mirrors the arrows along the bar and between menus in RTL", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Bar />
        </div>,
      );
      await focusBar(user);
      await user.keyboard("{ArrowLeft}");
      expect(entry("Edit")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(entry("File")).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menuitem", { name: /New/ });
      await user.keyboard("{ArrowLeft}");
      expect(await screen.findByRole("menuitem", { name: "Undo" })).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: /New/ })).toHaveFocus();
    });
  });

  describe("direction, submenus", () => {
    it("opens a submenu with Left and closes it with Right in RTL", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Bar />
        </div>,
      );
      await focusBar(user);
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(entry("Open recent")).toHaveFocus();
      await user.keyboard("{ArrowLeft}");
      expect(await screen.findByRole("menuitem", { name: "report.md" })).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      await waitFor(() => {
        expect(screen.queryByRole("menuitem", { name: "report.md" })).toBeNull();
      });
      expect(entry("Open recent")).toHaveFocus();
    });
  });

  describe("context", () => {
    it("opens its menus above a modal's overlay and keeps them usable", async () => {
      const user = userEvent.setup();
      const onNew = vi.fn();
      render(
        <Modal open title="Editor" onClose={() => undefined}>
          <Bar onNew={onNew} />
        </Modal>,
      );
      await user.click(entry("File"));
      await user.click(await screen.findByRole("menuitem", { name: /New/ }));
      expect(onNew).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("switches menus with the arrows inside a modal", async () => {
      const user = userEvent.setup();
      render(
        <Modal open title="Editor" onClose={() => undefined}>
          <Bar />
        </Modal>,
      );
      entry("File").focus();
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menuitem", { name: /New/ });
      await user.keyboard("{ArrowRight}");
      expect(await screen.findByRole("menuitem", { name: "Undo" })).toHaveFocus();
    });

    it("closes only the menu on Escape inside a modal, and Tab moves on from the entry", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Modal open title="Editor" onClose={onClose}>
          <Bar />
          <button type="button">after</button>
        </Modal>,
      );
      entry("File").focus();
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menu", { name: "File" });
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(entry("File")).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menu", { name: "File" });
      await user.keyboard("{Tab}");
      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    });

    it("has no axe violations closed, and with a menu and a submenu open, in both themes", async () => {
      for (const theme of ["washi", "sumi"] as const) {
        const user = userEvent.setup();
        const { unmount } = render(
          <Root theme={theme}>
            <main>
              <Bar />
            </main>
          </Root>,
        );
        expect(
          await runAxe(document.body, { rules: { region: { enabled: false } } }),
        ).toHaveNoViolations();
        await user.click(entry("File"));
        await user.click(await screen.findByRole("menuitem", { name: "Open recent" }));
        await screen.findByRole("menuitem", { name: "report.md" });
        expect(within(bar()).getAllByRole("menuitem")).toHaveLength(4);
        expect(
          await runAxe(document.body, { rules: { region: { enabled: false } } }),
        ).toHaveNoViolations();
        unmount();
      }
    });
  });

  describe("accessibility with a menu open", () => {
    const axeBody = () => runAxe(document.body, { rules: { region: { enabled: false } } });

    it("has no axe violations with a keyboard-opened menu, and right after an instant switch", async () => {
      for (const theme of ["washi", "sumi"] as const) {
        const user = userEvent.setup();
        const { unmount } = render(
          <Root theme={theme}>
            <main>
              <Bar menuClassName="ol-motion-noren" />
            </main>
          </Root>,
        );
        await user.tab();
        await user.keyboard("{ArrowDown}");
        await screen.findByRole("menuitem", { name: /New/ });
        expect(await axeBody()).toHaveNoViolations();
        await user.keyboard("{ArrowRight}");
        await screen.findByRole("menuitem", { name: "Undo" });
        expect(await axeBody()).toHaveNoViolations();
        unmount();
      }
    });
  });

  describe("stylesheet", () => {
    it("uses motion tokens only, and no transition on the cell so a switch is instant", () => {
      expect(css.match(/\b\d+(\.\d+)?m?s\b/g)).toBeNull();
      expect(css).not.toMatch(/transition\s*:/);
      expect(css).toMatch(/animation:\s*none/);
    });

    it("has a forced-colors block for the frame, the open cell and disabled cells", () => {
      const block = css.slice(css.indexOf("@media (forced-colors: active) {"));
      expect(block).toMatch(/border-color:\s*CanvasText/);
      expect(block).toMatch(/background:\s*Highlight/);
      expect(block).toMatch(/color:\s*HighlightText/);
      expect(block).toMatch(/color:\s*GrayText/);
      expect(block).toMatch(/box-shadow:\s*none/);
    });

    it("raises the cells on coarse pointers and inverts on hover only where hover exists", () => {
      expect(css).toMatch(
        /@media \(pointer: coarse\)\s*\{[^}]*\{[^}]*block-size:\s*var\(--control-m\)/,
      );
      expect(css).toMatch(/@media \(hover: hover\)\s*\{[^@]*:hover/);
    });
  });
});
