import type { Meta, StoryObj } from "@storybook/react-vite";
import { type SubmitEvent, useState } from "react";

import { Button } from "../Button";
import { Input } from "../Input";
import { Select } from "../Select";
import { Textarea } from "../Textarea";
import { Field } from "./Field";

const meta = {
  title: "Forms/Field",
  component: Field,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Field wraps one control with its mono label, hint and validation message, and wires the ARIA between them.\n\nOlivine controls read the field through context; a plain DOM element child is cloned with `id`, `aria-describedby`, `aria-invalid` and `required`; use `Field.Control` for any other component. Checkbox, Radio and Switch draw their own label, so don't also pass `label` to the Field.\n\n- Do write errors as instructions (\"Enter a valid address.\"), not accusations.\n- Don't rely on the × and ✓ prefixes or colour alone; the message text carries the meaning.",
      },
    },
  },
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

const grid = { display: "grid", gap: "var(--space-6)", maxWidth: 420 } as const;

export const Default: Story = {
  render: () => (
    <Field label="Name" hint="As it appears on your work." required>
      <Input placeholder="Damián Enríquez" />
    </Field>
  ),
};

export const States: Story = {
  render: () => (
    <div style={grid}>
      <Field label="Name" hint="As it appears on your work." required>
        <Input placeholder="Damián Enríquez" />
      </Field>
      <Field label="Email" error="Enter a valid address.">
        <Input defaultValue="damian@" />
      </Field>
      <Field label="Studio" valid="Available.">
        <Input defaultValue="studio-ma" />
      </Field>
      <Field label="Budget" aside="MXN" required>
        <Input placeholder="0.00" />
      </Field>
    </div>
  ),
};

export const OtherControls: Story = {
  render: () => (
    <div style={grid}>
      <Field label="Service">
        <Select placeholder="Choose one" options={["Identity", "Interiors", "Web", "Editorial"]} />
      </Field>
      <Field label="Message" aside="0 / 500">
        <Textarea placeholder="Tell us about the project…" />
      </Field>
      <Field label="Plain input" hint="A DOM element is cloned with the field's attributes.">
        <input className="ol-input" />
      </Field>
    </div>
  ),
};

export const FieldControl: Story = {
  render: () => (
    <Field
      label="Custom widget"
      hint="Spread the props onto the real control."
      error="Pick a value."
    >
      <Field.Control>{(props) => <input className="ol-input" {...props} />}</Field.Control>
    </Field>
  ),
};

export const FormExample: Story = {
  render: function Render() {
    const [errors, setErrors] = useState<{ email?: string; message?: string }>({});
    const [sent, setSent] = useState(false);
    const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const next: typeof errors = {};
      if (!(data.get("email") as string).includes("@")) next.email = "Enter a valid address.";
      if (!(data.get("message") as string).trim()) next.message = "Write a short message.";
      setErrors(next);
      const firstInvalid = next.email ? "email" : next.message ? "message" : null;
      if (firstInvalid) {
        const el = e.currentTarget.elements.namedItem(firstInvalid);
        if (el instanceof HTMLElement) el.focus();
      }
      setSent(Object.keys(next).length === 0);
    };
    return (
      <form onSubmit={onSubmit} noValidate style={grid}>
        <Field label="Email" required error={errors.email} hint="We reply within two days.">
          <Input name="email" type="email" />
        </Field>
        <Field label="Message" required error={errors.message}>
          <Textarea name="message" />
        </Field>
        <Field valid={sent ? "Sent. Thank you." : undefined}>
          <Button type="submit" variant="solid">
            Send
          </Button>
        </Field>
      </form>
    );
  },
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
            background: "var(--paper)",
            maxWidth: 420,
          }}
        >
          <Field label="Name" hint="As it appears on your work." required aside="EN">
            <Input />
          </Field>
          <Field label="Email" error="Enter a valid address.">
            <Input defaultValue="damian@" />
          </Field>
          <Field label="Studio" valid="Available.">
            <Input defaultValue="studio-ma" />
          </Field>
        </div>
      ))}
    </div>
  ),
};
