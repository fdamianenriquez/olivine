import type { Meta, StoryObj } from "@storybook/react-vite";

import { Root } from "../Root";
import { FileInput } from "./FileInput";

const meta = {
  title: "Forms/FileInput",
  component: FileInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "FileInput is a dashed drop zone around a native file input; it lists chosen file names in mono.\n\n- Do use it inside `Field` so it gets a label, hint and message.\n- Do state accepted types and sizes in the hint.\n- Don't treat `accept` as validation: check type and size in `onChange`.",
      },
    },
  },
} satisfies Meta<typeof FileInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = { args: { multiple: true } };

export const WithHint: Story = {
  args: { label: "Attach references", hint: "PDF, JPG · up to 20 MB", multiple: true },
};

export const Disabled: Story = { args: { disabled: true } };

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <FileInput hint="PDF, JPG · up to 20 MB" multiple />
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)", maxWidth: 480 }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <FileInput />
        </Root>
      ))}
    </div>
  ),
};
