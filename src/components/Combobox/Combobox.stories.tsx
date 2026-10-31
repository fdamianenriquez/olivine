import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useEffect, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Field } from "../Field";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Combobox, type ComboboxItem, type ComboboxOption } from "./Combobox";

const meta = {
  title: "Forms/Combobox",
  component: Combobox,
  tags: ["autodocs"],
  args: { options: [] },
  parameters: {
    docs: {
      description: {
        component: `Combobox is a text field with a popup list of suggestions that narrows as you type. Pick one option and the field shows its label; with \`multiple\`, each pick becomes a removable chip inside the field and the popup stays open. Focus stays in the input while ArrowUp/Down move a highlight; Enter picks, Escape closes (a second Escape reverts the text) and Tab leaves, reverting uncommitted text. Filtering ignores case, accents, width and the hiragana/katakana difference, and matches \`textValue\` readings. Options look like \`Listbox\` options. The popup shares the field's bottom hairline: while it is open its top edge covers the bottom of the focus ring on purpose (adjacent boxes share borders). Use \`Select\` for a short fixed list, \`Listbox\` for an always-visible list, \`Input\` for free text and \`SearchField\` for a submitted query.

- Do give the combobox a visible label through \`Field\` (or an \`aria-label\`).
- Do keep selected options in \`options\` while a server search changes the list.
- Do add \`textValue\` when \`label\` is not plain text, and a kana reading for kanji labels.
- Do use \`loading\` plus \`filter={null}\` for server search, and debounce the request in \`onInputChange\`.
- Don't use it for fewer than about five options (use \`Select\`), or to submit a search (use \`SearchField\`).
- Don't wrap it in a \`Popover\`; the popup is built in.
- Don't rely on native \`required\` validation; show the error through \`Field\`.
- Don't use chips for more than a handful of values without showing the count nearby.`,
      },
    },
  },
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

const column: CSSProperties = { width: "calc(var(--space-32) * 3)", maxWidth: "100%" };
const stack: CSSProperties = { ...column, display: "grid", gap: "var(--space-6)" };

const WOODS: ComboboxItem[] = [
  { value: "alder", label: "Alder" },
  { value: "ash", label: "Ash" },
  { value: "beech", label: "Beech" },
  { value: "birch", label: "Birch", disabled: true },
  { value: "cedar", label: "Cedar" },
  { value: "cherry", label: "Cherry" },
  { value: "elm", label: "Elm" },
  { value: "maple", label: "Maple" },
  { value: "oak", label: "Oak" },
  { value: "pine", label: "Pine" },
  { value: "walnut", label: "Walnut" },
];

const GROUPED: ComboboxItem[] = [
  { group: "Hardwood", options: ["Ash", "Beech", "Cherry", "Oak", "Walnut"] },
  { group: "Softwood", options: ["Cedar", "Fir", "Larch", "Pine", "Spruce"] },
];

const CITIES: ComboboxItem[] = [
  { value: "tokyo", label: "東京", textValue: "とうきょう tokyo" },
  { value: "kyoto", label: "京都", textValue: "きょうと kyoto" },
  { value: "osaka", label: "大阪", textValue: "おおさか osaka" },
  { value: "nara", label: "奈良", textValue: "なら nara" },
  { value: "sapporo", label: "札幌", textValue: "さっぽろ sapporo" },
  { value: "fukuoka", label: "福岡", textValue: "ふくおか fukuoka" },
];

/** One value; type to filter, arrows to move, Enter to pick. */
export const Default: Story = {
  render: () => (
    <div style={column}>
      <Field label="Wood" hint="Type to filter">
        <Combobox options={WOODS} defaultValue="walnut" placeholder="Choose a wood" />
      </Field>
    </div>
  ),
};

function ManyWoods({ popupClassName }: { popupClassName?: string }) {
  const [value, setValue] = useState<string[]>(["walnut", "oak"]);
  return (
    <Field label="Woods" aside={String(value.length)}>
      <Combobox
        multiple
        options={WOODS}
        value={value}
        onChange={setValue}
        placeholder="Add a wood"
        {...(popupClassName === undefined ? null : { popupClassName })}
      />
    </Field>
  );
}

/** Each pick becomes a chip; the popup stays open. ArrowLeft or Backspace reach the chips. */
export const Multiple: Story = {
  render: () => (
    <div style={column}>
      <ManyWoods />
    </div>
  ),
};

/** Group headings stay with their matches; empty groups are hidden. */
export const Grouped: Story = {
  render: () => (
    <div style={column}>
      <Field label="Timber">
        <Combobox options={GROUPED} defaultOpen />
      </Field>
    </div>
  ),
};

/** Kanji labels found by their kana or romaji reading in `textValue`. */
export const Japanese: Story = {
  render: () => (
    <Root locale="ja" lang="ja">
      <div style={column}>
        <Field label="都市" hint="かな・ローマ字でも検索できます">
          <Combobox options={CITIES} placeholder="とうきょう" />
        </Field>
      </div>
    </Root>
  ),
};

function ServerSearch() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ComboboxOption[]>([]);
  useEffect(() => {
    if (text === "") return;
    const timer = window.setTimeout(() => {
      const all = WOODS.filter((w): w is ComboboxOption => typeof w === "object" && "value" in w);
      setResults(all.filter((w) => w.value.includes(text.toLowerCase())));
      setLoading(false);
    }, 600);
    return () => {
      window.clearTimeout(timer);
    };
  }, [text]);
  return (
    <Field label="Wood" hint="Results come from a slow server">
      <Combobox
        options={results}
        filter={null}
        loading={loading}
        inputValue={text}
        onInputChange={(next, reason) => {
          setText(next);
          if (reason === "input" && next !== "") setLoading(true);
        }}
      />
    </Field>
  );
}

/** `filter={null}` and `loading`: the app fetches; the popup shows the loading row. */
export const ServerSearchLoading: Story = {
  name: "Server search",
  render: () => (
    <div style={column}>
      <ServerSearch />
    </div>
  ),
};

function Tags() {
  const [options, setOptions] = useState<ComboboxItem[]>(["Joinery", "Lacquer", "Veneer"]);
  const [value, setValue] = useState<string[]>(["Joinery"]);
  return (
    <Field label="Tags">
      <Combobox
        multiple
        options={options}
        value={value}
        onChange={setValue}
        onCreate={(text) => {
          setOptions((prev) => [...prev, text]);
          setValue((prev) => [...prev, text]);
        }}
      />
    </Field>
  );
}

/** `onCreate` adds a "Create …" row when nothing matches exactly. */
export const CreateTags: Story = {
  render: () => (
    <div style={column}>
      <Tags />
    </div>
  ),
};

/** The clear cell shows while there is text. */
export const Clearable: Story = {
  render: () => (
    <div style={column}>
      <Field label="Wood">
        <Combobox options={WOODS} defaultValue="cedar" clearable />
      </Field>
    </div>
  ),
};

/** Free text (as SearchField uses it): the typed text is the value. */
export const FreeText: Story = {
  render: () => (
    <div style={column}>
      <Field label="Species" hint="Pick a suggestion or type your own">
        <Combobox options={WOODS} allowCustomValue showTrigger={false} clearable />
      </Field>
    </div>
  ),
};

function StatesGallery() {
  return (
    <div style={stack}>
      <Field label="Disabled">
        <Combobox options={WOODS} defaultValue="oak" disabled />
      </Field>
      <Field label="Read-only">
        <Combobox multiple options={WOODS} defaultValue={["oak", "ash"]} readOnly />
      </Field>
      <Field label="Invalid" error="Choose a wood from the list" required>
        <Combobox options={WOODS} />
      </Field>
      <Field label="Large">
        <Combobox size="l" options={WOODS} defaultValue="maple" clearable />
      </Field>
    </div>
  );
}

/** Disabled, read-only, invalid in a Field, and size `l`. */
export const States: Story = { render: () => <StatesGallery /> };

/** The popup stays usable in a modal; Escape closes the popup first. */
export const InModal: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <Modal open title="Order timber" onClose={() => undefined}>
      <Field label="Wood">
        <Combobox options={WOODS} />
      </Field>
    </Modal>
  ),
};

/** Chips wrap; the field grows by rows. */
export const ManyChips: Story = {
  render: () => (
    <div style={{ width: "calc(var(--space-32) * 2)", maxWidth: "100%" }}>
      <Field label="Woods">
        <Combobox
          multiple
          options={WOODS}
          defaultValue={["alder", "ash", "beech", "cedar", "cherry", "elm", "maple"]}
        />
      </Field>
    </div>
  ),
};

/** Near the bottom of the viewport the popup flips above the field. */
export const FlipsAbove: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div
      style={{
        ...column,
        position: "absolute",
        insetBlockEnd: "var(--space-6)",
        insetInlineStart: "var(--space-6)",
      }}
    >
      <Field label="Wood">
        <Combobox options={WOODS} popupClassName="ol-motion-noren" />
      </Field>
    </div>
  ),
};

/** The opt-in noren curtain on open and close (never per row while filtering). */
export const Noren: Story = {
  render: () => (
    <div style={column}>
      <ManyWoods popupClassName="ol-motion-noren" />
    </div>
  ),
};

/** Reduced motion: the popup appears and disappears at once. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS} style={column}>
      <ManyWoods popupClassName="ol-motion-noren" />
    </div>
  ),
};

function Gallery() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "start" }}>
      <div style={stack}>
        <Field label="Wood">
          <Combobox options={WOODS} defaultValue="walnut" clearable />
        </Field>
        <ManyWoods />
      </div>
      <StatesGallery />
    </div>
  );
}

/** Both themes side by side. */
export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Gallery />
        </Root>
      ))}
    </div>
  ),
};
