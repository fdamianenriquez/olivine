import type { Meta, StoryObj } from "@storybook/react-vite";

import { Placeholder } from "./Placeholder";

const meta = {
  title: "Content/Placeholder",
  component: Placeholder,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `Placeholder draws paper-2 skeleton bars and blocks while content loads, with a stepped sweep.

**Props** — \`shape\`: \`text\` | \`block\`; \`lines\`; \`width\`, \`height\`; \`wave\` (default true); \`label\`.

- Do mirror the layout of the content that will replace it, so nothing jumps when it arrives.
- Do set \`aria-busy="true"\` on the region being filled; the bars are hidden from assistive technology.
- Do pass \`label\` when a skeleton stands alone and nothing else announces the loading state.
- Don't leave a skeleton up for long; after a few seconds show a Spinner or Progress with a message.
- Don't use it for content that never loads or for empty states.`,
      },
    },
  },
} satisfies Meta<typeof Placeholder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: { shape: "text", lines: 4 },
  render: (args) => (
    <div style={{ maxWidth: 420 }} aria-busy="true">
      <Placeholder {...args} />
    </div>
  ),
};

export const Block: Story = {
  args: { shape: "block", height: 120 },
  render: (args) => (
    <div style={{ maxWidth: 420 }} aria-busy="true">
      <Placeholder {...args} />
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => (
    <div
      aria-busy="true"
      style={{
        display: "grid",
        gap: "var(--space-4)",
        maxWidth: 360,
        padding: "var(--space-4)",
        border: "var(--stroke-hair) solid var(--rule)",
      }}
    >
      <Placeholder shape="block" height={160} />
      <Placeholder width="40%" />
      <Placeholder lines={3} />
    </div>
  ),
};

export const NoWave: Story = {
  render: () => (
    <div style={{ maxWidth: 420, display: "grid", gap: "var(--space-4)" }}>
      <Placeholder shape="block" height={80} wave={false} />
      <Placeholder lines={3} wave={false} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Placeholder lines={2} label />
    </div>
  ),
};

export const Themes: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-4)",
            padding: "var(--space-6)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        >
          <Placeholder shape="block" height={100} />
          <Placeholder width="40%" />
          <Placeholder lines={3} />
        </div>
      ))}
    </div>
  ),
};
