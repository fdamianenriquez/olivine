import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Field } from "../Field";
import { Input } from "../Input";
import { Root } from "../Root";
import { Modal, type ModalProps } from "./Modal";

const meta = {
  title: "Overlays/Modal",
  component: Modal,
  tags: ["autodocs"],
  args: { open: false },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Modal is a centred dialog over the scrim with a hard block shadow; it traps focus and closes on Escape or a scrim click.\n\n- Footer actions go right; the primary is the rightmost and may be `accent`.\n- Do put `data-autofocus` on the first field of a form so focus lands there instead of on the close button.",
      },
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

function Demo(props: Partial<ModalProps>) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  return (
    <div>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open modal
      </Button>
      <Modal
        index="Inquiry"
        title="Start a project"
        {...props}
        open={open}
        onClose={close}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="accent" arrow onClick={close}>
              Send
            </Button>
          </>
        }
      >
        <Field label="Email">
          <Input data-autofocus placeholder="you@studio.jp" />
        </Field>
      </Modal>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-3)" }}>
      {(["s", "m", "l", "full"] as const).map((size) => (
        <Demo key={size} size={size} title={`Size ${size}`} />
      ))}
    </div>
  ),
};

export const ScrimLocked: Story = { render: () => <Demo closeOnScrim={false} /> };

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Demo />
        </Root>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-4)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Demo />
        </Root>
      ))}
    </div>
  ),
};
