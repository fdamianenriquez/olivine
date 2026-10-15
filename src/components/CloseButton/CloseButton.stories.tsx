import type { Meta, StoryObj } from "@storybook/react-vite";

import { Root } from "../Root";
import { CloseButton } from "./CloseButton";

const meta = {
  title: "Actions/CloseButton",
  component: CloseButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `CloseButton is a 32px square "×" used in modal, toast, popover and alert heads.

- Do keep the default label unless the action is a dismissal; then pass \`label\`.
- Do place it at the end of a head row.
- Don't swap the "×" for another icon or round the corners.
- Don't use it for anything other than closing or dismissing.`,
      },
    },
  },
} satisfies Meta<typeof CloseButton>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = {
  display: "flex",
  gap: "var(--space-4)",
  alignItems: "center",
  flexWrap: "wrap",
} as const;

export const Default: Story = {};

export const Labelled: Story = {
  render: () => (
    <div style={row}>
      <CloseButton />
      <CloseButton label="Dismiss" />
      <CloseButton disabled />
    </div>
  ),
};

export const InHeader: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-3) var(--space-4)",
        border: "var(--stroke-hair) solid var(--rule)",
        maxWidth: 360,
      }}
    >
      <span>Notifications</span>
      <CloseButton />
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          style={{
            padding: "var(--space-6)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        >
          <CloseButton />
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={row}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <CloseButton />
        </Root>
      ))}
    </div>
  ),
};
