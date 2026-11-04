import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { CommandPalette, type CommandPaletteGroup, type CommandPaletteProps } from ".";
import { highlightRuns, rankGroups } from "./search";

const calls: string[] = [];
const note = (name: string) => () => {
  calls.push(name);
};

const GROUPS: CommandPaletteGroup[] = [
  {
    label: "Actions",
    items: [
      { id: "build", label: "Start a build", kbd: "mod+b", onSelect: note("build") },
      {
        id: "visit",
        label: "Book a workshop visit",
        keywords: "appointment",
        onSelect: note("visit"),
      },
      { id: "ask", label: "Ask a luthier", onSelect: note("ask") },
    ],
  },
  {
    label: "Models",
    items: [
      { id: "norikura", label: "Norikura", meta: "Double-cut offset", onSelect: note("norikura") },
      { id: "kaichi", label: "Kaichi", meta: "Chambered slab", onSelect: note("kaichi") },
    ],
  },
  {
    label: "Orders",
    items: [{ id: "order", label: "SG-2026-0131 · Kaichi", meta: "Finishing" }],
  },
];

function Harness({
  onOpen,
  panelRef,
  ...props
}: Partial<CommandPaletteProps> & {
  onOpen?: (open: boolean) => void;
  panelRef?: React.Ref<HTMLDivElement>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open palette
      </button>
      <CommandPalette
        groups={GROUPS}
        {...props}
        ref={panelRef}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpen?.(next);
        }}
      />
    </div>
  );
}

const input = () => screen.getByRole("combobox");
const listbox = () => screen.getByRole("listbox");
const names = () =>
  within(listbox())
    .getAllByRole("option")
    .map((option) => option.textContent);
const scrimOf = (dialog: HTMLElement): HTMLElement => {
  const scrim = dialog.parentElement;
  if (!scrim) throw new Error("The dialog has no scrim");
  return scrim;
};
const optionAt = (index: number): HTMLElement => {
  const option = screen.getAllByRole("option")[index];
  if (!option) throw new Error(`No option at ${String(index)}`);
  return option;
};
const activeOption = () => {
  const id = input().getAttribute("aria-activedescendant");
  return id === null ? null : document.getElementById(id);
};
const hotkey = (init: KeyboardEventInit = { key: "k", ctrlKey: true }) =>
  fireEvent.keyDown(document.body, init);
const gone = () =>
  waitFor(
    () => {
      expect(screen.queryByRole("dialog")).toBeNull();
    },
    { timeout: 2500 },
  );

async function openPalette(user = userEvent.setup()) {
  await user.click(screen.getByRole("button", { name: "Open palette" }));
  return user;
}

describe("CommandPalette", () => {
  describe("anatomy and ARIA", () => {
    it("renders nothing while closed", () => {
      render(<CommandPalette groups={GROUPS} open={false} />);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("is a named modal dialog in a portal, unrolled with the kakejiku", async () => {
      const { container } = render(<Harness />);
      await openPalette();
      const dialog = screen.getByRole("dialog", { name: "Command palette" });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveClass("ol-cmd", "ol-kakejiku");
      expect(dialog).toHaveAttribute("data-state", "open");
      expect(container.contains(dialog)).toBe(false);
    });

    it("has a combobox input that controls a listbox and keeps the active row in aria-activedescendant", async () => {
      render(<Harness />);
      await openPalette();
      const box = input();
      expect(box.tagName).toBe("INPUT");
      expect(box).toHaveAttribute("aria-expanded", "true");
      expect(box).toHaveAttribute("aria-autocomplete", "list");
      expect(box).toHaveAttribute("aria-controls", listbox().id);
      expect(box).toHaveAccessibleName("Search commands");
      expect(activeOption()).toBe(screen.getAllByRole("option")[0]);
      expect(listbox()).toHaveAccessibleName("Results");
    });

    it("groups the options and labels each group by its heading", async () => {
      render(<Harness />);
      await openPalette();
      const groups = within(listbox()).getAllByRole("group");
      expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([null, null, null]);
      expect(groups.map((group) => group.getAttribute("aria-labelledby"))).toSatisfy(
        (ids: (string | null)[]) => ids.every((id) => id !== null && document.getElementById(id)),
      );
      expect(within(listbox()).getByRole("group", { name: "Models" })).toBeInTheDocument();
      expect(within(listbox()).getByRole("group", { name: "Orders" })).toBeInTheDocument();
    });

    it("marks exactly one option as selected", async () => {
      render(<Harness />);
      await openPalette();
      const options = screen.getAllByRole("option");
      expect(options.filter((o) => o.getAttribute("aria-selected") === "true")).toHaveLength(1);
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    it("hides row shortcuts from the name and exposes them as aria-keyshortcuts", async () => {
      render(<Harness />);
      await openPalette();
      const option = screen.getByRole("option", { name: /Start a build/ });
      expect(option).toHaveAccessibleName("Start a build");
      expect(option.getAttribute("aria-keyshortcuts")).toMatch(/B/);
      expect(option.querySelector(".ol-cmd__kbd")).toHaveAttribute("aria-hidden", "true");
    });

    it("reads the meta text with the label", async () => {
      render(<Harness />);
      await openPalette();
      expect(screen.getByRole("option", { name: "Kaichi Chambered slab" })).toBeInTheDocument();
    });

    it("forwards the ref and extra props to the dialog", async () => {
      const ref = createRef<HTMLDivElement>();
      render(<Harness panelRef={ref} className="mine" data-testid="palette" />);
      await openPalette();
      expect(ref.current).toBe(screen.getByRole("dialog"));
      expect(screen.getByTestId("palette")).toHaveClass("ol-cmd", "mine");
    });

    it("keeps the theme of the surrounding Root", async () => {
      render(
        <Root theme="sumi" locale="ja">
          <Harness />
        </Root>,
      );
      await openPalette();
      expect(screen.getByRole("dialog").closest(".ol")).toHaveAttribute("data-theme", "sumi");
    });
  });

  describe("focus", () => {
    it("moves focus into the input and returns it to the opener on close", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const opener = screen.getByRole("button", { name: "Open palette" });
      await user.click(opener);
      expect(input()).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(opener).toHaveFocus();
      await gone();
    });

    it("keeps focus in the input while moving and typing", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("{ArrowDown}{ArrowDown}ka");
      expect(input()).toHaveFocus();
    });

    it("keeps focus in the input when a row is pressed", async () => {
      render(<Harness />);
      await openPalette();
      const option = optionAt(1);
      expect(fireEvent.mouseDown(option)).toBe(false);
      expect(input()).toHaveFocus();
    });

    it("keeps Tab inside the dialog", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.tab();
      expect(input()).toHaveFocus();
      await user.tab({ shift: true });
      expect(input()).toHaveFocus();
    });

    it("wraps Shift+Tab inside the dialog without leaving the input", async () => {
      render(<Harness />);
      await openPalette();
      expect(fireEvent.keyDown(input(), { key: "Tab", shiftKey: true })).toBe(false);
      expect(fireEvent.keyDown(input(), { key: "Tab" })).toBe(false);
      expect(input()).toHaveFocus();
    });

    it("keeps focus in the input when the glyph, footer or padding is pressed", async () => {
      render(<Harness />);
      await openPalette();
      const dialog = screen.getByRole("dialog");
      for (const part of [
        dialog.querySelector(".ol-cmd__glyph"),
        dialog.querySelector(".ol-cmd__foot"),
        dialog.querySelector(".ol-cmd__search"),
        dialog,
      ]) {
        expect(fireEvent.mouseDown(part ?? dialog)).toBe(false);
      }
      expect(fireEvent.mouseDown(input())).toBe(true);
      expect(input()).toHaveFocus();
    });

    it("makes the page inert while open and releases it after", async () => {
      render(<Harness />);
      await openPalette();
      expect(document.body.children[0]).toHaveAttribute("inert");
      await userEvent.keyboard("{Escape}");
      await gone();
      expect(document.body.children[0]).not.toHaveAttribute("inert");
    });
  });

  describe("keyboard", () => {
    it("moves down and up through the rows across groups", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("{ArrowDown}");
      expect(activeOption()).toHaveTextContent("Book a workshop visit");
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(activeOption()).toHaveTextContent("Norikura");
      await user.keyboard("{ArrowUp}");
      expect(activeOption()).toHaveTextContent("Ask a luthier");
    });

    it("wraps from the last row to the first and from the first to the last", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("{ArrowUp}");
      expect(activeOption()).toHaveTextContent("SG-2026-0131");
      await user.keyboard("{ArrowDown}");
      expect(activeOption()).toHaveTextContent("Start a build");
    });

    it("runs the active row on Enter, closing the palette first", async () => {
      calls.length = 0;
      const user = userEvent.setup();
      const onOpen = vi.fn((open: boolean) => {
        calls.push(`open:${String(open)}`);
      });
      render(<Harness onOpen={onOpen} />);
      await openPalette(user);
      await user.keyboard("{ArrowDown}{Enter}");
      expect(calls).toEqual(["open:true".replace("true", "false"), "visit"]);
      await gone();
    });

    it("runs the best match when typing then pressing Enter", async () => {
      calls.length = 0;
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("norikura{Enter}");
      expect(calls).toEqual(["norikura"]);
    });

    it("clears the query on the first Escape and closes on the second", async () => {
      const user = userEvent.setup();
      const onOpen = vi.fn();
      render(<Harness onOpen={onOpen} />);
      await openPalette(user);
      await user.keyboard("kai");
      expect(input()).toHaveValue("kai");
      await user.keyboard("{Escape}");
      expect(input()).toHaveValue("");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(onOpen).not.toHaveBeenCalled();
      expect(names()).toHaveLength(6);
      await user.keyboard("{Escape}");
      expect(onOpen).toHaveBeenCalledExactlyOnceWith(false);
      await gone();
    });

    it("moves the active row back to the first on a new query", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("{ArrowDown}{ArrowDown}");
      await user.keyboard("a");
      expect(activeOption()).toBe(screen.getAllByRole("option")[0]);
    });

    it("does nothing on arrows or Enter when no row matches", async () => {
      calls.length = 0;
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("zzzz{ArrowDown}{ArrowUp}{Enter}");
      expect(calls).toEqual([]);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("ignores keys that belong to an IME composition", async () => {
      calls.length = 0;
      render(<Harness />);
      await openPalette();
      fireEvent.compositionStart(input());
      fireEvent.keyDown(input(), { key: "Enter" });
      fireEvent.keyDown(input(), { key: "Escape" });
      fireEvent.keyDown(input(), { key: "ArrowDown" });
      expect(calls).toEqual([]);
      expect(activeOption()).toHaveTextContent("Start a build");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.compositionEnd(input());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
    });
  });

  describe("pointer", () => {
    it("moves the active row with the pointer and runs a row on click", async () => {
      calls.length = 0;
      render(<Harness />);
      await openPalette();
      fireEvent.mouseMove(optionAt(4));
      expect(activeOption()).toBe(optionAt(4));
      fireEvent.click(optionAt(3));
      expect(calls).toEqual(["norikura"]);
      await gone();
    });

    it("closes when a press both starts and ends on the scrim", async () => {
      const onOpen = vi.fn();
      render(<Harness onOpen={onOpen} />);
      await openPalette();
      const scrim = scrimOf(screen.getByRole("dialog"));
      fireEvent.pointerDown(scrim);
      fireEvent.click(scrim);
      expect(onOpen).toHaveBeenCalledWith(false);
    });

    it("stays open when the press started inside the panel", async () => {
      const onOpen = vi.fn();
      render(<Harness onOpen={onOpen} />);
      await openPalette();
      const dialog = screen.getByRole("dialog");
      fireEvent.pointerDown(dialog);
      fireEvent.click(scrimOf(dialog));
      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  describe("hotkey", () => {
    it("toggles with Ctrl K", async () => {
      render(
        <Root platform="other">
          <Harness />
        </Root>,
      );
      hotkey();
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      hotkey({ key: "K", ctrlKey: true });
      await gone();
    });

    it("uses Cmd K on Apple keyboards, where Ctrl K does nothing", async () => {
      render(
        <Root platform="apple">
          <Harness />
        </Root>,
      );
      hotkey();
      expect(screen.queryByRole("dialog")).toBeNull();
      hotkey({ key: "k", metaKey: true });
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("prevents the browser's own shortcut", () => {
      render(<Harness />);
      expect(hotkey()).toBe(false);
    });

    it("ignores K alone and other modifiers", () => {
      render(<Harness />);
      hotkey({ key: "k" });
      hotkey({ key: "j", ctrlKey: true });
      hotkey({ key: "k", ctrlKey: true, altKey: true });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("takes another key, or a full shortcut", async () => {
      const { rerender } = render(<Harness hotkey="j" />);
      hotkey();
      expect(screen.queryByRole("dialog")).toBeNull();
      hotkey({ key: "j", ctrlKey: true });
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      rerender(<Harness hotkey="mod+shift+p" />);
      hotkey({ key: "P", ctrlKey: true, shiftKey: true });
    });

    it("ignores a key that is held down", () => {
      render(<Harness />);
      expect(hotkey({ key: "k", ctrlKey: true, repeat: true })).toBe(true);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("keeps a bare shortcut out of text fields", async () => {
      render(
        <div>
          <input aria-label="Notes" />
          <Harness hotkey="shift+/" />
        </div>,
      );
      const notes = screen.getByLabelText("Notes");
      notes.focus();
      fireEvent.keyDown(notes, { key: "/", shiftKey: true });
      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.keyDown(document.body, { key: "/", shiftKey: true });
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("can be turned off", () => {
      render(<Harness hotkey={false} />);
      expect(hotkey()).toBe(true);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("opens while focus is in a text field", async () => {
      render(
        <div>
          <input aria-label="Notes" />
          <Harness />
        </div>,
      );
      screen.getByLabelText("Notes").focus();
      fireEvent.keyDown(screen.getByLabelText("Notes"), { key: "k", ctrlKey: true });
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("removes the listener on unmount", () => {
      const { unmount } = render(<Harness />);
      unmount();
      expect(hotkey()).toBe(true);
    });

    it("works uncontrolled", async () => {
      render(<CommandPalette groups={GROUPS} />);
      hotkey();
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("matching and ranking", () => {
    it("matches characters in order, anywhere, and ignores case", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("nrk");
      expect(names()).toEqual(["Norikura Double-cut offset"]);
    });

    it("also searches the keywords, with no highlight", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("apptmt");
      expect(names()).toEqual(["Book a workshop visit"]);
      expect(document.querySelector(".ol-cmd__hit")).toBeNull();
    });

    it("moves the group with the best match to the top", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("kai");
      const groups = within(listbox()).getAllByRole("group");
      expect(groups.map((group) => group.firstElementChild?.textContent)).toEqual([
        "Models",
        "Orders",
        "Actions",
      ]);
      expect(activeOption()).toHaveTextContent("Kaichi");
    });

    it("drops groups with no match", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("norikura");
      expect(within(listbox()).getAllByRole("group")).toHaveLength(1);
    });

    it("highlights matched letters with the maple fill", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("kai");
      const kaichi = screen.getByRole("option", { name: /^Kaichi/ });
      const hits = [...kaichi.querySelectorAll("mark.ol-cmd__hit")].map((m) => m.textContent);
      expect(hits).toEqual(["Kai"]);
    });

    it("ignores spaces in the query", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("start b");
      expect(names()[0]).toContain("Start a build");
      expect(names()[0]).not.toContain("Book");
    });

    describe("rankGroups", () => {
      const list: CommandPaletteGroup[] = [
        {
          label: "A",
          items: [
            { id: "1", label: "Open recent" },
            { id: "2", label: "Reopen closed tab" },
            { id: "3", label: "Copy path", keywords: ["open"] },
          ],
        },
        { label: "B", items: [{ id: "4", label: "Open" }] },
      ];

      it("keeps order and everything when the query is empty or blank", () => {
        const ranked = rankGroups(list, "  ");
        expect(ranked.map((g) => g.items.map((i) => i.item.id))).toEqual([["1", "2", "3"], ["4"]]);
      });

      it("ranks the start of the label above the middle", () => {
        const group = rankGroups(list, "open").find((g) => g.label === "A");
        expect(group?.items.map((i) => i.item.id)).toEqual(["1", "2", "3"]);
      });

      it("ranks a keyword match below any label match", () => {
        const ids = rankGroups(list, "open").flatMap((g) => g.items.map((i) => i.item.id));
        expect(ids.indexOf("3")).toBeGreaterThan(ids.indexOf("2"));
      });

      it("puts the group with the best match first", () => {
        expect(rankGroups(list, "open").map((g) => g.label)).toEqual(["B", "A"]);
      });

      it("ranks word starts above the middle of a word, and runs above gaps", () => {
        const rank = (query: string, labels: string[]) =>
          rankGroups(
            [{ label: "G", items: labels.map((label) => ({ id: label, label })) }],
            query,
          )[0]?.items.map((i) => i.item.id);
        expect(rank("ab", ["Cab", "A big box"])).toEqual(["A big box", "Cab"]);
        expect(rank("kai", ["Kxaxi", "Kaichi"])).toEqual(["Kaichi", "Kxaxi"]);
      });

      it("returns the matched indices of the label", () => {
        const [group] = rankGroups(list, "ore");
        expect(group?.items[0]?.indices).toEqual([0, 5, 6]);
      });

      it("folds case, accents and kana in the list's language", () => {
        const groups: CommandPaletteGroup[] = [
          {
            label: "G",
            items: [
              { id: "cafe", label: "Café" },
              { id: "kana", label: "カフェ" },
            ],
          },
        ];
        expect(rankGroups(groups, "cafe", "es")[0]?.items.map((i) => i.item.id)).toEqual(["cafe"]);
        expect(rankGroups(groups, "かふぇ", "ja")[0]?.items.map((i) => i.item.id)).toEqual([
          "kana",
        ]);
      });
    });

    describe("highlightRuns", () => {
      it("merges neighbouring matches into one run", () => {
        expect(highlightRuns("Kaichi", [0, 1, 2])).toEqual([
          { text: "Kai", hit: true },
          { text: "chi", hit: false },
        ]);
      });

      it("keeps a grapheme whole", () => {
        expect(highlightRuns("éa", [0])).toEqual([
          { text: "é", hit: true },
          { text: "a", hit: false },
        ]);
      });

      it("returns the text untouched without indices", () => {
        expect(highlightRuns("Kaichi", [])).toEqual([{ text: "Kaichi", hit: false }]);
      });
    });
  });

  describe("empty state", () => {
    it("announces what did not match in a status region and drops the listbox", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      const status = screen.getByRole("status");
      expect(status).toBeEmptyDOMElement();
      await user.keyboard("zzz");
      expect(status).toHaveTextContent("Nothing matches: “zzz”");
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(input()).toHaveAttribute("aria-expanded", "false");
      expect(input()).not.toHaveAttribute("aria-controls");
      expect(input()).not.toHaveAttribute("aria-activedescendant");
    });

    it("brings the list back when the query is cleared", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("zzz{Escape}");
      expect(listbox()).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("shows the empty state with no groups at all", async () => {
      render(<Harness groups={[]} />);
      await openPalette();
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("No options");
      expect(status).not.toHaveTextContent("“");
    });
  });

  describe("labels and locale", () => {
    it("lets labels and placeholder override every word", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          placeholder="Buscar"
          labels={{
            name: "Paleta",
            results: "Resultados",
            empty: (q) => `Sin resultados para ${q}`,
            move: "mover",
            open: "abrir",
            close: "cerrar",
          }}
        />,
      );
      await openPalette(user);
      expect(screen.getByRole("dialog", { name: "Paleta" })).toBeInTheDocument();
      expect(input()).toHaveAccessibleName("Buscar");
      expect(listbox()).toHaveAccessibleName("Resultados");
      expect(document.querySelector(".ol-cmd__foot")).toHaveTextContent(/mover.*abrir.*cerrar/);
      await user.keyboard("zzz");
      expect(screen.getByRole("status")).toHaveTextContent("Sin resultados para zzz");
    });

    it("follows a string `empty` with the query in quotes", async () => {
      const user = userEvent.setup();
      render(<Harness labels={{ empty: "Nada" }} />);
      await openPalette(user);
      await user.keyboard("zzz");
      expect(screen.getByRole("status")).toHaveTextContent("Nada: “zzz”");
    });

    it.each([
      ["es", "Paleta de comandos", "Buscar comandos", "Sin resultados para “zzz”", "Resultados"],
      ["ja", "コマンドパレット", "コマンドを検索", "「zzz」に一致する項目はありません", "検索結果"],
    ] as const)(
      "speaks %s from the built-in dictionary and keeps the language on the layer",
      async (locale, name, placeholder, empty, results) => {
        const user = userEvent.setup();
        render(
          <Root locale={locale}>
            <Harness />
          </Root>,
        );
        await openPalette(user);
        expect(screen.getByRole("dialog", { name })).toBeInTheDocument();
        expect(input()).toHaveAccessibleName(placeholder);
        expect(input()).toHaveAttribute("placeholder", placeholder);
        expect(listbox()).toHaveAccessibleName(results);
        expect(screen.getByRole("dialog").closest(".ol-portal")).toHaveAttribute("lang", locale);
        await user.keyboard("zzz");
        expect(screen.getByRole("status")).toHaveTextContent(empty);
      },
    );

    it("reads its words from the dictionary of the nearest Root", async () => {
      const user = userEvent.setup();
      render(
        <Root
          labels={{
            commandPalette: {
              name: "Paleta de comandos",
              placeholder: "Buscar comandos",
              results: "Resultados",
              empty: (q: string) => `Nada coincide: «${q}»`,
              move: "mover",
              open: "abrir",
              close: "cerrar",
            },
          }}
        >
          <Harness />
        </Root>,
      );
      await openPalette(user);
      expect(screen.getByRole("dialog", { name: "Paleta de comandos" })).toBeInTheDocument();
      expect(input()).toHaveAccessibleName("Buscar comandos");
      await user.keyboard("zzz");
      expect(screen.getByRole("status")).toHaveTextContent("Nada coincide: «zzz»");
    });
  });

  describe("inline", () => {
    it("draws the palette in place with no dialog, scrim, esc hint or hotkey", () => {
      const { container } = render(<CommandPalette inline groups={GROUPS} />);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(container.querySelector(".ol-cmd-scrim")).toBeNull();
      expect(container.querySelector(".ol-cmd")).toHaveClass("ol-cmd--inline");
      expect(container.querySelector(".ol-cmd")).not.toHaveClass("ol-kakejiku");
      expect(input()).toBeInTheDocument();
      expect(container.querySelector(".ol-cmd__foot")).not.toHaveTextContent("close");
      hotkey();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("filters and moves like the modal, and stays after a row runs", async () => {
      calls.length = 0;
      const onOpen = vi.fn();
      const user = userEvent.setup();
      render(<CommandPalette inline groups={GROUPS} onOpenChange={onOpen} />);
      await user.click(input());
      await user.keyboard("nrk{Enter}");
      expect(calls).toEqual(["norikura"]);
      expect(onOpen).not.toHaveBeenCalled();
      expect(input()).toBeInTheDocument();
    });

    it("clears on Escape and leaves a second Escape alone", async () => {
      const user = userEvent.setup();
      render(<CommandPalette inline groups={GROUPS} />);
      await user.click(input());
      await user.keyboard("kai");
      expect(fireEvent.keyDown(input(), { key: "Escape" })).toBe(false);
      expect(input()).toHaveValue("");
      expect(fireEvent.keyDown(input(), { key: "Escape" })).toBe(true);
    });
  });

  describe("motion", () => {
    it("rolls back up while closing and unmounts when the exit ends", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      await user.keyboard("{Escape}");
      const dialog = screen.getByRole("dialog", { hidden: true });
      expect(dialog).toHaveAttribute("data-state", "closing");
      expect(dialog).toHaveAttribute("inert");
      expect(dialog.parentElement).toHaveAttribute("data-state", "closing");
      await gone();
    });

    it("opens and closes under reduced motion", async () => {
      const user = userEvent.setup();
      render(
        <div className={REDUCE_MOTION_CLASS}>
          <Harness />
        </div>,
      );
      await openPalette(user);
      expect(screen.getByRole("dialog")).toHaveClass("ol-kakejiku");
      await user.keyboard("{Escape}");
      await gone();
    });

    it("takes every duration from the motion tokens", () => {
      const css = readFileSync(
        join(process.cwd(), "src/components/CommandPalette/CommandPalette.css"),
        "utf8",
      );
      expect(css).not.toMatch(/\d(ms|s)\b/);
      expect(css).toMatch(/var\(--dur-s\)/);
    });
  });

  describe("accessibility", () => {
    it("has no axe violations open, searching and empty", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await openPalette(user);
      expect(await runAxe(document.body)).toHaveNoViolations();
      await user.keyboard("kai");
      expect(await runAxe(document.body)).toHaveNoViolations();
      await user.keyboard("zzz");
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("has no axe violations with a row made active by the pointer", async () => {
      render(<Harness />);
      await openPalette();
      fireEvent.mouseMove(optionAt(4));
      expect(activeOption()).toBe(optionAt(4));
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("has no axe violations inline", async () => {
      const { container } = render(<CommandPalette inline groups={GROUPS} />);
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
