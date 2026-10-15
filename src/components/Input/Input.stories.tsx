import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./Input";

const meta = {
  title: "Forms/Input",
  component: Input,
  tags: ["autodocs"],
  args: { placeholder: "Default · 44px", "aria-label": "Input" },
  parameters: {
    docs: {
      description: {
        component:
          "Input is a square text field framed by a hairline; focus draws a 2px olive ring.\n\n- Do use it inside `Field` so it gets a label, hint and message.\n- Do use `line` for search bars and editorial forms.\n- Don't rely on the invalid border alone; pair it with a text message.",
      },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)", maxWidth: 360 }}>
      <Input size="s" placeholder="Small · 32px" aria-label="Small" />
      <Input size="m" placeholder="Medium · 44px" aria-label="Medium" />
      <Input size="l" placeholder="Large · 56px" aria-label="Large" />
    </div>
  ),
};

export const Line: Story = { args: { line: true, placeholder: "Line — only a bottom rule" } };

export const Placeholder: Story = { args: { placeholder: "Damián Enríquez" } };

export const Disabled: Story = { args: { disabled: true, placeholder: "Disabled" } };

export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "damian@" } };

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
          <Input placeholder="Default" aria-label="Default" />
          <Input line placeholder="Line" aria-label="Line" />
          <Input disabled placeholder="Disabled" aria-label="Disabled" />
          <Input aria-invalid defaultValue="damian@" aria-label="Invalid" />
        </div>
      ))}
    </div>
  ),
};
