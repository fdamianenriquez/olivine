import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button";
import { Field } from "../Field";
import { Input } from "../Input";
import { Root } from "../Root";
import { Popover } from "./Popover";

const meta = {
  title: "Feedback/Popover",
  component: Popover,
  tags: ["autodocs"],
  args: {
    title: "Lead time",
    content: "Six to ten weeks from approved drawings. Rush orders on request.",
    trigger: (
      <Button size="s" arrow="?">
        About delivery
      </Button>
    ),
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Popover is a click-toggled raised panel with a title row and close button. It is a non-modal dialog: focus moves into it on open, Escape and the close button return focus to the trigger, and an outside press closes it without moving focus.\n\nThe panel renders in a portal and flips or shifts at the viewport edge.\n\n- Do use it for short supporting detail or a small form tied to one control.\n- Do give it a `title`, or an `aria-label` when there is none.\n- Don't put essential information in it that the page needs to work; use inline text.\n- Don't use it for a short hint; use Tooltip.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 300, minWidth: 360, padding: "var(--space-8)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { defaultOpen: true } };

export const Placements: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-12)", padding: "var(--space-12)" }}>
      {(["bottom", "top", "right"] as const).map((placement) => (
        <Popover
          key={placement}
          {...args}
          placement={placement}
          trigger={<Button size="s">{placement}</Button>}
        />
      ))}
    </div>
  ),
};

export const RichContent: Story = {
  args: {
    title: "Request a sample",
    defaultOpen: true,
    trigger: <Button size="s">Request sample</Button>,
    content: (
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        style={{ display: "grid", gap: "var(--space-3)" }}
      >
        <Field label="Email">
          <Input type="email" placeholder="you@studio.jp" />
        </Field>
        <Button variant="accent" size="s" type="submit">
          Send
        </Button>
      </form>
    ),
  },
};

export const WithoutTitle: Story = {
  args: { title: undefined, "aria-label": "Delivery note", defaultOpen: true },
};

export const Themes: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root
          key={theme}
          theme={theme}
          style={{ minHeight: 280, padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <Popover {...args} defaultOpen />
        </Root>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale} style={{ minHeight: 280, padding: "var(--space-4)" }}>
          <Popover {...args} defaultOpen />
        </Root>
      ))}
    </div>
  ),
};
