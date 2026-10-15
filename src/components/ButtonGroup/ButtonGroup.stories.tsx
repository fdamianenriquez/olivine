import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Root } from "../Root";
import { ButtonGroup } from "./ButtonGroup";

const meta = {
  title: "Actions/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
  args: { label: "View" },
  parameters: {
    docs: {
      description: {
        component: `ButtonGroup joins buttons so their borders collapse into one ruled bar.

- Do give the group a \`label\`; it conveys a choice and needs a name.
- Do mark the selected button with \`aria-pressed="true"\`; it renders ink-filled.
- Don't mix button sizes inside one group.`,
      },
    },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = {
  display: "flex",
  gap: "var(--space-6)",
  alignItems: "flex-start",
  flexWrap: "wrap",
} as const;

function Toggle({ vertical = false, size = "m" }: { vertical?: boolean; size?: "s" | "m" | "l" }) {
  const options = ["Grid", "List", "Index"];
  const [value, setValue] = useState(options[0]);
  return (
    <ButtonGroup label="View" vertical={vertical}>
      {options.map((o) => (
        <Button
          key={o}
          size={size}
          aria-pressed={value === o}
          onClick={() => {
            setValue(o);
          }}
        >
          {o}
        </Button>
      ))}
    </ButtonGroup>
  );
}

export const Default: Story = { render: () => <Toggle /> };

export const Vertical: Story = { render: () => <Toggle vertical /> };

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Toggle size="s" />
      <Toggle size="m" />
      <Toggle size="l" />
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <div style={row}>
            <Toggle />
            <Toggle vertical />
          </div>
        </Root>
      ))}
    </div>
  ),
};
