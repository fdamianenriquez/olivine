import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

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
          'Popover is a click-toggled raised panel with a title row and close button. It is a non-modal dialog: focus moves into it on open, Escape and the close button return focus to the trigger, and an outside press closes it without moving focus.\n\nThe panel renders in a portal and flips or shifts at the viewport edge.\n\n**Actions** — `actions` adds a footer row under a hairline for one or two `ghost` / `s` Buttons, right-aligned; Tab goes close button, body, actions. `showClose={false}` hides the close button: the popover is then dismissed by an action, Escape or a press outside. An action can only close it when `open` is controlled: set it to `false` from the action, and focus returns to the trigger. This is the home of the "rich tooltip with an action": a click-opened dialog with a title, body and action buttons.\n\n- Do use it as the "info" pattern: an `i` button that opens a Popover.\n- Don\'t expect touch users to reach a Tooltip.\n- Do use it for short supporting detail or a small form tied to one control.\n- Do give it a `title`, or an `aria-label` when there is none.\n- Don\'t put essential information in it that the page needs to work; use inline text.\n- Don\'t use it for a short hint; use Tooltip.',
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

/**
 * A footer of actions and no close button: an action, Escape or a press outside dismisses it.
 * The actions close it through a controlled `open`.
 */
export const WithActions: Story = {
  render: function WithActions(args) {
    const [open, setOpen] = useState(true);
    const close = () => {
      setOpen(false);
    };
    return (
      <Popover
        {...args}
        title="Reorder rows"
        content="Drag a row by its handle, or focus it and use Alt with the arrow keys."
        trigger={
          <Button size="s" arrow="i">
            How to reorder
          </Button>
        }
        open={open}
        onOpenChange={setOpen}
        showClose={false}
        actions={
          <>
            <Button variant="ghost" size="s" onClick={close}>
              Later
            </Button>
            <Button variant="ghost" size="s" onClick={close}>
              Got it
            </Button>
          </>
        }
      />
    );
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
