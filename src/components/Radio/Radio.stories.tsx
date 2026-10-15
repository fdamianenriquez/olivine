import type { Meta, StoryObj } from "@storybook/react-vite";

import { Radio } from "./Radio";

const meta = {
  title: "Forms/Radio",
  component: Radio,
  tags: ["autodocs"],
  args: { label: "Pickup", name: "delivery" },
  parameters: {
    docs: {
      description: {
        component:
          "Radio is the round option, one of the few circles in the system, because it marks a point.\n\n- Give radios of one group the same `name`.\n- Group them in a fieldset with a legend (CheckGroup).\n- Use it when exactly one option applies; for several, use Checkbox.",
      },
    },
  },
} satisfies Meta<typeof Radio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Options({ name }: { name: string }) {
  return (
    <fieldset style={{ display: "grid", gap: "var(--space-3)", border: 0, padding: 0 }}>
      <legend>Delivery</legend>
      <Radio name={name} label="Pickup" defaultChecked />
      <Radio name={name} label="Courier" hint="Next business day." />
      <Radio name={name} label="Freight" disabled />
    </fieldset>
  );
}

export const Group: Story = { render: () => <Options name="group" /> };

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
          <Options name={theme} />
        </div>
      ))}
    </div>
  ),
};
