import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Button } from "../Button";
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
        component: `Toast is a brief raised notice with a meta line (coloured dot by tone, always with a word), an optional draining timer bar, at most one action and an optional hanko seal. It confirms something that just happened and is announced without moving focus. Place it inside \`ToastStack\`, or let \`ToastProvider\` and \`useToast()\` create it; for notices that must stay until read use Alert, for decisions use Modal.

- Do keep the title short; let the meta say when or where, and put the one follow-up in \`action\` ("Undo").
- Do give an action toast \`duration\` of 10 s or more, or none, and offer the same outcome elsewhere when the action is the only way to get it.
- Do use \`priority="assertive"\` only for failures the user must hear now (\`danger\` is assertive by default).
- Don't put two actions, a link or a form in a toast; use Alert or a dialog.
- Do give a status toast (success, warning, danger) a status word in \`meta\` ("Saved", "Note", "Error"); the default "Now" only says when.
- Don't rely on the tone dot or the seal alone; the meta word carries the status.
- \`onClose(reason)\` reports \`"timeout"\`, \`"dismiss"\`, \`"escape"\` or \`"swipe"\` (and \`"action"\`, \`"api"\` from the provider). Escape inside a toast closes it.`,
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
      {(
        [
          ["accent", "Now"],
          ["info", "Info"],
          ["success", "Saved"],
          ["warning", "Note"],
          ["danger", "Error"],
          ["neutral", "Memo"],
        ] as const
      ).map(([tone, word]) => (
        <Toast key={tone} tone={tone} meta={word} title="Heading" priority="polite">
          Body text.
        </Toast>
      ))}
    </div>
  ),
};

export const Timed: Story = {
  args: { duration: 8000, onClose: noop },
};

/** One follow-up, after Dismiss in Tab order. A timed toast with an action gets 10 s or more. */
export const WithAction: Story = {
  args: {
    meta: "Removed",
    title: "Ana Ruiz removed",
    children: "She is off the list.",
    duration: 10000,
    onClose: noop,
    action: (
      <Button size="s" variant="outline" onClick={noop}>
        Undo
      </Button>
    ),
  },
};

/** A decorative olive seal drops once the frame has settled. Success confirmations only. */
export const WithSeal: Story = {
  args: {
    tone: "success",
    meta: "Paid",
    title: "Invoice 0042 paid",
    children: "The receipt is in your inbox.",
    seal: "済",
    onClose: noop,
  },
};

/** `danger` is announced as an alert by default; every other tone is polite. */
export const Priority: Story = {
  render: () => (
    <div style={col}>
      <Toast tone="danger" meta="Error" title="Upload failed" onClose={noop}>
        The file is larger than 20 MB.
      </Toast>
      <Toast tone="warning" meta="Note" title="Almost full" onClose={noop}>
        90% of your storage is used.
      </Toast>
    </div>
  ),
};

/** Under reduced motion the toast and its seal appear at once and the bar stays full. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS} style={col}>
      <Toast
        tone="success"
        meta="Paid"
        title="Invoice 0042 paid"
        seal="済"
        duration={8000}
        onClose={noop}
      />
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-4)",
            padding: "var(--space-6)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        >
          <Toast
            tone="success"
            meta="Shipped · Order 001"
            title="On its way"
            duration={8000}
            onClose={noop}
          />
          <Toast tone="success" meta="Paid" title="Invoice 0042 paid" seal="済" onClose={noop} />
          <Toast
            tone="success"
            meta="Removed"
            title="Ana Ruiz removed"
            duration={10000}
            onClose={noop}
            action={
              <Button size="s" variant="outline" onClick={noop}>
                Undo
              </Button>
            }
          />
          <Toast tone="danger" meta="Error" title="Upload failed" onClose={noop}>
            Try a smaller file.
          </Toast>
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
