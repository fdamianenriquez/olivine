import type { Meta, StoryObj } from "@storybook/react-vite";

import { Grid } from "./Grid";

const meta = {
  title: "Foundations/Grid",
  component: Grid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Grid is a 12-column CSS grid; `ruled` swaps gutters for ink lines between cells, the signature brutalist index layout.",
          "",
          "- Do use `ruled` for indexes, specs and contact sheets; plain gutters for content.",
          "- Children are `Col`; each cell chooses its own span and collapses below the medium breakpoint.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

// Plain cells stand in until the story switches to Col.
const cell = (n: string) => (
  <div key={n} style={{ background: "var(--paper-2)", padding: "var(--space-3)" }}>
    {n}
  </div>
);

export const Default: Story = {
  args: { cols: 3, gap: 4, children: ["One", "Two", "Three"].map(cell) },
};

export const Ruled: Story = {
  args: {
    cols: 4,
    ruled: true,
    children: ["静", "間", "無", "空"].map((k) => (
      <div key={k} className="ol-col" style={{ padding: "var(--space-4)" }}>
        {k}
      </div>
    )),
  },
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ background: "var(--paper)", padding: "var(--space-6)" }}
        >
          <Grid cols={3} gap={4}>
            {["One", "Two", "Three"].map(cell)}
          </Grid>
        </div>
      ))}
    </div>
  ),
};
