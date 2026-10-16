import type { Meta, StoryObj } from "@storybook/react-vite";

import { Progress } from "./Progress";

const meta = {
  title: "Feedback/Progress",
  component: Progress,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `Progress shows completion as an olivo bar, an ink bar, or a row of block segments, with a zero-padded percentage.

**Props** — \`value\` (omit for indeterminate), \`max\`, \`label\`, \`variant\`: \`bar\` | \`ink\` | \`segments\`, \`segments\` (count), \`showValue\`.

- Do give every bar a name with \`label\`, \`aria-label\` or \`aria-labelledby\`.
- Do omit \`value\` when the duration is unknown; the bar becomes indeterminate and shows no percentage.
- Do use \`segments\` for countable steps and \`bar\` or \`ink\` for continuous work.
- Don't fake a percentage you cannot measure.
- Under reduced motion the indeterminate sweep stops and shows a static hatched bar.`,
      },
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bar: Story = { args: { label: "Upload", value: 64 } };

export const Ink: Story = { args: { label: "Export", value: 40, variant: "ink" } };

export const Segments: Story = {
  args: { label: "Steps", variant: "segments", value: 7, max: 20 },
};

export const Indeterminate: Story = { args: { label: "Syncing" } };

export const Overview: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: 420 }}>
      <Progress label="Upload" value={64} />
      <Progress label="Export" variant="ink" value={40} />
      <Progress label="Steps" variant="segments" value={7} max={20} />
      <Progress label="Syncing" />
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
            gap: "var(--space-6)",
            padding: "var(--space-6)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        >
          <Progress label="Upload" value={64} />
          <Progress label="Export" variant="ink" value={40} />
          <Progress label="Steps" variant="segments" value={7} max={20} />
          <Progress label="Syncing" />
        </div>
      ))}
    </div>
  ),
};
