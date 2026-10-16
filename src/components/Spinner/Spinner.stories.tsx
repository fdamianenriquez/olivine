import type { Meta, StoryObj } from "@storybook/react-vite";

import { Root } from "../Root";
import { Spinner } from "./Spinner";

const meta = {
  title: "Feedback/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Spinner is a square that turns in four steps with an olive corner, or three blinking blocks.\n\n- It announces its label as a polite status; the default is the locale\'s "Loading".\n- Use `showLabel` when the wait needs a visible word.\n- With reduced motion the mark stops but stays recognisable.',
      },
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-8)", alignItems: "center" }}>
      <Spinner />
      <Spinner size="l" />
      <Spinner showLabel label="Loading" />
      <Spinner variant="dots" showLabel label="Thinking" />
      <Spinner variant="dots" size="l" />
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
            display: "flex",
            gap: "var(--space-8)",
            alignItems: "center",
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <Spinner showLabel />
          <Spinner size="l" />
          <Spinner variant="dots" showLabel />
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
          <Spinner showLabel />
        </Root>
      ))}
    </div>
  ),
};
