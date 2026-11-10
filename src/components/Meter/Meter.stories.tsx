import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Meter } from "./Meter";

const meta = {
  title: "Feedback/Meter",
  component: Meter,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `Meter shows one reading inside a known range (disk used, battery, a score) as a ruled ink gauge, and says which band of the range it is in. The reading is printed in the figure face next to a Badge with a word. It is not progress: no olive, no sweep, no indeterminate mode, and nothing moves on mount.

**Props** — \`value\`, \`min\`, \`max\`, \`low\`, \`high\`, \`optimum\` (HTML \`meter\` rules), \`label\`, \`variant\`: \`bar\` | \`segments\`, \`segments\` (count, max 20), \`size\`: \`s\` | \`m\` | \`l\`, \`showValue\`, \`showState\`, \`format\`, \`formatOptions\`, \`locale\`, \`valueText\`, \`labels\`.

- Do give every meter a name and a word-bearing state; use \`low\` / \`high\` / \`optimum\` so the reader knows what "72%" means.
- Do pass \`format\` or \`formatOptions\` when the range is not 0–100, and \`valueText\` for units ("12 of 16 GB").
- Do use \`Progress\` for uploads, steps and loading, and \`Stat\` when the number has no maximum.
- Don't tint the fill with status colours or olivo; the Badge carries the status.
- Don't make it interactive; use \`Range\` when the user sets the value.
- With \`optimum\` inside the middle band (a temperature) both outer bands are "Fair" and "Poor" never shows; with \`optimum\` at an end (battery) the far band is "Poor".`,
      },
    },
  },
} satisfies Meta<typeof Meter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bar: Story = {
  args: { label: "Disk used", value: 72, low: 60, high: 85, optimum: 0 },
};

export const Segments: Story = {
  args: { label: "Battery", value: 80, low: 20, high: 50, optimum: 100, variant: "segments" },
};

export const Neutral: Story = { args: { label: "Score", value: 64 } };

const bands = (
  <>
    <Meter label="Battery" value={90} low={20} high={50} optimum={100} />
    <Meter label="Battery" value={35} low={20} high={50} optimum={100} />
    <Meter label="Battery" value={10} low={20} high={50} optimum={100} />
    <Meter
      label="Room temperature"
      value={22}
      min={0}
      max={40}
      low={18}
      high={24}
      optimum={21}
      formatOptions={{ maximumFractionDigits: 0 }}
      valueText="22 °C"
    />
    <Meter
      label="Memory"
      value={12}
      max={16}
      low={8}
      high={14}
      optimum={0}
      format={(v) => `${String(v)}/16`}
      valueText="12 of 16 GB"
    />
    <Meter label="Score" value={64} />
  </>
);

/** Good, fair and poor for an optimum at the top end, an optimum in the middle, and no bands. */
export const Bands: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: 420 }}>{bands}</div>
  ),
};

export const Sizes: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: 420 }}>
      {(["s", "m", "l"] as const).map((size) => (
        <Meter key={size} size={size} label="Disk used" value={72} low={60} high={85} optimum={0} />
      ))}
      {(["s", "m", "l"] as const).map((size) => (
        <Meter
          key={`seg-${size}`}
          size={size}
          variant="segments"
          label="Battery"
          value={30}
          low={20}
          high={50}
          optimum={100}
        />
      ))}
    </div>
  ),
};

/** Change the reading: newly lit blocks print one after another; the bar steps to its place. */
export const Updates: Story = {
  args: { value: 0 },
  render: function Render() {
    const [value, setValue] = useState(40);
    const step = (by: number) => {
      setValue((v) => Math.max(0, Math.min(100, v + by)));
    };
    return (
      <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: 420 }}>
        <Meter label="Battery" value={value} low={20} high={50} optimum={100} />
        <Meter label="Battery" variant="segments" value={value} low={20} high={50} optimum={100} />
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button
            onClick={() => {
              step(-30);
            }}
          >
            −30
          </Button>
          <Button
            onClick={() => {
              step(30);
            }}
          >
            +30
          </Button>
        </div>
      </div>
    );
  },
};

/** Right to left: the fill grows from the right and the scale mirrors. */
export const RightToLeft: Story = {
  args: { value: 0 },
  render: () => (
    <div dir="rtl" style={{ display: "grid", gap: "var(--space-6)", maxWidth: 420 }}>
      <Meter label="Disk used" value={72} low={60} high={85} optimum={0} />
      <Meter label="Battery" variant="segments" value={30} low={20} high={50} optimum={100} />
    </div>
  ),
};

export const Themes: Story = {
  args: { value: 0 },
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
          {bands}
          <Meter label="Battery" variant="segments" value={30} low={20} high={50} optimum={100} />
        </div>
      ))}
    </div>
  ),
};
