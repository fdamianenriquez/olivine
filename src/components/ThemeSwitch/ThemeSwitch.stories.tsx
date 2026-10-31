import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Root } from "../Root";
import { Text } from "../Text";
import { type ThemeName, ThemeSwitch } from "./ThemeSwitch";

const meta = {
  title: "Utilities/ThemeSwitch",
  component: ThemeSwitch,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `ThemeSwitch is a three-way control for the colour theme: Light (\`washi\`), Dark (\`sumi\`) or Auto, which follows the system. It is a single-choice SegmentedControl named "Theme"; the words come from the locale, the values keep the brand names. The theme changes instantly.

**Controlled** — the app owns the theme and feeds it to \`Root theme\`, so the switch and the page cannot disagree:

\`\`\`tsx
const [theme, setTheme] = useState<ThemeName>("auto");
<Root theme={theme}>
  <ThemeSwitch value={theme} onChange={setTheme} />
</Root>
\`\`\`

**Uncontrolled** — drop \`Root theme\`; ThemeSwitch reads and writes \`data-theme\` on \`<html>\` (or \`target\`). Two switches on one page stay in sync. \`auto\` is written as \`data-theme="auto"\`; the tokens follow \`prefers-color-scheme\` in CSS.

**No flash on load** — ThemeSwitch runs after the first paint and never injects a script. With \`storageKey\` alone, a reload shows the default theme for a moment before the saved one. Pick one of these:

1. *Server (preferred)*: save the choice in a cookie from your own \`onChange\`, read it on the server and render \`<html data-theme="sumi">\`.
2. *Static sites*: add your own small blocking script at the top of \`<head>\` (with your CSP nonce if you use one), reading the same key you pass as \`storageKey\`:

\`\`\`html
<script>
  try {
    var t = localStorage.getItem("theme");
    if (t === "washi" || t === "sumi" || t === "auto") document.documentElement.dataset.theme = t;
  } catch (e) {}
</script>
\`\`\`

- Do place it in a navbar, footer or settings page; keep \`auto\` unless the product has no system mode.
- Do feed a controlled value to \`Root theme\`.
- Don't wrap it in a Dropdown or hide it behind an icon, and don't decorate the cells with kanji alone.
- Don't set \`data-theme\` on \`<html>\` yourself while an uncontrolled switch drives a different \`target\`.
- Don't change the theme on hover or without a user action.`,
      },
    },
  },
} satisfies Meta<typeof ThemeSwitch>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-6)",
  alignItems: "flex-start",
};

const row: CSSProperties = {
  display: "flex",
  gap: "var(--space-6)",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const island: CSSProperties = {
  ...stack,
  padding: "var(--space-6)",
  border: "var(--stroke-hair) solid var(--rule)",
};

function Island({ theme, children }: { theme?: ThemeName; children: ReactNode }) {
  return (
    <Root {...(theme && { theme })} style={island}>
      {children}
    </Root>
  );
}

function ControlledDemo() {
  const [theme, setTheme] = useState<ThemeName>("washi");
  return (
    <Island theme={theme}>
      <ThemeSwitch value={theme} onChange={setTheme} />
      <Text>Theme: {theme}</Text>
    </Island>
  );
}

/** Controlled: the app's state feeds both the switch and `Root theme`. */
export const Default: Story = { render: () => <ControlledDemo /> };

function UncontrolledDemo() {
  const box = useRef<HTMLDivElement>(null);
  return (
    <Root ref={box} style={island}>
      <ThemeSwitch target={box} defaultValue="sumi" label="Header theme" />
      <Text>Both switches drive this box and follow each other.</Text>
      <ThemeSwitch target={box} label="Footer theme" />
    </Root>
  );
}

export const Uncontrolled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Uncontrolled switches write `data-theme` on their `target` (here a box; `<html>` by default) and stay in sync.",
      },
    },
  },
  render: () => <UncontrolledDemo />,
};

function StorageDemo() {
  const box = useRef<HTMLDivElement>(null);
  return (
    <Root ref={box} style={island}>
      <ThemeSwitch target={box} storageKey="olivine-story-theme" />
      <Text>Pick a theme and reload the story: the choice is kept.</Text>
    </Root>
  );
}

export const Remembered: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`storageKey` saves the choice in `localStorage`. Blocked or full storage is ignored. Use the head script above to avoid the first-paint flash.",
      },
    },
  },
  render: () => <StorageDemo />,
};

export const TwoThemes: Story = {
  name: "Two themes",
  render: () => (
    <Island>
      <ThemeSwitch themes={["washi", "sumi"]} target={null} defaultValue="washi" />
    </Island>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      <ThemeSwitch target={null} defaultValue="washi" size="s" />
      <ThemeSwitch target={null} defaultValue="sumi" size="m" />
      <ThemeSwitch target={null} defaultValue="auto" size="l" />
    </div>
  ),
};

export const FillAndVertical: Story = {
  name: "Fill and vertical",
  render: () => (
    <div style={row}>
      <div style={{ width: "calc(var(--space-32) * 3)" }}>
        <ThemeSwitch target={null} defaultValue="auto" fill />
      </div>
      <ThemeSwitch target={null} defaultValue="sumi" vertical />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => <ThemeSwitch target={null} defaultValue="washi" disabled />,
};

export const Locales: Story = {
  render: () => (
    <div style={stack}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <ThemeSwitch target={null} defaultValue="auto" />
        </Root>
      ))}
    </div>
  ),
};

export const ReducedMotion: Story = {
  name: "Reduced motion",
  parameters: {
    docs: {
      description: {
        story:
          "Inside `.ol-reduce-motion` (or with `prefers-reduced-motion: reduce`) the selected cell inks instantly. The theme itself always changes instantly.",
      },
    },
  },
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <ThemeSwitch target={null} defaultValue="washi" />
    </div>
  ),
};

function ThemeSample({ theme }: { theme: ThemeName }) {
  return (
    <div style={stack}>
      <ThemeSwitch target={null} defaultValue={theme} />
      <ThemeSwitch target={null} defaultValue="auto" size="m" />
      <ThemeSwitch target={null} defaultValue="washi" disabled />
      <ThemeSwitch target={null} defaultValue="sumi" vertical />
    </div>
  );
}

export const Themes: Story = {
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <ThemeSample theme={theme} />
        </Root>
      ))}
    </div>
  ),
};
