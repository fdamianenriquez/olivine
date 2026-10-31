import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Field } from "../Field";
import { Range, type RangeValue } from "./Range";

/**
 * Word units (cm, kg) sit in their own label-face cell beside the figure. A node result gives no
 * `aria-valuetext`, so the unit must also be in the accessible name ("Width (cm)").
 */
function withUnit(unit: string) {
  return function formatWithUnit(v: number) {
    return (
      <>
        {v}
        <span className="ol-range__unit">{unit}</span>
      </>
    );
  };
}

const meta = {
  title: "Forms/Range",
  component: Range,
  tags: ["autodocs"],
  args: { "aria-label": "Width", defaultValue: 120, min: 0, max: 240, step: 10 },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Range is a hairline track with a block thumb and a scale showing min, current and max in the figure face. Given a `[low, high]` pair (or `range`) it has two thumbs that never cross, with an ink segment between them; pressing the line moves the nearest thumb.\n\n- Do keep symbols (%, ¥, $) with the digits in the figure face; put word units (cm, kg) in `.ol-range__unit` through `format`, and in the label too, because a node result is not announced.\n- Do use it inside `Field` so it gets a label; each thumb is read as "<label>, minimum" / "<label>, maximum".\n- Do use `onValueCommit` for anything expensive and `onValueChange` for a live readout.\n- Don\'t use it for exact entry; pair it with `NumberField` when precision matters.',
      },
    },
  },
} satisfies Meta<typeof Range>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithUnits: Story = { args: { "aria-label": "Width (cm)", format: withUnit("cm") } };

function SpokenUnits() {
  const [value, setValue] = useState(120);
  return (
    <Range
      aria-label="Width"
      max={240}
      step={10}
      value={value}
      onChange={(event) => {
        setValue(Number(event.target.value));
      }}
      format={withUnit("cm")}
      // The visible unit is a node, so the spoken value names it explicitly.
      aria-valuetext={`${String(value)} centimetres`}
    />
  );
}

/** A node `format` is not announced: pass `aria-valuetext` (single thumb) to keep the unit. */
export const WithSpokenUnits: Story = { render: () => <SpokenUnits /> };

export const Percent: Story = {
  args: { min: 0, max: 100, step: 5, defaultValue: 40, format: (v) => `${String(v)}%` },
};

export const Yen: Story = {
  args: { min: 0, max: 50000, step: 1000, defaultValue: 12000, format: (v) => "¥" + String(v) },
};

export const NoScale: Story = { args: { scale: false } };

export const Disabled: Story = { args: { disabled: true } };

export const Dual: Story = {
  render: () => <Range aria-label="Price" defaultValue={[20, 80]} />,
};

export const DualWithUnits: Story = {
  render: () => (
    <Range
      aria-label="Width (cm)"
      min={0}
      max={240}
      step={10}
      defaultValue={[60, 180]}
      format={withUnit("cm")}
    />
  ),
};

export const DualCurrency: Story = {
  render: () => (
    <Range
      aria-label="Budget"
      min={0}
      max={50000}
      step={1000}
      defaultValue={[12000, 30000]}
      formatOptions={{ style: "currency", currency: "JPY" }}
      locale="ja-JP"
    />
  ),
};

export const DualMinDistance: Story = {
  render: () => <Range aria-label="Price" step={5} minDistance={20} defaultValue={[30, 50]} />,
};

function Controlled() {
  const [value, setValue] = useState<RangeValue>([25, 75]);
  const [committed, setCommitted] = useState<RangeValue>(value);
  return (
    <Field label="Price" hint={`Saved: ${String(committed[0])} – ${String(committed[1])} euros`}>
      <Range value={value} onValueChange={setValue} onValueCommit={setCommitted} name="price" />
    </Field>
  );
}

export const DualInField: Story = { render: () => <Controlled /> };

export const DualInvalid: Story = {
  render: () => (
    <Field label="Price" error="The range is too narrow for any result">
      <Range defaultValue={[48, 52]} />
    </Field>
  ),
};

export const DualOverlap: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-5)" }}>
      <Range aria-label="At the end" defaultValue={[100, 100]} />
      <Range aria-label="At the start" defaultValue={[0, 0]} />
    </div>
  ),
};

export const DualDisabled: Story = {
  render: () => <Range aria-label="Price" defaultValue={[20, 80]} disabled />,
};

export const DualRtl: Story = {
  render: () => (
    <div dir="rtl">
      <Range aria-label="Price" defaultValue={[20, 80]} />
    </div>
  ),
};

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
            gap: "var(--space-5)",
            padding: "var(--space-4)",
            background: "var(--paper)",
            maxWidth: 360,
          }}
        >
          <Range
            aria-label="Width"
            defaultValue={120}
            max={240}
            step={10}
            format={withUnit("cm")}
          />
          <Range aria-label="No scale" scale={false} defaultValue={30} />
          <Range aria-label="Disabled" disabled defaultValue={60} />
          <Range
            aria-label="Width range (cm)"
            defaultValue={[60, 180]}
            max={240}
            step={10}
            format={withUnit("cm")}
          />
          <Range
            aria-label="Budget"
            defaultValue={[12000, 30000]}
            max={50000}
            step={1000}
            formatOptions={{ style: "currency", currency: "JPY" }}
            locale="ja-JP"
          />
          <Range aria-label="Disabled range" defaultValue={[20, 80]} disabled />
        </div>
      ))}
    </div>
  ),
};
