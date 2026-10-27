import type { Meta, StoryObj } from "@storybook/react-vite";

import { Stack } from "../Stack";
import { Text } from "../Text";
import { Divider } from "./Divider";

const meta = {
  title: "Foundations/Divider",
  component: Divider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Divider is a hairline rule in `rule`; with `label` it becomes a section marker ("02 — Selected works ———").\n\n- Don\'t use `soft` as the only boundary between two controls.',
      },
    },
  },
} satisfies Meta<typeof Divider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Preview: Story = {
  render: () => (
    <Stack gap={6}>
      <Divider />
      <Divider label="Selected works" index={2} />
      <Divider weight="heavy" />
      <Divider weight="soft" />
    </Stack>
  ),
};

export const Weights: Story = {
  render: () => (
    <Stack gap={6}>
      <Divider weight="hair" />
      <Divider weight="heavy" />
      <Divider weight="soft" />
    </Stack>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Stack direction="h" gap={4} align="stretch">
      <Text>Overview</Text>
      <Divider vertical />
      <Text>Details</Text>
      <Divider vertical weight="soft" />
      <Text>History</Text>
    </Stack>
  ),
};

export const Labelled: Story = {
  render: () => (
    <Stack gap={6}>
      <Divider label="Selected works" />
      <Divider label="Selected works" index={2} />
      <Divider label="Archive" index="A.1" weight="soft" />
    </Stack>
  ),
};

export const AsHeading: Story = {
  render: () => (
    <Stack gap={4}>
      <Divider label="Selected works" index={2} headingLevel={2} />
      <Text>The marker is an h2, so it appears in the document outline.</Text>
    </Stack>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <Stack gap={6}>
            <Divider />
            <Divider label="Selected works" index={2} />
            <Divider weight="heavy" />
            <Divider weight="soft" />
          </Stack>
        </div>
      ))}
    </div>
  ),
};
