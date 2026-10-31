import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useListbox } from "../../hooks/useListbox";
import { runAxe } from "../../test/axe";
import { Field } from "../Field";
import { Root } from "../Root";
import {
  Listbox,
  type ListboxActions,
  ListboxGroup,
  type ListboxItemData,
  type ListboxMultipleProps,
  ListboxOption,
  ListboxOptions,
  type ListboxSingleProps,
} from ".";

afterEach(() => {
  vi.restoreAllMocks();
});

const WOODS = ["Alder", "Birch", "Cedar", "Elm", "Oak"];

function Woods({ off = [], ...props }: Partial<ListboxSingleProps> & { off?: string[] }) {
  return (
    <Listbox label="Woods" {...props}>
      {WOODS.map((w) => (
        <ListboxOption key={w} value={w} disabled={off.includes(w)}>
          {w}
        </ListboxOption>
      ))}
    </Listbox>
  );
}

function ManyWoods({
  off = [],
  ...props
}: Omit<ListboxMultipleProps, "multiple"> & { off?: string[] }) {
  return (
    <Listbox label="Woods" multiple {...props}>
      {WOODS.map((w) => (
        <ListboxOption key={w} value={w} disabled={off.includes(w)}>
          {w}
        </ListboxOption>
      ))}
    </Listbox>
  );
}

function Grouped() {
  return (
    <Listbox label="Timber" defaultValue="oak">
      <ListboxGroup label="Hardwood">
        <ListboxOption value="oak" description="Dense, open grain" meta="12">
          Oak
        </ListboxOption>
        <ListboxOption value="walnut">Walnut</ListboxOption>
      </ListboxGroup>
      <ListboxGroup label="Softwood">
        <ListboxOption value="cedar">Cedar</ListboxOption>
        <ListboxOption value="pine" disabled>
          Pine
        </ListboxOption>
      </ListboxGroup>
    </Listbox>
  );
}

const option = (name: string) => screen.getByRole("option", { name });
const selected = (name: string) => option(name).getAttribute("aria-selected") === "true";

describe("Listbox", () => {
  describe("anatomy and ARIA", () => {
    it("is a named listbox whose options all carry aria-selected", () => {
      render(<Woods defaultValue="Cedar" />);
      const list = screen.getByRole("listbox", { name: "Woods" });
      expect(list).toHaveClass("ol-listbox");
      expect(list).not.toHaveAttribute("aria-multiselectable");
      for (const w of WOODS)
        expect(option(w)).toHaveAttribute("aria-selected", String(w === "Cedar"));
      expect(list).not.toHaveAttribute("tabindex");
    });

    it("marks multiple selection with aria-multiselectable", () => {
      render(<ManyWoods />);
      expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
    });

    it("names options by their label and describes them by description and meta; the ✓ is hidden", () => {
      render(<Grouped />);
      const oak = option("Oak");
      expect(oak).toHaveAccessibleDescription("Dense, open grain 12");
      const mark = oak.querySelector(".ol-listbox__mark");
      expect(mark).toHaveAttribute("aria-hidden", "true");
      expect(mark).toHaveTextContent("✓");
    });

    it("names groups by their heading, which is not an option", () => {
      render(<Grouped />);
      expect(screen.getByRole("group", { name: "Hardwood" })).toHaveClass("ol-listbox__group");
      expect(screen.getAllByRole("option")).toHaveLength(4);
    });

    it("marks the option highlighted when it takes focus (dom mode)", () => {
      render(<Woods />);
      expect(option("Elm")).not.toHaveAttribute("data-highlighted");
      act(() => {
        option("Elm").focus();
      });
      expect(option("Elm")).toHaveAttribute("data-highlighted");
    });

    it("lets an aria-label name an option instead of its label", () => {
      render(
        <Listbox label="Prices">
          <ListboxOption value="1" aria-label="One yen">
            ¥1
          </ListboxOption>
        </Listbox>,
      );
      const one = screen.getByRole("option", { name: "One yen" });
      expect(one).not.toHaveAttribute("aria-labelledby");
    });

    it("hides the ✓ slot with checkmark={false}", () => {
      render(<Woods checkmark={false} />);
      expect(option("Oak").querySelector(".ol-listbox__mark")).toBeNull();
    });

    it("forwards ref, className, style and other props to the root", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Listbox
          ref={ref}
          label="Woods"
          className="extra"
          style={{ color: "red" }}
          data-testid="list"
          rows={3}
        >
          <ListboxOption value="a">A</ListboxOption>
        </Listbox>,
      );
      const list = screen.getByTestId("list");
      expect(ref.current).toBe(list);
      expect(list).toHaveClass("ol-listbox", "ol-listbox--rows", "extra");
      expect(list.style.getPropertyValue("--ol-listbox-rows")).toBe("3");
      expect(list).toHaveStyle({ color: "rgb(255, 0, 0)" });
    });

    it("sets modifier classes for size, figures, boxed and divided", () => {
      render(<Woods size="m" figures boxed divided />);
      expect(screen.getByRole("listbox")).toHaveClass(
        "ol-listbox--m",
        "ol-listbox--figures",
        "ol-listbox--boxed",
        "ol-listbox--divided",
      );
    });

    it("warns in development when it has no name", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Listbox>
          <ListboxOption value="a">A</ListboxOption>
        </Listbox>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Listbox: the list needs a name"));
    });

    it("becomes a group with the locale's empty text when there are no options", () => {
      render(<Listbox label="Woods" />);
      expect(screen.queryByRole("listbox")).toBeNull();
      const group = screen.getByRole("group", { name: "Woods" });
      expect(group).toHaveAttribute("data-state", "empty");
      expect(group).toHaveTextContent("No options");
    });

    it("treats empty data and empty groups as no options, and shows custom empty content", () => {
      render(
        <Listbox label="Woods" empty="Nothing in stock">
          <ListboxOptions items={[{ label: "Hardwood", options: [] }]} />
        </Listbox>,
      );
      expect(screen.getByRole("group", { name: "Woods" })).toHaveTextContent("Nothing in stock");
    });

    it("is busy with a loading row under the options, which stay interactive", async () => {
      const user = userEvent.setup();
      render(<Woods loading />);
      const list = screen.getByRole("listbox");
      expect(list).toHaveAttribute("aria-busy", "true");
      expect(list.querySelector(".ol-listbox__loading")).toHaveTextContent("Loading");
      await user.click(option("Elm"));
      expect(selected("Elm")).toBe(true);
    });

    it("shows only the loading row when loading with no options", () => {
      render(<Listbox label="Woods" loading />);
      const group = screen.getByRole("group", { name: "Woods" });
      expect(group).toHaveTextContent("Loading");
      expect(group).not.toHaveTextContent("No options");
    });
  });

  describe("Field", () => {
    it("is named by the Field's label and takes its description and validity", () => {
      render(
        <Field label="Wood" hint="Pick one" error="Choose a wood" required>
          <Woods label={undefined} />
        </Field>,
      );
      const list = screen.getByRole("listbox", { name: "Wood" });
      expect(list).toHaveAccessibleDescription(expect.stringContaining("Pick one"));
      expect(list).toHaveAttribute("aria-invalid", "true");
      expect(list).toHaveAttribute("aria-required", "true");
    });

    it("keeps its own name inside a Field", () => {
      render(
        <Field label="Wood">
          <Woods />
        </Field>,
      );
      expect(screen.getByRole("listbox", { name: "Woods" })).toBeInTheDocument();
    });
  });

  describe("keyboard (dom focus)", () => {
    it("is one tab stop that enters on the selected option", async () => {
      const user = userEvent.setup();
      render(<Woods defaultValue="Cedar" />);
      await user.tab();
      expect(option("Cedar")).toHaveFocus();
      expect(option("Cedar")).toHaveAttribute("data-highlighted");
      await user.tab();
      expect(document.body).toHaveFocus();
    });

    it("enters on the first enabled option when nothing is selected", async () => {
      const user = userEvent.setup();
      render(<Woods off={["Alder"]} />);
      await user.tab();
      expect(option("Birch")).toHaveFocus();
    });

    it("enters on the first selected option in multiple mode", async () => {
      const user = userEvent.setup();
      render(<ManyWoods defaultValue={["Oak", "Birch"]} />);
      await user.tab();
      expect(option("Birch")).toHaveFocus();
    });

    it("moves with Up and Down, skipping disabled options and not wrapping", async () => {
      const user = userEvent.setup();
      render(<Woods off={["Birch"]} />);
      await user.tab();
      expect(fireEvent.keyDown(option("Alder"), { key: "ArrowUp" })).toBe(false);
      expect(option("Alder")).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(option("Cedar")).toHaveFocus();
      await user.keyboard("{End}");
      expect(option("Oak")).toHaveFocus();
      expect(fireEvent.keyDown(option("Oak"), { key: "ArrowDown" })).toBe(false);
      expect(option("Oak")).toHaveFocus();
      await user.keyboard("{Home}");
      expect(option("Alder")).toHaveFocus();
      expect(selected("Alder")).toBe(false);
    });

    it("wraps with loop", async () => {
      const user = userEvent.setup();
      render(<Woods loop />);
      await user.tab();
      await user.keyboard("{ArrowUp}");
      expect(option("Oak")).toHaveFocus();
    });

    it("moves by a page with Page Down and Page Up", async () => {
      const user = userEvent.setup();
      render(<Woods />);
      await user.tab();
      await user.keyboard("{PageDown}");
      expect(option("Oak")).toHaveFocus();
      await user.keyboard("{PageUp}");
      expect(option("Alder")).toHaveFocus();
    });

    it("selects with Space and Enter and reports every pick to onAction", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onAction = vi.fn();
      render(<Woods onChange={onChange} onAction={onAction} />);
      await user.tab();
      await user.keyboard("{ArrowDown} ");
      expect(onChange).toHaveBeenLastCalledWith("Birch");
      await user.keyboard("{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenLastCalledWith("Cedar");
      expect(selected("Birch")).toBe(false);
      await user.keyboard("{Enter}");
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onAction).toHaveBeenCalledTimes(3);
      expect(onAction).toHaveBeenLastCalledWith("Cedar", expect.anything());
    });

    it("selects with arrows when selectionFollowsFocus", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Woods selectionFollowsFocus onChange={onChange} />);
      await user.tab();
      await user.keyboard("{ArrowDown}");
      expect(onChange).toHaveBeenLastCalledWith("Birch");
    });

    it("jumps by typeahead without selecting", async () => {
      const user = userEvent.setup();
      render(<Woods />);
      await user.tab();
      await user.keyboard("o");
      expect(option("Oak")).toHaveFocus();
      expect(selected("Oak")).toBe(false);
    });

    it("matches typeahead against textValue (a Japanese label by its reading)", async () => {
      const user = userEvent.setup();
      render(
        <Listbox label="都市">
          <ListboxOption value="tokyo" textValue="toukyou">
            東京
          </ListboxOption>
          <ListboxOption value="kyoto" textValue="kyouto">
            京都
          </ListboxOption>
          <ListboxOption value="osaka" textValue="oosaka">
            大阪
          </ListboxOption>
        </Listbox>,
      );
      await user.tab();
      await user.keyboard("ky");
      expect(option("京都")).toHaveFocus();
    });

    it("leaves typing to the page with typeahead={false}", async () => {
      const user = userEvent.setup();
      render(<Woods typeahead={false} />);
      await user.tab();
      await user.keyboard("o");
      expect(option("Alder")).toHaveFocus();
    });

    it("leaves Left, Right and Escape to the container", async () => {
      const user = userEvent.setup();
      render(<Woods />);
      await user.tab();
      for (const key of ["ArrowLeft", "ArrowRight", "Escape"]) {
        expect(fireEvent.keyDown(option("Alder"), { key })).toBe(true);
      }
    });

    it("is not a tab stop when disabled and selects nothing", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Woods disabled defaultValue="Elm" />
          <button type="button">After</button>
        </>,
      );
      expect(screen.getByRole("listbox")).toHaveAttribute("aria-disabled", "true");
      await user.tab();
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
      await user.click(option("Oak"));
      expect(selected("Oak")).toBe(false);
      expect(selected("Elm")).toBe(true);
    });
  });

  describe("multiple", () => {
    it("Space toggles, Shift+Arrow moves and toggles, Shift+Space selects a range", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ManyWoods off={["Cedar"]} onChange={onChange} />);
      await user.tab();
      await user.keyboard(" {Shift>}{ArrowDown}{/Shift}");
      expect(onChange).toHaveBeenLastCalledWith(["Alder", "Birch"]);
      await user.keyboard("{ArrowDown}{ArrowDown}{Shift>} {/Shift}");
      expect(onChange).toHaveBeenLastCalledWith(["Alder", "Birch", "Elm", "Oak"]);
      expect(selected("Cedar")).toBe(false);
      await user.keyboard(" ");
      expect(onChange).toHaveBeenLastCalledWith(["Alder", "Birch", "Elm"]);
    });

    it("Ctrl+Shift+Home and End select from the focused option to the ends", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ManyWoods onChange={onChange} />);
      await user.tab();
      await user.keyboard("{ArrowDown}{ArrowDown}{Control>}{Shift>}{End}{/Shift}{/Control}");
      expect(onChange).toHaveBeenLastCalledWith(["Cedar", "Elm", "Oak"]);
      expect(option("Oak")).toHaveFocus();
      await user.keyboard("{ArrowUp}{Control>}{Shift>}{Home}{/Shift}{/Control}");
      expect(onChange).toHaveBeenLastCalledWith(["Cedar", "Elm", "Oak", "Alder", "Birch"]);
    });

    it("Ctrl+A selects all enabled options and announces it; again clears", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ManyWoods off={["Elm"]} onChange={onChange} />);
      await user.tab();
      await user.keyboard("{Control>}a{/Control}");
      expect(onChange).toHaveBeenLastCalledWith(["Alder", "Birch", "Cedar", "Oak"]);
      expect(screen.getByRole("status")).toHaveTextContent("4 selected");
      await user.keyboard("{Control>}a{/Control}");
      expect(onChange).toHaveBeenLastCalledWith([]);
      expect(screen.getByRole("status")).toHaveTextContent("0 selected");
    });

    it("does not announce single toggles, nor anything with announce={false}", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<ManyWoods />);
      await user.tab();
      await user.keyboard(" ");
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
      unmount();
      render(<ManyWoods announce={false} />);
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("keeps the value in the order the options were chosen", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ManyWoods onChange={onChange} />);
      await user.click(option("Oak"));
      await user.click(option("Alder"));
      await user.click(option("Elm"));
      expect(onChange).toHaveBeenLastCalledWith(["Oak", "Alder", "Elm"]);
      await user.click(option("Alder"));
      expect(onChange).toHaveBeenLastCalledWith(["Oak", "Elm"]);
    });

    it("Shift+click selects the range from the last pick", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ManyWoods off={["Cedar"]} onChange={onChange} />);
      await user.click(option("Birch"));
      await user.keyboard("{Shift>}");
      await user.click(option("Oak"));
      await user.keyboard("{/Shift}");
      expect(onChange).toHaveBeenLastCalledWith(["Birch", "Elm", "Oak"]);
    });
  });

  describe("pointer and value", () => {
    it("keeps the selection on a second pick unless deselectable", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { unmount } = render(<Woods defaultValue="Oak" onChange={onChange} />);
      await user.click(option("Oak"));
      expect(selected("Oak")).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
      unmount();
      render(<Woods defaultValue="Oak" deselectable onChange={onChange} />);
      await user.click(option("Oak"));
      expect(onChange).toHaveBeenLastCalledWith(null);
      expect(selected("Oak")).toBe(false);
    });

    it("does not select a disabled option", async () => {
      const user = userEvent.setup();
      render(<Woods off={["Elm"]} />);
      expect(option("Elm")).toHaveAttribute("aria-disabled", "true");
      await user.click(option("Elm"));
      expect(selected("Elm")).toBe(false);
    });

    it("is controlled by value, with null as an empty selection", async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState<string | null>(null);
        return (
          <>
            <Woods value={value} onChange={setValue} />
            <button
              type="button"
              onClick={() => {
                setValue(null);
              }}
            >
              Clear
            </button>
          </>
        );
      }
      render(<Controlled />);
      await user.click(option("Birch"));
      expect(selected("Birch")).toBe(true);
      await user.click(screen.getByRole("button", { name: "Clear" }));
      expect(selected("Birch")).toBe(false);
    });

    it("ignores a pick that the controlled owner does not apply", async () => {
      const user = userEvent.setup();
      render(<Woods value="Alder" />);
      await user.click(option("Oak"));
      expect(selected("Alder")).toBe(true);
      expect(selected("Oak")).toBe(false);
    });

    it("renders one hidden input per selected value for name, none when disabled", () => {
      const { container, rerender } = render(
        <ManyWoods name="woods" defaultValue={["Oak", "Alder"]} />,
      );
      const inputs = () =>
        Array.from(container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')).map(
          (i) => `${i.name}=${i.value}`,
        );
      expect(inputs()).toEqual(["woods=Oak", "woods=Alder"]);
      rerender(<ManyWoods name="woods" defaultValue={["Oak", "Alder"]} disabled />);
      expect(inputs()).toEqual([]);
    });
  });

  describe("actions", () => {
    it("focuses the selected option on mount with autoFocus", () => {
      // eslint-disable-next-line jsx-a11y/no-autofocus -- the behaviour under test
      render(<Woods defaultValue="Elm" autoFocus />);
      expect(option("Elm")).toHaveFocus();
    });

    it("focuses by target and scrolls by value through actionRef", () => {
      const actions = createRef<ListboxActions>();
      render(<Woods actionRef={actions} defaultValue="Cedar" />);
      expect(actions.current?.focus("last")).toBe(true);
      expect(option("Oak")).toHaveFocus();
      expect(actions.current?.focus("selected")).toBe(true);
      expect(option("Cedar")).toHaveFocus();
      expect(actions.current?.focus("Birch")).toBe(true);
      expect(option("Birch")).toHaveFocus();
      expect(actions.current?.focus("nope")).toBe(false);
      expect(() => actions.current?.scrollTo("Oak")).not.toThrow();
    });
  });

  describe("data and controller", () => {
    const items: ListboxItemData[] = [
      { value: "any", label: "Any wood" },
      {
        label: "Hardwood",
        options: [
          { value: "oak", label: "Oak", meta: "12" },
          { value: "walnut", label: "Walnut", disabled: true },
        ],
      },
      { label: "Empty", options: [] },
    ];

    it("renders options and groups from data with the same parts", () => {
      render(
        <Listbox label="Woods">
          <ListboxOptions items={items} />
        </Listbox>,
      );
      expect(screen.getAllByRole("option")).toHaveLength(3);
      expect(screen.getByRole("group", { name: "Hardwood" })).toBeInTheDocument();
      expect(screen.queryByRole("group", { name: "Empty" })).toBeNull();
      expect(option("Walnut")).toHaveAttribute("aria-disabled", "true");
      expect(option("Oak")).toHaveClass("ol-listbox__option");
    });

    it("follows a controller in virtual focus mode (focus stays in the input)", async () => {
      const user = userEvent.setup();
      const onPick = vi.fn();
      function Popup() {
        const lb = useListbox({ focus: "virtual", onSelectedChange: onPick });
        return (
          <>
            <input
              aria-label="Wood"
              role="combobox"
              aria-expanded
              aria-controls="popup-list"
              {...lb.getControllerProps()}
            />
            <Listbox controller={lb} id="popup-list" aria-label="Woods">
              <ListboxOptions items={items} />
            </Listbox>
          </>
        );
      }
      render(<Popup />);
      const input = screen.getByRole("combobox");
      await user.click(input);
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute("aria-activedescendant", option("Oak").id);
      expect(option("Oak")).toHaveAttribute("data-focus-visible");
      await user.keyboard("{Enter}");
      expect(onPick).toHaveBeenLastCalledWith(["oak"]);
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("lets a component render the options under its own root with a controller", () => {
      function Own() {
        const lb = useListbox();
        return (
          <div {...lb.getListboxProps({ "aria-label": "Woods" })} className="ol-listbox">
            <ListboxOptions items={items} controller={lb} checkmark={false} />
          </div>
        );
      }
      render(<Own />);
      expect(option("Oak").querySelector(".ol-listbox__mark")).toBeNull();
    });
  });

  describe("locale", () => {
    it.each([
      ["es", "Sin opciones", "4 seleccionados"],
      ["ja", "選択肢がありません", "4件を選択中"],
    ])("uses the %s strings", async (locale, none, count) => {
      const user = userEvent.setup();
      const { unmount } = render(
        <Root locale={locale}>
          <Listbox label="Woods" />
        </Root>,
      );
      expect(screen.getByRole("group", { name: "Woods" })).toHaveTextContent(none);
      unmount();
      render(
        <Root locale={locale}>
          <ManyWoods off={["Elm"]} />
        </Root>,
      );
      await user.tab();
      await user.keyboard("{Control>}a{/Control}");
      expect(screen.getByRole("status")).toHaveTextContent(count);
    });

    it("says 1 seleccionado in Spanish", async () => {
      const user = userEvent.setup();
      render(
        <Root locale="es">
          <ManyWoods off={["Alder", "Birch", "Cedar", "Elm"]} />
        </Root>,
      );
      await user.tab();
      await user.keyboard("{Control>}a{/Control}");
      expect(screen.getByRole("status")).toHaveTextContent(/^1 seleccionado$/);
    });
  });

  describe("axe", () => {
    it("single", async () => {
      const { container } = render(<Woods defaultValue="Oak" off={["Elm"]} />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("multiple", async () => {
      const { container } = render(<ManyWoods defaultValue={["Oak", "Alder"]} name="w" />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("grouped, with descriptions and meta", async () => {
      const { container } = render(<Grouped />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("empty", async () => {
      const { container } = render(<Listbox label="Woods" />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("loading, with and without options", async () => {
      const { container } = render(
        <>
          <Woods loading />
          <Listbox label="More woods" loading />
        </>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("with an option focused in dom mode (selected and not)", async () => {
      const user = userEvent.setup();
      const { container } = render(<Grouped />);
      await user.tab();
      expect(option("Oak")).toHaveFocus();
      expect(await runAxe(container)).toHaveNoViolations();
      await user.keyboard("{ArrowDown}");
      expect(option("Walnut")).toHaveAttribute("data-highlighted");
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("with an option highlighted in virtual mode", async () => {
      const user = userEvent.setup();
      function Popup() {
        const lb = useListbox({ focus: "virtual", defaultSelected: ["oak"] });
        return (
          <>
            <input
              aria-label="Wood"
              role="combobox"
              aria-expanded
              aria-controls="popup-axe"
              {...lb.getControllerProps()}
            />
            <Listbox controller={lb} id="popup-axe" aria-label="Woods">
              <ListboxOptions
                items={[
                  { value: "oak", label: "Oak" },
                  { value: "ash", label: "Ash" },
                ]}
              />
            </Listbox>
          </>
        );
      }
      const { container } = render(<Popup />);
      await user.click(screen.getByRole("combobox"));
      await user.keyboard("{ArrowDown}");
      expect(option("Oak")).toHaveAttribute("data-highlighted");
      expect(await runAxe(container)).toHaveNoViolations();
      await user.keyboard("{ArrowDown}");
      expect(option("Ash")).toHaveAttribute("data-focus-visible");
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("inside a Field with an error", async () => {
      const { container } = render(
        <Field label="Wood" hint="Pick one" error="Choose a wood">
          <Woods label={undefined} boxed />
        </Field>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
