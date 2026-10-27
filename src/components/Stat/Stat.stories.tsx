import type { Meta, StoryObj } from "@storybook/react-vite";

import { Grid } from "../Grid";
import { Stat } from "./Stat";

const meta = {
  title: "Content/Stat",
  component: Stat,
  tags: ["autodocs"],
  args: { label: "Orders", value: "1,284", delta: "12% vs. last month", trend: "up" },
  argTypes: {
    size: { control: "inline-radio", options: ["m", "l", "xl"] },
    trend: { control: "inline-radio", options: [undefined, "up", "down"] },
  },
  parameters: {
    docs: {
      description: {
        component: `Stat shows one number in the figure face (Sprat Condensed) with a label and an optional change line.

- Do zero-pad indexes and percentages (064%) when they sit in a row.
- Do keep \`unit\` to a symbol (%, ¥, $, ×); words go in \`label\`, because the figure face is for numbers.
- Do use \`accent\` once per view.
- Don't put words in \`value\`.`,
      },
    },
  },
} satisfies Meta<typeof Stat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <Grid cols={3} gap={6}>
      <Stat size="m" label="Medium" value="1,284" />
      <Stat size="l" label="Large" value="1,284" />
      <Stat size="xl" label="Extra large" value="1,284" />
    </Grid>
  ),
};

export const Units: Story = {
  render: () => (
    <Grid cols={4} gap={6}>
      <Stat label="Growth" value="064" unit="%" />
      <Stat label="Total" value="48,000" unit="¥" />
      <Stat label="Price" value="120" unit="$" />
      <Stat label="Scale" value="2" unit="×" />
    </Grid>
  ),
};

export const Trend: Story = {
  render: () => (
    <Grid cols={2} gap={6}>
      <Stat label="Orders" value="1,284" delta="12% vs. last month" trend="up" />
      <Stat label="Returns" value="031" delta="3% vs. last month" trend="down" />
    </Grid>
  ),
};

export const Accent: Story = {
  render: () => <Stat label="Growth" value="064" unit="%" accent />,
};

export const ZeroPaddedRow: Story = {
  render: () => (
    <Grid cols={4} gap={6}>
      <Stat size="m" label="Drawings" value="007" />
      <Stat size="m" label="Approved" value="064" unit="%" />
      <Stat size="m" label="Pending" value="012" />
      <Stat size="m" label="Late" value="003" />
    </Grid>
  ),
};

export const Showcase: Story = {
  render: () => (
    <Grid cols={3} gap={6}>
      <Stat label="Orders" value="1,284" delta="12% vs. last month" trend="up" />
      <Stat label="Growth" value="064" unit="%" accent />
      <Stat label="Total" value="¥48,000" size="m" delta="3 pieces" />
    </Grid>
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
          style={{ padding: "var(--space-6)", background: "var(--paper)", color: "var(--ink)" }}
        >
          <Grid cols={2} gap={6}>
            <Stat label="Orders" value="1,284" delta="12% vs. last month" trend="up" />
            <Stat label="Growth" value="064" unit="%" accent />
          </Grid>
        </div>
      ))}
    </div>
  ),
};
