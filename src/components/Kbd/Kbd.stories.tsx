import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";

import { Root } from "../Root";
import { Kbd, KbdGroup } from "./Kbd";

const meta = {
  title: "Actions/Kbd",
  component: Kbd,
  tags: ["autodocs"],
  args: { keys: "mod+k" },
  parameters: {
    docs: {
      description: {
        component:
          'A key or shortcut drawn as a keycap: a hairline box with a 2px bottom edge, `label-s`, `ink-2` on `paper`. A combination is an outer `<kbd class="ol-kbd-group">` around one cap per key, 4px apart, always left to right. On an ink ground use `inverse`, or set `--kbd-fill`, `--kbd-ink` and `--kbd-line` on the host (disabled rows use `ink-3`).\n\n**Props** — `keys` (`"mod+k"` or `["mod", "k"]`; omit it for one literal cap from `children`), `platform` (`auto` | `apple` | `other`, default from `Root platform`, else `auto`), `inverse`, `label` (replaces the spoken text), plus native `kbd` attributes and `ref`. `KbdGroup` for hand-built combinations. Helpers: `useKbdPlatform`, `formatShortcut`, `parseShortcut`, `toAriaKeyShortcuts`.\n\nKey names: `mod meta ctrl alt shift enter esc tab space backspace delete up down left right`, any single character, or a literal legend (`F5`). `mod` is ⌘ on Apple and Ctrl elsewhere; on a server render and the first hydration pass it shows ⌘ / Ctrl in one cap. Glyphs and abbreviations carry their spoken name from the locale in hidden text.\n\n- Do use `keys="mod+k"` so ⌘ and Ctrl are chosen for the reader\'s platform.\n- Do keep one cap per key; a long chord is several caps in one group, never a string like "Ctrl+Shift+P" in a single box.\n- Do hide nothing from assistive tech: the hidden name is how "⌘" is read.\n- Do make single-character shortcuts work only while their host (menu, list) has focus; app-wide shortcuts need a modifier (WCAG 2.1.4).\n- Don\'t add a visible "+" between caps, don\'t uppercase with CSS, don\'t use the cap as a button.\n- Don\'t colour the cap with `maple`, `olivo` or a status colour.',
      },
    },
  },
} satisfies Meta<typeof Kbd>;

export default meta;

type Story = StoryObj<typeof meta>;

const row: CSSProperties = {
  display: "flex",
  gap: "var(--space-4)",
  flexWrap: "wrap",
  alignItems: "center",
};
const stack: CSSProperties = { display: "grid", gap: "var(--space-4)" };
const caption: CSSProperties = {
  minWidth: "calc(var(--space-24) + var(--space-8))",
  color: "var(--ink-2)",
  fontFamily: "var(--text-label-family)",
  fontSize: "var(--text-label-size)",
};
const inkRow: CSSProperties = {
  ...row,
  padding: "var(--space-2) var(--space-3)",
  background: "var(--ink)",
  color: "var(--on-ink)",
  fontFamily: "var(--text-label-family)",
  fontSize: "var(--text-label-size)",
  justifyContent: "space-between",
};
const menuRow: CSSProperties = {
  ...row,
  justifyContent: "space-between",
  padding: "var(--space-2) var(--space-3)",
  fontFamily: "var(--text-label-family)",
  fontSize: "var(--text-label-size)",
  borderBottom: "var(--stroke-hair) solid var(--rule)",
};

export const Default: Story = {};

export const SingleKeys: Story = {
  render: () => (
    <div style={row}>
      <Kbd>K</Kbd>
      <Kbd>?</Kbd>
      <Kbd>/</Kbd>
      <Kbd keys="F5" />
      <Kbd keys="esc" />
      <Kbd keys="enter" />
      <Kbd keys="tab" />
      <Kbd keys="space" />
      <Kbd keys="up" />
      <Kbd keys="down" />
    </div>
  ),
};

export const Combinations: Story = {
  render: () => (
    <div style={row}>
      <Kbd keys="mod+k" />
      <Kbd keys="mod+shift+p" />
      <Kbd keys="alt+enter" />
      <Kbd keys="ctrl+alt+delete" platform="other" />
      <Kbd keys="shift+tab" />
      <KbdGroup>
        <Kbd keys="ctrl" />
        <Kbd>F2</Kbd>
      </KbdGroup>
    </div>
  ),
};

export const Platforms: Story = {
  render: () => (
    <div style={stack}>
      {(["apple", "other"] as const).map((platform) => (
        <div key={platform} style={row}>
          <span style={caption}>{platform === "apple" ? "Apple" : "Windows, Linux"}</span>
          <Kbd keys="mod+k" platform={platform} />
          <Kbd keys="mod+shift+p" platform={platform} />
          <Kbd keys="alt+backspace" platform={platform} />
          <Kbd keys="meta+delete" platform={platform} />
        </div>
      ))}
    </div>
  ),
};

/** Inline in body text the cap keeps its box; the line grows by a few pixels around it. */
export const InASentence: Story = {
  render: () => (
    <div style={{ ...stack, maxWidth: "calc(var(--space-32) * 4)" }}>
      <p className="ol-text ol-text--body" style={{ margin: 0 }}>
        Press <Kbd keys="mod+k" /> to open the command palette, then type to filter. Use{" "}
        <Kbd keys="up" /> and <Kbd keys="down" /> to move through the results and{" "}
        <Kbd keys="enter" /> to run one. <Kbd keys="esc" /> closes it without running anything, and{" "}
        <Kbd keys="mod+shift+p" /> reopens the last command.
      </p>
      <p className="ol-text ol-text--body-s" style={{ margin: 0 }}>
        Smaller text: <Kbd keys="shift+tab" /> moves focus back.
      </p>
    </div>
  ),
};

/**
 * On ink grounds the cap turns transparent with `on-ink` text and border. Hosts can set the
 * three custom properties themselves; a disabled row uses `ink-3`.
 */
export const Inverse: Story = {
  render: () => (
    <div style={{ ...stack, maxWidth: "calc(var(--space-32) * 3)" }}>
      <div style={inkRow}>
        <span>Tooltip: search</span>
        <Kbd keys="mod+k" inverse />
      </div>
      <div style={{ border: "var(--stroke-hair) solid var(--rule)" }}>
        <div style={menuRow}>
          <span>Rename</span>
          <Kbd keys="mod+r" />
        </div>
        <div
          style={
            {
              ...menuRow,
              background: "var(--ink)",
              color: "var(--on-ink)",
              "--kbd-fill": "transparent",
              "--kbd-ink": "var(--on-ink)",
              "--kbd-line": "var(--on-ink)",
            } as CSSProperties
          }
        >
          <span>Duplicate (selected)</span>
          <Kbd keys="mod+d" />
        </div>
        <div
          aria-disabled="true"
          style={
            {
              ...menuRow,
              color: "var(--ink-3)",
              borderBottom: 0,
              "--kbd-ink": "var(--ink-3)",
              "--kbd-line": "var(--ink-3)",
            } as CSSProperties
          }
        >
          <span>Archive (disabled)</span>
          <Kbd keys="mod+shift+a" />
        </div>
      </div>
    </div>
  ),
};

const GLYPHS = "mod+meta+ctrl+alt+shift+enter+esc+tab+space+backspace+delete+up+down+left+right";

/**
 * Every named key at 12px in each locale and platform, to check the fallback fonts that draw
 * ⌘ ⌥ ⇧ ⌃ ↵ ⌫ ⌦ ⇥ and the arrows.
 */
export const GlyphCoverage: Story = {
  render: () => (
    <div style={stack}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale} style={stack}>
          {(["apple", "other"] as const).map((platform) => (
            <div key={platform} style={row}>
              <span style={caption}>
                {locale} · {platform}
              </span>
              <Kbd keys={GLYPHS} platform={platform} />
            </div>
          ))}
        </Root>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={stack}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale} style={row}>
          <span style={caption}>{locale}</span>
          <Kbd keys="mod+shift+delete" platform="other" />
          <Kbd keys="ctrl+backspace" platform="other" />
          <Kbd keys="shift+enter" platform="other" />
          <Kbd keys="mod+shift+delete" platform="apple" />
        </Root>
      ))}
    </div>
  ),
};

/**
 * In Windows High Contrast the cap stays a bordered box drawn in system colours. Turn on
 * forced colours in the browser's rendering tools to check it.
 */
export const ForcedColors: Story = {
  render: () => (
    <div style={stack}>
      <div style={row}>
        <Kbd keys="mod+k" />
        <Kbd keys="esc" />
        <Kbd>?</Kbd>
      </div>
      <div style={{ ...inkRow, justifyContent: "flex-start" }}>
        <Kbd keys="mod+shift+p" inverse />
      </div>
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={stack}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ ...stack, padding: "var(--space-4)", background: "var(--paper-2)" }}
        >
          <div style={row}>
            <Kbd>K</Kbd>
            <Kbd keys="esc" platform="other" />
            <Kbd keys="mod+k" platform="apple" />
            <Kbd keys="mod+shift+p" platform="other" />
            <Kbd keys="up" />
          </div>
          <div style={{ ...inkRow, justifyContent: "flex-start" }}>
            <Kbd keys="mod+k" platform="apple" inverse />
            <Kbd keys="mod+shift+p" platform="other" inverse />
          </div>
        </div>
      ))}
    </div>
  ),
};
