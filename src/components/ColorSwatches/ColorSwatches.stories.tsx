import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Field } from "../Field";
import { Label } from "../Label";
import { Root } from "../Root";
import { Text } from "../Text";
import { ColorSwatches, type ColorSwatchOption } from "./ColorSwatches";

/* Product colours are content: literal values live only in the options, never in the CSS. */
const FINISHES: ColorSwatchOption[] = [
  { value: "natural", label: "Natural", color: "#e3cfa4" },
  { value: "sunburst", label: "Sunburst", color: "rgb(150 60 18 / 0.62)", base: "#d8b78a" },
  { value: "cherry", label: "Cherry", color: "#7a1f1b" },
  { value: "ebony", label: "Ebony", color: "#16110e", disabled: true, hint: "Sold out" },
  { value: "snow", label: "Snow", color: "#fbfaf7" },
  { value: "seafoam", label: "Seafoam", color: "oklch(0.82 0.06 170)" },
];

/*
 * Amounts are figures: pass them in the figure face. Text inherits the cell's (inverted) colour.
 * `dir="ltr"` keeps the sign in place ("+¥8,000") inside right-to-left pages.
 */
function Price({ children }: { children: string }) {
  return (
    <Text variant="figure-m" dir="ltr">
      {children}
    </Text>
  );
}

const WOODS: ColorSwatchOption[] = [
  { value: "alder", label: "Alder", color: "#d9b58a", hint: "Included" },
  { value: "ash", label: "Swamp ash", color: "#e6d3b0", hint: <Price>+¥8,000</Price> },
  { value: "mahogany", label: "Mahogany", color: "#6b2f1e", hint: <Price>+¥12,000</Price> },
  { value: "walnut", label: "Walnut", color: "#3d2a1e", disabled: true, hint: "Sold out" },
];

/* Edge cases for contrast: near paper, near ink, translucent with and without a base. */
const EDGES: ColorSwatchOption[] = [
  { value: "white", label: "Pure white", color: "#ffffff" },
  { value: "cream", label: "Cream", color: "#f6f0e2" },
  { value: "black", label: "Jet black", color: "#000000" },
  { value: "charcoal", label: "Charcoal", color: "#1a1a1a" },
  { value: "tint", label: "Smoke tint", color: "rgb(0 0 0 / 0.25)" },
  { value: "stain", label: "Amber stain", color: "rgb(200 120 20 / 0.5)", base: "#e9d8b5" },
  { value: "none", label: "No finish" },
];

const meta = {
  title: "Forms/ColorSwatches",
  component: ColorSwatches,
  tags: ["autodocs"],
  args: { legend: "Finish", options: FINISHES, defaultValue: "sunburst" },
  parameters: {
    docs: {
      description: {
        component: `ColorSwatches is a single-choice picker over a fixed set of named swatches — finishes, woods, hardware. Each option is a square colour tile with its name; the selected cell fills with ink by a wipe. The colours are the product's own and are passed as data (\`color\`, and \`base\` under a translucent colour), not tokens.

A native radio group: Tab enters on the selected swatch, arrows move and select (wrapping), Space selects. Disabled swatches are skipped and show their reason.

- Do give every option a clear name ("Natural", "Ebony"), not a hex code or a number.
- Do put a visible reason on unavailable swatches ("Sold out").
- Do test your own colours in both themes; the hairline keeps very light and very dark swatches visible.
- Don't use it for a free colour choice or for several selections.
- Don't style the tile with your own classes or inline backgrounds; pass \`color\` (and \`base\`).
- Don't rely on \`labels="tooltip"\` for touch-only audiences; it hides the names that are not selected.`,
      },
    },
  },
} satisfies Meta<typeof ColorSwatches>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-8)",
  alignItems: "flex-start",
};

const row: CSSProperties = {
  display: "flex",
  gap: "var(--space-6)",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const column: CSSProperties = { width: "calc(var(--space-32) * 3)" };

export const Default: Story = {};

export const Stack: Story = {
  args: { legend: "Body wood", layout: "stack", options: WOODS, defaultValue: "ash" },
  render: (args) => (
    <div style={column}>
      <ColorSwatches {...args} />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      {(["s", "m", "l"] as const).map((size) => (
        <ColorSwatches
          key={size}
          size={size}
          legend={`Finish, size ${size}`}
          options={FINISHES}
          defaultValue="cherry"
        />
      ))}
    </div>
  ),
};

export const TooltipLabels: Story = {
  name: "Tooltip labels",
  args: { labels: "tooltip", size: "s", defaultValue: "seafoam" },
};

export const Disabled: Story = {
  render: () => (
    <div style={stack}>
      <ColorSwatches legend="Finish (one sold out)" options={FINISHES} defaultValue="natural" />
      <ColorSwatches legend="Finish (locked)" options={FINISHES} defaultValue="cherry" disabled />
    </div>
  ),
};

export const EdgeColours: Story = {
  name: "Very light, very dark and translucent",
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <ColorSwatches legend="Finish" options={EDGES} defaultValue="black" />
        </Root>
      ))}
    </div>
  ),
};

function ControlledDemo() {
  const [value, setValue] = useState<string | null>("alder");
  return (
    <div style={{ ...stack, gap: "var(--space-3)" }}>
      <ColorSwatches legend="Body wood" options={WOODS} value={value} onChange={setValue} />
      <Label muted>Selected: {value ?? "none"}</Label>
    </div>
  );
}

export const Controlled: Story = { render: () => <ControlledDemo /> };

export const InAField: Story = {
  name: "In a Field",
  render: () => (
    <form
      style={column}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Field label="Hardware" hint="Shown on the bridge and tuners." required>
        <ColorSwatches
          name="hardware"
          layout="stack"
          size="s"
          options={[
            { value: "chrome", label: "Chrome", color: "#c9ccce", hint: "Included" },
            { value: "gold", label: "Gold", color: "#c7a24a", hint: <Price>+¥6,000</Price> },
            { value: "black", label: "Black", color: "#1c1c1c", hint: <Price>+¥4,000</Price> },
          ]}
          defaultValue="chrome"
        />
      </Field>
    </form>
  ),
};

export const RightToLeft: Story = {
  name: "Right to left",
  parameters: {
    docs: {
      description: {
        story:
          'Under `dir="rtl"` the cells run from the right, the arrow keys follow the reading direction and the ink wipes in from the inline-start (right) edge.',
      },
    },
  },
  render: () => (
    <div dir="rtl" style={stack}>
      <ColorSwatches legend="Finish" options={FINISHES} defaultValue="cherry" />
      <div style={column}>
        <ColorSwatches legend="Body wood" layout="stack" options={WOODS} defaultValue="ash" />
      </div>
    </div>
  ),
};

export const ReducedMotion: Story = {
  name: "Reduced motion",
  parameters: {
    docs: {
      description: {
        story:
          "Inside `.ol-reduce-motion` (or with `prefers-reduced-motion: reduce`) the ink and the ✓ appear at once.",
      },
    },
  },
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <ColorSwatches legend="Finish" options={FINISHES} defaultValue="natural" />
    </div>
  ),
};

function ThemeSample() {
  return (
    <div style={stack}>
      <ColorSwatches legend="Finish" options={FINISHES} defaultValue="sunburst" />
      <div style={column}>
        <ColorSwatches legend="Body wood" layout="stack" options={WOODS} defaultValue="mahogany" />
      </div>
      <ColorSwatches
        legend="Pickguard"
        labels="tooltip"
        size="s"
        options={EDGES}
        defaultValue="cream"
      />
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
