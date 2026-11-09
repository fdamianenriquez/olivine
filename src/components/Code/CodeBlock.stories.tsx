import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode } from "react";
import { expect, within } from "storybook/test";

import { Card } from "../Card";
import { Root } from "../Root";
import { CodeBlock } from "./CodeBlock";

const meta = {
  title: "Content/CodeBlock",
  component: CodeBlock,
  tags: ["autodocs"],
  args: {
    code: 'import { Button } from "olivine";\n\nexport function Save() {\n  return <Button variant="accent">Save</Button>;\n}',
  },
  parameters: {
    docs: {
      description: {
        component:
          "`CodeBlock` is several lines of code in a framed block: a hairline `rule` frame on `paper-2`, an optional bar (file title in mono, language in `label-s`, copy button) above a scrollable `pre`. The code is shown unhighlighted; consumers can plug in their own highlighter through `renderLine` or `children`. The block is monochrome on purpose: status colours need a word or glyph, `maple` is a fill and `olivo` is the single accent, so Olivine defines no syntax-token palette. The code, the file title and the language are always left to right and `translate=\"no\"`; the bar follows the page direction.\n\n**Props**\n- `code` (string, required): the plain source. It is what the copy button copies, what line numbers split on, and the default content.\n- `children`: pre-rendered, pre-highlighted content that replaces the lines. `code` is still required for copying. `lineNumbers` is ignored with `children` (dev warning).\n- `renderLine` (`(line, index) => ReactNode`): per-line slot to colour tokens while keeping line numbers, wrapping and copy. Return the original `line` for lines you do not touch.\n- `language`: adds `language-<x>` on the `code` and `data-language`, and shows the value in the bar. Not a locale string.\n- `title`: a file name or caption, rendered as `figcaption` in the bar and used in the copy button's name.\n- `label`: accessible name of the scrollable region; default `title`, then the locale word \"Code\".\n- `lineNumbers` (default `false`) and `startLine` (default `1`): digits in a hairline-divided gutter; `aria-hidden`, not selectable, not copied.\n- `wrap` (default `false`): `pre-wrap` with `overflow-wrap: anywhere` instead of horizontal scrolling.\n- `copyable` (default `true`), `copiedFor` (ms, default `2000`), `onCopy(code, ok)`.\n- Native `figure` attributes and `ref` (the `figure`).\n\n**Behaviour** — the copy button is always visible, never hover-revealed, keeps focus and reports through a polite live region. If the clipboard is unavailable or refuses, the code is selected and the failure is announced. When the block overflows, the `pre` becomes a keyboard-focusable named region so arrow keys scroll it; a block that fits adds no tab stop. All words come from the locale.\n\n- Do keep `Code` for fragments of a line and `CodeBlock` for anything of two lines or more, or anything the reader will copy.\n- Do pass the exact source in `code`, including indentation; the copy button copies that string, not the rendered text.\n- Do give a `title` when several blocks sit on one page, so each Copy button has a distinct name.\n- Do keep `wrap` off for indentation-sensitive languages and leave horizontal scroll to the reader.\n- Do highlight, if you must, in the consumer's code through `renderLine` using Olivine tokens (`ink`, `ink-2`); keep every token pair at 4.5:1 on `paper-2` in both themes. `olivo` text is 4.2:1 on `paper-2` in washi, so use it for underlines and markers, not for text.\n- Don't add a syntax-colour palette from status colours, `maple` or `shu`; a colour without a word or glyph is not allowed to carry meaning.\n- Don't put the copy button in a hover-only overlay on top of the code.\n- Don't use a `CodeBlock` for IDs or values in running data (use `Text variant=\"mono\"`), or `Code` for keys (use `Kbd`).\n- Don't remove the scroller's focus ring or its `tabindex`.",
      },
    },
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

const column: CSSProperties = {
  display: "grid",
  gap: "var(--space-6)",
  maxInlineSize: "calc(var(--space-32) * 5)",
};
const narrow: CSSProperties = { maxInlineSize: "calc(var(--space-32) * 2 + var(--space-16))" };

const TSX = `import { Button, Root } from "olivine";

export function App() {
  return (
    <Root theme="washi">
      <Button variant="accent">Save</Button>
    </Root>
  );
}
`;

const PYTHON = `def total(prices):
    result = 0
    for price in prices:
        if price > 0:
            result += price

    return result
`;

const LONG_LINE =
  'const url = "https://example.com/api/v2/boards?species=oak&finish=oiled&thickness=18&width=140&length=2400&grade=select&sort=price-asc&page=1";';

export const Default: Story = {};

export const Titled: Story = {
  args: { code: TSX, title: "app.tsx" },
};

export const WithLanguage: Story = {
  args: { code: TSX, title: "app.tsx", language: "tsx" },
};

export const LanguageOnly: Story = {
  args: { code: "pnpm add olivine\npnpm dlx olivine init", language: "sh" },
};

export const NoBar: Story = {
  args: { code: "pnpm add olivine\npnpm dlx olivine init", copyable: false },
};

export const LineNumbers: Story = {
  args: { code: TSX, title: "app.tsx", language: "tsx", lineNumbers: true },
};

export const StartLine: Story = {
  args: { code: PYTHON, title: "totals.py", language: "python", lineNumbers: true, startLine: 98 },
};

export const Wrap: Story = {
  args: { code: LONG_LINE, title: "wrap", language: "ts", wrap: true, lineNumbers: true },
  render: (args) => (
    <div style={{ ...column, ...narrow }}>
      <CodeBlock {...args} />
      <CodeBlock {...args} title="no wrap" wrap={false} />
    </div>
  ),
};

/**
 * Narrow column, long lines: the block scrolls sideways and the scroller becomes a focusable,
 * named region. Tab to it and use the arrow keys; the 2px olivo ring shows around the code.
 */
export const Overflow: Story = {
  args: { code: LONG_LINE + "\n" + TSX, title: "scroll.ts", language: "ts", lineNumbers: true },
  render: (args) => (
    <div style={narrow}>
      <CodeBlock {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = await canvas.findByRole("region", { name: "scroll.ts" });
    await expect(region).toHaveAttribute("tabindex", "0");
  },
};

export const LongSingleLine: Story = {
  args: { code: LONG_LINE, title: "url.ts", language: "ts" },
  render: (args) => (
    <div style={narrow}>
      <CodeBlock {...args} />
    </div>
  ),
};

/** A long path wraps in the bar instead of being cut off. */
export const LongTitle: Story = {
  args: {
    code: "pnpm add olivine",
    title: "packages/olivine/src/components/timepicker/TimePicker.stories.tsx",
    language: "tsx",
  },
  render: (args) => (
    <div style={{ maxInlineSize: "calc(var(--space-32) * 2 + var(--space-8))" }}>
      <CodeBlock {...args} />
    </div>
  ),
};

export const FitsNoTabStop: Story = {
  name: "Fits: no tab stop",
  args: { code: "pnpm add olivine", language: "sh" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button");
    await expect(canvas.queryByRole("region")).toBeNull();
  },
};

export const EmptyLines: Story = {
  args: {
    code: "first\n\n\nafter two empty lines\n    indented\n\n",
    lineNumbers: true,
    title: "empty.txt",
  },
};

export const IndentationKept: Story = {
  args: { code: PYTHON, title: "totals.py", language: "python" },
};

/**
 * Xanh Mono has no box-drawing glyphs, so ASCII-art tables do not line up. Japanese text and
 * symbols such as → ✓ ≤ ≠ also fall back to other faces, so columns drift. Keep tables out of code
 * blocks, or use plain `|` and `-` characters.
 */
export const UnicodeCoverage: Story = {
  args: {
    title: "unicode.txt",
    lineNumbers: true,
    code: "// 木板を在庫から探す\nconst ma = 0; // 間\n┌──────┬──────┐\n│ oak  │ ash  │\n└──────┴──────┘\n→ ✓ × ≤ ≥ ≠ …",
  },
};

export const InCard: Story = {
  render: (args) => (
    <div style={{ ...column, ...narrow }}>
      <Card title="Install" text="Add the package, then import the stylesheet once.">
        <CodeBlock {...args} code="pnpm add olivine" language="sh" title="terminal" />
      </Card>
    </div>
  ),
};

export const OnPaperTwo: Story = {
  render: (args) => (
    <div style={{ ...column, padding: "var(--space-6)", background: "var(--paper-2)" }}>
      <CodeBlock {...args} title="app.tsx" />
    </div>
  ),
};

export const SeveralBlocks: Story = {
  render: () => (
    <div style={column}>
      <CodeBlock code="pnpm add olivine" title="Install" language="sh" />
      <CodeBlock code={'import "olivine/styles.css";'} title="Styles" language="ts" />
    </div>
  ),
};

/* A tiny tokenizer for the highlighting demo: ink, ink-2 and an olivo underline marker. */
const KEYWORDS = new Set(["import", "from", "export", "function", "return", "const", "if"]);

function highlight(line: string): ReactNode {
  const parts = line.split(/(\/\/.*$|"[^"]*"|\b\w+\b)/);
  return parts.map((part, index) => {
    if (part.startsWith("//")) {
      return (
        <span key={index} style={{ color: "var(--ink-2)" }}>
          {part}
        </span>
      );
    }
    if (KEYWORDS.has(part)) {
      return (
        <span
          key={index}
          style={{
            textDecoration: "underline",
            textDecorationColor: "var(--olivo)",
            textDecorationThickness: "var(--stroke-bold)",
            textUnderlineOffset: "var(--space-1)",
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Highlighting is the consumer's job. `renderLine` keeps line numbers, wrapping and copy; the
 * palette is `ink`, `ink-2` and an olivo underline (olivo text is only 4.2:1 on `paper-2` in washi).
 */
export const RenderLine: Story = {
  args: {
    code: 'import { Button } from "olivine"; // the one accent\n\nexport function Save() {\n  return <Button>Save</Button>;\n}',
    title: "save.tsx",
    language: "tsx",
    lineNumbers: true,
    renderLine: highlight,
  },
};

export const PreRenderedChildren: Story = {
  args: {
    code: "const a = 1;\nconst b = 2;",
    title: "children.ts",
    language: "ts",
    children: (
      <>
        <span className="tok" style={{ color: "var(--ink-2)" }}>
          {"// pre-rendered by a highlighter\n"}
        </span>
        {"const a = 1;\nconst b = 2;"}
      </>
    ),
  },
};

/** The clipboard rejects: the code is selected and the button shows "Copy failed". */
export const CopyFails: Story = {
  args: { code: TSX, title: "app.tsx", language: "tsx" },
  render: (args) => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException("blocked", "NotAllowedError")) },
    });
    return <CodeBlock {...args} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button").click();
    await expect(await canvas.findByText("Copy failed")).toBeInTheDocument();
  },
};

export const Themes: Story = {
  render: (args) => (
    <div style={column}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <CodeBlock {...args} code={TSX} title="app.tsx" language="tsx" lineNumbers />
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: (args) => (
    <div style={column}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <CodeBlock {...args} code="pnpm add olivine" language="sh" />
          <div style={narrow}>
            <CodeBlock {...args} code={LONG_LINE} title={`url-${locale}.ts`} />
          </div>
        </Root>
      ))}
    </div>
  ),
};
