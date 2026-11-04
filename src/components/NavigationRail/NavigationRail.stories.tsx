import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Avatar } from "../Avatar";
import {
  NavigationRail,
  type NavigationRailItem,
  type NavigationRailProps,
} from "./NavigationRail";

const items: NavigationRailItem[] = [
  { key: "workshop", label: "Workshop", mark: "工" },
  { key: "orders", label: "Orders", mark: "注", badge: 3 },
  { key: "stock", label: "Stock", mark: "庫" },
  { key: "makers", label: "Makers", mark: "匠" },
  { key: "notes", label: "Notes", mark: "§" },
];

const labels = { expand: "Expand navigation", collapse: "Collapse navigation" };

/** A stateful rail: selecting a destination moves the olivo edge. */
function Rail(props: Partial<NavigationRailProps>) {
  const [active, setActive] = useState("orders");
  return (
    <NavigationRail
      items={items}
      label="Main"
      labels={labels}
      active={active}
      onSelect={setActive}
      {...props}
    />
  );
}

const meta = {
  title: "Navigation/NavigationRail",
  component: NavigationRail,
  tags: ["autodocs"],
  args: { items, label: "Main", labels, active: "orders" },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'NavigationRail is a vertical bar for the 3 to 7 top-level destinations of a tool on wide screens. Collapsed it is 80px: a mark with its word under it. Expanded it is 240px with the word beside the mark, and the labels wipe in. Below 600px use a bottom navigation instead.\n\n**Props** — `items` (`[{key, label, mark, href, badge}]`), `active`, `onSelect(key, event)`, `expanded` / `defaultExpanded` / `onExpandedChange`, `action` (`{label, glyph, onClick}`), `label`, `labels` (`expand`, `collapse`); `children` sit at the foot.\n\n- The current destination is `paper-2` with a 3px olivo edge and `aria-current="page"`; hover inverts a destination to ink.\n- `mark` is a kanji or a typographic glyph, set in the jp face and hidden from assistive tech: the label is always the name. Never use a mark alone.\n- A `badge` is a maple count read after the label ("Orders, 3").\n- The toggle is a button with `aria-expanded`, named "Expand navigation" / "Collapse navigation".\n- The optional `action` is the one square accent button of the view; collapsed, its name is `aria-label`.\n- Items with an `href` are links; call `event.preventDefault()` in `onSelect` to route on the client.\n- Under reduced motion the labels appear at once.\n\n- Do keep to 3–7 destinations, each with a one-word label.\n- Don\'t use it for in-page sections (use Nav or Tabs) or on narrow screens.',
      },
    },
  },
  decorators: [
    (Story, { parameters }) =>
      parameters.framed === false ? (
        <Story />
      ) : (
        <div style={{ height: "36rem", display: "flex" }}>
          <Story />
        </div>
      ),
  ],
} satisfies Meta<typeof NavigationRail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  render: (args) => <Rail {...args} />,
};

export const Expanded: Story = {
  args: { defaultExpanded: true },
  render: (args) => <Rail {...args} />,
};

export const WithAction: Story = {
  args: { defaultExpanded: true, action: { label: "New order", glyph: "+" } },
  render: (args) => <Rail {...args} />,
};

export const WithFoot: Story = {
  render: (args) => (
    <Rail {...args} action={{ label: "New order" }}>
      <Avatar name="Aiko Mori" size="s" />
    </Rail>
  ),
};

export const Links: Story = {
  args: {
    items: items.map((item) => ({ ...item, href: `#${item.key}` })),
  },
  render: (args) => (
    <Rail
      {...args}
      onSelect={(_key, event) => {
        event.preventDefault();
      }}
    />
  ),
};

/** Both themes, collapsed and expanded: the frames the owner approves. */
export const Themes: Story = {
  parameters: { flush: true, framed: false },
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "flex",
            gap: "var(--space-6)",
            padding: "var(--space-6)",
            background: "var(--paper-3)",
            height: "36rem",
          }}
        >
          <Rail {...args} label={`${theme} collapsed`} />
          <Rail
            {...args}
            label={`${theme} expanded`}
            defaultExpanded
            action={{ label: "New order", glyph: "+" }}
          />
        </div>
      ))}
    </div>
  ),
};
