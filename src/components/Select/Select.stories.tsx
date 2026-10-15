import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select } from "./Select";

const meta = {
  title: "Forms/Select",
  component: Select,
  tags: ["autodocs"],
  args: { "aria-label": "Service", options: ["Identity", "Interiors", "Web", "Editorial"] },
  parameters: {
    docs: {
      description: {
        component:
          "Select is a native select restyled square, with the arrow in its own ink-ruled cell.\n\n`className` and native props go to the `<select>`.\n\n- Do use it inside `Field` so it gets a label, hint and message.\n- Do use `placeholder` when no choice should be preselected.\n- Don't rely on the invalid border alone; pair it with a text message.",
      },
    },
  },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Options: Story = {
  args: {
    options: [
      { value: "mx", label: "Mexico" },
      { value: "jp", label: "Japan" },
      { value: "es", label: "Spain", disabled: true },
    ],
  },
};

export const Placeholder: Story = { args: { placeholder: "Choose one" } };

export const Small: Story = { args: { size: "s" } };

export const Disabled: Story = { args: { disabled: true, defaultValue: "Web" } };

export const Invalid: Story = { args: { "aria-invalid": true, placeholder: "Choose one" } };

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
            gap: "var(--space-4)",
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <Select aria-label="Default" placeholder="Choose one" options={["Identity", "Web"]} />
          <Select aria-label="Small" size="s" options={["Identity", "Web"]} />
          <Select aria-label="Disabled" disabled options={["Identity", "Web"]} />
          <Select aria-label="Invalid" aria-invalid options={["Identity", "Web"]} />
        </div>
      ))}
    </div>
  ),
};
