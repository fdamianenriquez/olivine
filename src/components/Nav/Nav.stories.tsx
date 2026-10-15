import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Nav, type NavItem } from "./Nav";

const meta = {
  title: "Navigation/Nav",
  component: Nav,
  tags: ["autodocs"],
  args: {
    label: "Sections",
    items: [
      { label: "Overview", href: "#", active: true },
      { label: "Process", href: "#" },
      { label: "Credits", href: "#" },
      { label: "Archive", href: "#", disabled: true },
    ],
  },
  parameters: {
    docs: {
      description: {
        component:
          'Nav is a list of links or buttons in three shapes: `line` (olive underline on the active item), `boxed` (joined cells, active ink-filled), `vertical` (side index with an olive edge).\n\n**Props** — `items` (`[{label, href, active, disabled, key}]`), `variant`, `indexed` (01, 02…), `onSelect(key)`, `label`.\n\n- Items with an `href` are links (`aria-current="page"` when active); items without are buttons that switch content in place (`aria-current="true"`). For panels use Tabs.\n- The active item is marked by shape (underline, fill, edge), never by colour alone.\n- Give each navigation on a page a distinct `label`.',
      },
    },
  },
} satisfies Meta<typeof Nav>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Boxed: Story = {
  args: {
    variant: "boxed",
    items: [
      { label: "All", href: "#", active: true },
      { label: "Identity", href: "#" },
      { label: "Interior", href: "#" },
    ],
  },
};

export const Vertical: Story = {
  args: {
    variant: "vertical",
    items: [
      { label: "Introduction", href: "#" },
      { label: "Tokens", href: "#", active: true },
      { label: "Components", href: "#" },
    ],
  },
};

export const Indexed: Story = { args: { indexed: true } };

const filters: NavItem[] = [
  { label: "All", key: "all" },
  { label: "Identity", key: "identity" },
  { label: "Interior", key: "interior" },
];

export const Buttons: Story = {
  render: (args) => {
    const [current, setCurrent] = useState<string | number>("all");
    return (
      <Nav
        {...args}
        variant="boxed"
        label="Filter works"
        items={filters.map((f) => ({ ...f, active: f.key === current }))}
        onSelect={setCurrent}
      />
    );
  },
};

export const Themes: Story = {
  render: (args) => (
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
          }}
        >
          <Nav {...args} label={`${theme} line`} indexed />
          <Nav {...args} label={`${theme} boxed`} variant="boxed" />
          <Nav {...args} label={`${theme} vertical`} variant="vertical" />
        </div>
      ))}
    </div>
  ),
};
