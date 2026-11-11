import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Avatar } from "../Avatar";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Image } from "../Image";
import { Link } from "../Link";
import { Root } from "../Root";
import { Text } from "../Text";
import { HoverCard } from "./HoverCard";

const photo =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#e7e4dc"/><rect x="24" y="52" width="112" height="6" fill="#111110"/><rect x="34" y="58" width="4" height="22" fill="#111110"/><rect x="122" y="58" width="4" height="22" fill="#111110"/></svg>',
  );

const person = (
  <div style={{ display: "grid", gap: "var(--space-3)" }}>
    <Avatar name="Aiko Tanaka" kanji="田中" showName meta="Furniture maker, Matsumoto" />
    <Text variant="body-s">
      Works in chestnut and white oak. Twelve pieces in the current catalogue.
    </Text>
    <div style={{ display: "flex", gap: "var(--space-2)" }}>
      <Badge>Joinery</Badge>
      <Badge>Urushi</Badge>
    </div>
  </div>
);

const meta = {
  title: "Feedback/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
  args: {
    trigger: <Link href="#aiko">Aiko Tanaka</Link>,
    content: person,
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "HoverCard is a raised preview card beside a link. It opens when a mouse rests on the link, or when the link takes keyboard focus, after `openDelay` (600 ms); touch never opens it, a tap just follows the link. It closes on Escape, on a press on the link or outside the card, and `closeDelay` (300 ms) after pointer and focus have left. The pointer can travel onto the card, and the card stays open while text inside it is selected.\n\nThe card is a visual extra: focus never enters it, it is not announced, and focusable elements inside are taken out of the tab order. Everything in it must also be on the linked page.\n\n- Do keep it to a glance: a name, an image, two or three lines, a few tags.\n- Do use a real link as the trigger.\n- Don't put a button, a form, a menu or the only route to anything in it; use Popover.\n- Don't use it for short labels; use Tooltip.\n- Don't nest hover cards.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 320, padding: "var(--space-8)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HoverCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A link in running text. Rest the pointer on the name, or Tab to it. */
export const Default: Story = {
  render: (args) => (
    <Text as="p" style={{ maxWidth: "60ch" }}>
      The bench in the hall was made by <HoverCard {...args} /> from a single chestnut board,
      finished with three coats of urushi.
    </Text>
  ),
};

export const Open: Story = { args: { defaultOpen: true } };

export const WithImage: Story = {
  args: {
    defaultOpen: true,
    trigger: <Link href="#bench">Engawa bench</Link>,
    content: (
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <Image src={photo} alt="" width={160} height={90} style={{ width: "100%" }} />
        <Text as="h3" variant="h3">
          Engawa bench
        </Text>
        <Text variant="body-s">Chestnut, 1800 × 380 mm. Made to order in eight weeks.</Text>
      </div>
    ),
  },
};

export const Placements: Story = {
  render: (args) => (
    <div style={{ display: "grid", paddingInlineStart: 320 }}>
      {(["bottom", "top", "right", "left"] as const).map((placement) => (
        <div key={placement} style={{ height: 200, display: "flex", alignItems: "center" }}>
          <HoverCard
            {...args}
            placement={placement}
            defaultOpen
            trigger={<Link href={`#${placement}`}>{placement}</Link>}
            content={<Text variant="body-s">Opens on the {placement}.</Text>}
          />
        </div>
      ))}
    </div>
  ),
};

/** Near the bottom of the viewport the card flips above the link. */
export const FlipsAtTheEdge: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div
        style={{
          height: "calc(100vh - 2 * var(--space-8))",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "flex-end",
          padding: "var(--space-4)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: { defaultOpen: true },
};

/** Tab onto the link: the card opens after the delay and focus stays on the link. */
export const KeyboardFocus: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
      <Button size="s">Before</Button>
      <HoverCard {...args} />
      <Button size="s">After</Button>
    </div>
  ),
};

export const Controlled: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ display: "grid", gap: "var(--space-4)", justifyItems: "start" }}>
        <Text variant="body-s">Card is {open ? "open" : "closed"}.</Text>
        <HoverCard {...args} open={open} onOpenChange={setOpen} />
      </div>
    );
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root
          key={theme}
          theme={theme}
          style={{ minHeight: 300, padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <HoverCard {...args} defaultOpen />
        </Root>
      ))}
    </div>
  ),
};
