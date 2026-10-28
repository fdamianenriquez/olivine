import type { Meta, StoryObj } from "@storybook/react-vite";

import { Root } from "../Root";
import { Button } from "./Button";

const meta = {
  title: "Actions/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Button" },
  parameters: {
    docs: {
      description: {
        component: `Button is a square, ink-lined action that inverts to ink on hover.

- Do use \`accent\` once per view, for the one action that matters.
- Do pair \`arrow\` with actions that go somewhere.
- Don't round corners or add shadows; the hover inversion is the feedback.
- \`square\` sets one glyph from the system set (→ ↗ ← ↑ ↓ ↕ + − × ✓) in a 32 / 44 / 56px box; the glyph is hidden from assistive tech, so the types require \`aria-label\` or \`aria-labelledby\`. Pair it with a Tooltip in the same words.
- Don't put words in a \`square\` button, and don't use one for an overlay's close "×": that is CloseButton.
- With \`aria-pressed\` (toggles), an unpressed button hovers with \`paper-2\` instead of the ink inversion, and a pressed one ignores hover.`,
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = {
  display: "flex",
  gap: "var(--space-4)",
  alignItems: "center",
  flexWrap: "wrap",
} as const;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={row}>
      <Button>Outline</Button>
      <Button variant="solid">Solid</Button>
      <Button variant="accent" brackets arrow>
        Send inquiry
      </Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Delete</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Button size="s">Small</Button>
      <Button>Medium</Button>
      <Button size="l" arrow>
        Large
      </Button>
    </div>
  ),
};

export const BracketsAndArrow: Story = {
  render: () => (
    <div style={row}>
      <Button brackets>Brackets</Button>
      <Button arrow>Arrow</Button>
      <Button arrow="?">Custom glyph</Button>
      <Button variant="accent" brackets arrow>
        Both
      </Button>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div style={row}>
      <Button square size="s" aria-label="Add">
        +
      </Button>
      <Button square aria-label="Move up">
        ↑
      </Button>
      <Button square size="l" variant="solid" aria-label="Next">
        →
      </Button>
      <Button square aria-label="Saving" loading>
        ✓
      </Button>
      <Button icon="+">Add item</Button>
    </div>
  ),
};

export const Pressed: Story = {
  render: () => (
    <div style={row}>
      <Button aria-pressed={false}>Grid</Button>
      <Button aria-pressed>List</Button>
      <Button aria-pressed disabled>
        Map
      </Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={row}>
      <Button loading>Saving</Button>
      <Button disabled>Disabled</Button>
      <Button href="/somewhere" disabled>
        Disabled link
      </Button>
    </div>
  ),
};

export const Block: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Button block arrow>
        Continue
      </Button>
    </div>
  ),
};

export const Link: Story = {
  render: () => (
    <Button href="https://example.com" arrow>
      Visit the site
    </Button>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-4)" }}>
          <div style={row}>
            <Button>Outline</Button>
            <Button variant="solid">Solid</Button>
            <Button variant="accent" brackets arrow>
              Send
            </Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Delete</Button>
            <Button loading>Saving</Button>
            <Button square aria-label="Add">
              +
            </Button>
            <Button aria-pressed>Pressed</Button>
          </div>
        </Root>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale} style={{ padding: "var(--space-4)" }}>
          <Button loading>
            {locale === "ja" ? "保存中" : locale === "es" ? "Guardando" : "Saving"}
          </Button>
          <p>Screen readers announce the loading text of this locale.</p>
        </Root>
      ))}
    </div>
  ),
};
