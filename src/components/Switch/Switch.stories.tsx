import type { Meta, StoryObj } from "@storybook/react-vite";

import { Root } from "../Root";
import { Switch } from "./Switch";

const meta = {
  title: "Forms/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: { label: "Notifications" },
  parameters: {
    docs: {
      description: {
        component:
          "Switch toggles a setting immediately; off is an ink square, on fills the track with ink and turns the knob into an olive dot.\n\n- Use it for settings that apply instantly.\n- Use Checkbox inside forms that submit.\n- Always give it a `label`, or an `aria-label` when the label is drawn elsewhere.",
      },
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { defaultChecked: true } };

export const NoStateWord: Story = { args: { defaultChecked: true, showState: false } };

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <Switch {...args} label="Unavailable" disabled />
      <Switch {...args} label="Unavailable, on" disabled defaultChecked />
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <Switch label="Notifications" />
          <Switch label="Notifications" defaultChecked />
          <Switch label="Unavailable" disabled />
          <Switch label="Unavailable" disabled defaultChecked />
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <Switch label={locale} />
            <Switch label={locale} defaultChecked />
          </div>
        </Root>
      ))}
    </div>
  ),
};
