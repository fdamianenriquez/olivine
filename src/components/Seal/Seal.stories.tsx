import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Button } from "../Button";
import { Root } from "../Root";
import { Seal, type SealInk, type SealVariant } from "./Seal";

const row: CSSProperties = {
  display: "flex",
  gap: "var(--space-8)",
  flexWrap: "wrap",
  alignItems: "center",
};
const stack: CSSProperties = { display: "grid", gap: "var(--space-6)", alignContent: "start" };
const caption: CSSProperties = {
  color: "var(--ink-2)",
  fontFamily: "var(--text-label-family)",
  fontSize: "var(--text-label-size)",
};
/** A seal is as large as the text around it: this wrapper sets that size with a token. */
const mono: CSSProperties = { fontFamily: "var(--font-mono)" };
const big: CSSProperties = { fontSize: "var(--text-h1-size)" };
const table: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, auto)",
  gap: "var(--space-6) var(--space-8)",
  alignItems: "center",
  justifyContent: "start",
};

function Big({ children }: { children: ReactNode }) {
  return <span style={big}>{children}</span>;
}

const meta = {
  title: "Content/Seal",
  component: Seal,
  tags: ["autodocs"],
  args: { children: "Workshop" },
  argTypes: {
    variant: { control: "inline-radio", options: ["shubun", "hakubun"] },
    ink: { control: "inline-radio", options: ["ink", "shu", "olivo"] },
    shape: { control: "inline-radio", options: ["default", "vertical", "square", "round"] },
    press: { control: "inline-radio", options: [false, true, "view"] },
  },
  parameters: {
    docs: {
      description: {
        component: [
          "A tenkoku seal for a short title or mark: the `.ol-stamp` class as a component. It stays real text (selectable, read by screen readers); for kanji it is an image with a text alternative. The look is the shipped class and the edge filter that `Root` renders once, so a seal outside a `Root` has no rough edges. See also **Foundations/Stamp**, which documents the bare class.",
          "",
          '**Props** — `children` (the text, a string: 1–3 Latin words or 1–4 kanji), `variant` (`shubun` | `hakubun`), `ink` (`ink` | `shu` | `olivo`), `shape` (`default` | `vertical` | `square` | `round`), `tilt`, `press` (`false` | `true` | `"view"`), `label`, `decorative`, `lang`, plus span attributes and `ref`.',
          "",
          "**Size** is the font size of the parent (or a `font-size` token on `className`); keep it at 16px or more so the frame and the pores stay readable. Kanji needs the Japanese font (`olivine/fonts-jp.css`).",
          "",
          '**Accessible name** — Latin text is read as it is. Kanji and kana need `label`, which makes the seal an image named by it (the characters are not announced); without it a development warning appears. `decorative` hides the seal and wins over `label`: use it only when the same information is next to the seal as real text. **`lang`** is `"ja"` for kanji and kana; Latin text under a `ja` Root gets `"en"` so it keeps the Latin face. Hangul is tagged `"ko"` and is not supported (a development warning), and so is a string that mixes Latin with kanji or kana.',
          "",
          '**Known limitation** — `label` takes the language of the seal text. On a non-Japanese page, an English label on a `lang="ja"` seal may be read with a Japanese voice by assistive technology that honours `lang` on `aria-label`. The pattern: give the meaning in `label` (`<Seal label="Inspected" lang="ja">検品</Seal>`), or mark the seal `decorative` and put the same words beside it as real text in the page language.',
          "",
          '**Motion** — `press` plays the hanko once: `true` when the seal first appears, `"view"` when it first scrolls into view. Mount the seal when the event happens (sold, approved) for a hanko on demand. With reduced motion the seal shows its end state at once. In forced colours the filter and the masks are removed and the seal stays a framed text; check it manually in a forced-colours browser (for example Windows High Contrast).',
          "",
          "A seal is not interactive: not focusable, not clickable. To act, wrap it in a `Button` or `Link` with its own name.",
          "",
          "- Do use one or two seals per view, for titles of 1–3 words or 1–4 kanji.",
          "- Do give kanji seals a `label` with the meaning, and keep the status word next to a seal that stamps a state.",
          "- Do use `square` only with three or four kanji and `round` with one or two.",
          "- Don't make a seal a button, a tab, a badge or a status; don't use `shu` for error or warning.",
          "- Don't mix scripts or use lowercase; don't use `press` on a list of seals.",
          "- Don't put a small `olivo` seal on `paper-2` (4.2:1). `shu` shubun on `paper-2` is 4.48:1: use it there only at 24px or larger, or keep seals below 24px on `paper`.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof Seal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Big>
      <Seal {...args} />
    </Big>
  ),
};

const VARIANTS: readonly SealVariant[] = ["shubun", "hakubun"];
const INKS: readonly SealInk[] = ["ink", "shu", "olivo"];

export const Variants: Story = {
  render: () => (
    <div style={table}>
      <span />
      {INKS.map((ink) => (
        <span key={ink} style={caption}>
          {ink}
        </span>
      ))}
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "contents" }}>
          <span style={caption}>{variant}</span>
          {INKS.map((ink) => (
            <Big key={ink}>
              <Seal variant={variant} ink={ink}>
                Approved
              </Seal>
            </Big>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: () => (
    <div style={row}>
      <Big>
        <Seal>Workshop</Seal>
      </Big>
      <Big>
        <Seal shape="vertical" label="Inspected" ink="shu">
          検品
        </Seal>
      </Big>
      <Big>
        <Seal shape="square" label="Shirakaba Gakki, birch instruments" variant="hakubun" ink="shu">
          白樺楽器
        </Seal>
      </Big>
      <Big>
        <Seal shape="round" label="Done" ink="olivo">
          済
        </Seal>
      </Big>
    </div>
  ),
};

export const Tilt: Story = {
  render: () => (
    <div style={row}>
      <Big>
        <Seal tilt ink="shu">
          Sold
        </Seal>
      </Big>
      <Big>
        <Seal tilt variant="hakubun">
          Approved
        </Seal>
      </Big>
      <Big>
        <Seal tilt shape="round" label="Done" ink="olivo">
          済
        </Seal>
      </Big>
    </div>
  ),
};

function PressDemo() {
  const [stamped, setStamped] = useState(false);
  const [onDemand, setOnDemand] = useState(false);
  return (
    <div style={stack}>
      <div style={stack}>
        <span style={caption}>
          press — plays when the seal first appears. Mount it when the event happens.
        </span>
        <div style={row}>
          <Button
            onClick={() => {
              setStamped((v) => !v);
            }}
          >
            {stamped ? "Remove the seal" : "Sell the guitar"}
          </Button>
          <span role="status" style={big}>
            {stamped ? "Sold " : ""}
            {stamped && (
              <Seal press tilt ink="shu" decorative>
                Sold
              </Seal>
            )}
          </span>
        </div>
      </div>
      <div style={stack}>
        <span style={caption}>
          press toggled false → true on a mounted seal — plays it on demand.
        </span>
        <div style={row}>
          <Button
            onClick={() => {
              setOnDemand((v) => !v);
            }}
          >
            {onDemand ? "Lift the seal" : "Stamp it"}
          </Button>
          <Big>
            <Seal press={onDemand} variant="hakubun" tilt>
              Approved
            </Seal>
          </Big>
        </div>
      </div>
    </div>
  );
}

export const Press: Story = { render: () => <PressDemo /> };

export const PressInView: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={stack}>
      <span style={caption}>
        press=&quot;view&quot; — scroll the box: the seal is held until it is in view.
      </span>
      <div
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (Safari)
        tabIndex={0}
        role="region"
        aria-label="Scrollable page"
        style={{
          blockSize: "calc(var(--space-24) * 4)",
          overflowY: "auto",
          border: "var(--stroke-hair) solid var(--rule)",
          padding: "var(--space-6)",
        }}
      >
        <p style={{ margin: 0, blockSize: "calc(var(--space-24) * 6)" }}>
          Scroll down to the seal.
        </p>
        <Big>
          <Seal press="view" ink="shu" tilt>
            Approved
          </Seal>
        </Big>
        <p style={{ margin: 0, blockSize: "calc(var(--space-24) * 2)" }} />
      </div>
    </div>
  ),
};

export const AccessibleName: Story = {
  render: () => (
    <div style={{ ...table, gridTemplateColumns: "repeat(3, auto)" }}>
      <span style={caption}>Latin text: read as text</span>
      <Big>
        <Seal>Workshop</Seal>
      </Big>
      <code style={mono}>{"<Seal>Workshop</Seal>"}</code>
      <span style={caption}>Kanji with a label: an image named by the label</span>
      <Big>
        <Seal label="Inspected" shape="vertical">
          検品
        </Seal>
      </Big>
      <code style={mono}>{'<Seal label="Inspected">検品</Seal>'}</code>
      <span style={caption}>Decorative: the same words are beside it as text</span>
      <span style={{ display: "inline-flex", gap: "var(--space-3)", alignItems: "center" }}>
        <span>Inspected</span>
        <Big>
          <Seal decorative shape="round" ink="shu">
            済
          </Seal>
        </Big>
      </span>
      <code style={mono}>{"<Seal decorative>済</Seal>"}</code>
    </div>
  ),
};

export const JapaneseRoot: Story = {
  render: () => (
    <Root locale="ja" style={{ ...row, background: "transparent" }}>
      <Big>
        <Seal>Sold</Seal>
      </Big>
      <Big>
        <Seal label="Inspected" shape="vertical" ink="shu">
          検品
        </Seal>
      </Big>
      <span style={caption}>
        Under a ja Root, Latin text keeps the Latin face (lang en); kanji gets Yuji Syuku.
      </span>
    </Root>
  ),
};

export const Languages: Story = {
  render: () => (
    <div style={row}>
      <Big>
        <Seal ink="shu">Sold</Seal>
      </Big>
      <Big>
        <Seal ink="shu" lang="es">
          Vendido
        </Seal>
      </Big>
      <Big>
        <Seal ink="shu" shape="square" label="Sold, contract signed">
          売約済
        </Seal>
      </Big>
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div style={row}>
      <Big>
        <Seal press ink="shu" tilt>
          Sold
        </Seal>
      </Big>
      <div className={REDUCE_MOTION_CLASS}>
        <Big>
          <Seal press ink="shu" tilt>
            Sold
          </Seal>
        </Big>
      </div>
      <span style={caption}>
        Press motion, then the same seal with reduced motion (the end state at once).
      </span>
    </div>
  ),
};
