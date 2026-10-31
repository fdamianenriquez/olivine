import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { Button } from "../Button";
import { Root } from "../Root";
import { Portal } from "./Portal";

const meta = {
  title: "Utilities/Portal",
  component: Portal,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Renders its children into `document.body` (or `container`) inside an `.ol` layer, for floating content you build yourself. Locale and platform pass through React context; pass `anchor` so the layer keeps the theme, `lang`, `dir` and motion settings of the island it came from. Nothing renders on the server. `container={null}` means "not ready yet" and renders nothing. The layer paints no background: children bring their own surface.\n\n- Do give your layer a z-index token.\n- Do use `keepActive` only for content that must stay usable under a modal (a live region, your own toasts).\n- Don\'t portal content that belongs in the flow.',
      },
    },
  },
} satisfies Meta<typeof Portal>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A sumi island opens a note in body; the note keeps the island's theme through `anchor`. */
export const Island: Story = {
  render: () => {
    function Demo() {
      const anchor = useRef<HTMLButtonElement>(null);
      const [open, setOpen] = useState(true);
      return (
        <Root theme="sumi" style={{ padding: "var(--space-6)" }}>
          <Button
            ref={anchor}
            aria-expanded={open}
            onClick={() => {
              setOpen((v) => !v);
            }}
          >
            {open ? "Hide note" : "Show note"}
          </Button>
          {open && (
            <Portal anchor={anchor}>
              <p
                style={{
                  position: "fixed",
                  insetBlockEnd: "var(--space-6)",
                  insetInlineEnd: "var(--space-6)",
                  zIndex: "var(--z-dropdown)",
                  margin: 0,
                  padding: "var(--space-4)",
                  border: "var(--stroke-hair) solid var(--rule)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              >
                Rendered in body, drawn in sumi.
              </p>
            </Portal>
          )}
        </Root>
      );
    }
    return <Demo />;
  },
};
