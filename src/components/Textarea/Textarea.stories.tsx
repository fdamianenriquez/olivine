import type { Meta, StoryObj } from "@storybook/react-vite";

import { Textarea } from "./Textarea";

const meta = {
  title: "Forms/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: { "aria-label": "Message", placeholder: "Tell us about the project…" },
  parameters: {
    docs: {
      description: {
        component:
          "Textarea is the multi-line Input; resizes vertically only.\n\n- Do use it inside `Field` so it gets a label, hint and message.\n- Don't rely on the invalid border alone; pair it with a text message.",
      },
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Placeholder: Story = { args: { placeholder: "Write at least two sentences." } };

export const Disabled: Story = { args: { disabled: true, placeholder: "Disabled" } };

export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "Too short" } };

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
          <Textarea placeholder="Default" aria-label="Default" />
          <Textarea disabled placeholder="Disabled" aria-label="Disabled" />
          <Textarea aria-invalid defaultValue="Too short" aria-label="Invalid" />
        </div>
      ))}
    </div>
  ),
};
