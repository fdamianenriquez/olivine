import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Field } from "../Field";
import { Root } from "../Root";
import { Listbox } from "./Listbox";
import { ListboxGroup, type ListboxItemData, ListboxOption, ListboxOptions } from "./ListboxOption";

const meta = {
  title: "Forms/Listbox",
  component: Listbox,
  tags: ["autodocs"],
  args: { label: "Woods" },
  parameters: {
    docs: {
      description: {
        component: `Listbox is a visible, scrollable list of options with one selection or many. Arrow keys, Home and End move through the options, typeahead jumps by the first letters, and Space or Enter chooses. In \`multiple\` mode Space toggles, Shift+Arrow moves and toggles, Shift+Space selects a range and Ctrl+A selects all; Shift+click selects a range. A selected option is an ink row with a ✓; an unselected one hovers with \`paper-2\`; the keyboard-active option shows the olive inset ring. Use \`Select\` (native) for a compact single choice, \`CheckGroup\` for a few settings, \`ChipGroup\` for filter tokens and \`Dropdown\` for actions.

- Do name every list (\`label\`, or a surrounding \`Field\`).
- Do keep option labels short and distinct at the start; put detail in \`description\` or \`meta\`.
- Do give long lists a \`rows\` height so they scroll inside themselves.
- Do use \`onAction\` to close a popup that holds the list.
- Do set \`textValue\` when an option's label is an icon, an amount or markup, or a kanji word typed by its reading.
- Don't put buttons, links or checkboxes inside an option.
- Don't use it for commands (\`Dropdown\`) or for navigation (\`Nav\`, \`ListGroup\`).
- Don't turn on \`selectionFollowsFocus\` when a change triggers navigation or a request.
- Don't render hundreds of rich rows: there is no virtualisation yet.`,
      },
    },
  },
} satisfies Meta<typeof Listbox>;

export default meta;

type Story = StoryObj<typeof meta>;

const column: CSSProperties = { width: "calc(var(--space-32) * 2)", maxWidth: "100%" };
const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "var(--space-6)" };

const WOODS = [
  { value: "alder", label: "Alder" },
  { value: "ash", label: "Ash" },
  { value: "cedar", label: "Cedar" },
  { value: "maple", label: "Maple" },
  { value: "oak", label: "Oak" },
  { value: "walnut", label: "Walnut" },
];

function Woods(props: { boxed?: boolean; defaultValue?: string }) {
  const [value, setValue] = useState<string | null>(props.defaultValue ?? "oak");
  return (
    <div style={column}>
      <Listbox label="Wood" value={value} onChange={setValue} boxed={props.boxed ?? true}>
        {WOODS.map((w) => (
          <ListboxOption key={w.value} value={w.value}>
            {w.label}
          </ListboxOption>
        ))}
      </Listbox>
    </div>
  );
}

/** One selection. A second pick keeps it; the arrows move without selecting. */
export const Default: Story = { render: () => <Woods /> };

function ManyWoods() {
  const [value, setValue] = useState<string[]>(["walnut", "alder"]);
  return (
    <div style={{ ...row, alignItems: "start" }}>
      <div style={column}>
        <Listbox label="Woods" multiple value={value} onChange={setValue} boxed>
          {WOODS.map((w) => (
            <ListboxOption key={w.value} value={w.value}>
              {w.label}
            </ListboxOption>
          ))}
        </Listbox>
      </div>
      <output style={{ fontFamily: "var(--font-mono)" }}>{JSON.stringify(value)}</output>
    </div>
  );
}

/** `multiple`: the value keeps the order the options were chosen in. Ctrl+A is announced. */
export const Multiple: Story = { render: () => <ManyWoods /> };

const TIMBER: ListboxItemData[] = [
  {
    label: "Hardwood",
    options: [
      { value: "oak", label: "Oak", description: "Dense, open grain", meta: "12 boards" },
      { value: "walnut", label: "Walnut", description: "Dark, straight grain", meta: "4 boards" },
      {
        value: "cherry",
        label: "Cherry",
        description: "Ages to red",
        meta: "Sold out",
        disabled: true,
      },
    ],
  },
  {
    label: "Softwood",
    options: [
      { value: "cedar", label: "Cedar", description: "Aromatic, light", meta: "30 boards" },
      { value: "hinoki", label: "Hinoki", description: "Pale, fine grain", meta: "8 boards" },
    ],
  },
];

/** Groups with descriptions and meta, from data. Disabled options are skipped by the keys. */
export const Groups: Story = {
  render: () => (
    <div style={column}>
      <Listbox label="Timber" defaultValue="walnut" boxed divided>
        <ListboxOptions items={TIMBER} />
      </Listbox>
    </div>
  ),
};

/** Composed from children: `ListboxGroup` and `ListboxOption`. */
export const Children: Story = {
  render: () => (
    <div style={column}>
      <Listbox label="Finish" boxed defaultValue="oil">
        <ListboxGroup label="Natural">
          <ListboxOption value="oil" meta="2 coats">
            Oil
          </ListboxOption>
          <ListboxOption value="wax">Wax</ListboxOption>
        </ListboxGroup>
        <ListboxGroup label="Film">
          <ListboxOption value="lacquer" description="Urushi, hand applied">
            Lacquer
          </ListboxOption>
          <ListboxOption value="varnish" disabled>
            Varnish
          </ListboxOption>
        </ListboxGroup>
      </Listbox>
    </div>
  ),
};

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, m) => String(m * 5).padStart(2, "0"));

/** `figures`, `size="m"`, `divided`, `rows` and no ✓: the columns of a time picker. */
export const Figures: Story = {
  render: () => (
    <div style={{ display: "flex" }}>
      {[
        { label: "Hour", values: HOURS, value: "09" },
        { label: "Minute", values: MINUTES, value: "30" },
      ].map((c, i) => (
        <Listbox
          key={c.label}
          label={c.label}
          defaultValue={c.value}
          figures
          size="m"
          divided
          boxed
          rows={5}
          checkmark={false}
          // Adjacent columns share one hairline.
          style={{
            width: "var(--space-24)",
            marginInlineStart: i > 0 ? "calc(var(--stroke-hair) * -1)" : undefined,
          }}
        >
          {c.values.map((v) => (
            <ListboxOption key={v} value={v}>
              {v}
            </ListboxOption>
          ))}
        </Listbox>
      ))}
    </div>
  ),
};

const COUNTRIES = [
  "Argentina",
  "Bolivia",
  "Brazil",
  "Chile",
  "Colombia",
  "Ecuador",
  "Guyana",
  "Japan",
  "Mexico",
  "Paraguay",
  "Peru",
  "Spain",
  "Suriname",
  "Uruguay",
  "Venezuela",
];

/** `rows={6}`: a long list scrolls inside itself; Page Up and Page Down move by a page. */
export const LongList: Story = {
  name: "Long list with rows",
  render: () => (
    <div style={column}>
      <Listbox label="Country" rows={6} boxed defaultValue="Peru">
        {COUNTRIES.map((c) => (
          <ListboxOption key={c} value={c}>
            {c}
          </ListboxOption>
        ))}
      </Listbox>
    </div>
  ),
};

/** Named by the Field's label; the hint and the error describe it and the frame turns beni. */
export const InField: Story = {
  name: "In a Field",
  render: () => (
    <div style={column}>
      <Field
        label="Woods"
        hint="Pick the woods you want quoted."
        error="Pick at least one wood."
        required
      >
        <Listbox multiple boxed name="woods">
          {WOODS.slice(0, 4).map((w) => (
            <ListboxOption key={w.value} value={w.value}>
              {w.label}
            </ListboxOption>
          ))}
        </Listbox>
      </Field>
    </div>
  ),
};

const CITIES = [
  { value: "tokyo", label: "東京", reading: "toukyou", meta: "とうきょう" },
  { value: "kyoto", label: "京都", reading: "kyouto", meta: "きょうと" },
  { value: "osaka", label: "大阪", reading: "oosaka", meta: "おおさか" },
  { value: "nara", label: "奈良", reading: "nara", meta: "なら" },
  { value: "sapporo", label: "札幌", reading: "sapporo", meta: "さっぽろ" },
];

/**
 * Japanese labels with `textValue` readings: with the IME off, typing "ky" jumps to 京都. The
 * built-in strings follow the Root's locale.
 */
export const Japanese: Story = {
  render: () => (
    <Root locale="ja">
      <div style={{ ...row, alignItems: "start" }}>
        <div style={column}>
          <Listbox label="都市" boxed defaultValue="kyoto">
            {CITIES.map((c) => (
              <ListboxOption key={c.value} value={c.value} textValue={c.reading} meta={c.meta}>
                {c.label}
              </ListboxOption>
            ))}
          </Listbox>
        </div>
        <div style={column}>
          <Listbox label="候補" boxed />
        </div>
      </div>
    </Root>
  ),
};

/** No options: the root becomes a plain group with the locale's "No options", or `empty`. */
export const Empty: Story = {
  render: () => (
    <div style={row}>
      <div style={column}>
        <Listbox label="Woods" boxed />
      </div>
      <div style={column}>
        <Listbox label="Woods" boxed empty="Nothing in stock" />
      </div>
    </div>
  ),
};

/** `loading`: the list is busy and a status row sits under the options, which stay usable. */
export const Loading: Story = {
  render: () => (
    <div style={row}>
      <div style={column}>
        <Listbox label="Woods" boxed loading defaultValue="ash">
          {WOODS.slice(0, 3).map((w) => (
            <ListboxOption key={w.value} value={w.value}>
              {w.label}
            </ListboxOption>
          ))}
        </Listbox>
      </div>
      <div style={column}>
        <Listbox label="Woods" boxed loading />
      </div>
    </div>
  ),
};

/** Listbox has no motion of its own: selection and scrolling are instant in every mode. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <ManyWoods />
    </div>
  ),
};

function Gallery() {
  return (
    <div style={{ ...row, alignItems: "start" }}>
      <div style={column}>
        <Listbox label="Timber" defaultValue="walnut" boxed divided>
          <ListboxOptions items={TIMBER} />
        </Listbox>
      </div>
      <div style={{ ...column, display: "grid", gap: "var(--space-6)" }}>
        <Listbox label="Woods" multiple defaultValue={["oak", "alder"]} boxed>
          {WOODS.slice(0, 5).map((w) => (
            <ListboxOption key={w.value} value={w.value} disabled={w.value === "cedar"}>
              {w.label}
            </ListboxOption>
          ))}
        </Listbox>
        <Listbox label="Woods" boxed disabled defaultValue="ash">
          {WOODS.slice(0, 3).map((w) => (
            <ListboxOption key={w.value} value={w.value}>
              {w.label}
            </ListboxOption>
          ))}
        </Listbox>
      </div>
      <div style={{ ...column, display: "grid", gap: "var(--space-6)" }}>
        <Field label="Wood" error="Choose a wood.">
          <Listbox boxed>
            {WOODS.slice(0, 3).map((w) => (
              <ListboxOption key={w.value} value={w.value}>
                {w.label}
              </ListboxOption>
            ))}
          </Listbox>
        </Field>
        <Listbox label="Woods" boxed loading />
        <Listbox label="Woods" boxed />
      </div>
    </div>
  );
}

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
