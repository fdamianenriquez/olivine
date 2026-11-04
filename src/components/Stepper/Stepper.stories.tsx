import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Stepper, type StepperProps, type StepperStep } from "./Stepper";

const steps: StepperStep[] = [
  { label: "Body", description: "Wood and shape" },
  { label: "Neck", description: "Scale length and profile" },
  { label: "Pickups", description: "Pair and position" },
  { label: "Hardware", description: "Bridge and tuners" },
  { label: "Finish", description: "Colour and lacquer" },
  { label: "Review", description: "Check the build" },
];

const meta = {
  title: "Navigation/Stepper",
  component: Stepper,
  tags: ["autodocs"],
  args: { steps, current: 2, label: "Build your guitar" },
  parameters: {
    docs: {
      description: {
        component:
          'Stepper shows the steps of a flow whose order is real, such as a configurator or a reservation. Horizontal is a ruled timeline: the line over a step is drawn in ink when it is done, the current step carries the olive edge and an error the beni edge. Vertical hangs the steps on a hairline spine and unrolls the current step\'s panel.\n\n**Props** — `steps` (`[{label, description?, error?}]`), `current`, `completed` (defaults to every step before `current`), `onStepChange` (omit for read-only), `linear` (default true), `orientation`, `renderPanel` (vertical), `label`, `labels`.\n\n- A `nav` with an ordered list; the current step has `aria-current="step"` and a polite "Step 03 of 06" line announces changes.\n- Done and error states are visible words for screen readers and a glyph for everyone else, never colour alone.\n- With `linear`, only done steps, the current one and the step after a done one are buttons; the others are plain text.',
      },
    },
  },
} satisfies Meta<typeof Stepper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = {
  args: { orientation: "vertical", current: 1 },
  render: (args) => (
    <Stepper {...args} renderPanel={(i) => <p style={{ margin: 0 }}>Panel for step {i + 1}.</p>} />
  ),
};

/** Without `onStepChange` no step is a button. */
export const ReadOnly: Story = {};

export const WithError: Story = {
  args: {
    current: 3,
    steps: steps.map((s, i) => (i === 1 ? { ...s, error: "Choose a scale length" } : s)),
  },
};

function Flow(args: StepperProps) {
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const last = steps.length - 1;
  const go = (to: number) => {
    setCurrent(to);
  };
  const next = () => {
    setCompleted((c) => (c.includes(current) ? c : [...c, current]));
    go(Math.min(last, current + 1));
  };
  return (
    <Stepper
      {...args}
      steps={steps}
      current={current}
      completed={completed}
      onStepChange={go}
      renderPanel={(i) => (
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button
            size="s"
            variant="outline"
            disabled={i === 0}
            onClick={() => {
              go(i - 1);
            }}
          >
            Back
          </Button>
          <Button size="s" disabled={i === last} onClick={next}>
            Next
          </Button>
        </div>
      )}
    />
  );
}

export const Interactive: Story = {
  render: (args) => <Flow {...args} orientation="horizontal" />,
};

export const InteractiveVertical: Story = {
  render: (args) => <Flow {...args} orientation="vertical" />,
};

export const Unlinked: Story = {
  args: { linear: false, onStepChange: () => undefined },
};

export const Themes: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div style={{ display: "grid" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-8)",
            padding: "var(--space-6)",
            background: "var(--paper)",
            alignContent: "start",
          }}
        >
          <Stepper
            {...args}
            label={`${theme} horizontal`}
            onStepChange={() => undefined}
            steps={steps.map((s, i) => (i === 1 ? { ...s, error: "Choose a scale length" } : s))}
          />
          <Stepper
            {...args}
            label={`${theme} vertical`}
            orientation="vertical"
            current={2}
            onStepChange={() => undefined}
            renderPanel={() => <p style={{ margin: 0 }}>Pick a pickup pair.</p>}
          />
        </div>
      ))}
    </div>
  ),
};
