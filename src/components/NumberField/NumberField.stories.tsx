import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Field } from "../Field";
import { Root } from "../Root";
import { NumberField } from "./NumberField";

const meta = {
  title: "Forms/NumberField",
  component: NumberField,
  tags: ["autodocs"],
  args: { "aria-label": "Seats", defaultValue: 3, min: 1, max: 12 },
  parameters: {
    docs: {
      description: {
        component: `NumberField is a numeric input framed as one ruled bar with − and + steppers; the digits are set in Sprat Condensed, and the value is formatted and parsed for the locale. It is a text input with the \`spinbutton\` role, not \`type="number"\`, so commas, full-width digits typed through an IME and percent or currency signs all work. Arrow keys, Page Up/Down and the steppers move the value by \`step\`; typed text is parsed, clamped to \`min\`/\`max\` and snapped to \`step\` when you leave the field or press Enter. Use inside \`Field\` for a label.

- Do give every NumberField a visible label through \`Field\`, and write limits in the hint ("1 to 12 seats").
- Do put units and words in \`unit\` or the label; the figure face carries digits and symbols only.
- Do set \`min\`, \`max\` and \`step\` to what the data accepts; they drive clamping, Home/End and the disabled steppers.
- Do use \`format={{ style: "currency", currency: "JPY" }}\` for money and \`style: "percent"\` with \`step={0.01}\` for percentages.
- Do write the error as an instruction in \`Field\` ("Enter a quantity between 1 and 12.").
- Don't use it for postal codes, phone numbers, card numbers or IDs; use \`Input\` with \`inputMode="numeric"\`.
- Don't turn on \`allowWheel\` in long scrolling forms; accidental changes are worse than the saving.
- Don't use \`steppers\` for values nobody nudges (an exact price); use \`steppers={false}\`.
- Don't pass \`type="number"\`; the component controls type and parsing.
- Don't set the field below the \`s\` size; the digits cannot go below 16px.`,
      },
    },
  },
} satisfies Meta<typeof NumberField>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack = { display: "grid", gap: "var(--space-6)", maxWidth: "32ch" } as const;

export const Default: Story = {};

export const InField: Story = {
  render: () => (
    <div style={stack}>
      <Field label="Seats" hint="1 to 12 seats">
        <NumberField defaultValue={2} min={1} max={12} />
      </Field>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      <NumberField aria-label="Small" size="s" defaultValue={4} />
      <NumberField aria-label="Medium" defaultValue={44} />
      <NumberField aria-label="Large" size="l" defaultValue={56} />
    </div>
  ),
};

export const Formats: Story = {
  render: () => (
    <div style={stack}>
      <Field label="Price" hint="Whole yen">
        <NumberField
          locale="ja-JP"
          defaultValue={48000}
          min={0}
          step={100}
          steppers={false}
          format={{ style: "currency", currency: "JPY" }}
        />
      </Field>
      <Field label="Discount">
        <NumberField
          defaultValue={0.25}
          min={0}
          max={1}
          step={0.01}
          format={{ style: "percent" }}
        />
      </Field>
      <Field label="Weight">
        <NumberField defaultValue={12.5} min={0} step={0.5} unit="kg" />
      </Field>
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={stack}>
      {(["en", "es-ES", "es-MX", "ja-JP"] as const).map((tag) => (
        <Root key={tag} locale={tag}>
          <Field label={tag} hint="Type 1.500, 1,5 or ９，８００ and leave the field.">
            <NumberField defaultValue={12345.5} step={0.1} />
          </Field>
        </Root>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={stack}>
      <Field label="Empty">
        <NumberField placeholder="0" min={0} />
      </Field>
      <Field label="At the limit" hint="Up to 12">
        <NumberField defaultValue={12} max={12} />
      </Field>
      <Field label="Quantity" hint="1 to 12" error="Enter a quantity between 1 and 12.">
        {/* A saved value outside the range: shown as is until the user commits a new one. */}
        <NumberField defaultValue={20} min={1} max={12} />
      </Field>
      <Field label="Read-only">
        <NumberField defaultValue={8} readOnly />
      </Field>
      <Field label="Disabled">
        <NumberField defaultValue={8} unit="weeks" disabled />
      </Field>
    </div>
  ),
};

export const Controlled: Story = {
  render: function Controlled() {
    const [value, setValue] = useState<number | null>(3);
    return (
      <div style={stack}>
        <Field label="Guests" hint={`Committed value: ${String(value)}`}>
          <NumberField value={value} onValueChange={setValue} min={0} max={20} allowWheel />
        </Field>
      </div>
    );
  },
};

const all = (
  <div style={stack}>
    <Field label="Seats" hint="1 to 12 seats">
      <NumberField defaultValue={3} min={1} max={12} />
    </Field>
    <Field label="Weight">
      <NumberField size="s" defaultValue={12.5} min={0} step={0.5} unit="kg" />
    </Field>
    <Field label="Price">
      <NumberField
        size="l"
        locale="ja-JP"
        defaultValue={48000}
        min={0}
        step={100}
        format={{ style: "currency", currency: "JPY" }}
      />
    </Field>
    <Field label="Discount">
      <NumberField
        defaultValue={0.25}
        min={0}
        max={1}
        step={0.01}
        steppers={false}
        format={{ style: "percent" }}
      />
    </Field>
    <Field label="Quantity" hint="1 to 12" error="Enter a quantity between 1 and 12.">
      <NumberField defaultValue={20} min={1} max={12} />
    </Field>
    <Field label="Disabled">
      <NumberField defaultValue={8} unit="weeks" disabled />
    </Field>
  </div>
);

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-6)", background: "var(--paper)" }}
        >
          {all}
        </div>
      ))}
    </div>
  ),
};
