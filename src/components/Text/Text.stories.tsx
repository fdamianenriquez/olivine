import type { Meta, StoryObj } from "@storybook/react-vite";

import { Text } from "./Text";

const meta = {
  title: "Foundations/Text",
  component: Text,
  tags: ["autodocs"],
  args: { children: "Cocinas, repisas y lámparas de papel." },
  parameters: {
    docs: {
      description: {
        component: `Text renders one of the type styles in tokens.json; \`variant\` maps 1:1 to the style names. Words and numbers use different faces.

- Do keep display styles for real titles; one \`display-xl\` per page.
- Do put numbers in \`figure-*\`, words never.
- Do use one italic word in a heading for emphasis, not a whole line.
- Don't mix display and figure faces on the same line.`,
      },
    },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

const col = { display: "grid", gap: "var(--space-4)" } as const;
const row = { display: "flex", gap: "var(--space-8)", alignItems: "flex-end" } as const;

export const Default: Story = {};

export const Display: Story = {
  render: () => (
    <div style={col}>
      <Text variant="display-xl">Índice</Text>
      <Text variant="display-l">Índice de obras</Text>
      <Text variant="display-m">Índice de obras</Text>
    </div>
  ),
};

export const Headings: Story = {
  render: () => (
    <div style={col}>
      <Text variant="h1">
        Cocina 04, <i>Meguro</i>
      </Text>
      <Text variant="h2">
        Cocina 04, <i>Meguro</i>
      </Text>
      <Text variant="h3">
        Cocina 04, <i>Meguro</i>
      </Text>
    </div>
  ),
};

export const Figures: Story = {
  render: () => (
    <div style={row}>
      <Text variant="figure-xl">07</Text>
      <Text variant="figure-l">¥48,000</Text>
      <Text variant="figure-m">02 / 03</Text>
    </div>
  ),
};

export const Body: Story = {
  render: () => (
    <div style={col}>
      <Text variant="body-l">Cocinas, repisas y lámparas de papel para departamentos chicos.</Text>
      <Text variant="body">Cocinas, repisas y lámparas de papel para departamentos chicos.</Text>
      <Text variant="body-s">Cocinas, repisas y lámparas de papel para departamentos chicos.</Text>
      <Text variant="mono">const ma = 0;</Text>
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div style={col}>
      <Text>Primary ink</Text>
      <Text tone="muted">Muted tone</Text>
      <Text tone="accent">Accent tone</Text>
    </div>
  ),
};

export const Kanji: Story = {
  render: () => (
    <div style={row}>
      <Text variant="kanji" lang="ja">
        静寂の間
      </Text>
      <Text variant="kanji" vertical lang="ja" style={{ height: "var(--space-32)" }}>
        静寂の間
      </Text>
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
          style={{ padding: "var(--space-6)", background: "var(--paper)", color: "var(--ink)" }}
        >
          <Text variant="h2">
            Cocina 04, <i>Meguro</i>
          </Text>
          <Text variant="figure-l">¥48,000</Text>
          <Text tone="muted">Muted tone</Text>
          <Text tone="accent">Accent tone</Text>
          <Text variant="kanji" lang="ja">
            静寂の間
          </Text>
        </div>
      ))}
    </div>
  ),
};
