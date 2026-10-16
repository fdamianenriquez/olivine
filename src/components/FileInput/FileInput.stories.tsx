import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Field } from "../Field";
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
          "FileInput is a dashed drop zone around a native file input; it lists chosen file names in mono.\n\n- Do use it inside `Field` so it gets a label, hint and message.\n- Do state accepted types and sizes in the hint.\n- Do set `maxSize` and `accept` and show rejections through `Field error` (`onReject`).\n- Don't read `event.target.files` for the accepted set: it still holds rejected files; use `onFilesChange`.",
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

// The messages below are illustrative: the consumer owns the wording (and its translation).
export const WithValidation: Story = {
  render: () => {
    const [error, setError] = useState<string>();
    return (
      <Field label="Attachments" hint="PDF, up to 1 MB" error={error}>
        <FileInput
          multiple
          accept=".pdf,application/pdf"
          maxSize={1_000_000}
          onFilesChange={() => {
            // Runs before onReject, so a batch with rejections sets the message right after.
            setError(undefined);
          }}
          onReject={(rejections) => {
            setError(
              rejections
                .map((r) => `${r.file.name}: ${r.reason === "size" ? "too large" : "wrong type"}`)
                .join("; "),
            );
          }}
        />
      </Field>
    );
  },
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
