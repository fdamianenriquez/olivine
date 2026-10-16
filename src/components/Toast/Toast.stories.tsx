import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Root } from "../Root";
import { Toast } from "./Toast";

const noop = fn();

const meta = {
  title: "Feedback/Toast",
  component: Toast,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `Toast is a brief raised notice with a mono meta line (coloured dot by tone) and an optional draining timer bar. Place it inside \`ToastStack\`, which owns the single polite live region.

- Do keep the title short and let the meta line say when or where.
- Do pass \`onClose\` whenever you pass \`duration\`; the timer pauses on hover and focus.
- Don't rely on the tone dot alone; the meta text always accompanies it.
- Don't use a Toast for notices that must stay until acted on; use Alert.`,
      },
    },
  },
  args: {
    meta: "Saved · 20:05",
    title: "Draft saved",
    children: "Your changes are stored.",
  },
} satisfies Meta<typeof Toast>;

export default meta;

type Story = StoryObj<typeof meta>;

const col = { display: "grid", gap: "var(--space-4)", justifyItems: "start" } as const;

export const Default: Story = { args: { onClose: noop } };

export const Tones: Story = {
  render: () => (
    <div style={col}>
      {(["accent", "info", "success", "warning", "danger", "neutral"] as const).map((tone) => (
        <Toast key={tone} tone={tone} meta={tone} title="Heading">
          Body text.
        </Toast>
      ))}
    </div>
  ),
};

export const Timed: Story = {
  args: { duration: 8000, onClose: noop },
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          style={{ padding: "var(--space-6)", background: "var(--paper)", color: "var(--ink)" }}
        >
          <Toast tone="success" meta="Order · 001" title="Shipped" duration={8000} onClose={noop} />
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={col}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Toast title="Draft" onClose={noop} />
        </Root>
      ))}
    </div>
  ),
};
