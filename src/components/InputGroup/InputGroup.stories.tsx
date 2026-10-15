import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button";
import { Input } from "../Input";
import { Select } from "../Select";
import { InputGroup } from "./InputGroup";

const meta = {
  title: "Forms/InputGroup",
  component: InputGroup,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "InputGroup joins inputs, buttons and `InputGroup.Text` affixes into one ruled bar with shared borders.\n\n- Do use `Input`, `Select`, `Button` and `InputGroup.Text` as children.\n- Do put an affix's meaning in the Field label or hint, or give the Text an `id` and add it to the input's `aria-describedby`; the affix itself is visual context.\n- Do pass `aria-label` or `aria-labelledby` to announce the bar as a group.\n- Don't nest other components inside; the shared borders only cover direct children.",
      },
    },
  },
} satisfies Meta<typeof InputGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const wrap = { display: "grid", gap: "var(--space-6)", maxWidth: 420 } as const;

export const Currency: Story = {
  render: () => (
    <InputGroup>
      <InputGroup.Text id="ig-cur">¥</InputGroup.Text>
      <Input aria-label="Amount" aria-describedby="ig-cur" placeholder="0" inputMode="numeric" />
    </InputGroup>
  ),
};

export const Domain: Story = {
  render: () => (
    <InputGroup>
      <Input aria-label="Domain" placeholder="olivine" />
      <InputGroup.Text>.com</InputGroup.Text>
    </InputGroup>
  ),
};

export const Search: Story = {
  render: () => (
    <InputGroup>
      <Input aria-label="Search" placeholder="Search the archive" />
      <Button variant="solid">Search</Button>
    </InputGroup>
  ),
};

export const SelectAndInput: Story = {
  render: () => (
    <InputGroup>
      <Select aria-label="Scheme" options={["https://", "http://"]} />
      <Input aria-label="Host" placeholder="example.org" />
    </InputGroup>
  ),
};

const all = (
  <div style={wrap}>
    <InputGroup>
      <InputGroup.Text>¥</InputGroup.Text>
      <Input aria-label="Amount" placeholder="0" />
    </InputGroup>
    <InputGroup>
      <Input aria-label="Domain" placeholder="olivine" />
      <InputGroup.Text>.com</InputGroup.Text>
    </InputGroup>
    <InputGroup>
      <Input aria-label="Search" placeholder="Search" />
      <Button variant="solid">Search</Button>
    </InputGroup>
    <InputGroup>
      <Select aria-label="Scheme" options={["https://", "http://"]} />
      <Input aria-label="Host" placeholder="example.org" />
    </InputGroup>
  </div>
);

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
          {all}
        </div>
      ))}
    </div>
  ),
};
