import type { Meta, StoryObj } from "@storybook/react-vite";

import { Range } from "./Range";

const meta = {
  title: "Forms/Range",
  component: Range,
  tags: ["autodocs"],
  args: { "aria-label": "Width", defaultValue: 120, min: 0, max: 240, step: 10 },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Range is a hairline track with a block thumb and a mono scale showing min, current and max.\n\n- Do use `format` to add units to the scale and to the announced value.\n- Do use it inside `Field` so it gets a label.\n- Don't use it for exact entry; pair it with an `Input` when precision matters.",
      },
    },
  },
} satisfies Meta<typeof Range>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFormat: Story = { args: { format: (v) => String(v) + "cm" } };

export const Percent: Story = {
  args: { min: 0, max: 100, step: 5, defaultValue: 40, format: (v) => String(v) + "%" },
};

export const Yen: Story = {
  args: { min: 0, max: 50000, step: 1000, defaultValue: 12000, format: (v) => "¥" + String(v) },
};

export const NoScale: Story = { args: { scale: false } };

export const Disabled: Story = { args: { disabled: true } };

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-5)",
            padding: "var(--space-4)",
            background: "var(--paper)",
            maxWidth: 360,
          }}
        >
          <Range
            aria-label="Width"
            defaultValue={120}
            max={240}
            step={10}
            format={(v) => String(v) + "cm"}
          />
          <Range aria-label="No scale" scale={false} defaultValue={30} />
          <Range aria-label="Disabled" disabled defaultValue={60} />
        </div>
      ))}
    </div>
  ),
};
