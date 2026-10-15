import type { Meta, StoryObj } from "@storybook/react-vite";

import { Dropdown, type DropdownItem } from "./Dropdown";

const full: DropdownItem[] = [
  { header: "Project" },
  { label: "Rename", kbd: "⌘R" },
  { label: "Duplicate", kbd: "⌘D" },
  { label: "Archive", disabled: true },
  { divider: true },
  { label: "Delete", danger: true },
];

const meta = {
  title: "Navigation/Dropdown",
  component: Dropdown,
  tags: ["autodocs"],
  args: { label: "Actions", items: full },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Dropdown opens a raised menu from a button; items invert to ink on hover and focus. Arrow keys, Home/End and typeahead move, Escape and outside click close.\n\nThe menu renders in a portal and flips or shifts at the viewport edge. The trigger is a `Button`, so `variant` and `size` pass through, and `ref` points to it.\n\n- Do use it for a short list of actions on one object.\n- Do mark destructive actions with `danger` and keep them last, after a divider.\n- Don't use it to pick a value for a form; use Select.\n- Don't hide the only primary action in a menu.",
      },
    },
  },
} satisfies Meta<typeof Dropdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { items: [{ label: "Rename" }, { label: "Duplicate" }, { label: "Delete" }] },
};

export const HeadersDividersAndShortcuts: Story = {
  args: { defaultOpen: true },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 300, minWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export const AlignEnd: Story = {
  args: { align: "end", defaultOpen: true },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 300, minWidth: 320, textAlign: "right" }}>
        <Story />
      </div>
    ),
  ],
};

export const Up: Story = {
  args: { up: true, defaultOpen: true },
  decorators: [
    (Story) => (
      <div style={{ paddingTop: 220 }}>
        <Story />
      </div>
    ),
  ],
};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
      <Dropdown {...args} label="Outline" />
      <Dropdown {...args} label="Solid" variant="solid" />
      <Dropdown {...args} label="Small" size="s" />
      <Dropdown {...args} label="Large" size="l" />
    </div>
  ),
};

export const NearViewportEdge: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "var(--space-4)" }}>
      <Dropdown {...args} defaultOpen />
    </div>
  ),
};

export const Themes: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ minHeight: 320, padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <Dropdown {...args} defaultOpen />
        </div>
      ))}
    </div>
  ),
};
