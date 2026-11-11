import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button";
import { Root } from "../Root";
import { Toolbar } from "../Toolbar";
import { Tooltip } from "./Tooltip";
import { TooltipProvider } from "./TooltipProvider";

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
          'Tooltip shows a few words in an ink box on hover, keyboard focus and touch long-press, to name or describe a control; Escape hides it. Give it a `title` (or `variant="rich"`) for a raised paper box with a title and a short supporting text. It never holds links, buttons or anything focusable and never carries information the user needs: for that use Popover (click) or HoverCard (hover/focus).\n\n' +
          "**Behaviour** — It opens after `openDelay` on hover, at once on keyboard focus, and after a 500 ms press on touch. Neighbouring tooltips open without the wait inside a `TooltipProvider` (or the built-in default group), and only one tooltip of a group is open at a time. The pointer can move onto the box without closing it; the tooltip stays while the pointer or keyboard focus remains, and closes on Escape, blur, a press on the trigger, or a tap elsewhere or on the box. The trigger is described with `aria-describedby` unless the tooltip only repeats its name; a rich tooltip always describes.\n\n" +
          "**Motion** — A plain tooltip fades in, a rich one settles into place. A tooltip opened at once by a warm group appears without motion, and none has an exit.\n\n" +
          "**TooltipProvider** — Optional. Props `openDelay` (300), `closeDelay` (0), `skipDelay` (300). A tooltip's own `openDelay` / `closeDelay` win over the group's.\n\n" +
          "- Do keep the text to a few words; sentence case, no full stop for fragments.\n" +
          "- Do give a glyph-only button an `aria-label` and a Tooltip with the **same words**; Tooltip then skips `aria-describedby`.\n" +
          "- Do wrap a disabled control in a focusable `span` and put the Tooltip on the wrapper.\n" +
          "- Do wrap a toolbar or button row in one `TooltipProvider` so the second tooltip is instant.\n" +
          "- Do use `title` + `content` only for a short explanation that is nice to have, never required.\n" +
          "- Don't put links, buttons, inputs or essential information in a tooltip; use Popover (click) or HoverCard (hover/focus preview).\n" +
          "- Don't rely on touch long-press: the label or meaning must be visible without it.\n" +
          "- Don't use a Tooltip as the only name of a control (no `aria-label` = dev warning).\n" +
          "- Don't add a native `title` to the same trigger.\n" +
          '- Don\'t set very long delays to "hide" a tooltip; use `disabled`.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A title and a short supporting text on the raised paper surface. Not interactive. */
export const Rich: Story = {
  args: {
    title: "Lead time",
    content: "Six to ten weeks from approved drawings. Rush orders on request.",
    defaultOpen: true,
    children: (
      <Button size="s" arrow="?">
        Delivery
      </Button>
    ),
  },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ paddingBlock: "var(--space-24)", paddingInline: "var(--space-8)" }}>
        <Story />
      </div>
    ),
  ],
};

export const Placements: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-24)", padding: "var(--space-16)" }}>
      {(["top", "bottom", "left", "right"] as const).map((placement) => (
        <Tooltip key={placement} content={placement} placement={placement} open>
          <Button size="s" variant="ghost">
            {placement}
          </Button>
        </Tooltip>
      ))}
    </div>
  ),
};

/**
 * A toolbar in one `TooltipProvider`: the first tooltip waits, then the next opens at once while
 * the pointer sweeps across, and only one is open at a time.
 */
export const Group: Story = {
  render: () => (
    <TooltipProvider>
      <Toolbar label="Text formatting">
        {(
          [
            ["Bold", "B"],
            ["Italic", "I"],
            ["Underline", "U"],
          ] as const
        ).map(([label, glyph]) => (
          <Tooltip key={label} content={label}>
            <Toolbar.Action label={label} icon={glyph} iconOnly />
          </Tooltip>
        ))}
      </Toolbar>
    </TooltipProvider>
  ),
};

export const Delays: Story = {
  args: { openDelay: 800, closeDelay: 400 },
};

/** `disabled` turns the tooltip off and leaves the trigger untouched. */
export const Disabled: Story = {
  args: { disabled: true, children: <Button size="s">No tooltip</Button> },
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

/**
 * On touch, a 500 ms press opens the tooltip (the click that ends it is swallowed) and a tap
 * elsewhere or on the box closes it. Few people discover a long press: the meaning must be
 * visible without it, as here, where the button carries its word.
 */
export const Touch: Story = {
  render: () => (
    <Tooltip content="Copies a link anyone in the studio can open">
      <Button size="s" arrow="⧉">
        Copy link
      </Button>
    </Tooltip>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root
          key={theme}
          theme={theme}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-6)",
            paddingBlock: "var(--space-16) var(--space-32)",
            width: "calc(var(--popover-width) + var(--space-16))",
            background: "var(--paper)",
          }}
        >
          <Tooltip content={`Copy link, ${theme}`} open>
            <Button size="s">Plain</Button>
          </Tooltip>
          <Tooltip
            title="Lead time"
            content="Six to ten weeks from approved drawings."
            placement="bottom"
            open
          >
            <Button size="s">Rich</Button>
          </Tooltip>
        </Root>
      ))}
    </div>
  ),
};
