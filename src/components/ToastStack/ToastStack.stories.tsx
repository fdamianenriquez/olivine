import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Button } from "../Button";
import { Toast } from "../Toast";
import { useToast } from "./ToastContext";
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
        component: `ToastStack pins toasts to a screen corner with \`space-6\` margin and stacks them. It owns the single polite live region and renders it even when empty. For programmatic use, wrap the app in \`ToastProvider\` and call \`useToast()\`: \`show\`, \`dismiss\`, \`clear\`.

- Do mount one stack (or one provider) per app, so announcements stay in a single live region.
- Do cap visible toasts with \`max\`; extra toasts queue and appear as earlier ones close.
- Don't use persistent toasts for notices that need action; use Alert.
- Do use \`duration: null\` for toasts the user must read or act on; timed toasts can vanish before they are read.
- Hovering or focusing any toast, or hiding the page, pauses every countdown in the stack.
- Known limitation: while a Modal is open the toast layer is reachable by pointer only, because the focus trap keeps keyboard focus in the dialog.`,
      },
    },
  },
} satisfies Meta<typeof ToastStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Static: Story = {
  args: { position: "static" },
  render: (args) => (
    <ToastStack {...args}>
      <Toast tone="success" meta="Order · 001" title="Shipped" />
      <Toast tone="danger" meta="Upload" title="File too large" onClose={noop} />
    </ToastStack>
  ),
};

function Trigger() {
  const toast = useToast();
  return (
    <div style={{ display: "flex", gap: "var(--space-3)" }}>
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
