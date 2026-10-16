import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button";
import { Root } from "../Root";
import { Alert } from "./Alert";

const meta = {
  title: "Feedback/Alert",
  component: Alert,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `Alert is an inline message whose frame and word tag carry the status colour while the text stays ink.

- Do keep the word tag; status never depends on colour alone.
- Do use \`tag\` to rename the word (Info, Done, Note, Error, Memo).
- Don't colour the body text with the status colour.`,
      },
    },
  },
  args: {
    tone: "info",
    title: "Studio closed 1–3 Nov",
    children: "Messages will be answered on the 4th.",
  },
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const stack = { display: "grid", gap: "var(--space-3)" } as const;

export const Default: Story = {};

export const Tones: Story = {
  render: () => (
    <div style={stack}>
      <Alert tone="info" title="Studio closed 1–3 Nov">
        Messages will be answered on the 4th.
      </Alert>
      <Alert tone="success" title="Order placed" onClose={noop}>
        A confirmation is on its way.
      </Alert>
      <Alert tone="warning" title="Lead time extended">
        Oak deliveries take two extra weeks.
      </Alert>
      <Alert
        tone="danger"
        title="Payment failed"
        action={
          <Button size="s" variant="danger">
            Retry
          </Button>
        }
      >
        The card was declined.
      </Alert>
      <Alert tone="neutral" title="House rules" tag="Memo">
        Shoes off in the studio.
      </Alert>
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          style={{ padding: "var(--space-6)", background: "var(--paper)", color: "var(--ink)" }}
        >
          <div style={stack}>
            {(["info", "success", "warning", "danger", "neutral"] as const).map((tone) => (
              <Alert key={tone} tone={tone} title={tone} onClose={noop}>
                Body text
              </Alert>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={stack}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Alert tone="danger" title={locale} onClose={noop}>
            Body text
          </Alert>
        </Root>
      ))}
    </div>
  ),
};
