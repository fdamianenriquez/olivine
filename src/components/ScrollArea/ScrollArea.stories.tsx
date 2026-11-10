import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useState } from "react";
import { expect, waitFor, within } from "storybook/test";

import { Button } from "../Button";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Text } from "../Text";
import { ScrollArea } from "./ScrollArea";

const meta = {
  title: "Foundations/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
  args: { label: "Order history", bordered: true },
  parameters: {
    docs: {
      description: {
        component:
          "`ScrollArea` is a bounded box that scrolls its content natively and draws the scrollbar as a ruled, square bar: track `paper-2`, thumb a `rule` hairline box on `paper` that fills `ink` on hover and drag, thickness `--scrollbar-size`, corner `paper-2`. While the content overflows, the scroller is a named, keyboard-focusable region, so the arrow, Page, Space and Home/End keys scroll it; when everything fits it adds no tab stop. Give the root a height or `max-height`: without a bounded size nothing overflows.\n\n**Props**\n- `orientation`: `vertical` (default) · `horizontal` · `both`. Physical axes; vertical-writing content that scrolls sideways uses `horizontal`.\n- `label`: accessible name of the region (or pass `aria-labelledby`). Exposed only while the scroller is a tab stop. An unnamed overflowing area is still focusable, is not a region, and logs a development warning.\n- `focusable`: `overflow` (default) · `always` (tab stop even before measuring, e.g. before hydration) · `never` (for content that handles the arrow keys itself: a listbox, a tree, a menu).\n- `bordered`: hairline `rule` frame on all sides.\n- `hints`: a 2px `ink` line on each edge of the main axis that has more content beyond it, fading with `dur-s` / `ease-effect`. Decorative, never announced.\n- `gutter`: `scrollbar-gutter: stable`, so content does not shift when a bar appears.\n- `contain`: `overscroll-behavior: contain`, so a wheel or swipe at the end does not scroll the page behind.\n- `viewportRef` (the scrolling element), `onScroll` (from the scrolling element), `ref` (the root); other `div` attributes go to the root.\n\n**State attributes** on the root: `data-orientation`, `data-overflow-x`, `data-overflow-y`, `data-overflow-x-start`, `data-overflow-x-end`, `data-overflow-y-start`, `data-overflow-y-end` (logical, so they flip in RTL).\n\n**Utility** — `ol-scrollbar` is the skin alone, for any element that already scrolls.\n\n- Do give every ScrollArea a name that says what scrolls, so the tab stop is announced.\n- Do bound the height and let the content flow naturally inside.\n- Do use `hints` on small panels that touch users scroll, where the OS bar stays hidden until a swipe.\n- Do use `focusable=\"never\"` when the content is a listbox, tree or menu that handles arrow keys itself.\n- Don't hide the bar or scroll an area with no visible sign of overflow.\n- Don't nest ScrollAreas in the same axis, or put one around the whole page.\n- Don't colour the thumb or add rounded ends, shadows or gradient fades.\n- Don't animate scrolling or add auto-hide.",
      },
    },
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

const box: CSSProperties = {
  blockSize: "calc(var(--space-32) * 2)",
  maxInlineSize: "calc(var(--space-32) * 3)",
};
const strip: CSSProperties = { maxInlineSize: "calc(var(--space-32) * 3)" };
const wide: CSSProperties = {
  blockSize: "calc(var(--space-32) * 2)",
  maxInlineSize: "calc(var(--space-32) * 3)",
};
const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "var(--space-4)",
  padding: "var(--space-2) var(--space-4)",
  borderBlockEnd: "var(--stroke-hair) solid var(--rule)",
};
const list: CSSProperties = { margin: 0, padding: 0, listStyle: "none" };

const ORDERS = Array.from({ length: 18 }, (_, i) => ({
  id: `OL-${String(2041 + i)}`,
  item: ["Oak board", "Walnut offcut", "Ash dowel", "Cedar plank", "Maple veneer"][i % 5],
  total: ((i * 37) % 180) + 24,
}));

function Orders({ count = ORDERS.length }: { count?: number }) {
  return (
    <ul style={list}>
      {ORDERS.slice(0, count).map((order) => (
        <li key={order.id} style={row}>
          <span>
            <Text as="span" variant="mono">
              {order.id}
            </Text>{" "}
            {order.item}
          </span>
          <Text as="span" variant="figure-xs">
            €{order.total}
          </Text>
        </li>
      ))}
    </ul>
  );
}

const TAGS = [
  "Oak",
  "Walnut",
  "Ash",
  "Cedar",
  "Maple",
  "Cherry",
  "Elm",
  "Beech",
  "Birch",
  "Larch",
  "Pine",
  "Teak",
];

function Strip() {
  return (
    <ul
      style={{
        ...list,
        display: "flex",
        inlineSize: "max-content",
      }}
    >
      {TAGS.map((tag) => (
        <li
          key={tag}
          style={{
            padding: "var(--space-2) var(--space-4)",
            borderInlineEnd: "var(--stroke-hair) solid var(--rule)",
          }}
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function Grid() {
  return (
    <table style={{ borderCollapse: "collapse", inlineSize: "max-content" }}>
      <tbody>
        {Array.from({ length: 14 }, (_, r) => (
          <tr key={r}>
            {Array.from({ length: 10 }, (_, c) => (
              <td
                key={c}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  border: "var(--stroke-hair) solid var(--rule)",
                }}
              >
                <Text as="span" variant="mono">
                  {String.fromCharCode(65 + c)}
                  {r + 1}
                </Text>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Stage = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "grid", gap: "var(--space-6)", justifyItems: "start" }}>{children}</div>
);

/** A vertical list in a framed box: the viewport is one tab stop while it overflows. */
export const Vertical: Story = {
  render: (args) => (
    <ScrollArea {...args} style={box}>
      <Orders />
    </ScrollArea>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = await waitFor(() => canvas.getByRole("region", { name: "Order history" }));
    await expect(region).toHaveAttribute("tabindex", "0");
  },
};

/** Content that fits adds no tab stop, no region and no bar. */
export const Fits: Story = {
  render: (args) => (
    <ScrollArea {...args} style={box}>
      <Orders count={3} />
    </ScrollArea>
  ),
};

/** A strip that scrolls sideways. */
export const Horizontal: Story = {
  args: { label: "Woods", orientation: "horizontal" },
  render: (args) => (
    <ScrollArea {...args} style={strip}>
      <Strip />
    </ScrollArea>
  ),
};

/** Both axes: the bars meet in a `paper-2` corner. */
export const Both: Story = {
  args: { label: "Cut list", orientation: "both" },
  render: (args) => (
    <ScrollArea {...args} style={wide}>
      <Grid />
    </ScrollArea>
  ),
};

/** Without the frame, the box sits flush in its container. */
export const Unbordered: Story = {
  args: { bordered: false },
  render: (args) => (
    <ScrollArea {...args} style={box}>
      <Orders />
    </ScrollArea>
  ),
};

/** Edge hints: a 2px `ink` line on each edge of the main axis with more content beyond it. */
export const Hints: Story = {
  args: { hints: true },
  render: (args) => (
    <Stage>
      <ScrollArea {...args} style={box}>
        <Orders />
      </ScrollArea>
      <ScrollArea {...args} label="Woods" orientation="horizontal" style={strip}>
        <Strip />
      </ScrollArea>
    </Stage>
  ),
};

/** `gutter` keeps the bar's space, so the rows do not shift when the list grows past the box. */
export const Gutter: Story = {
  render: function Render(args) {
    const [count, setCount] = useState(3);
    return (
      <Stage>
        <Button
          size="s"
          onClick={() => {
            setCount((n) => (n === 3 ? ORDERS.length : 3));
          }}
        >
          {count === 3 ? "Show all orders" : "Show three orders"}
        </Button>
        <Stage>
          <ScrollArea {...args} gutter style={box}>
            <Orders count={count} />
          </ScrollArea>
          <ScrollArea {...args} label="Order history without gutter" style={box}>
            <Orders count={count} />
          </ScrollArea>
        </Stage>
      </Stage>
    );
  },
};

/** `focusable="never"` for content that owns the arrow keys; the buttons are the tab stops. */
export const FocusableNever: Story = {
  args: { focusable: "never" },
  render: (args) => (
    <ScrollArea {...args} style={box}>
      <ul style={{ ...list, display: "grid", gap: "var(--space-2)", padding: "var(--space-2)" }}>
        {ORDERS.map((order) => (
          <li key={order.id}>
            <Button size="s" variant="ghost">
              Open {order.id}
            </Button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  ),
};

/** Right to left: the bar moves to the left and the horizontal edges flip. */
export const RightToLeft: Story = {
  args: { hints: true },
  render: (args) => (
    <div dir="rtl">
      <Stage>
        <ScrollArea {...args} style={box}>
          <Orders />
        </ScrollArea>
        <ScrollArea {...args} label="Woods" orientation="horizontal" style={strip}>
          <Strip />
        </ScrollArea>
      </Stage>
    </div>
  ),
};

const POEM =
  "白樺の林を抜けて、工房に朝の光が差し込む。板を一枚ずつ選び、木目を読み、鉋をかける。手のひらで確かめた面は、時間をかけて静かに艶を帯びていく。仕上げた棚は、長く使われることで初めて完成する。";

/** Japanese set vertically scrolls sideways and starts at the right edge. The writing mode is
 * set on the root, so the scroller itself starts on the right. */
export const JapaneseVertical: Story = {
  args: { label: "工房の朝", orientation: "horizontal", hints: true },
  render: (args) => (
    <Root locale="ja">
      <ScrollArea
        {...args}
        lang="ja"
        style={{
          width: "calc(var(--space-32) * 2)",
          height: "calc(var(--space-32) + var(--space-16))",
          writingMode: "vertical-rl",
        }}
      >
        <Text vertical as="p" style={{ margin: 0, padding: "var(--space-4)" }}>
          {POEM}
        </Text>
      </ScrollArea>
    </Root>
  ),
};

/** A long body inside a Modal. */
export const InModal: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          Open orders
        </Button>
        <Modal
          open={open}
          title="Orders"
          onClose={() => {
            setOpen(false);
          }}
        >
          <ScrollArea {...args} style={{ blockSize: "calc(var(--space-32) * 2)" }}>
            <Orders />
          </ScrollArea>
        </Modal>
      </>
    );
  },
};

/** Narrow, touch-sized: hints carry the "more" cue where the OS hides the bar. */
export const Narrow: Story = {
  args: { hints: true, contain: true },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => (
    <ScrollArea {...args} style={{ blockSize: "calc(var(--space-32) * 2)" }}>
      <Orders />
    </ScrollArea>
  ),
};

/** Under reduced motion the hint lines appear and go at once. */
export const ReducedMotion: Story = {
  args: { hints: true },
  render: (args) => (
    <div className="ol-reduce-motion">
      <ScrollArea {...args} style={box}>
        <Orders />
      </ScrollArea>
    </div>
  ),
};

/** Both themes side by side: the frames the owner approves. */
export const Themes: Story = {
  args: { hints: true },
  parameters: { flush: true, layout: "fullscreen" },
  render: (args) => (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root
          key={theme}
          theme={theme}
          style={{ padding: "var(--space-6)", background: "var(--paper)" }}
        >
          <Stage>
            <ScrollArea {...args} label={`Order history, ${theme}`} style={box}>
              <Orders />
            </ScrollArea>
            <ScrollArea {...args} label={`Cut list, ${theme}`} orientation="both" style={wide}>
              <Grid />
            </ScrollArea>
          </Stage>
        </Root>
      ))}
    </div>
  ),
};
