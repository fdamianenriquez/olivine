import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "../Checkbox/Checkbox";
import { Field } from "../Field/Field";
import { Radio } from "../Radio/Radio";
import { CheckGroup } from "./CheckGroup";

const meta = {
  title: "Forms/CheckGroup",
  component: CheckGroup,
  tags: ["autodocs"],
  args: { legend: "Interests" },
  parameters: {
    docs: {
      description: {
        component:
          "CheckGroup is a fieldset for checkboxes or radios with a mono legend.\n\n- Use `legend` to name the group; it is what assistive technology announces.\n- Use `inline` for short options that fit on one row.\n- Disabling the group disables every option inside.",
      },
    },
  },
} satisfies Meta<typeof CheckGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checkboxes: Story = {
  render: (args) => (
    <CheckGroup {...args}>
      <Checkbox label="Kitchens" defaultChecked />
      <Checkbox label="Storage" hint="Shelving, wardrobes, cabinets." />
      <Checkbox label="All of the above" indeterminate />
      <Checkbox label="Unavailable" disabled />
    </CheckGroup>
  ),
};

export const Radios: Story = {
  args: { legend: "Delivery", inline: true },
  render: (args) => (
    <CheckGroup {...args}>
      <Radio name="d" label="Pickup" defaultChecked />
      <Radio name="d" label="Courier" />
      <Radio name="d" label="Freight" disabled />
    </CheckGroup>
  ),
};

export const Inline: Story = {
  args: { legend: "Notify me", inline: true },
  render: (args) => (
    <CheckGroup {...args}>
      <Checkbox label="Email" defaultChecked />
      <Checkbox label="SMS" />
      <Checkbox label="Post" />
    </CheckGroup>
  ),
};

export const Disabled: Story = {
  args: { legend: "Notify me", disabled: true },
  render: (args) => (
    <CheckGroup {...args}>
      <Checkbox label="Email" defaultChecked />
      <Checkbox label="SMS" />
    </CheckGroup>
  ),
};

export const InField: Story = {
  name: "Inside a Field",
  parameters: {
    docs: {
      description: {
        story:
          "Name the group with `legend`, not the Field `label`. The Field supplies its hint and error to the group.",
      },
    },
  },
  render: () => (
    <Field hint="Pick at least one." error="Choose a channel.">
      <CheckGroup legend="Notify me">
        <Checkbox label="Email" />
        <Checkbox label="SMS" />
      </CheckGroup>
    </Field>
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
          <CheckGroup legend="Notify me" inline>
            <Checkbox label="Email" defaultChecked />
            <Checkbox label="SMS" />
            <Checkbox label="Post" />
          </CheckGroup>
        </div>
      ))}
    </div>
  ),
};
