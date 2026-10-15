import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./Checkbox";

const meta = {
  title: "Forms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: { label: "Kitchens" },
  parameters: {
    docs: {
      description: {
        component:
          "Checkbox is a 20px square; checked fills a 10px ink block, indeterminate draws a bar.\n\n- Use it for independent options inside forms that submit.\n- Use the indeterminate state for a parent whose children are partly selected.\n- Don't use it for settings that apply instantly; use Switch.",
      },
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Indeterminate: Story = { args: { label: "All of the above", indeterminate: true } };

export const Hint: Story = {
  args: { label: "Storage", hint: "Shelving, wardrobes, cabinets." },
};

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <Checkbox {...args} label="Unavailable" disabled />
      <Checkbox {...args} label="Unavailable, checked" disabled defaultChecked />
    </div>
  ),
};

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
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <Checkbox label="Kitchens" defaultChecked />
          <Checkbox label="Storage" hint="Shelving, wardrobes, cabinets." />
          <Checkbox label="All of the above" indeterminate />
          <Checkbox label="Unavailable" disabled />
        </div>
      ))}
    </div>
  ),
};
