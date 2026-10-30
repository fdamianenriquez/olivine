import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ButtonGroup } from "../ButtonGroup";
import { Root } from "../Root";
import { Tooltip } from "../Tooltip";
import { ToggleButton } from "./ToggleButton";

const meta = {
  title: "Actions/ToggleButton",
  component: ToggleButton,
  tags: ["autodocs"],
  args: { children: "Grid" },
  parameters: {
    docs: {
      description: {
        component: `ToggleButton is a Button that holds an on/off state: off is an outlined box, on is filled with ink, and \`aria-pressed\` tells assistive technology which. Its label never changes with the state.

Hover on an unpressed toggle fills with \`paper-2\` instead of inverting to ink, so hover never looks like pressed; a pressed toggle ignores hover. No motion.

- Do keep the same label in both states and let the fill carry the state ("Grid" stays "Grid").
- Do put related toggles in a ButtonGroup (with \`label\`) so their borders are shared; each remains an independent toggle.
- Do pair glyph-only toggles with a Tooltip and an \`aria-label\` (see Button \`square\`).
- Don't use it for one-of-many choices: that is SegmentedControl (radio semantics, arrow keys).
- Don't flip the label ("Mute" / "Unmute") and set \`aria-pressed\` as well; use a plain Button.
- Don't use \`solid\`, \`accent\` or \`danger\`, and don't mark the state with colour alone: the ink fill is the state.`,
      },
    },
  },
} satisfies Meta<typeof ToggleButton>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = {
  display: "flex",
  gap: "var(--space-4)",
  alignItems: "center",
  flexWrap: "wrap",
} as const;

export const Default: Story = {};

export const States: Story = {
  render: () => (
    <div style={row}>
      <ToggleButton>Grid</ToggleButton>
      <ToggleButton defaultPressed>Grid</ToggleButton>
      <ToggleButton disabled>Map</ToggleButton>
      <ToggleButton disabled defaultPressed>
        Map
      </ToggleButton>
    </div>
  ),
};

export const Ghost: Story = {
  render: () => (
    <div style={row}>
      <ToggleButton variant="ghost">Show rules</ToggleButton>
      <ToggleButton variant="ghost" defaultPressed>
        Show rules
      </ToggleButton>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <ToggleButton size="s">Small</ToggleButton>
      <ToggleButton defaultPressed>Medium</ToggleButton>
      <ToggleButton size="l">Large</ToggleButton>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div style={row}>
      <ToggleButton square size="s" aria-label="Pin">
        ↑
      </ToggleButton>
      <ToggleButton icon="+" pressedIcon="✓" aria-label="Save for later" defaultPressed />
      <ToggleButton square size="l" variant="ghost" aria-label="Show grid">
        ■
      </ToggleButton>
    </div>
  ),
};

export const WithTooltip: Story = {
  render: () => (
    <Tooltip content="Save for later">
      <ToggleButton icon="+" pressedIcon="✓" aria-label="Save for later" />
    </Tooltip>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div style={row}>
      <ToggleButton icon="+" pressedIcon="✓">
        Watch
      </ToggleButton>
      <ToggleButton icon="+" pressedIcon="✓" defaultPressed>
        Watch
      </ToggleButton>
    </div>
  ),
};

export const InButtonGroup: Story = {
  render: () => (
    <ButtonGroup label="Text style">
      <ToggleButton square aria-label="Bold" defaultPressed>
        B
      </ToggleButton>
      <ToggleButton square aria-label="Italic">
        I
      </ToggleButton>
      <ToggleButton square aria-label="Underline" defaultPressed>
        U
      </ToggleButton>
    </ButtonGroup>
  ),
};

function ControlledDemo() {
  const [on, setOn] = useState(false);
  return (
    <div style={row}>
      <ToggleButton pressed={on} onPressedChange={setOn}>
        Grid
      </ToggleButton>
      <p>Grid is {on ? "shown" : "hidden"}.</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-4)" }}>
          <div style={{ ...row, flexDirection: "column", alignItems: "flex-start" }}>
            <div style={row}>
              <ToggleButton>Grid</ToggleButton>
              <ToggleButton defaultPressed>Grid</ToggleButton>
              <ToggleButton variant="ghost">Rules</ToggleButton>
              <ToggleButton variant="ghost" defaultPressed>
                Rules
              </ToggleButton>
            </div>
            <div style={row}>
              <ToggleButton disabled>Map</ToggleButton>
              <ToggleButton disabled defaultPressed>
                Map
              </ToggleButton>
              <ToggleButton icon="+" pressedIcon="✓" defaultPressed>
                Watch
              </ToggleButton>
            </div>
            <ButtonGroup label="Text style">
              <ToggleButton square aria-label="Bold" defaultPressed>
                B
              </ToggleButton>
              <ToggleButton square aria-label="Italic">
                I
              </ToggleButton>
              <ToggleButton square aria-label="Underline">
                U
              </ToggleButton>
            </ButtonGroup>
          </div>
        </Root>
      ))}
    </div>
  ),
};
