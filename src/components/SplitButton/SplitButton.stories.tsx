import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";

import { SplitButton, type SplitButtonItem } from "./SplitButton";

const save: SplitButtonItem[] = [
  { label: "Save as…", kbd: "mod+shift+s" },
  { label: "Save and close" },
  { label: "Save a copy", disabled: true },
  { divider: true },
  { label: "Discard changes", danger: true },
];

const meta = {
  title: "Actions/SplitButton",
  component: SplitButton,
  tags: ["autodocs"],
  args: { label: "Save", items: save, menuLabel: "More save options" },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "SplitButton joins a primary button and a square menu trigger into one ruled bar: the left half runs the main action, the right half opens a raised menu of related actions. The menu is Dropdown's, lined up with the whole bar and at least as wide as it; items invert to ink on hover and focus, arrow keys move, Escape and outside click close and return focus to the trigger.\n\nThe halves share one hairline (on `solid` and `accent` it is drawn in the text colour of the fill). The trigger is ink-filled while its menu is open. Only the trigger opens the menu: two predictable tab stops.\n\n- Do use it when one action is the default and the menu holds variations of it (Save / Save as… / Save and close).\n- Do put the destructive variant in the menu with `danger: true`, after a divider.\n- Do use `accent` once per view, like Button.\n- Do give the trigger a specific `menuLabel` when several split buttons share a page.\n- Don't use it for unrelated actions; use Dropdown.\n- Don't hide the only way to do something in the menu: the primary must be a complete action on its own.\n- Don't add an `arrow` to the primary or round the corners.",
      },
    },
  },
} satisfies Meta<typeof SplitButton>;

export default meta;

type Story = StoryObj<typeof meta>;

const room = (rows: number, extra?: CSSProperties) => [
  (Story: () => ReactNode) => (
    <div
      style={{
        minHeight: `calc(var(--space-12) * ${String(rows)})`,
        minWidth: "calc(var(--space-12) * 5)",
        ...extra,
      }}
    >
      <Story />
    </div>
  ),
];

export const Default: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
  decorators: room(6),
};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", alignItems: "center" }}>
      <SplitButton {...args} />
      <SplitButton {...args} variant="solid" />
      <SplitButton {...args} variant="accent" brackets />
      <SplitButton {...args} variant="ghost" />
      <SplitButton {...args} variant="danger" label="Delete" />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
      <SplitButton {...args} size="s" />
      <SplitButton {...args} />
      <SplitButton {...args} size="l" />
    </div>
  ),
};

/** The trigger is ink-filled while its menu is open, on every variant. */
export const OpenTriggers: Story = {
  render: (args) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, calc(var(--space-12) * 6))",
        columnGap: "var(--space-4)",
        rowGap: "var(--space-12)",
        paddingBottom: "var(--space-12)",
      }}
    >
      {(["outline", "solid", "accent", "ghost", "danger"] as const).map((variant) => (
        <SplitButton
          key={variant}
          {...args}
          label={variant}
          variant={variant}
          defaultOpen
          items={[{ label: "Save as…" }]}
        />
      ))}
    </div>
  ),
};

/** The menu is at least as wide as the whole bar, not only the trigger. */
export const MatchWidth: Story = {
  args: {
    label: "Publish to every channel at once",
    defaultOpen: true,
    items: [{ label: "Draft" }],
  },
  decorators: room(4),
};

export const AlignEnd: Story = {
  args: { align: "end", defaultOpen: true, label: "Go" },
  decorators: room(6, { textAlign: "right" }),
};

export const Up: Story = {
  args: { up: true, defaultOpen: true },
  decorators: [
    (Story) => (
      <div style={{ paddingTop: "calc(var(--space-12) * 4)" }}>
        <Story />
      </div>
    ),
  ],
};

export const Block: Story = {
  args: { block: true },
  decorators: room(0, { width: "calc(var(--space-12) * 8)" }),
};

/** The primary waits for a valid form; the menu still works. */
export const DisabledPrimary: Story = {
  args: { primaryProps: { disabled: true } },
};

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = { args: { loading: true } };

/** Opt-in noren curtain on the menu (needs `olivine/motion-extras.css`); off under reduced motion. */
export const Noren: Story = {
  args: { menuClassName: "ol-motion-noren" },
  decorators: room(6),
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
          style={{
            display: "grid",
            gap: "var(--space-4)",
            justifyItems: "start",
            alignContent: "start",
            minHeight: "calc(var(--space-12) * 8)",
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
            <SplitButton {...args} />
            <SplitButton {...args} variant="solid" />
            <SplitButton {...args} variant="accent" brackets />
            <SplitButton {...args} variant="ghost" />
            <SplitButton {...args} variant="danger" label="Delete" />
          </div>
          <SplitButton {...args} size="l" defaultOpen />
        </div>
      ))}
    </div>
  ),
};
