import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { Button } from "../Button";
import { Card } from "../Card";
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
- Do give a vertical meter a short label and, for a different height, set \`--ol-meter-length\`; it reads value, gauge, label, Badge from top to bottom.
- Do turn on \`showScale\` for a stand-alone meter whose thresholds matter (a gauge in a card), and keep the Badge word as well.
- Don't use \`showScale\` in table rows or compact lists; it adds a row of 16 px figures. Scale and bands are hidden from assistive technology, so don't rely on them for meaning.
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
          <div style={{ display: "flex", gap: "var(--space-8)", alignItems: "flex-start" }}>
            <Meter
              orientation="vertical"
              label="Humidity"
              value={52}
              low={40}
              high={60}
              optimum={50}
              showScale
              showBands
            />
            <Meter
              orientation="vertical"
              variant="segments"
              label="Airflow"
              value={30}
              low={20}
              high={50}
              optimum={100}
            />
          </div>
          <Meter
            label="Wood moisture"
            value={9}
            {...moisture}
            formatOptions={moistureFormat}
            showScale
            showBands
          />
        </div>
      ))}
    </div>
  ),
};

const verticalStates = [
  { label: "Low", value: 18 },
  { label: "Middle", value: 48 },
  { label: "Optimum", value: 82 },
  { label: "Empty", value: 0 },
  { label: "Full", value: 100 },
];

/** Vertical meters fill from the bottom and read value, gauge, label, Badge. Higher is better. */
export const Vertical: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-8)" }}>
      {(["bar", "segments"] as const).map((variant) => (
        <div
          key={variant}
          style={{ display: "flex", gap: "var(--space-8)", alignItems: "flex-start" }}
        >
          {verticalStates.map((state) => (
            <Meter
              key={state.label}
              orientation="vertical"
              variant={variant}
              label={state.label}
              value={state.value}
              low={33}
              high={66}
              optimum={100}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

/** Length 96, 128 and 192 px by size; `--ol-meter-length` sets any other. */
export const VerticalSizes: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-8)", alignItems: "flex-end" }}>
      {(["bar", "segments"] as const).map((variant) =>
        (["s", "m", "l"] as const).map((size) => (
          <Meter
            key={`${variant}-${size}`}
            orientation="vertical"
            variant={variant}
            size={size}
            label={`Size ${size}`}
            value={64}
            low={33}
            high={66}
            optimum={50}
          />
        )),
      )}
      <Meter
        orientation="vertical"
        label="Short"
        value={30}
        low={20}
        optimum={50}
        style={{ "--ol-meter-length": "var(--space-16)" } as CSSProperties}
      />
      <Meter
        orientation="vertical"
        label="Thick"
        size="l"
        value={55}
        low={20}
        optimum={50}
        style={{ "--ol-meter-length": "var(--space-24)" } as CSSProperties}
      />
    </div>
  ),
};

const moisture = { min: 0, max: 16, low: 6, high: 10, optimum: 8 } as const;
const moistureFormat = { maximumFractionDigits: 0 } as const;

/** Scale and bands, horizontal and vertical. Numerals that overlap a more important one are hidden. */
export const Scale: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-8)", maxWidth: 420 }}>
      <Meter
        label="Wood moisture"
        value={9}
        {...moisture}
        formatOptions={moistureFormat}
        showScale
      />
      <Meter
        label="Wood moisture"
        value={9}
        {...moisture}
        formatOptions={moistureFormat}
        showScale
        showBands
      />
      <Meter
        label="Wood moisture"
        value={9}
        {...moisture}
        formatOptions={moistureFormat}
        variant="segments"
        showScale
        showBands
      />
      <Meter label="Battery" value={71} low={2} high={98} optimum={100} showScale />
      <Meter label="Score" value={64} showScale />
      <div style={{ display: "flex", gap: "var(--space-8)", alignItems: "flex-start" }}>
        <Meter
          orientation="vertical"
          label="Humidity"
          value={52}
          low={40}
          high={60}
          optimum={50}
          showScale
        />
        <Meter
          orientation="vertical"
          label="Humidity"
          value={52}
          low={40}
          high={60}
          optimum={50}
          showScale
          showBands
        />
        <Meter
          orientation="vertical"
          variant="segments"
          label="Humidity"
          value={52}
          low={40}
          high={60}
          optimum={50}
          showScale
          showBands
        />
        <Meter
          orientation="vertical"
          size="l"
          label="Room"
          value={21}
          min={10}
          max={30}
          low={18}
          high={24}
          optimum={21}
          formatOptions={{ maximumFractionDigits: 0 }}
          showScale
          showBands
        />
        <Meter
          orientation="vertical"
          size="s"
          label="Short"
          value={52}
          low={2}
          high={98}
          optimum={50}
          showScale
        />
      </div>
    </div>
  ),
};

/** Four vertical meters in one card, and a horizontal one with a scale. */
export const InACard: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: 560 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          {[
            ["Humidity", 46, 30, 60, 45],
            ["Temperature", 23, 18, 26, 22],
            ["Stock", 8, 20, 80, 100],
          ].map(([label, value, low, high, optimum]) => (
            <Meter
              key={String(label)}
              orientation="vertical"
              label={String(label)}
              value={Number(value)}
              low={Number(low)}
              high={Number(high)}
              optimum={Number(optimum)}
            />
          ))}
          <Meter
            orientation="vertical"
            variant="segments"
            label="Airflow"
            value={30}
            low={20}
            high={50}
            optimum={100}
          />
        </div>
      </Card>
      <Card>
        <div style={{ display: "grid", gap: "var(--space-6)" }}>
          <Meter label="Top" value={8} {...moisture} formatOptions={moistureFormat} showScale />
          <Meter label="Back" value={11} {...moisture} formatOptions={moistureFormat} showScale />
        </div>
      </Card>
    </div>
  ),
};

export const VerticalRightToLeft: Story = {
  args: { value: 0 },
  render: () => (
    <div dir="rtl" style={{ display: "flex", gap: "var(--space-8)", alignItems: "flex-start" }}>
      <Meter
        orientation="vertical"
        label="Humidity"
        value={52}
        low={40}
        high={60}
        optimum={50}
        showScale
        showBands
      />
      <Meter
        orientation="vertical"
        variant="segments"
        label="Humidity"
        value={52}
        low={40}
        high={60}
        optimum={50}
        showScale
        showBands
      />
      <Meter label="Disk used" value={72} low={60} high={85} optimum={0} showScale showBands />
    </div>
  ),
};
