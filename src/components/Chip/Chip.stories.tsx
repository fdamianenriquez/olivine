import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Root } from "../Root";
import { Chip } from "./Chip";

const meta = {
  title: "Actions/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { children: "Walnut" },
  parameters: {
    docs: {
      description: {
        component: `Chip is a 32px hairline-framed token for a choice, a filter, a suggestion or a value the user entered. The props decide what it is: \`onClick\` (action), \`selected\` (toggle with a stamped ✓), \`href\` (link), \`onRemove\` (removable value).

- Do let the props decide the type: \`onClick\` for an assist or suggestion chip, \`selected\` for a filter, \`onRemove\` for a value the user entered.
- Do keep labels to one to three words in sentence case; long values truncate and need \`textValue\` or a string label.
- Do group chips with \`ChipGroup\` as soon as they share a selection.
- Don't put counts or amounts in a chip label; say it in words outside the chip.
- Don't use a chip as a status tag or a primary action; that is \`Badge\` and \`Button\`.
- Don't add colour variants: selected means ink fill and ✓, never colour alone.
- Don't remove the chip from the DOM and leave focus on \`body\`; move focus to the neighbour.`,
      },
    },
  },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = {
  display: "flex",
  gap: "var(--space-2)",
  alignItems: "center",
  flexWrap: "wrap",
} as const;

const stack = { display: "grid", gap: "var(--space-6)" } as const;

const woods = ["Walnut", "Oak", "Alder", "Ash"];

function Filters() {
  const [selected, setSelected] = useState<string[]>(["Walnut"]);
  return (
    <div style={row}>
      {woods.map((wood) => (
        <Chip
          key={wood}
          selected={selected.includes(wood)}
          onSelectedChange={(on) => {
            setSelected((prev) => (on ? [...prev, wood] : prev.filter((w) => w !== wood)));
          }}
        >
          {wood}
        </Chip>
      ))}
    </div>
  );
}

function Recipients() {
  const [people, setPeople] = useState(["Yui Tanaka", "Haruka Mori", "Daichi Ueno"]);
  const ref = useRef<HTMLDivElement>(null);
  const remove = (index: number) => {
    setPeople((prev) => prev.filter((_, i) => i !== index));
    // The list owner moves focus to the neighbour (next, else previous) after the update.
    requestAnimationFrame(() => {
      const buttons = ref.current?.querySelectorAll<HTMLButtonElement>(".ol-chip__remove");
      const target = buttons?.[index] ?? buttons?.[index - 1];
      target?.focus();
    });
  };
  return (
    <div ref={ref} style={row}>
      {people.map((name, i) => (
        <Chip
          key={name}
          leading="◼"
          onRemove={() => {
            remove(i);
          }}
        >
          {name}
        </Chip>
      ))}
    </div>
  );
}

function Gallery() {
  return (
    <div style={stack}>
      <div style={row}>
        <Chip onClick={() => undefined}>Add walnut</Chip>
        <Chip onClick={() => undefined} leading="→">
          Book a fitting
        </Chip>
        <Chip href="#woods">Woods guide</Chip>
      </div>
      <div style={row}>
        <Chip defaultSelected={false}>Oak</Chip>
        <Chip defaultSelected>Walnut</Chip>
        <Chip defaultSelected onRemove={() => undefined}>
          Alder
        </Chip>
      </div>
      <div style={row}>
        <Chip onClick={() => undefined} onRemove={() => undefined} leading="◼">
          Yui Tanaka
        </Chip>
        <Chip onRemove={() => undefined}>yui@shirakaba.jp</Chip>
      </div>
      <div style={row}>
        <Chip disabled onClick={() => undefined}>
          Ash
        </Chip>
        <Chip disabled selected>
          Walnut
        </Chip>
        <Chip disabled onRemove={() => undefined}>
          Maple
        </Chip>
        <Chip disabled href="#woods">
          Woods guide
        </Chip>
      </div>
    </div>
  );
}

export const Default: Story = { args: { onClick: () => undefined } };

export const Action: Story = {
  render: () => (
    <div style={row}>
      <Chip onClick={() => undefined}>Add walnut</Chip>
      <Chip onClick={() => undefined}>Compare bodies</Chip>
      <Chip onClick={() => undefined} leading="→">
        Book a fitting
      </Chip>
    </div>
  ),
};

export const Filter: Story = {
  render: () => (
    <div style={stack}>
      <div style={row}>
        {woods.map((wood, i) => (
          <Chip key={wood} defaultSelected={i === 0}>
            {wood}
          </Chip>
        ))}
      </div>
      <Filters />
    </div>
  ),
};

export const Input: Story = { render: () => <Recipients /> };

export const RemoveOnly: Story = {
  render: () => (
    <div style={row}>
      <Chip onRemove={() => undefined}>yui@shirakaba.jp</Chip>
      <Chip onRemove={() => undefined}>haruka@shirakaba.jp</Chip>
    </div>
  ),
};

export const LinkChip: Story = {
  name: "Link",
  render: () => (
    <div style={row}>
      <Chip href="#walnut">Walnut</Chip>
      <Chip href="#oak">Oak</Chip>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={row}>
      <Chip disabled onClick={() => undefined}>
        Ash
      </Chip>
      <Chip disabled selected>
        Walnut
      </Chip>
      <Chip disabled onRemove={() => undefined}>
        Maple
      </Chip>
    </div>
  ),
};

export const LongLabel: Story = {
  render: () => (
    <div style={{ ...row, inlineSize: "calc(var(--space-32) * 1.5)" }}>
      <Chip onRemove={() => undefined} textValue="Yui Tanaka-Whitfield (lead luthier)">
        Yui Tanaka-Whitfield (lead luthier)
      </Chip>
    </div>
  ),
};

/** The ✓ appears at once: the hanko collapses to 1ms under reduced motion. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <Filters />
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Gallery />
        </Root>
      ))}
    </div>
  ),
};

const walnut = { en: "Walnut", es: "Nogal", ja: "クルミ" };
const oak = { en: "Oak", es: "Roble", ja: "オーク" };

export const Locales: Story = {
  render: () => (
    <div style={stack}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <div style={row}>
            <Chip onRemove={() => undefined}>{walnut[locale]}</Chip>
            <Chip defaultSelected onRemove={() => undefined}>
              {oak[locale]}
            </Chip>
          </div>
        </Root>
      ))}
    </div>
  ),
};
