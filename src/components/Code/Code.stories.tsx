import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";

import { Kbd } from "../Kbd";
import { Code } from "./Code";

const meta = {
  title: "Content/Code",
  component: Code,
  tags: ["autodocs"],
  args: { children: "npm install olivine" },
  parameters: {
    docs: {
      description: {
        component:
          '`Code` is an inline fragment of code in running text: `<code class="ol-code">` in Xanh Mono (`mono` style) on a `paper-2` box with a hairline `rule` border, `ink` text, no radius and no bold edge (that look is Kbd\'s). It wraps with the sentence (`box-decoration-break: clone`) and breaks long identifiers (`overflow-wrap: anywhere`). It is always left to right and `translate="no"`. Size is fixed at the 13px `mono` token, so it is smaller than the text around it. For several lines, use `CodeBlock`.\n\n**Props** — `children`, `inverse` (boolean, default `false`; for ink grounds, same as Kbd), plus native `code` attributes and `ref`. Hosts may set `--code-fill`, `--code-ink`, `--code-line`.\n\n- Do keep `Code` for fragments of a line and `CodeBlock` for anything of two lines or more, or anything the reader will copy.\n- Don\'t set `Code` as a button or link.\n- Don\'t use `Code` for keys (use `Kbd`) or for IDs and values in running data (use `Text variant="mono"`).\n- Don\'t put amounts or prices in `Code`; amounts use the figure face.',
      },
    },
  },
} satisfies Meta<typeof Code>;

export default meta;

type Story = StoryObj<typeof meta>;

const column: CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
  maxInlineSize: "calc(var(--space-32) * 4)",
};
const inkGround: CSSProperties = {
  padding: "var(--space-3) var(--space-4)",
  background: "var(--ink)",
  color: "var(--on-ink)",
};

export const Default: Story = {};

export const InRunningText: Story = {
  render: () => (
    <div style={column}>
      <p>
        Pass <Code>onChange</Code> to listen for edits, or call <Code>useControllable</Code> when
        you build your own control. Install the package with <Code>pnpm add olivine</Code> and
        import <Code>olivine/styles.css</Code> once.
      </p>
      <p
        style={{
          font: "var(--text-body-l-size)/var(--text-body-l-leading) var(--text-body-l-family)",
        }}
      >
        In larger text the box stays at <Code>13px</Code>, so it reads as a quiet aside.
      </p>
    </div>
  ),
};

export const WrapsWithTheSentence: Story = {
  render: () => (
    <p style={{ ...column, maxInlineSize: "calc(var(--space-32) * 2)" }}>
      Wrapped inline code keeps its box on both lines, so a command such as{" "}
      <Code>pnpm dlx olivine add button --path src/components</Code> is still one fragment.
    </p>
  ),
};

export const LongIdentifier: Story = {
  render: () => (
    <p style={{ ...column, maxInlineSize: "calc(var(--space-32) * 2)" }}>
      A very long name breaks anywhere instead of overflowing:{" "}
      <Code>OlivineLabelsOverridesForTheTimePickerAndDatePickerPopovers</Code>.
    </p>
  ),
};

export const Inverse: Story = {
  render: () => (
    <div style={{ ...column, ...inkGround }}>
      <p>
        Run <Code inverse>pnpm storybook</Code> and open the Content group.
      </p>
      <p>
        With <Kbd keys="mod+k" inverse /> and <Code inverse>--code-line</Code> set by the host.
      </p>
    </div>
  ),
};

export const Hosted: Story = {
  name: "Host custom properties",
  render: () => (
    <p
      style={
        {
          ...column,
          "--code-fill": "var(--paper-3)",
          "--code-line": "var(--ink-2)",
        } as CSSProperties
      }
    >
      A host recolours the box with <Code>--code-fill</Code> and <Code>--code-line</Code>.
    </p>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={column}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)", color: "var(--ink)" }}
        >
          <p>
            Set <Code>direction: ltr</Code> and read <Code>--space-4</Code> on <Code>paper</Code>.
          </p>
          <div
            style={{
              marginBlockStart: "var(--space-3)",
              padding: "var(--space-3)",
              background: "var(--paper-2)",
            }}
          >
            <p>
              On <Code>paper-2</Code> the fill and the ground are the same, so the hairline does the
              work.
            </p>
          </div>
        </div>
      ))}
    </div>
  ),
};

/** A Japanese sentence with a Latin identifier; the fragment is never translated or mirrored. */
export const Japanese: Story = {
  render: () => (
    <p lang="ja" style={column}>
      <Code>Root</Code> の <Code>locale=&quot;ja&quot;</Code>{" "}
      を指定すると、組み込みの文言が日本語に切り替わります。
    </p>
  ),
};

export const Spanish: Story = {
  render: () => (
    <p lang="es" style={column}>
      Importa <Code>olivine/styles.css</Code> una sola vez y envuelve la aplicación en{" "}
      <Code>{'<Root locale="es">'}</Code>.
    </p>
  ),
};
