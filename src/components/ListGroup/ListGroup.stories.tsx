import type { Meta, StoryObj } from "@storybook/react-vite";

import { ListGroup } from "./ListGroup";

const noop = () => undefined;

const meta = {
  title: "Content/ListGroup",
  component: ListGroup,
  tags: ["autodocs"],
  args: {
    items: [
      { title: "Identity", description: "Marks, type, voice", meta: "12" },
      { title: "Interiors", description: "Kitchens, storage", meta: "08" },
      { title: "Editorial", meta: "03" },
    ],
  },
  parameters: {
    docs: {
      description: {
        component:
          "ListGroup is a stack of ruled rows: title, optional description, and right-aligned meta.\n\n**Props** — `items` (`[{title, description, meta, href, onClick, active, disabled}]`), `numbered` (01, 02…), `boxed`, `flush`.\n\n- Rows with `href` render links and rows with `onClick` render buttons; both invert to ink on hover and focus.\n- `active` draws an olive left edge and sets `aria-current` (`page` on links, `true` on buttons).\n- Disabled rows are dimmed and not focusable.\n- Numbered lists render an `<ol>`.",
      },
    },
  },
} satisfies Meta<typeof ListGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Static: Story = {};

export const Links: Story = {
  args: {
    items: [
      { title: "Identity", description: "Marks, type, voice", meta: "12", href: "#" },
      { title: "Interiors", description: "Kitchens, storage", meta: "08", href: "#", active: true },
      { title: "Editorial", meta: "03", href: "#" },
      { title: "Archive", meta: "00", href: "#", disabled: true },
    ],
  },
};

export const Buttons: Story = {
  args: {
    boxed: true,
    items: [
      { title: "Open project", onClick: noop, meta: "→" },
      { title: "Share link", onClick: noop, meta: "→", active: true },
      { title: "Unavailable", onClick: noop, disabled: true },
    ],
  },
};

export const Numbered: Story = { args: { numbered: true } };

export const Boxed: Story = { args: { boxed: true } };

export const Flush: Story = { args: { flush: true } };

export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <ListGroup
            {...args}
            numbered
            items={[
              { title: "Identity", description: "Marks, type, voice", meta: "12", href: "#" },
              { title: "Interiors", meta: "08", href: "#", active: true },
              { title: "Editorial", meta: "03", onClick: noop },
              { title: "Archive", meta: "00", disabled: true, onClick: noop },
            ]}
          />
        </div>
      ))}
    </div>
  ),
};
