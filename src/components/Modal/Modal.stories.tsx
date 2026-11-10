import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
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
          "Modal is a centred dialog over the scrim with a hard block shadow; it traps focus and closes on Escape or a scrim click. It unrolls downwards on open and rolls back up on close.\n\n- Footer actions go right; the primary is the rightmost and may be `accent`.\n- Do put `data-autofocus` on the first field of a form so focus lands there instead of on the close button.",
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

/** No "×": the footer's Cancel and Escape are the ways out. */
export const NoCloseButton: Story = {
  render: () => <Demo closeButton={false} closeOnScrim={false} />,
};

/** Opened from inside another modal: Escape closes only the top one. */
export const Nested: Story = {
  render: function Render() {
    const [outer, setOuter] = useState(false);
    const [inner, setInner] = useState(false);
    return (
      <div>
        <Button
          onClick={() => {
            setOuter(true);
          }}
        >
          Open modal
        </Button>
        <Modal
          open={outer}
          index="Order"
          title="SG-2026-0131"
          onClose={() => {
            setOuter(false);
          }}
          footer={
            <Button
              variant="accent"
              onClick={() => {
                setInner(true);
              }}
            >
              Change finish
            </Button>
          }
        >
          Kaichi, chambered slab. Finishing.
        </Modal>
        <Modal
          open={inner}
          size="s"
          title="Change finish"
          onClose={() => {
            setInner(false);
          }}
        >
          <Field label="Finish">
            <Input data-autofocus placeholder="Natural oil" />
          </Field>
        </Modal>
      </div>
    );
  },
};

/** Inside `.ol-reduce-motion` (or with the system setting) it appears and goes at once. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <Demo />
    </div>
  ),
};

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
