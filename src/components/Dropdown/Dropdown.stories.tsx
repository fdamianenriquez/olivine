import type { Meta, StoryObj } from "@storybook/react-vite";

import { Modal } from "../Modal";
import { Dropdown, type DropdownItem } from "./Dropdown";

const full: DropdownItem[] = [
  { header: "Project" },
  { label: "Rename", kbd: "mod+r" },
  { label: "Duplicate", kbd: "mod+d" },
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
          "Dropdown opens a raised menu from a button; items invert to ink on hover and focus. The pointer moves the highlight, so only one row is ever inverted. Arrow keys, Home/End and typeahead move; Escape and outside click close and return focus to the button.\n\nThe menu renders in a portal above the sticky navbar and modals, flips or shifts at the viewport edge, and scrolls when it does not fit. Headers name the group of items that follows them. Shortcuts in `kbd` are drawn with Kbd and exposed as `aria-keyshortcuts`; they are hints, the app handles the keys. The trigger is a `Button`, so `variant` and `size` pass through, and `ref` points to it.\n\n- Do use it for a short list of actions on one object.\n- Do mark destructive actions with `danger` and keep them last, after a divider.\n- Do set `restoreFocus={false}` when an item moves focus itself (rename in place).\n- Don't use it for site navigation (use Nav) or to pick a value for a form (use Select).\n- Don't hide the only primary action in a menu.",
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

/** A menu taller than the room left: it stops at the viewport edge and scrolls. */
export const LongMenu: Story = {
  parameters: { layout: "fullscreen" },
  args: {
    defaultOpen: true,
    items: Array.from({ length: 40 }, (_, i) => ({ label: `Version ${String(40 - i)}` })),
  },
  render: (args) => (
    <div style={{ padding: "var(--space-4)" }}>
      <Dropdown {...args} label="History" />
    </div>
  ),
};

/** Shortcut caps on every row state: plain, disabled, and (on hover or arrow keys) highlighted and danger. */
export const ShortcutStates: Story = {
  args: {
    defaultOpen: true,
    items: [
      { label: "Copy", kbd: "mod+c" },
      { label: "Paste", kbd: "mod+v", disabled: true },
      { divider: true },
      { label: "Delete", kbd: "delete", danger: true },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 240, minWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};

/** The menu stacks above a modal (`z-dropdown` sits above overlays, below toasts and tooltips). */
export const InModal: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <Modal open title="Project" onClose={() => undefined}>
      <Dropdown {...args} defaultOpen />
    </Modal>
  ),
};
