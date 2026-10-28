import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { Root } from "../components/Root";

function Cell({ note, children }: { note: string; children: ReactNode }) {
  return (
    <figure
      style={{
        display: "grid",
        gap: "var(--space-3)",
        justifyItems: "start",
        margin: 0,
        padding: "var(--space-6)",
        border: "var(--stroke-hair) solid var(--rule)",
        marginTop: "calc(var(--stroke-hair) * -1)",
        marginLeft: "calc(var(--stroke-hair) * -1)",
      }}
    >
      <span style={{ fontSize: "var(--text-h1-size)" }}>{children}</span>
      <figcaption style={{ font: "inherit", color: "var(--ink-2)" }}>
        <code>{note}</code>
      </figcaption>
    </figure>
  );
}

function Seals() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
      <Cell note="ol-stamp">
        <span className="ol-stamp">Workshop</span>
      </Cell>
      <Cell note="--haku --shu --square">
        <span className="ol-stamp ol-stamp--haku ol-stamp--shu ol-stamp--square" lang="ja">
          白樺楽器
        </span>
      </Cell>
      <Cell note="--shu --vertical">
        <span className="ol-stamp ol-stamp--shu ol-stamp--vertical" lang="ja">
          検品
        </span>
      </Cell>
      <Cell note="--olivo --round">
        <span className="ol-stamp ol-stamp--olivo ol-stamp--round" lang="ja">
          済
        </span>
      </Cell>
      <Cell note="--negative --tilt">
        <span className="ol-stamp ol-stamp--negative ol-stamp--tilt">Approved</span>
      </Cell>
      <Cell note="--shu --tilt --press">
        <span className="ol-stamp ol-stamp--shu ol-stamp--tilt ol-stamp--press">Sold</span>
      </Cell>
    </div>
  );
}

const meta = {
  title: "Foundations/Stamp",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "`.ol-stamp` is a Japanese seal (tenkoku) for short titles and marks. It stays real text: selectable and read by screen readers. Root renders the edge filter once.",
          "",
          "- Shubun (default): ink characters in a thick frame. `--negative` (alias `--haku`) is hakubun: a solid block with the characters knocked out.",
          "- Ink: `--shu` (seal vermilion, decorative only) or `--olivo`; default `ink`.",
          "- Shapes: `--square` (four kanji, 2 × 2, read in columns right to left), `--vertical`, `--round`. `--tilt` turns it −4°; `--press` plays the hanko motion once.",
          '- Latin text is set in Big Shoulders 800 uppercase; `lang="ja"` text in Yuji Syuku (load `olivine/fonts-jp.css`).',
          "- Do use one or two per view, for titles of 1–3 words or 1–4 kanji. Don't use a seal for body text, buttons or status; next to a status, keep the status word.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = { render: () => <Seals /> };

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Seals />
        </Root>
      ))}
    </div>
  ),
};
