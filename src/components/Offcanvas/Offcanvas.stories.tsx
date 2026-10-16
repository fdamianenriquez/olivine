import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Checkbox } from "../Checkbox";
import { Root } from "../Root";
import { Offcanvas, type OffcanvasProps } from "./Offcanvas";

const meta = {
  title: "Overlays/Offcanvas",
  component: Offcanvas,
  tags: ["autodocs"],
  args: { open: false },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Offcanvas is a panel that slides in from an edge for navigation, filters or a cart. It traps focus and closes on Escape or a scrim click.\n\n- `end` is the default; `start` and `end` flip in right-to-left languages.\n- Use `bottom` for short, thumb-reachable content on small screens.",
      },
    },
  },
} satisfies Meta<typeof Offcanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

function Demo(props: Partial<OffcanvasProps>) {
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
        Open panel
      </Button>
      <Offcanvas title="Filters" {...props} open={open} onClose={close}>
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          <Checkbox label="Identity" defaultChecked />
          <Checkbox label="Interiors" />
          <Button variant="solid" block arrow onClick={close}>
            Apply
          </Button>
        </div>
      </Offcanvas>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const Start: Story = { render: () => <Demo placement="start" /> };

export const Bottom: Story = { render: () => <Demo placement="bottom" /> };

export const Placements: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-3)" }}>
      {(["start", "end", "bottom"] as const).map((placement) => (
        <Demo key={placement} placement={placement} title={`Placement ${placement}`} />
      ))}
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
