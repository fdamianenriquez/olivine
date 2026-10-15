import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label";
import { Ratio } from "./Ratio";

const meta = {
  title: "Foundations/Ratio",
  component: Ratio,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `Ratio holds media or embeds at a fixed aspect ratio; its child fills and covers.

**Props** — \`ratio\` (\`"16/9"\`, \`"4/3"\`, \`"1/1"\`, any \`a/b\`).

- Do use it for media and embeds only; the child is cropped (\`overflow: hidden\`, \`object-fit: cover\`).
- Do pick a ratio close to the media's own, and use \`object-position\` for focal points.
- Do give every iframe, video or object a \`title\` or \`aria-label\`; Ratio adds no name.
- Do keep essential information in \`alt\` or in the surrounding HTML.
- Don't put text, captions or controls inside; they get cropped.`,
      },
    },
  },
} satisfies Meta<typeof Ratio>;

export default meta;

type Story = StoryObj<typeof meta>;

const block = {
  background: "var(--paper-2)",
  border: "var(--stroke-hair) solid var(--rule)",
  display: "grid",
  placeItems: "center",
} as const;

function Block({ children }: { children: string }) {
  return (
    <div style={block}>
      <Label>{children}</Label>
    </div>
  );
}

export const Default: Story = {
  args: { ratio: "16/9" },
  render: (args) => (
    <div style={{ width: "60%" }}>
      <Ratio {...args}>
        <Block>{args.ratio ?? "16/9"}</Block>
      </Ratio>
    </div>
  ),
};

export const Ratios: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
      {["1/1", "4/3", "16/9"].map((r) => (
        <Ratio key={r} ratio={r}>
          <Block>{r}</Block>
        </Ratio>
      ))}
    </div>
  ),
};

export const WithHalftone: Story = {
  render: () => (
    <div style={{ width: "60%" }}>
      <Ratio ratio="4/3">
        <div className="ol-halftone" aria-hidden="true" />
      </Ratio>
    </div>
  ),
};

export const Embed: Story = {
  render: () => (
    <div style={{ width: "60%" }}>
      <Ratio ratio="16/9">
        <iframe title="Product video" src="about:blank" style={{ border: 0 }} />
      </Ratio>
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
          <Ratio ratio="4/3">
            <Block>{theme}</Block>
          </Ratio>
        </div>
      ))}
    </div>
  ),
};
