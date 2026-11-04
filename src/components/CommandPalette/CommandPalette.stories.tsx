import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { Button } from "../Button";
import { Kbd } from "../Kbd";
import { Root } from "../Root";
import { CommandPalette, type CommandPaletteGroup } from "./CommandPalette";

const meta = {
  title: "Overlays/CommandPalette",
  component: CommandPalette,
  tags: ["autodocs"],
  args: { groups: [] },
  parameters: {
    docs: {
      description: {
        component: `CommandPalette is a ⌘K / Ctrl K search over actions, records and pages. It unrolls from the top of the screen with the 3px ink rod: a large search input, grouped results and a footer of key hints. It is an APG combobox with a grouped listbox: focus stays in the input while the arrows move the active row (wrapping), Enter runs it, Escape clears the query and a second Escape closes. Focus returns to where it was.

Matching is by subsequence: every typed character must appear in order, in the label or in a keyword, ignoring case, accents, width and the hiragana/katakana difference. Better matches rank first (the start of the label and of words, then contiguous runs), the group with the best match moves to the top, and the matched letters get the \`maple\` fill. The active row inverts to ink. The olive line under the search row is the focus indicator.

**Props** — \`open\` / \`defaultOpen\` / \`onOpenChange\`, \`groups\` (\`{ label, items: { id, label, meta?, kbd?, keywords?, onSelect }[] }[]\`), \`placeholder\`, \`hotkey\` (default \`"k"\`), \`inline\`, \`labels\`.

- Do give every row a short, verb-first label; put the kind or status in \`meta\` and the command's own shortcut in \`kbd\`.
- Do add \`keywords\` for synonyms and old names people still type.
- Do keep one palette per page; it owns ⌘K / Ctrl K.
- Don't use it as a form control or for a long-running search that needs a submit; use \`SearchField\`.
- Don't put rows that need confirmation or input in \`onSelect\` without opening that step in a layer of its own.
- Don't use \`inline\` for the real thing: it has no dialog, scrim or hotkey and exists for previews and docs.`,
      },
      story: { inline: false, iframeHeight: 560 },
    },
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;

type Story = StoryObj<typeof meta>;

const GROUPS: CommandPaletteGroup[] = [
  {
    label: "Actions",
    items: [
      { id: "build", label: "Start a build", kbd: "mod+b", keywords: "new commission order" },
      { id: "visit", label: "Book a workshop visit", keywords: "appointment schedule" },
      { id: "ask", label: "Ask a luthier", kbd: ["mod", "shift", "l"] },
    ],
  },
  {
    label: "Models",
    items: [
      { id: "norikura", label: "Norikura", meta: "Double-cut offset" },
      { id: "utsukushi", label: "Utsukushi", meta: "Single cut" },
      { id: "kaichi", label: "Kaichi", meta: "Chambered slab" },
      { id: "kurobe", label: "Kurobe", meta: "Hollow body" },
    ],
  },
  {
    label: "Orders",
    items: [
      { id: "o-0131", label: "SG-2026-0131 · Kaichi", meta: "Finishing" },
      { id: "o-0127", label: "SG-2026-0127 · Norikura", meta: "In build" },
      { id: "o-0119", label: "SG-2026-0119 · Utsukushi", meta: "Shipped" },
    ],
  },
  {
    label: "Pages",
    items: [
      { id: "p-woods", label: "Tonewoods", meta: "Guide" },
      { id: "p-care", label: "Care and setup", meta: "Guide" },
      { id: "p-shipping", label: "Shipping and duties", meta: "Policy" },
    ],
  },
];

const JAPANESE: CommandPaletteGroup[] = [
  {
    label: "操作",
    items: [
      { id: "build", label: "製作を始める", kbd: "mod+b", keywords: ["せいさく"] },
      { id: "visit", label: "工房を訪ねる", keywords: ["こうぼう", "予約"] },
    ],
  },
  {
    label: "モデル",
    items: [
      { id: "norikura", label: "乗鞍", meta: "ダブルカット", keywords: "のりくら norikura" },
      { id: "kaichi", label: "カイチ", meta: "チェンバード", keywords: "かいち" },
    ],
  },
];

const many: CommandPaletteGroup[] = [
  ...GROUPS,
  {
    label: "Settings",
    items: Array.from({ length: 12 }, (_, at) => ({
      id: `s-${String(at)}`,
      label: `Setting ${String(at + 1)}`,
      meta: "Preference",
    })),
  },
];

const row: CSSProperties = { display: "flex", gap: "var(--space-3)", alignItems: "center" };

function Demo(props: Partial<React.ComponentProps<typeof CommandPalette>>) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const groups = (props.groups ?? GROUPS).map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      onSelect: () => {
        setLast(item.label);
      },
    })),
  }));
  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div style={row}>
        <Button
          variant="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          Search
        </Button>
        <span className="ol-text ol-text--body-s">
          or press <Kbd keys="mod+k" />
        </span>
      </div>
      <p className="ol-text ol-text--body-s" style={{ margin: 0 }} aria-live="polite">
        {last === null ? "Nothing run yet." : `Ran: ${last}`}
      </p>
      <CommandPalette {...props} groups={groups} open={open} onOpenChange={setOpen} />
    </div>
  );
}

/** A button and ⌘K / Ctrl K open it; the chosen row is reported under the button. */
export const Default: Story = { render: () => <Demo /> };

/** Open from the start: the unrolled dialog over the scrim. */
export const Open: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <CommandPalette groups={GROUPS} defaultOpen hotkey={false} />,
};

/** No dialog, scrim or hotkey: for previews and docs. Type "nrk", then ↑ ↓ and Enter. */
export const Inline: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <div style={{ maxWidth: "calc(var(--space-32) * 5)" }}>
      <CommandPalette inline groups={GROUPS} />
    </div>
  ),
};

/** Washi and sumi side by side, inline. */
export const Themes: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: "calc(var(--space-32) * 5)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <CommandPalette inline groups={GROUPS} />
        </Root>
      ))}
    </div>
  ),
};

/** More rows than fit: the list scrolls, and a first row brings its heading along. */
export const LongList: Story = { render: () => <Demo groups={many} /> };

/** Kana keywords find kanji labels; the hiragana/katakana difference is ignored. */
export const Japanese: Story = {
  render: () => (
    <Root locale="ja">
      <Demo groups={JAPANESE} placeholder="操作やモデルを検索" />
    </Root>
  ),
};

/** Another key with ⌘ / Ctrl, or none at all. */
export const CustomHotkey: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <p className="ol-text ol-text--body-s" style={{ margin: 0 }}>
        This palette opens with <Kbd keys="mod+shift+p" />.
      </p>
      <Demo hotkey="mod+shift+p" />
    </div>
  ),
};
