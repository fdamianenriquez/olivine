import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./Label";

const meta = {
  title: "Foundations/Label",
  component: Label,
  tags: ["autodocs"],
  args: { children: "Archive" },
  parameters: {
    docs: {
      description: {
        component:
          "Label is the voice of the interface: eyebrows, metadata, index numbers, in Familjen Grotesk 500.\n\n- Do write labels in 1-3 words, in sentence case. Never uppercase them.",
      },
    },
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Index: Story = { args: { index: 1, children: "Section" } };

export const Dot: Story = { args: { dot: true, children: "Live" } };

export const Muted: Story = { args: { muted: true, children: "Updated today" } };

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "flex",
            gap: "var(--space-6)",
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <Label>Archive</Label>
          <Label index={2}>Section</Label>
          <Label dot>Live</Label>
          <Label muted>Updated</Label>
        </div>
      ))}
    </div>
  ),
};
