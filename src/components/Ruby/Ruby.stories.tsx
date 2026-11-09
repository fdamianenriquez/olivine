import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";

import { Ruby } from "./Ruby";

const meta = {
  title: "Content/Ruby",
  component: Ruby,
  tags: ["autodocs"],
  args: { base: "今日", reading: "きょう" },
  argTypes: {
    reveal: { control: "inline-radio", options: ["always", "hover"] },
    size: { control: "inline-radio", options: ["body", "kanji", "display"] },
  },
  parameters: {
    docs: {
      description: {
        component: `Furigana over Japanese text so a reader who doesn't know a word can still say it. Native \`<ruby>\` with \`<rp>\` fallbacks; readings at half the base size (JLREQ) in \`ink-2\`; kana and kanji in the jp face.

**Props** — \`base\` + \`reading\` (group ruby: one reading for the whole word, required for jukujikun such as 今日 きょう), \`pairs\` (\`[[base, reading], …]\`, mono ruby: one reading per kanji, lines may break between them; the default choice), \`romaji\` (Latin reading stacked under the base in the label voice, never below 11px; not used in vertical text), \`reveal\` (\`always\` | \`hover\`: learner mode, readings appear on hover or keyboard focus; the word is focusable and marked with a dotted hairline), \`size\` (\`body\` 18 | \`kanji\` 24 | \`display\` 64), \`vertical\` (tategaki: readings on the right).

The root is \`lang="ja"\` and the Latin line \`lang="ja-Latn"\`. Readings stay in the DOM in learner mode, for screen readers and copy. Line height leaves room for ruby so it never collides with the line above (2.1 at body size). The Latin reading is a flex stack under the base, not a nested \`<ruby>\` with \`ruby-position: under\`, which Chromium renders above.

- Do use \`pairs\` for compounds so a line can break between characters.
- Do use \`base\` + \`reading\` for jukujikun, where the reading cannot be split.
- Do give ruby only to words a reader may not know.
- Do use \`reveal="hover"\` sparingly in long passages: each word is a tab stop.
- Don't repeat a Latin reading that is already the visible title.
- Don't use \`romaji\` in vertical text.`,
      },
    },
  },
} satisfies Meta<typeof Ruby>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = {
  display: "flex",
  gap: "var(--space-8)",
  alignItems: "flex-end",
  flexWrap: "wrap",
};
const col: CSSProperties = { display: "grid", gap: "var(--space-4)", maxWidth: "60ch" };

const MATSUMOTO = [
  ["松", "まつ"],
  ["本", "もと"],
] as const;

export const Default: Story = {};

export const Kinds: Story = {
  render: () => (
    <div style={row}>
      <Ruby size="display" pairs={MATSUMOTO} />
      <Ruby size="display" base="今日" reading="きょう" />
      <Ruby size="display" base="白樺" reading="しらかば" romaji="Shirakaba" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Ruby size="body" base="白樺" reading="しらかば" />
      <Ruby size="kanji" base="白樺" reading="しらかば" />
      <Ruby size="display" base="白樺" reading="しらかば" />
    </div>
  ),
};

export const InRunningText: Story = {
  render: () => (
    <p
      lang="ja"
      style={{
        ...col,
        margin: 0,
        fontFamily: "var(--font-jp)",
        fontSize: "var(--text-body-l-size)",
      }}
    >
      <span>
        <Ruby
          pairs={[
            ["乗", "の"],
            ["り", ""],
          ]}
        />
        <Ruby pairs={[["鞍", "くら"]]} />
        のあと、
        <Ruby base="今日" reading="きょう" />
        は<Ruby pairs={MATSUMOTO} />
        の宿で休みます。ルビが必要なのは、読み手が知らないかもしれない言葉だけです。
      </span>
    </p>
  ),
};

export const WithLatinReading: Story = {
  render: () => (
    <div style={row}>
      <Ruby size="kanji" base="白樺" reading="しらかば" romaji="Shirakaba" />
      <Ruby size="kanji" pairs={MATSUMOTO} romaji="Matsumoto" />
      <Ruby size="display" base="白樺" reading="しらかば" romaji="Shirakaba" />
    </div>
  ),
};

export const LearnerMode: Story = {
  render: () => (
    <div style={col}>
      <p
        lang="en"
        style={{ margin: 0, color: "var(--ink-2)", fontFamily: "var(--text-body-family)" }}
      >
        Hover a word, or Tab to it, to see its reading.
      </p>
      <div style={row}>
        <Ruby size="kanji" reveal="hover" base="今日" reading="きょう" romaji="kyō" />
        <Ruby size="kanji" reveal="hover" pairs={MATSUMOTO} />
        <Ruby size="kanji" reveal="hover" base="白樺" reading="しらかば" romaji="Shirakaba" />
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div style={{ ...row, blockSize: "calc(var(--space-32) + var(--space-16))" }}>
      <Ruby size="kanji" vertical pairs={MATSUMOTO} />
      <Ruby size="kanji" vertical base="今日" reading="きょう" />
    </div>
  ),
};

export const Themes: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-6)",
            padding: "var(--space-6)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        >
          <div style={row}>
            <Ruby size="display" pairs={MATSUMOTO} />
            <Ruby size="display" base="今日" reading="きょう" />
            <Ruby size="display" base="白樺" reading="しらかば" romaji="Shirakaba" />
          </div>
          <div style={row}>
            <Ruby size="kanji" reveal="hover" base="今日" reading="きょう" />
            <Ruby size="kanji" vertical pairs={MATSUMOTO} />
          </div>
        </div>
      ))}
    </div>
  ),
};
