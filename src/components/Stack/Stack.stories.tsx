import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label";
import { Stack } from "./Stack";

const meta = {
  title: "Foundations/Stack",
  component: Stack,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Stack lays children out in a column (or row) with one spacing step between them.",
          "",
          '- `direction` is `"v"` (default) or `"h"`; `gap` is a spacing step (default 4).',
          "- `align` and `justify` take any CSS `align-items` / `justify-content` value.",
          "- Use `as` to render a semantic element such as `ul` or `section`.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

const items = (word: string) =>
  [1, 2, 3].map((i) => (
    <div
      key={i}
      style={{ border: "var(--stroke-hair) solid var(--rule)", padding: "var(--space-2)" }}
    >
      <Label index={i}>{word}</Label>
    </div>
  ));

export const Vertical: Story = {
  args: { gap: 2, children: items("Vertical") },
};

export const Horizontal: Story = {
  args: { direction: "h", gap: 2, children: items("Row") },
};

export const Gaps: Story = {
  render: () => (
    <Stack gap={6}>
      {([1, 2, 4, 8] as const).map((gap) => (
        <Stack key={gap} direction="h" gap={gap}>
          <Label>{`gap ${String(gap)}`}</Label>
          {items("Row")}
        </Stack>
      ))}
    </Stack>
  ),
};

export const Alignment: Story = {
  render: () => (
    <Stack gap={4}>
      <Stack
        direction="h"
        gap={2}
        justify="space-between"
        style={{ minHeight: "var(--space-24)" }}
        align="flex-end"
      >
        {items("End")}
      </Stack>
    </Stack>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ background: "var(--paper)", padding: "var(--space-6)" }}
        >
          <Stack gap={4}>
            <Stack gap={2}>{items("Vertical")}</Stack>
            <Stack direction="h" gap={2}>
              {items("Row")}
            </Stack>
          </Stack>
        </div>
      ))}
    </div>
  ),
};
