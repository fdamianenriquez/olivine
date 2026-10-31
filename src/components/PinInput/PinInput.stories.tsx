import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Button } from "../Button";
import { Field } from "../Field";
import { Root } from "../Root";
import { PinInput } from "./PinInput";

const meta = {
  title: "Forms/PinInput",
  component: PinInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `PinInput captures a short fixed-length code (a one-time code, a PIN) as a row of square cells joined by hairlines. Behind the cells sits one real, transparent text input, so autofill from SMS or a password manager, pasting a whole code, undo, the numeric keyboard and screen readers all behave like an ordinary field. The active cell carries an olive underline drawn like a brush stroke. Digits are set in Xanh Mono. Use it inside \`Field\` for the label, hint and error.

- Do give it a label through \`Field\` and state the shape in the hint: "We sent a 6-digit code to your phone."
- Do allow paste and autofill; never block them (WCAG 3.3.8).
- Do keep \`mask\` for PINs and other secrets; a one-time code the user just received should stay visible.
- Do use \`group\` for codes people read aloud or compare (\`123 456\`).
- Don't use it for free-length values, passwords or long keys: use \`Input\`.
- Don't build the same look from N separate inputs; it breaks autofill, paste and screen readers.
- Don't use the figure face for the digits: a code is an identifier, not an amount.
- Don't auto-submit silently: if \`onComplete\` triggers verification, show the loading state and the result in \`Field\`.`,
      },
    },
  },
} satisfies Meta<typeof PinInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-6)",
  alignItems: "flex-start",
};

const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "var(--space-6)" };

export const Default: Story = {
  render: (args) => (
    <Field label="Verification code" hint="We sent a 6-digit code to your phone.">
      <PinInput {...args} />
    </Field>
  ),
};

export const Grouped: Story = {
  render: () => (
    <Field label="Verification code" hint="Six digits, as in the message: 123 456.">
      <PinInput group={3} defaultValue="4817" />
    </Field>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      <PinInput size="s" length={4} defaultValue="20" aria-label="Small" />
      <PinInput size="m" length={4} defaultValue="20" aria-label="Medium" />
      <PinInput size="l" length={4} defaultValue="20" aria-label="Large" />
    </div>
  ),
};

export const Masked: Story = {
  render: () => (
    <Field label="PIN" hint="Four digits.">
      <PinInput length={4} mask defaultValue="73" />
    </Field>
  ),
};

export const Alphanumeric: Story = {
  render: () => (
    <Field label="Pairing code" hint="Letters and numbers, as shown on the screen.">
      <PinInput charset="alphanumeric" length={8} group={4} placeholder="·" defaultValue="K7Rq" />
    </Field>
  ),
};

function VerifyDemo() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  return (
    <form
      style={stack}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Field
        label="Verification code"
        hint="We sent a 6-digit code to your phone. Try 123456."
        error={state === "invalid" ? "Enter the 6-digit code." : undefined}
        valid={state === "valid" ? "Code accepted." : undefined}
      >
        <PinInput
          group={3}
          value={code}
          readOnly={state === "checking"}
          onChange={(next) => {
            setCode(next);
            setState("idle");
          }}
          onComplete={(next) => {
            setState("checking");
            window.setTimeout(() => {
              setState(next === "123456" ? "valid" : "invalid");
            }, 600);
          }}
        />
      </Field>
      <Button type="submit" disabled={code.length < 6}>
        Verify
      </Button>
    </form>
  );
}

/** `onComplete` starts the check; the result shows in `Field`, never a silent submit. */
export const Verification: Story = { render: () => <VerifyDemo /> };

export const States: Story = {
  render: () => (
    <div style={stack}>
      <Field label="Default" hint="Empty.">
        <PinInput length={4} />
      </Field>
      <Field label="Invalid" error="Enter the 4-digit code.">
        <PinInput length={4} defaultValue="12" />
      </Field>
      <Field label="Read-only">
        <PinInput length={4} defaultValue="2048" readOnly />
      </Field>
      <Field label="Disabled">
        <PinInput length={4} defaultValue="20" disabled />
      </Field>
    </div>
  ),
};

/** Under reduced motion the underline appears and disappears with no wipe. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <Field label="Verification code" hint="Type to move the underline: no wipe.">
        <PinInput group={3} />
      </Field>
    </div>
  ),
};

function ThemeSample() {
  return (
    <div style={stack}>
      <Field label="Verification code" hint="We sent a 6-digit code to your phone.">
        <PinInput group={3} defaultValue="4817" />
      </Field>
      <Field label="PIN">
        <PinInput length={4} mask defaultValue="73" />
      </Field>
      <Field label="Code" error="Enter the 4-digit code.">
        <PinInput length={4} defaultValue="12" />
      </Field>
      <Field label="Disabled">
        <PinInput length={4} size="s" defaultValue="20" disabled />
      </Field>
    </div>
  );
}

export const Themes: Story = {
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <ThemeSample />
        </Root>
      ))}
    </div>
  ),
};
