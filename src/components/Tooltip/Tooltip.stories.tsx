import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button";
import { Root } from "../Root";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "Feedback/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  args: { content: "Copy link", children: <Button size="s">Hover or focus</Button> },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Tooltip shows a few mono words in an ink box on hover and focus; Escape hides it.\n\nIt opens after `openDelay` on hover, at once on keyboard focus, and on a long press on touch. The pointer can move onto the tooltip without closing it. It renders in a portal and flips at the viewport edge.\n\nA disabled button receives no pointer or focus events, so the tooltip never opens. Wrap it in a focusable element (for example a `span` with `tabIndex={0}`) and put the tooltip on the wrapper.\n\n- Don't put essential information or links in a tooltip; use Popover.",
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Placements: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 96, padding: 64 }}>
      {(["top", "bottom", "left", "right"] as const).map((placement) => (
        <Tooltip key={placement} content={placement} placement={placement} defaultOpen>
          <Button size="s" variant="ghost">
            {placement}
          </Button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const Delays: Story = {
  args: { openDelay: 800, closeDelay: 400 },
};

export const DisabledButtonWrapper: Story = {
  render: () => (
    <Tooltip content="Needs a selection">
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the wrapper must be focusable to carry the tooltip */}
      <span tabIndex={0} style={{ display: "inline-block" }}>
        <Button disabled>Delete</Button>
      </span>
    </Tooltip>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 0 }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: 64, background: "var(--paper)" }}>
          <Tooltip content={theme} defaultOpen>
            <Button size="s">{theme}</Button>
          </Tooltip>
        </Root>
      ))}
    </div>
  ),
};
