import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Text } from "../Text";
import { Tabs } from "./Tabs";

const meta = {
  title: "Navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: { label: "Project sections", children: null },
  parameters: {
    docs: {
      description: {
        component:
          "Tabs switch between panels in place; the selected tab is an ink-outlined box with an olive top edge. Arrow keys move between tabs, Home and End jump to the ends.\n\n- Use it to split related content of equal weight into panels.\n- Keep tab labels short, one or two words.\n- Do not use it for page navigation; use links.\n- Do not hide required steps behind tabs.",
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

const panels = [
  <Tabs.Tab key="1" label="Concept">
    <Text tone="muted">A kitchen is a room of verbs: cut, wash, wait.</Text>
  </Tabs.Tab>,
  <Tabs.Tab key="2" label="Material">
    <Text tone="muted">Oak, steel, washi.</Text>
  </Tabs.Tab>,
  <Tabs.Tab key="3" label="Process">
    <Text tone="muted">Drawings, models, mock-ups.</Text>
  </Tabs.Tab>,
];

export const Default: Story = { render: (args) => <Tabs {...args}>{panels}</Tabs> };

export const Indexed: Story = {
  render: (args) => (
    <Tabs {...args} indexed>
      {panels}
    </Tabs>
  ),
};

export const Fill: Story = {
  render: (args) => (
    <Tabs {...args} fill>
      {panels}
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  render: (args) => (
    <Tabs {...args} indexed>
      {panels}
      <Tabs.Tab label="Locked" disabled />
    </Tabs>
  ),
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState(1);
    return (
      <Tabs {...args} value={value} onChange={setValue}>
        {panels}
      </Tabs>
    );
  },
};

export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <Tabs {...args} indexed>
            {panels}
            <Tabs.Tab label="Locked" disabled />
          </Tabs>
        </div>
      ))}
    </div>
  ),
};
