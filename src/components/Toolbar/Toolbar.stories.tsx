import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { Button } from "../Button";
import { ButtonGroup } from "../ButtonGroup";
import { Dropdown } from "../Dropdown";
import { Input } from "../Input";
import { Root } from "../Root";
import { SegmentedControl } from "../SegmentedControl";
import { SplitButton } from "../SplitButton";
import { Text } from "../Text";
import { ToggleButton } from "../ToggleButton";
import { Tooltip } from "../Tooltip";
import { Toolbar } from "./Toolbar";

const meta = {
  title: "Actions/Toolbar",
  component: Toolbar,
  tags: ["autodocs"],
  args: { label: "Text formatting", children: null },
  parameters: {
    docs: {
      description: {
        component:
          "Toolbar is a labelled bar of related controls that is one Tab stop: arrow keys move between its buttons, toggles, segmented choices, menu triggers and (last) one text field. It is docked (a full-width ruled strip) or floating (`paper-3`, hairline, block shadow), horizontal or vertical. Use it for three or more commands that belong together (formatting, selection actions, table tools). Use ButtonGroup for a short cluster of buttons, Navbar or NavigationRail for navigation, SegmentedControl for a single choice.\n\n" +
          "**Behaviour** — Tab enters on the last focused item (the first enabled one the first time) and leaves in one press. Right and Left (swapped in right-to-left text), or Down and Up in a vertical bar, move focus; Home and End jump to the ends; disabled items are skipped; focus wraps with `loop`. The keys of the other axis are left to the item: a menu trigger still opens with Down in a horizontal bar. Inside the text field the arrow keys move the caret and reach the neighbour only from the start or end of the text; Home and End stay with the field. A SegmentedControl inside a toolbar moves focus with the arrows and selects with Space, Enter or a click. Menus opened from the bar do not move the bar's focus. The bar does not hide on scroll, close or animate.\n\n" +
          "**States** — Docked: `paper` ground with a hairline on the edges facing content. Floating: `paper-3`, hairline, block shadow. Radius 0. Inner padding keeps the focus rings whole. Item states belong to the items. Forced colours: borders only, no shadow.\n\n" +
          "**Layout** — `anchor` pins the bar to a viewport edge (floating bars sit `space-6` from it, safe-area aware). Anchored docked bars cover the content under them: pad the page. A floating bar next to a Fab is the app's layout to arrange.\n\n" +
          "- Do give the toolbar a name that says what it acts on (\"Text formatting\", \"Selection actions\").\n- Do use `ghost` buttons so the bar's frame is the only line, and a ButtonGroup for outline controls that must read as one cluster.\n- Do give glyph-only items an `aria-label` and a Tooltip with the same words.\n- Do put the one text field last, and separate groups with `Toolbar.Separator`.\n- Don't put fewer than three controls in a toolbar, or use it for page navigation.\n- Don't nest toolbars or other roving groups (Tabs, ChipGroup), and don't add a number field or combobox.\n- Don't use the block shadow on a docked bar: only floating bars float.",
      },
    },
  },
} satisfies Meta<typeof Toolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A box that holds fixed bars: a transform makes it their containing block. */
const frame: CSSProperties = {
  position: "relative",
  transform: "translateZ(0)",
  height: "calc(var(--control-xl) * 4)",
  border: "var(--stroke-hair) dashed var(--line-soft)",
  background: "var(--paper-2)",
};

const column: CSSProperties = { display: "grid", gap: "var(--space-6)" };

const row: CSSProperties = {
  display: "flex",
  gap: "var(--space-6)",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

function Clipboard({
  names = ["Copy", "Move", "Archive", "Delete"],
  ...props
}: Partial<React.ComponentProps<typeof Toolbar>> & { names?: readonly string[] }) {
  const [copy = "", move = "", archive = "", remove = ""] = names;
  return (
    <Toolbar label="Selection actions" {...props}>
      <Toolbar.Action label={copy} />
      <Toolbar.Action label={move} />
      <Toolbar.Action label={archive} />
      <Toolbar.Separator />
      <Toolbar.Action label={remove} danger />
    </Toolbar>
  );
}

function Formatting({
  placeholder = "Find in text",
  ...props
}: Partial<React.ComponentProps<typeof Toolbar>> & { placeholder?: string }) {
  const [align, setAlign] = useState("left");
  return (
    <Toolbar label="Text formatting" {...props}>
      <ToggleButton variant="ghost">Bold</ToggleButton>
      <ToggleButton variant="ghost" defaultPressed>
        Italic
      </ToggleButton>
      <ToggleButton variant="ghost">Underline</ToggleButton>
      <Toolbar.Separator />
      <SegmentedControl
        label="Alignment"
        value={align}
        onChange={setAlign}
        options={[
          { value: "left", label: "Left" },
          { value: "centre", label: "Centre" },
          { value: "right", label: "Right" },
        ]}
      />
      <Toolbar.Separator />
      <Dropdown
        label="Style"
        variant="ghost"
        items={[{ label: "Paragraph" }, { label: "Heading" }, { label: "Quote" }]}
      />
      <Input aria-label="Find in text" placeholder={placeholder} />
    </Toolbar>
  );
}

/** Docked in the page flow: a full-width strip ruled above and below. */
export const Docked: Story = {
  render: () => (
    <div style={column}>
      <Formatting />
      <Text tone="muted">
        The bar keeps its place in the flow. Tab enters it once; arrows move between the items.
      </Text>
    </div>
  ),
};

/** Pinned to the bottom edge of the viewport (here, of the dashed frame). */
export const DockedBottom: Story = {
  render: () => (
    <div style={frame}>
      <Clipboard anchor="bottom" />
    </div>
  ),
};

export const Floating: Story = {
  render: () => (
    <div style={column}>
      <Clipboard variant="floating" />
      <Toolbar label="Quick actions" variant="floating">
        <Button variant="ghost">Undo</Button>
        <Button variant="ghost">Redo</Button>
        <ButtonGroup label="View">
          <Button aria-pressed="true">Grid</Button>
          <Button aria-pressed="false">List</Button>
        </ButtonGroup>
        <SplitButton label="Export" variant="ghost" items={[{ label: "As PDF" }]} />
      </Toolbar>
    </div>
  ),
};

function TableTools({ tip }: { tip: "left" | "right" }) {
  return (
    <div style={frame}>
      <Toolbar label="Table tools" variant="floating" orientation="vertical" anchor="start">
        <Tooltip content="Add row" placement={tip}>
          <Toolbar.Action label="Add row" icon="+" iconOnly />
        </Tooltip>
        <Tooltip content="Remove row" placement={tip}>
          <Toolbar.Action label="Remove row" icon="−" iconOnly />
        </Tooltip>
        <Toolbar.Separator />
        <Tooltip content="Move up" placement={tip}>
          <Toolbar.Action label="Move up" icon="↑" iconOnly />
        </Tooltip>
        <Tooltip content="Move down" placement={tip}>
          <Toolbar.Action label="Move down" icon="↓" iconOnly />
        </Tooltip>
      </Toolbar>
    </div>
  );
}

/** A floating column at the inline start of the viewport; menus and tooltips open to the side. */
export const FloatingVertical: Story = { render: () => <TableTools tip="right" /> };

/** The same column in right-to-left text: it sits at the right edge and its tooltips open to the left. */
export const FloatingVerticalRightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <TableTools tip="left" />
    </div>
  ),
};

/** Toggles, a segmented choice, a menu trigger and the one text field, last. */
export const FormattingToolbar: Story = { render: () => <Formatting /> };

/** `wrap` continues on the next row (arrows follow DOM order); `scroll` scrolls along the axis. */
export const Overflow: Story = {
  render: () => (
    <div style={column}>
      {(["wrap", "scroll"] as const).map((overflow) => (
        <div key={overflow} style={{ width: "calc(var(--control-xl) * 2.5)" }}>
          <Text tone="muted">{overflow}</Text>
          <Clipboard overflow={overflow} label={`Selection actions (${overflow})`} />
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={column}>
      {(["s", "m", "l"] as const).map((size) => (
        <Toolbar key={size} label={`Size ${size}`} variant="floating">
          <Toolbar.Action label="Cut" size={size} />
          <Toolbar.Action label="Copy" size={size} />
          <Toolbar.Action label="Paste" size={size} />
        </Toolbar>
      ))}
    </div>
  ),
};

/** Under `dir="rtl"` the bar runs from the right and Left and Right swap. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl" style={column}>
      <Formatting placeholder="Find in text" />
      <Clipboard variant="floating" />
    </div>
  ),
};

export const Japanese: Story = {
  render: () => (
    <Root locale="ja" lang="ja">
      <div style={column}>
        <Toolbar label="文字の書式">
          <ToggleButton variant="ghost">太字</ToggleButton>
          <ToggleButton variant="ghost">斜体</ToggleButton>
          <Toolbar.Separator />
          <SegmentedControl
            label="配置"
            defaultValue="left"
            options={[
              { value: "left", label: "左" },
              { value: "centre", label: "中央" },
              { value: "right", label: "右" },
            ]}
          />
          <Toolbar.Separator />
          <Dropdown
            label="スタイル"
            variant="ghost"
            items={[{ label: "段落" }, { label: "見出し" }]}
          />
          <Toolbar.Spacer />
          <Input aria-label="検索" placeholder="本文を検索" />
        </Toolbar>
        <Clipboard
          variant="floating"
          label="選択の操作"
          names={["コピー", "移動", "保管", "削除"]}
        />
      </div>
    </Root>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <div style={column}>
            <Formatting />
            <div style={row}>
              <Clipboard variant="floating" />
              <Clipboard variant="floating" orientation="vertical" label="Selection (column)" />
            </div>
          </div>
        </Root>
      ))}
    </div>
  ),
};
