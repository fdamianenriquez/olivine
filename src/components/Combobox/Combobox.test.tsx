import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { runAxe } from "../../test/axe";
import { Field } from "../Field";
import { Modal } from "../Modal";
import { Root } from "../Root";
import {
  Combobox,
  type ComboboxItem,
  type ComboboxMultipleProps,
  type ComboboxSingleProps,
} from ".";
import { defaultFilter, sameText, textOf } from "./options";

afterEach(() => {
  vi.restoreAllMocks();
});

const WOODS: ComboboxItem[] = [
  { value: "alder", label: "Alder" },
  { value: "ash", label: "Ash" },
  { value: "birch", label: "Birch", disabled: true },
  { value: "cedar", label: "Cedar" },
  { value: "oak", label: "Oak" },
  { value: "walnut", label: "Walnut" },
];

function Single(props: Partial<ComboboxSingleProps>) {
  return (
    <Field label="Wood">
      <Combobox options={WOODS} {...props} />
    </Field>
  );
}

function Many(props: Partial<Omit<ComboboxMultipleProps, "multiple">>) {
  const [value, setValue] = useState<string[]>(props.defaultValue ?? []);
  return (
    <Field label="Woods">
      <Combobox
        multiple
        options={WOODS}
        value={value}
        onChange={(next) => {
          setValue(next);
          props.onChange?.(next);
        }}
        {...(props.name === undefined ? null : { name: props.name })}
        {...(props.readOnly === undefined ? null : { readOnly: props.readOnly })}
      />
    </Field>
  );
}

const input = () => screen.getByRole("combobox");
const listbox = () => screen.getByRole("listbox");
const optionNames = () =>
  within(listbox())
    .getAllByRole("option")
    .map((o) => o.textContent.replace("✓", "").trim());
const activeOption = () => {
  const id = input().getAttribute("aria-activedescendant");
  return id === null ? null : document.getElementById(id);
};
const NO_REGION = { rules: { region: { enabled: false } } };
const status = () => document.querySelector(".ol-combobox__live");

describe("Combobox", () => {
  describe("anatomy and ARIA", () => {
    it("is a closed combobox input with list autocomplete", async () => {
      const { container } = render(<Single />);
      const box = input();
      expect(box.tagName).toBe("INPUT");
      expect(box).toHaveAttribute("aria-expanded", "false");
      expect(box).toHaveAttribute("aria-autocomplete", "list");
      expect(box).toHaveAttribute("autocomplete", "off");
      expect(box).toHaveAttribute("enterkeyhint", "done");
      expect(box).not.toHaveAttribute("aria-controls");
      expect(box).toHaveAccessibleName("Wood");
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("opens a listbox named by the field label and points aria-controls at it", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.type(input(), "a");
      expect(input()).toHaveAttribute("aria-expanded", "true");
      const list = listbox();
      expect(input()).toHaveAttribute("aria-controls", list.id);
      expect(list).toHaveAccessibleName("Wood");
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("names the trigger cell from the locale and links it to the list", async () => {
      const user = userEvent.setup();
      render(<Single />);
      const trigger = screen.getByRole("button", { name: "Show options", hidden: true });
      expect(trigger).toHaveAttribute("tabindex", "-1");
      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(trigger).toHaveAttribute("aria-controls", listbox().id);
      expect(input()).toHaveFocus();
      await user.click(trigger);
      expect(input()).toHaveAttribute("aria-expanded", "false");
    });

    it("lets caller props win for type, enterKeyHint, autoComplete and inputMode", () => {
      render(
        <Combobox
          aria-label="Search"
          options={[]}
          type="search"
          enterKeyHint="search"
          autoComplete="on"
          inputMode="search"
        />,
      );
      const box = screen.getByRole("combobox");
      expect(box).toHaveAttribute("type", "search");
      expect(box).toHaveAttribute("enterkeyhint", "search");
      expect(box).toHaveAttribute("autocomplete", "on");
      expect(box).toHaveAttribute("inputmode", "search");
    });

    it("names the list from an external label for the input", async () => {
      const user = userEvent.setup();
      render(
        <>
          <label id="ext-label" htmlFor="ext">
            Timber
          </label>
          <Combobox id="ext" options={WOODS} />
        </>,
      );
      await user.type(input(), "a");
      expect(listbox()).toHaveAccessibleName("Timber");
    });

    it("keeps the trigger cell inert when disabled and hides cells when read-only", () => {
      const { unmount } = render(<Single disabled />);
      expect(screen.getByRole("button", { name: "Show options", hidden: true })).toBeDisabled();
      unmount();
      render(<Single readOnly defaultValue="oak" />);
      expect(screen.queryByRole("button", { name: "Show options", hidden: true })).toBeNull();
    });

    it("warns in development when the input has no name", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Combobox options={WOODS} />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs a name"));
    });
  });

  describe("keyboard", () => {
    it("ArrowDown opens and highlights the selected option; arrows wrap", async () => {
      const user = userEvent.setup();
      render(<Single defaultValue="oak" />);
      expect(input()).toHaveValue("Oak");
      input().focus();
      await user.keyboard("{ArrowDown}");
      expect(input()).toHaveAttribute("aria-expanded", "true");
      expect(optionNames()).toHaveLength(6);
      await waitFor(() => {
        expect(activeOption()).toHaveTextContent("Oak");
      });
      expect(activeOption()).toHaveAttribute("data-focus-visible");
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(activeOption()).toHaveTextContent("Alder");
      await user.keyboard("{ArrowUp}");
      expect(activeOption()).toHaveTextContent("Walnut");
    });

    it("ArrowUp opens on the last option and skips disabled ones", async () => {
      const user = userEvent.setup();
      render(<Single />);
      input().focus();
      await user.keyboard("{ArrowUp}");
      await waitFor(() => {
        expect(activeOption()).toHaveTextContent("Walnut");
      });
      await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
      expect(activeOption()).toHaveTextContent("Ash");
    });

    it("Alt+ArrowDown opens without a highlight and Alt+ArrowUp closes", async () => {
      const user = userEvent.setup();
      render(<Single />);
      input().focus();
      await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
      expect(input()).toHaveAttribute("aria-expanded", "true");
      expect(input()).not.toHaveAttribute("aria-activedescendant");
      await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
      expect(input()).toHaveAttribute("aria-expanded", "false");
    });

    it("Enter picks the highlighted option, sets the text and closes", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onInputChange = vi.fn();
      render(<Single onChange={onChange} onInputChange={onInputChange} />);
      await user.type(input(), "ced");
      await user.keyboard("{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenLastCalledWith("cedar");
      expect(onInputChange).toHaveBeenLastCalledWith("Cedar", "select");
      expect(input()).toHaveValue("Cedar");
      expect(input()).toHaveAttribute("aria-expanded", "false");
    });

    it("Home and End stay with the caret", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.type(input(), "oa");
      await user.keyboard("{ArrowDown}{Home}");
      expect(activeOption()).toHaveTextContent("Oak");
      expect((input() as HTMLInputElement).selectionStart).toBe(0);
    });

    it("Enter with nothing highlighted reverts, closes and never submits the form", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: Event) => {
        event.preventDefault();
      });
      render(
        <form
          onSubmit={(e) => {
            onSubmit(e.nativeEvent);
          }}
        >
          <Single defaultValue="oak" />
        </form>,
      );
      await user.clear(input());
      await user.type(input(), "wal");
      await user.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
      expect(input()).toHaveAttribute("aria-expanded", "false");
      // Emptying the input had already cleared the value.
      expect(input()).toHaveValue("");
    });

    it("Enter on a closed popup is left to the form", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: Event) => {
        event.preventDefault();
      });
      render(
        <form
          onSubmit={(e) => {
            onSubmit(e.nativeEvent);
          }}
        >
          <Single defaultValue="oak" />
          <button type="submit">Send</button>
        </form>,
      );
      input().focus();
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("Escape closes first, then reverts the text, then is left alone", async () => {
      const user = userEvent.setup();
      const outer = vi.fn();
      render(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          onKeyDown={(e) => {
            outer(e.key);
          }}
        >
          <Single defaultValue="oak" />
        </div>,
      );
      await user.type(input(), "x");
      expect(input()).toHaveValue("Oakx");
      await user.keyboard("{Escape}");
      expect(input()).toHaveAttribute("aria-expanded", "false");
      expect(input()).toHaveValue("Oakx");
      await user.keyboard("{Escape}");
      expect(input()).toHaveValue("Oak");
      expect(outer).not.toHaveBeenCalledWith("Escape");
      await user.keyboard("{Escape}");
      expect(outer).toHaveBeenCalledWith("Escape");
    });

    it("Tab leaves, closes and reverts uncommitted text", async () => {
      const user = userEvent.setup();
      const onInputChange = vi.fn();
      render(
        <>
          <Single defaultValue="oak" onInputChange={onInputChange} />
          <button type="button">Next</button>
        </>,
      );
      await user.type(input(), "zz");
      await user.tab();
      expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
      expect(input()).toHaveValue("Oak");
      expect(onInputChange).toHaveBeenLastCalledWith("Oak", "reset");
      expect(input()).toHaveAttribute("aria-expanded", "false");
    });

    it("emptying the input clears the selection at once", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single defaultValue="oak" onChange={onChange} />);
      await user.clear(input());
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("drops aria-activedescendant when the highlighted option is filtered out", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.type(input(), "a");
      await user.keyboard("{ArrowDown}");
      expect(activeOption()).toHaveTextContent("Alder");
      await user.type(input(), "sh");
      expect(input()).not.toHaveAttribute("aria-activedescendant");
      expect(optionNames()).toEqual(["Ash"]);
    });

    it("runs the caller's onKeyDown after its own, only for unprevented events", async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      render(
        <Single
          onKeyDown={(e) => {
            onKeyDown(e.key);
          }}
        />,
      );
      await user.type(input(), "o");
      await user.keyboard("{ArrowDown}");
      expect(onKeyDown).not.toHaveBeenCalledWith("ArrowDown");
      expect(onKeyDown).toHaveBeenCalledWith("o");
    });
  });

  describe("free text (allowCustomValue)", () => {
    it("commits the text on blur, and matches an option's text to its value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <>
          <Single allowCustomValue onChange={onChange} />
          <button type="button">Next</button>
        </>,
      );
      await user.type(input(), "Teak");
      await user.tab();
      expect(onChange).toHaveBeenLastCalledWith("Teak");
      expect(input()).toHaveValue("Teak");
      await user.clear(input());
      await user.type(input(), "walnut");
      await user.tab();
      expect(onChange).toHaveBeenLastCalledWith("walnut");
    });

    it("Enter with nothing highlighted closes and passes the event on unprevented", async () => {
      const user = userEvent.setup();
      const seen = vi.fn();
      const onChange = vi.fn();
      render(
        <Single
          allowCustomValue
          onChange={onChange}
          onKeyDown={(e) => {
            seen(e.key, e.defaultPrevented);
          }}
        />,
      );
      await user.type(input(), "oa");
      expect(input()).toHaveAttribute("aria-expanded", "true");
      await user.keyboard("{Enter}");
      expect(seen).toHaveBeenLastCalledWith("Enter", false);
      expect(onChange).toHaveBeenLastCalledWith("oa");
      expect(input()).toHaveAttribute("aria-expanded", "false");
    });

    it("leaves Escape on a closed popup unhandled", async () => {
      const user = userEvent.setup();
      const seen = vi.fn();
      render(
        <Single
          allowCustomValue
          onKeyDown={(e) => {
            seen(e.key);
          }}
        />,
      );
      await user.type(input(), "teak");
      await user.keyboard("{Escape}{Escape}");
      expect(input()).toHaveValue("teak");
      expect(seen).toHaveBeenCalledWith("Escape");
    });

    it("can hide the trigger and show a clear cell while there is text", async () => {
      const user = userEvent.setup();
      const onInputChange = vi.fn();
      render(
        <Single allowCustomValue showTrigger={false} clearable onInputChange={onInputChange} />,
      );
      expect(screen.queryByRole("button", { name: "Show options", hidden: true })).toBeNull();
      expect(screen.queryByRole("button", { name: "Clear", hidden: true })).toBeNull();
      await user.type(input(), "teak");
      await user.click(screen.getByRole("button", { name: "Clear", hidden: true }));
      expect(input()).toHaveValue("");
      expect(input()).toHaveFocus();
      expect(onInputChange).toHaveBeenLastCalledWith("", "clear");
    });
  });

  describe("keyboard while closed", () => {
    it("Alt+ArrowDown opens with typed text and no highlight; Alt+ArrowUp closes keeping it", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.type(input(), "ce");
      await user.keyboard("{Escape}");
      expect(input()).toHaveAttribute("aria-expanded", "false");
      await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
      expect(input()).toHaveAttribute("aria-expanded", "true");
      expect(input()).not.toHaveAttribute("aria-activedescendant");
      await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
      expect(input()).toHaveAttribute("aria-expanded", "false");
      expect(input()).toHaveValue("ce");
    });
  });

  describe("pointer", () => {
    it("highlights on mouse movement, not touch; a press keeps focus; a click picks", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      await user.click(input());
      expect(input()).toHaveAttribute("aria-expanded", "true");
      const cedar = screen.getByRole("option", { name: "Cedar" });
      fireEvent.pointerMove(cedar, { pointerType: "touch" });
      expect(cedar).not.toHaveAttribute("data-highlighted");
      fireEvent.pointerMove(cedar, { pointerType: "mouse" });
      expect(cedar).toHaveAttribute("data-highlighted");
      expect(cedar).not.toHaveAttribute("data-focus-visible");
      expect(fireEvent.mouseDown(cedar)).toBe(false);
      await user.click(cedar);
      expect(onChange).toHaveBeenCalledWith("cedar");
      expect(input()).toHaveFocus();
    });

    it("drops a pointer highlight when the user types", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      await user.click(input());
      fireEvent.pointerMove(screen.getByRole("option", { name: "Oak" }), { pointerType: "mouse" });
      await user.type(input(), "o");
      expect(input()).not.toHaveAttribute("aria-activedescendant");
      await user.keyboard("{Enter}");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("closes on a press outside", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Single />
          <p>Outside</p>
        </>,
      );
      await user.click(input());
      await user.click(screen.getByText("Outside"));
      expect(input()).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("filtering", () => {
    it("ignores case and accents", async () => {
      const user = userEvent.setup();
      render(<Combobox aria-label="Tree" options={["Árbol", "Olmo", "Haya", "Fresno"]} />);
      await user.type(input(), "ARB");
      expect(optionNames()).toEqual(["Árbol"]);
    });

    it("folds katakana to hiragana and full-width text", async () => {
      const user = userEvent.setup();
      render(<Combobox aria-label="City" options={["トウキョウ", "オオサカ", "TOKYO"]} />);
      await user.type(input(), "とうきょう");
      expect(optionNames()).toEqual(["トウキョウ"]);
      await user.clear(input());
      await user.type(input(), "ｔｏｋｙｏ");
      expect(optionNames()).toEqual(["TOKYO"]);
    });

    it("matches a textValue reading as well as the label", async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          aria-label="City"
          options={[
            { value: "tokyo", label: "東京", textValue: "とうきょう tokyo" },
            { value: "osaka", label: "大阪", textValue: "おおさか osaka" },
          ]}
        />,
      );
      await user.type(input(), "トウ");
      expect(optionNames()).toEqual(["東京"]);
      await user.clear(input());
      await user.type(input(), "osa");
      expect(optionNames()).toEqual(["大阪"]);
      await user.keyboard("{ArrowDown}{Enter}");
      expect(input()).toHaveValue("大阪");
    });

    it("drops empty groups and keeps headings of groups with matches", async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          aria-label="Wood"
          options={[
            { group: "Hardwood", options: ["Oak", "Walnut"] },
            { group: "Softwood", options: ["Cedar", "Pine"] },
          ]}
        />,
      );
      await user.type(input(), "pi");
      expect(screen.getAllByRole("group")).toHaveLength(1);
      expect(screen.getByRole("group")).toHaveAccessibleName("Softwood");
    });

    it("shows options as given with filter null, and uses a custom filter", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<Single filter={null} />);
      await user.type(input(), "zzz");
      expect(optionNames()).toHaveLength(6);
      unmount();
      render(<Single filter={(o, q) => o.value.startsWith(q)} />);
      await user.type(input(), "a");
      expect(optionNames()).toEqual(["Alder", "Ash"]);
    });

    it("announces the result count once typing settles", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.type(input(), "a");
      await waitFor(() => {
        expect(status()).toHaveTextContent("5 results available");
      });
      await user.type(input(), "sh");
      await waitFor(() => {
        expect(status()).toHaveTextContent("1 result available");
      });
    });

    it("stays silent with announceResults false", async () => {
      const user = userEvent.setup();
      render(<Single announceResults={false} />);
      await user.type(input(), "a");
      await new Promise((resolve) => setTimeout(resolve, 700));
      expect(status()?.textContent ?? "").toBe("");
    });

    it("does not announce no results while the create row shows", async () => {
      const user = userEvent.setup();
      render(<Single onCreate={() => undefined} />);
      await user.type(input(), "Teak");
      await new Promise((resolve) => setTimeout(resolve, 700));
      expect(status()).not.toHaveTextContent("No results");
    });

    it("pure helpers fold text and fall back to textValue", () => {
      expect(sameText("Árbol", "arbol")).toBe(true);
      expect(sameText("Árbol", "arbo")).toBe(false);
      expect(textOf({ value: "x", label: <b>X</b>, textValue: "Ex" })).toBe("Ex");
      expect(defaultFilter({ value: "x", label: "Ex" }, "e")).toBe(true);
    });
  });

  describe("empty, loading and create", () => {
    it("shows a status row instead of an empty listbox", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.type(input(), "zzz");
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(input()).not.toHaveAttribute("aria-controls");
      expect(screen.getByText("No results")).toBeInTheDocument();
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
      await waitFor(() => {
        expect(status()).toHaveTextContent("No results");
      });
    });

    it("emptyText null shows no popup", async () => {
      const user = userEvent.setup();
      render(<Single emptyText={null} />);
      await user.type(input(), "zzz");
      expect(input()).toHaveAttribute("aria-expanded", "false");
    });

    it("loading shows the loading row and marks the list busy", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Single loading filter={null} options={[]} />);
      await user.type(input(), "o");
      expect(screen.getByText("Loading")).toBeInTheDocument();
      expect(screen.queryByText("No results")).toBeNull();
      rerender(<Single loading filter={null} />);
      expect(listbox()).toHaveAttribute("aria-busy", "true");
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("offers a create row, highlighted when it is the only row", async () => {
      const user = userEvent.setup();
      const onCreate = vi.fn();
      render(<Single onCreate={onCreate} />);
      await user.type(input(), "oak");
      expect(screen.queryByRole("option", { name: "Create “oak”" })).toBeNull();
      await user.clear(input());
      await user.type(input(), "Teak");
      expect(activeOption()).toHaveTextContent("Create “Teak”");
      await user.keyboard("{Enter}");
      expect(onCreate).toHaveBeenCalledWith("Teak");
    });

    it("autoHighlight highlights the first match while typing", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single autoHighlight onChange={onChange} />);
      await user.type(input(), "c");
      expect(activeOption()).toHaveTextContent("Cedar");
      await user.keyboard("{Enter}");
      expect(onChange).toHaveBeenCalledWith("cedar");
    });
  });

  describe("IME composition", () => {
    it("does not filter, open or select while composing; filters at compositionend", () => {
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      const box = input();
      box.focus();
      fireEvent.compositionStart(box);
      fireEvent.change(box, { target: { value: "c" } });
      expect(box).toHaveAttribute("aria-expanded", "false");
      fireEvent.keyDown(box, { key: "ArrowDown", isComposing: true, keyCode: 229 });
      fireEvent.keyDown(box, { key: "Enter", isComposing: true, keyCode: 229 });
      expect(box).toHaveAttribute("aria-expanded", "false");
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.change(box, { target: { value: "ce" } });
      fireEvent.compositionEnd(box);
      expect(box).toHaveAttribute("aria-expanded", "true");
      expect(optionNames()).toEqual(["Cedar"]);
    });

    it("ignores the committing Enter Safari sends after compositionend", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single autoHighlight onChange={onChange} />);
      await user.type(input(), "c");
      const box = input();
      fireEvent.compositionStart(box);
      fireEvent.change(box, { target: { value: "ce" } });
      fireEvent.compositionEnd(box);
      // Same task, isComposing false: still part of the composition.
      fireEvent.keyDown(box, { key: "Enter", keyCode: 13 });
      expect(onChange.mock.calls).toEqual([]);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      fireEvent.keyDown(box, { key: "Enter", keyCode: 13 });
      expect(onChange).toHaveBeenCalledWith("cedar");
    });

    it("Backspace during composition never reaches the chips", () => {
      render(<Many defaultValue={["oak"]} />);
      const box = input();
      box.focus();
      fireEvent.compositionStart(box);
      fireEvent.keyDown(box, { key: "Backspace", isComposing: true, keyCode: 229 });
      expect(box).toHaveFocus();
      fireEvent.compositionEnd(box);
    });
  });

  describe("multiple", () => {
    it("adds chips in selection order, keeps the popup open and clears the query", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Many onChange={onChange} />);
      expect(input()).toHaveAttribute("enterkeyhint", "enter");
      await user.type(input(), "wal");
      await user.keyboard("{ArrowDown}{Enter}");
      expect(input()).toHaveValue("");
      expect(input()).toHaveAttribute("aria-expanded", "true");
      expect(listbox()).toHaveAttribute("aria-multiselectable", "true");
      expect(status()).toHaveTextContent("Walnut added");
      await user.type(input(), "ald");
      await user.keyboard("{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenLastCalledWith(["walnut", "alder"]);
      const toolbar = screen.getByRole("toolbar", { name: "Selected" });
      expect(
        within(toolbar)
          .getAllByRole("button")
          .map((b) => b.getAttribute("aria-label")),
      ).toEqual(["Remove Walnut", "Remove Alder"]);
      expect(input()).toHaveAccessibleDescription("Use the left arrow to reach selected items");
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("picking a selected option again removes it", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Many defaultValue={["oak"]} onChange={onChange} />);
      input().focus();
      await user.keyboard("{ArrowDown}");
      await user.click(screen.getByRole("option", { name: "Oak" }));
      expect(onChange).toHaveBeenLastCalledWith([]);
      expect(status()).toHaveTextContent("Oak removed");
    });

    it("ArrowLeft at the start and Backspace in an empty input move to the last chip", async () => {
      const user = userEvent.setup();
      render(<Many defaultValue={["oak", "ash"]} />);
      input().focus();
      await user.keyboard("{ArrowLeft}");
      expect(screen.getByRole("button", { name: "Remove Ash" })).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(input()).toHaveFocus();
      await user.keyboard("{Backspace}");
      expect(screen.getByRole("button", { name: "Remove Ash" })).toHaveFocus();
    });

    it("keeps ArrowLeft with the caret when there is text before it", async () => {
      const user = userEvent.setup();
      render(<Many defaultValue={["oak"]} />);
      await user.type(input(), "ce");
      await user.keyboard("{ArrowLeft}");
      expect(input()).toHaveFocus();
    });

    it("a printable key on a chip returns to the input", async () => {
      const user = userEvent.setup();
      render(<Many defaultValue={["oak", "ash"]} />);
      input().focus();
      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      expect(screen.getByRole("button", { name: "Remove Oak" })).toHaveFocus();
      await user.keyboard("c");
      expect(input()).toHaveFocus();
    });

    it("Escape closes then clears the typed query; Tab drops it", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Many defaultValue={["oak"]} />
          <button type="button">Next</button>
        </>,
      );
      await user.type(input(), "ce");
      await user.keyboard("{Escape}");
      expect(input()).toHaveAttribute("aria-expanded", "false");
      expect(input()).toHaveValue("ce");
      await user.keyboard("{Escape}");
      expect(input()).toHaveValue("");
      await user.type(input(), "wa");
      await user.tab();
      expect(input()).toHaveValue("");
      expect(screen.getByRole("button", { name: "Remove Oak" })).toBeInTheDocument();
    });

    it("Backspace on a chip removes it; focus goes to the neighbour, then the input", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Many defaultValue={["oak", "ash"]} onChange={onChange} />);
      input().focus();
      await user.keyboard("{Backspace}{Backspace}");
      expect(onChange).toHaveBeenLastCalledWith(["oak"]);
      expect(screen.getByRole("button", { name: "Remove Oak" })).toHaveFocus();
      expect(status()).toHaveTextContent("Ash removed");
      // One announcement only: the chip group's own region is off.
      expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
      await user.keyboard("{Delete}");
      expect(onChange).toHaveBeenLastCalledWith([]);
      expect(input()).toHaveFocus();
    });

    it("renders one hidden input per value", () => {
      const { container } = render(<Many defaultValue={["oak", "ash"]} name="woods" />);
      const hidden = container.querySelectorAll('input[type="hidden"][name="woods"]');
      expect(Array.from(hidden, (h) => (h as HTMLInputElement).value)).toEqual(["oak", "ash"]);
    });

    it("keeps a chip's label after the option leaves a server result", () => {
      function Server() {
        const [opts, setOpts] = useState<ComboboxItem[]>(WOODS);
        return (
          <>
            <Combobox aria-label="Woods" multiple defaultValue={["oak"]} options={opts} />
            <button
              type="button"
              onClick={() => {
                setOpts([]);
              }}
            >
              Search
            </button>
          </>
        );
      }
      render(<Server />);
      fireEvent.click(screen.getByRole("button", { name: "Search" }));
      expect(screen.getByRole("button", { name: "Remove Oak" })).toBeInTheDocument();
    });

    it("read-only shows chips without remove cells or a popup", async () => {
      const user = userEvent.setup();
      render(<Many defaultValue={["oak"]} readOnly />);
      expect(screen.queryByRole("button", { name: "Remove Oak" })).toBeNull();
      expect(screen.getByText("Oak")).toBeInTheDocument();
      await user.click(input());
      expect(input()).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("state", () => {
    it("works controlled: value and inputValue follow the owner", async () => {
      const user = userEvent.setup();
      function Owner() {
        const [value, setValue] = useState<string | null>("ash");
        const [text, setText] = useState("Ash");
        return (
          <>
            <Combobox
              aria-label="Wood"
              options={WOODS}
              value={value}
              onChange={setValue}
              inputValue={text}
              onInputChange={setText}
            />
            <button
              type="button"
              onClick={() => {
                setValue("oak");
              }}
            >
              Oak please
            </button>
            <output>{value}</output>
          </>
        );
      }
      render(<Owner />);
      await user.click(screen.getByRole("button", { name: "Oak please" }));
      expect(input()).toHaveValue("Oak");
      await user.clear(input());
      await user.type(input(), "ced");
      await user.keyboard("{ArrowDown}{Enter}");
      expect(document.querySelector("output")).toHaveTextContent("cedar");
      expect(input()).toHaveValue("Cedar");
    });

    it("open can be controlled", () => {
      const onOpenChange = vi.fn();
      render(<Combobox aria-label="Wood" options={WOODS} open onOpenChange={onOpenChange} />);
      expect(input()).toHaveAttribute("aria-expanded", "true");
      fireEvent.keyDown(input(), { key: "Escape" });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(input()).toHaveAttribute("aria-expanded", "true");
    });

    it("openOnFocus opens when the input takes focus", () => {
      render(<Single openOnFocus />);
      act(() => {
        input().focus();
      });
      expect(input()).toHaveAttribute("aria-expanded", "true");
    });

    it("renders a hidden input for the single value", async () => {
      const user = userEvent.setup();
      const { container } = render(<Single name="wood" />);
      await user.type(input(), "ced");
      await user.keyboard("{ArrowDown}{Enter}");
      expect(container.querySelector('input[name="wood"]')).toHaveValue("cedar");
    });

    it("disabled never opens and dims everything", async () => {
      const user = userEvent.setup();
      render(<Single disabled />);
      expect(input()).toBeDisabled();
      await user.click(input());
      expect(input()).toHaveAttribute("aria-expanded", "false");
      expect(document.querySelector(".ol-combobox--disabled")).not.toBeNull();
    });
  });

  describe("Field", () => {
    it("takes the field's id, description, validity and requirement", async () => {
      render(
        <Field label="Wood" hint="Pick one" error="Choose a wood" required>
          <Combobox options={WOODS} />
        </Field>,
      );
      const box = input();
      expect(box).toHaveAccessibleName(/Wood/);
      expect(box).toHaveAccessibleDescription(/Pick one/);
      expect(box).toHaveAttribute("aria-invalid", "true");
      expect(box).toHaveAttribute("aria-required", "true");
      expect(box).not.toHaveAttribute("required");
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });
  });

  describe("Modal", () => {
    it("works inside a modal; Escape closes the popup, not the modal", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Modal open title="Order" onClose={onClose}>
          <Single />
        </Modal>,
      );
      await user.type(input(), "ce");
      const option = screen.getByRole("option", { name: "Cedar" });
      expect(option.closest("[inert]")).toBeNull();
      await user.keyboard("{Escape}");
      expect(input()).toHaveAttribute("aria-expanded", "false");
      expect(onClose).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Show options", hidden: true }));
      await user.click(screen.getByRole("option", { name: "Cedar" }));
      expect(input()).toHaveValue("Cedar");
    });
  });

  describe("Modal, more", () => {
    it("passes axe with the popup open inside a modal", async () => {
      const user = userEvent.setup();
      render(
        <Modal open title="Order" onClose={() => undefined}>
          <Single />
        </Modal>,
      );
      await user.type(input(), "a");
      expect(listbox()).toBeInTheDocument();
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("Escape on a closed popup with uncommitted text reverts and keeps the modal", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Modal open title="Order" onClose={onClose}>
          <Single defaultValue="oak" />
        </Modal>,
      );
      await user.type(input(), "zz");
      await user.keyboard("{Escape}");
      expect(input()).toHaveAttribute("aria-expanded", "false");
      await user.keyboard("{Escape}");
      expect(input()).toHaveValue("Oak");
      expect(onClose).not.toHaveBeenCalled();
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("locale and motion", () => {
    function In({ locale, children }: { locale: "es" | "ja"; children: ReactNode }) {
      return <Root locale={locale}>{children}</Root>;
    }

    it("speaks Spanish and Japanese", async () => {
      const user = userEvent.setup();
      const { unmount } = render(
        <In locale="es">
          <Single />
        </In>,
      );
      expect(screen.getByRole("button", { name: "Mostrar opciones", hidden: true })).toBeDefined();
      await user.type(input(), "zzz");
      expect(screen.getByText("Sin resultados")).toBeInTheDocument();
      unmount();
      render(
        <In locale="ja">
          <Many defaultValue={["oak"]} />
        </In>,
      );
      expect(screen.getByRole("toolbar", { name: "選択済み" })).toBeDefined();
      expect(screen.getByRole("button", { name: "候補を表示", hidden: true })).toBeDefined();
    });

    it("passes axe with the popup open in Japanese", async () => {
      const user = userEvent.setup();
      render(
        <In locale="ja">
          <Field label="都市">
            <Combobox
              options={[
                { value: "tokyo", label: "東京", textValue: "とうきょう" },
                { value: "osaka", label: "大阪", textValue: "おおさか" },
              ]}
            />
          </Field>
        </In>,
      );
      await user.type(input(), "と");
      expect(listbox()).toHaveAccessibleName("都市");
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("opens and closes under reduced motion, with the noren class on the popup", async () => {
      const user = userEvent.setup();
      render(
        <div className={REDUCE_MOTION_CLASS}>
          <Single popupClassName="ol-motion-noren" />
        </div>,
      );
      await user.click(input());
      const popup = document.querySelector(".ol-combobox__popup");
      expect(popup).toHaveClass("ol-motion-noren");
      expect(popup).toHaveAttribute("data-state", "open");
      await user.keyboard("{Escape}");
      await waitFor(
        () => {
          expect(document.querySelector(".ol-combobox__popup")).toBeNull();
        },
        { timeout: 2000 },
      );
    });
  });
});
