import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { fn } from "storybook/test";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { Toast } from "../Toast";
import { type ToastOptions, useToast } from "./ToastContext";
import { ToastProvider } from "./ToastProvider";
import { ToastStack } from "./ToastStack";

const noop = fn();

const meta = {
  title: "Feedback/ToastStack",
  component: ToastStack,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `ToastStack pins toasts to a screen corner with \`space-6\` margin and stacks them, newest nearest the corner. It is a named landmark ("Notifications") that owns the single polite live region and renders it even when empty. For programmatic use, wrap the app in \`ToastProvider\` and call \`useToast()\`: \`show\`, \`update\`, \`dismiss\`, \`clear\`, \`promise\`.

- Do mount one stack (or one provider) per app, so announcements stay in a single live region.
- Do cap visible toasts with \`max\`; extra toasts queue (first in, first out) and appear once earlier ones have left.
- Do route Undo flows through \`action\` and \`onClose(reason)\`: revert on \`"action"\`, commit on \`"timeout"\`, \`"dismiss"\`, \`"swipe"\`.
- Don't place a Dropdown, Popover or another floating layer in the stack's corner; with a Fab, use \`tr\` or \`tc\`.
- Do give a status toast (success, warning, danger) a status word in \`meta\` ("Saved", "Error"); the default "Now" only says when.
- Don't use persistent toasts as a substitute for Alert, and don't hide the stack's hotkey from users who need it.
- Hovering (mouse or pen), focusing or pressing any toast, hiding the page or leaving the window pauses every countdown.
- **F6** moves focus into the stack and back, also from inside a Modal; it is only intercepted while a toast is shown. Escape closes the focused toast. Touch and pen can swipe a toast toward the stack's edge; the Dismiss button always stays.`,
      },
    },
  },
} satisfies Meta<typeof ToastStack>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = { display: "flex", flexWrap: "wrap", gap: "var(--space-3)" } as const;

export const Static: Story = {
  args: { position: "static" },
  render: (args) => (
    <ToastStack {...args}>
      <Toast tone="success" meta="Shipped · Order 001" title="On its way" />
      <Toast tone="danger" meta="Error · Upload" title="File too large" onClose={noop} />
    </ToastStack>
  ),
};

function Trigger() {
  const toast = useToast();
  return (
    <div style={row}>
      <Button
        onClick={() => {
          toast.show({
            title: "Draft saved",
            meta: "Saved",
            tone: "success",
            description: "Your changes are stored.",
          });
        }}
      >
        Show toast
      </Button>
      <Button variant="outline" onClick={toast.clear}>
        Clear
      </Button>
    </div>
  );
}

/** Shows the given toasts once on load, so the story has something to look at. */
function Preset({ toasts }: { toasts: ToastOptions[] }) {
  const toast = useToast();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    toasts.forEach((options) => toast.show(options));
  }, [toast, toasts]);
  return null;
}

export const Programmatic: Story = {
  render: () => (
    <ToastProvider max={3}>
      <Trigger />
    </ToastProvider>
  ),
};

export const TopRight: Story = {
  render: () => (
    <ToastProvider position="tr" max={2} duration={8000}>
      <Trigger />
    </ToastProvider>
  ),
};

const people = ["Ana Ruiz", "Kenji Sato", "Lea Marin"];

function UndoList() {
  const toast = useToast();
  const [list, setList] = useState(people);
  const [log, setLog] = useState<string[]>([]);
  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div style={row}>
        {list.map((name) => (
          <Button
            key={name}
            variant="outline"
            onClick={() => {
              const index = list.indexOf(name);
              setList((prev) => prev.filter((p) => p !== name));
              toast.show({
                title: `${name} removed`,
                meta: "Removed",
                tone: "success",
                action: {
                  label: "Undo",
                  ariaLabel: `Undo removing ${name}`,
                  onClick: () => {
                    setList((prev) => {
                      const next = [...prev];
                      next.splice(Math.min(index, next.length), 0, name);
                      return next;
                    });
                  },
                },
                onClose: (reason) => {
                  setLog((prev) => [...prev, `${name}: ${reason}`]);
                },
              });
            }}
          >
            {`Remove ${name}`}
          </Button>
        ))}
      </div>
      <output>{log.length > 0 ? `Closed: ${log.join(", ")}` : "Nothing closed yet"}</output>
    </div>
  );
}

/**
 * One action per toast. It waits 10 s (`actionDuration`), pauses on hover and focus, and tells
 * screen readers that F6 reaches it. `onClose(reason)` says whether to revert or commit.
 */
export const ActionUndo: Story = {
  name: "Action and undo",
  render: () => (
    <ToastProvider>
      <UndoList />
      <Preset
        toasts={[
          {
            title: "Ana Ruiz removed",
            meta: "Removed",
            tone: "success",
            duration: null,
            action: { label: "Undo", onClick: noop },
          },
        ]}
      />
    </ToastProvider>
  ),
};

/**
 * Touch and pen swipe toward the stack's edge: right for `tr` and `br`, left for `bl`, up for
 * `tc`. Use the device toolbar to try it. Below 40% (and slower than a flick) the toast returns.
 */
export const Swipe: Story = {
  render: () => (
    <ToastProvider position="bl" duration={null}>
      <Trigger />
      <Preset
        toasts={[
          { title: "Swipe me left", meta: "Touch", description: "Or press Dismiss." },
          { title: "Draft saved", meta: "Saved", tone: "success" },
        ]}
      />
    </ToastProvider>
  ),
};

function PromiseDemo() {
  const toast = useToast();
  const run = (fail: boolean) => {
    const work = new Promise<number>((resolve, reject) => {
      window.setTimeout(() => {
        if (fail) reject(new Error("The server did not answer."));
        else resolve(3);
      }, 2000);
    });
    toast
      .promise(work, {
        loading: { title: "Uploading 3 files", description: "This takes a moment." },
        success: (n) => ({ title: `${String(n)} files uploaded`, description: "All done." }),
        error: (e) => ({
          title: "Upload failed",
          description: e instanceof Error ? e.message : "Try again.",
        }),
      })
      .catch(() => undefined);
  };
  return (
    <div style={row}>
      <Button
        onClick={() => {
          run(false);
        }}
      >
        Upload
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          run(true);
        }}
      >
        Upload and fail
      </Button>
    </div>
  );
}

/** `promise()` shows a persistent loading toast and updates it in place with the outcome. */
export const PromiseSteps: Story = {
  name: "Promise",
  render: () => (
    <ToastProvider>
      <PromiseDemo />
    </ToastProvider>
  ),
};

/** `danger` is assertive (an alert) by default; the others are polite unless `priority` says so. */
export const Priority: Story = {
  render: () => (
    <ToastProvider duration={null}>
      <Preset
        toasts={[
          {
            title: "Payment failed",
            meta: "Error",
            tone: "danger",
            description: "Your card was declined.",
          },
          { title: "Draft saved", meta: "Saved", tone: "success" },
        ]}
      />
    </ToastProvider>
  ),
};

/**
 * Press F6 to move focus to the first toast's controls, Tab between them, and F6 (or Shift+F6)
 * to come back. Escape closes the focused toast; focus moves to the next toast or back.
 */
export const Hotkey: Story = {
  render: () => (
    <ToastProvider duration={null}>
      <div style={row}>
        <Button variant="outline">Focus me, then press F6</Button>
      </div>
      <Preset
        toasts={[
          {
            title: "Kenji Sato removed",
            meta: "Removed",
            tone: "success",
            duration: null,
            action: { label: "Undo", onClick: noop },
          },
          { title: "Draft saved", meta: "Saved", tone: "success" },
        ]}
      />
    </ToastProvider>
  ),
};

/** Toasts appear and leave at once and the bar stays full; the countdown still runs. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <ToastProvider duration={8000}>
        <Trigger />
        <Preset
          toasts={[
            {
              title: "Invoice 0042 paid",
              meta: "Paid",
              tone: "success",
              seal: "済",
              duration: null,
            },
          ]}
        />
      </ToastProvider>
    </div>
  ),
};

function ModalWithToast() {
  const toast = useToast();
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open the dialog
      </Button>
      <Modal
        open={open}
        title="Edit recipient"
        onClose={() => {
          setOpen(false);
        }}
      >
        <p>Save, then press F6 to reach the toast while the dialog stays open.</p>
        <Button
          onClick={() => {
            toast.show({
              title: "Recipient saved",
              meta: "Saved",
              tone: "success",
              action: { label: "Undo", onClick: noop },
            });
          }}
        >
          Save
        </Button>
      </Modal>
    </>
  );
}

/** The toast layer stays reachable over a Modal: by pointer, and by F6 for the keyboard. */
export const ModalAndToast: Story = {
  name: "Modal and toast",
  render: () => (
    <ToastProvider>
      <ModalWithToast />
    </ToastProvider>
  ),
};
