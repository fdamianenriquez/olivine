import type { Meta, StoryObj } from "@storybook/react-vite";

import { Grid } from "../Grid";
import { Text } from "../Text";
import { Sheet } from "./Sheet";

const meta = {
  title: "Foundations/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Sheet is the archive panel: an ink frame with a mono bar (index, title, meta) over its content.\n\n- Do use `crosshair` on one or two sheets per page, not all of them.\n- Texture utilities go inside a flush sheet: `.ol-halftone` (dot screen, add `--fade` or `--fine`) for images and covers, `.ol-scanlines` for dark data blocks only. Never put either behind body text.",
      },
    },
  },
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Grid cols={2} gap={6}>
      <Sheet crosshair index={1} title="Order" meta="Rev 0.2 · 14.10.2026">
        <Text variant="h2">Oak shelf</Text>
        <Text tone="muted">Delivery in six weeks.</Text>
      </Sheet>
      <Sheet flush title="Panel" meta="Online">
        <div
          className="ol-scanlines"
          style={{ padding: "var(--space-4)", minHeight: "var(--space-32)" }}
        >
          <Text variant="mono" as="p">
            {">>> UNIT / D-01"}
            <br />
            {"[ 064% ] ////////"}
          </Text>
        </div>
      </Sheet>
    </Grid>
  ),
};

export const Flush: Story = {
  render: () => (
    <Grid cols={2} gap={6}>
      <Sheet flush index={2} title="Cover" meta="Halftone">
        <div
          className="ol-halftone ol-halftone--fade"
          aria-hidden="true"
          style={{ minHeight: "calc(var(--space-32) + var(--space-8))" }}
        />
      </Sheet>
      <Sheet flush index={3} title="Telemetry" meta="Scanlines">
        <div
          className="ol-scanlines"
          style={{ padding: "var(--space-4)", minHeight: "calc(var(--space-32) + var(--space-8))" }}
        >
          <Text variant="mono" as="p">
            {"[ 064% ] ////////"}
          </Text>
        </div>
      </Sheet>
    </Grid>
  ),
};

export const Crosshair: Story = {
  args: { crosshair: true, title: "Specimen", meta: "Plate 04", children: "Marked corners." },
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-6)", background: "var(--paper)" }}
        >
          <Sheet crosshair index={1} title="Order" meta="Rev 0.2">
            <Text>Delivery in six weeks.</Text>
          </Sheet>
        </div>
      ))}
    </div>
  ),
};
