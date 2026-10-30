import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Label } from "../Label";
import { Root } from "../Root";
import { SegmentedControl, type SegmentedControlOption } from "./SegmentedControl";

const VIEWS: SegmentedControlOption[] = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "index", label: "Index" },
];

const CURRENCIES: SegmentedControlOption[] = [
  { value: "jpy", label: "JPY" },
  { value: "usd", label: "USD" },
  { value: "eur", label: "EUR" },
  { value: "gbp", label: "GBP" },
];

const STYLES: SegmentedControlOption[] = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "mono", label: "Mono" },
];

const meta = {
  title: "Actions/SegmentedControl",
  component: SegmentedControl,
  tags: ["autodocs"],
  args: { label: "View", options: VIEWS, defaultValue: "grid" },
  parameters: {
    docs: {
      description: {
        component: `SegmentedControl is a ruled bar of two to five joined cells for choosing a value in place, one option or several. The selected cell fills with ink by a wipe that travels from the previous choice (instant under reduced motion).

Single is a radio group: one tab stop, arrow keys move and select, Home and End jump to the ends. \`multiple\` makes each cell a toggle button and its own tab stop.

- Do give the group a short visible or accessible name ("View", "Currency").
- Do keep labels to one to three words; use \`fill\` for equal widths in a narrow column.
- Don't use it to switch panels (use Tabs), for more than five options (use Select), or for commands (use ButtonGroup).
- Don't make an icon-only cell without \`aria-label\`.`,
      },
    },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-6)",
  alignItems: "flex-start",
};

const row: CSSProperties = {
  display: "flex",
  gap: "var(--space-6)",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

export const Default: Story = {};

export const Multiple: Story = {
  render: () => (
    <SegmentedControl
      multiple
      check
      label="Text style"
      options={STYLES}
      defaultValue={["bold", "mono"]}
    />
  ),
};

export const Check: Story = { args: { check: true } };

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      {(["s", "m", "l"] as const).map((size) => (
        <SegmentedControl
          key={size}
          size={size}
          label={`Currency, size ${size}`}
          options={CURRENCIES}
          defaultValue="jpy"
        />
      ))}
    </div>
  ),
};

export const Fill: Story = {
  render: () => (
    <div style={{ width: "calc(var(--space-32) * 3)" }}>
      <SegmentedControl fill label="Currency" options={CURRENCIES} defaultValue="eur" />
    </div>
  ),
};

export const Vertical: Story = {
  args: { vertical: true, options: CURRENCIES, label: "Currency", defaultValue: "usd" },
};

export const Icons: Story = {
  render: () => (
    <div style={stack}>
      <SegmentedControl
        label="Sort"
        options={[
          { value: "up", label: "Oldest", icon: "↑" },
          { value: "down", label: "Newest", icon: "↓" },
        ]}
        defaultValue="down"
      />
      <SegmentedControl
        label="Direction"
        options={[
          { value: "prev", icon: "←", "aria-label": "Previous" },
          { value: "next", icon: "→", "aria-label": "Next" },
        ]}
        defaultValue="next"
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={stack}>
      <SegmentedControl
        label="Currency"
        options={CURRENCIES.map((o) => (o.value === "usd" ? { ...o, disabled: true } : o))}
        defaultValue="jpy"
      />
      <SegmentedControl disabled label="View" options={VIEWS} defaultValue="list" />
    </div>
  ),
};

function ControlledDemo() {
  const [value, setValue] = useState<string | null>("list");
  return (
    <div style={stack}>
      <SegmentedControl label="View" options={VIEWS} value={value} onChange={setValue} />
      <Label muted>Selected: {value ?? "none"}</Label>
    </div>
  );
}

export const Controlled: Story = { render: () => <ControlledDemo /> };

export const InAForm: Story = {
  name: "In a form",
  render: () => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <SegmentedControl
        name="unit"
        label="Unit"
        options={[
          { value: "mm", label: "mm" },
          { value: "cm", label: "cm" },
          { value: "in", label: "in" },
        ]}
        defaultValue="mm"
      />
    </form>
  ),
};

export const ReducedMotion: Story = {
  name: "Reduced motion",
  parameters: {
    docs: {
      description: {
        story:
          "Inside `.ol-reduce-motion` (or with `prefers-reduced-motion: reduce`) the selection changes instantly; nothing travels.",
      },
    },
  },
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <SegmentedControl label="View" options={VIEWS} defaultValue="grid" />
    </div>
  ),
};

function ThemeSample() {
  return (
    <div style={stack}>
      <SegmentedControl label="View" options={VIEWS} defaultValue="list" />
      <SegmentedControl
        multiple
        check
        label="Text style"
        options={STYLES}
        defaultValue={["bold", "mono"]}
      />
      <div style={row}>
        <SegmentedControl
          size="s"
          label="Currency"
          options={CURRENCIES.map((o) => (o.value === "usd" ? { ...o, disabled: true } : o))}
          defaultValue="eur"
        />
        <SegmentedControl vertical label="Unit" options={VIEWS} defaultValue="index" />
      </div>
      <div style={{ width: "calc(var(--space-32) * 3)" }}>
        <SegmentedControl fill label="Currency" options={CURRENCIES} defaultValue="jpy" />
      </div>
    </div>
  );
}

export const Themes: Story = {
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <ThemeSample />
        </Root>
      ))}
    </div>
  ),
};
