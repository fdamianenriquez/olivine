import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Alert } from "../Alert";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { AlertDialog, type AlertDialogProps } from "./AlertDialog";

const meta = {
  title: "Overlays/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
  args: { open: false, title: "Delete 3 files?", onClose: () => undefined },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'AlertDialog is a modal confirmation that needs an answer. It is a Modal announced as `alertdialog`, with no close button and no scrim dismissal: Cancel and Escape are the ways out, and Cancel has focus when it opens.\n\n- Do write the title as the question and the confirm label as the action ("Delete 3 files?" / "Delete").\n- Do use `tone="danger"` for actions that destroy or cannot be undone; the word tag and the label carry the meaning, not the colour.\n- Don\'t use it for forms or content (use Modal), for messages that need no answer (use Alert or Toast), or when Undo is possible (use a Toast with Undo).',
      },
    },
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

type DemoProps = Partial<Omit<AlertDialogProps, "open" | "onClose">> & { trigger?: string };

function Demo({ trigger = "Delete files", children, ...props }: DemoProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {trigger}
      </Button>
      <AlertDialog
        title="Delete 3 files?"
        {...props}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      >
        {children ?? "The files leave the shared folder for everyone on the project."}
      </AlertDialog>
    </div>
  );
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** A neutral confirmation with the locale's default labels. */
export const Default: Story = {
  render: () => (
    <Demo trigger="Publish" title="Publish the catalogue?">
      It goes live on the shop for every visitor.
    </Demo>
  ),
};

/** For actions that destroy: the Caution word, the danger button and a verb as its label. */
export const Danger: Story = {
  render: () => <Demo tone="danger" confirmLabel="Delete" />,
};

/** `onConfirm` returns a promise: confirm shows its loading state, Cancel and Escape wait. */
export const AsyncConfirm: Story = {
  render: () => (
    <Demo
      tone="danger"
      confirmLabel="Delete"
      onConfirm={() => wait(2000)}
      trigger="Delete files (async)"
    />
  ),
};

/**
 * A failing confirm: catch the error in `onConfirm`, show it in the message, and keep the dialog
 * open by ignoring that "confirm" in `onClose`. (A rejected promise also keeps it open, and the
 * error is reported as uncaught.)
 */
export const FailingConfirm: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    const [failed, setFailed] = useState(false);
    const failedRef = useRef(false);
    return (
      <div>
        <Button
          onClick={() => {
            setFailed(false);
            setOpen(true);
          }}
        >
          Delete files (fails)
        </Button>
        <AlertDialog
          open={open}
          tone="danger"
          title="Delete 3 files?"
          confirmLabel="Delete"
          onConfirm={async () => {
            failedRef.current = false;
            setFailed(false);
            try {
              await wait(1200);
              throw new Error("The server did not answer.");
            } catch {
              failedRef.current = true;
              setFailed(true);
            }
          }}
          onClose={(reason) => {
            if (reason === "confirm" && failedRef.current) return;
            setOpen(false);
          }}
        >
          <p style={{ margin: 0 }}>The files leave the shared folder for everyone.</p>
          {failed && (
            <Alert tone="danger" title="Not deleted" style={{ marginTop: "var(--space-3)" }}>
              The server did not answer. Try again.
            </Alert>
          )}
        </AlertDialog>
      </div>
    );
  },
};

/** For a harmless confirmation the confirm action may take focus. */
export const InitialFocusConfirm: Story = {
  render: () => (
    <Demo
      trigger="Send draft"
      title="Send the draft to Kaichi?"
      confirmLabel="Send"
      initialFocus="confirm"
    >
      They get a read-only link.
    </Demo>
  ),
};

/** Opened from a Modal: Escape answers the alert dialog and leaves the Modal open. */
export const FromModal: Story = {
  render: function Render() {
    const [modal, setModal] = useState(false);
    const [ask, setAsk] = useState(false);
    return (
      <div>
        <Button
          onClick={() => {
            setModal(true);
          }}
        >
          Edit order
        </Button>
        <Modal
          open={modal}
          index="Order"
          title="SG-2026-0131"
          onClose={() => {
            setModal(false);
          }}
          footer={
            <Button
              variant="danger"
              onClick={() => {
                setAsk(true);
              }}
            >
              Discard changes
            </Button>
          }
        >
          Kaichi, chambered slab. Finishing.
        </Modal>
        <AlertDialog
          open={ask}
          tone="danger"
          title="Discard your changes?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onClose={(reason) => {
            setAsk(false);
            if (reason === "confirm") setModal(false);
          }}
        >
          The finish and the note go back to how they were.
        </AlertDialog>
      </div>
    );
  },
};

/** Inside `.ol-reduce-motion` (or with the system setting) it appears and goes at once. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <Demo tone="danger" confirmLabel="Delete" />
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Demo trigger="Neutral" title="Publish the catalogue?" />
            <Demo trigger="Danger" tone="danger" confirmLabel="Delete" />
          </div>
        </Root>
      ))}
    </div>
  ),
};

const LOCALE_DEMO = {
  en: {
    title: "Delete 3 files?",
    action: "Delete",
    text: "The files leave the shared folder for everyone on the project.",
  },
  es: {
    title: "¿Eliminar 3 archivos?",
    action: "Eliminar",
    text: "Los archivos salen de la carpeta compartida para todo el proyecto.",
  },
  ja: {
    title: "3 件のファイルを削除しますか？",
    action: "削除",
    text: "共有フォルダからファイルが削除され、全員が見られなくなります。",
  },
} as const;

/** Cancel and the Caution word come from the locale; the confirm label names the action. */
export const Locales: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-4)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Demo
            trigger={locale}
            tone="danger"
            title={LOCALE_DEMO[locale].title}
            confirmLabel={LOCALE_DEMO[locale].action}
          >
            {LOCALE_DEMO[locale].text}
          </Demo>
        </Root>
      ))}
    </div>
  ),
};
