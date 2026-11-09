import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";

import { Avatar } from "../Avatar";
import { Carousel } from "../Carousel";
import { Root } from "../Root";
import { InlineQuote, Quote } from "./Quote";

const meta = {
  title: "Content/Quote",
  component: Quote,
  tags: ["autodocs"],
  args: {
    children:
      "Every board in this store already belongs to someone. They just have not ordered yet.",
  },
  parameters: {
    docs: {
      description: {
        component: `Quote sets words from another voice with their attribution. Without attribution it is a bare \`<blockquote>\`; with \`author\`, \`detail\` or \`source\` it is a \`<figure>\` holding the \`<blockquote>\` and a \`<figcaption>\`, so the attribution is never inside the quoted text. \`block\` (default) is a quote inside running content, with a hairline edge; \`pull\` is a display statement in Big Shoulders with quotation marks. The quotation marks, the dash and the dots are drawn by CSS, so they are not read and not copied; their form follows \`lang\` (“ ” in English and Spanish, 「 」 in Japanese). \`InlineQuote\` wraps a short quotation inside a sentence in \`<q>\`.

**Props (Quote)** — \`children\`, \`variant\` (\`block\` | \`pull\`), \`size\` (\`m\` | \`l\`, \`pull\` only), \`author\`, \`detail\`, \`source\` (the title of a work, in \`<cite>\`), \`attribution\`, \`avatar\`, \`cite\` (URL), \`lang\`, \`marks\`, \`framed\`, \`repeated\`, plus native attributes and \`ref\`. **InlineQuote** — \`children\`, \`cite\`, \`lang\`, native \`q\` attributes.

- Do keep \`block\` for one to three sentences inside an article and \`pull\` for one strong sentence of about 140 characters or fewer, with room around it.
- Do give the attribution through \`author\` / \`detail\` / \`source\`; \`source\` is for the title of a work, never a person's name.
- Do set \`lang\` on a quote in another language than the page.
- Do set \`repeated\` when a pull quote copies a passage that is also in the body text.
- Do put a \`pull\` quote alone, left-aligned, with the attribution below.
- Don't write the quotation marks in the text when \`marks\` is on, and don't put the attribution inside the quoted text.
- Don't use \`pull\` for a page headline or a slogan (use \`Text display-*\`), for dialogue, or below 40px.
- Don't colour the quote with \`olivo\`, \`maple\` or \`shu\`, and don't add a big decorative quote glyph.
- Don't set \`repeated\` on a quote that has a link, a button or a form control inside.
- Don't use Quote as a callout for notes or warnings (use \`Alert\`).`,
      },
    },
  },
} satisfies Meta<typeof Quote>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A story stand-in for a photo (a birch wood in fog), drawn inline so the stories need no network. */
const birches =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" fill="#d9d6cc"/>
      <rect y="110" width="160" height="50" fill="#b9a77a"/>
      <g fill="#f4f1ea" stroke="#3a372f" stroke-width="1">
        <rect x="18" y="0" width="9" height="160"/><rect x="58" y="0" width="6" height="160"/>
        <rect x="96" y="0" width="11" height="160"/><rect x="134" y="0" width="5" height="160"/>
      </g>
    </svg>`,
  );

const stack: CSSProperties = { display: "grid", gap: "var(--space-16)" };
const ma: CSSProperties = { padding: "var(--space-16) 0" };
const ground: CSSProperties = {
  padding: "var(--space-16) var(--space-8)",
  backgroundImage: `url("${birches}")`,
  backgroundSize: "cover",
};

export const Default: Story = {};

export const WithAttribution: Story = {
  args: { author: "Head of timber", detail: "North store", source: "Timber journal" },
};

export const WithMarks: Story = {
  args: { marks: true, author: "Head of timber", detail: "North store" },
};

export const MultiParagraph: Story = {
  args: {
    marks: true,
    author: "Head of timber",
    children: [
      <p key="1">Every board in this store already belongs to someone.</p>,
      <p key="2">They just have not ordered yet, and that is the part we plan for.</p>,
    ],
  },
};

export const BareMultiParagraph: Story = {
  args: {
    marks: true,
    children: [
      <p key="1">Every board in this store already belongs to someone.</p>,
      <p key="2">They just have not ordered yet, and that is the part we plan for.</p>,
    ],
  },
};

export const LatinInJapaneseRoot: Story = {
  args: { variant: "pull", author: "Head of timber", children: "Every board belongs to someone." },
  render: (args) => (
    <Root locale="ja">
      <div style={ma}>
        <Quote {...args} />
      </div>
    </Root>
  ),
};

export const Pull: Story = {
  args: { variant: "pull", author: "Head of timber", detail: "North store" },
  render: (args) => (
    <div style={ma}>
      <Quote {...args} />
    </div>
  ),
};

export const PullLarge: Story = {
  args: {
    variant: "pull",
    size: "l",
    author: "Head of timber",
    detail: "North store",
    children: "Every board in this store already belongs to someone.",
  },
  render: (args) => (
    <div style={ma}>
      <Quote {...args} />
    </div>
  ),
};

export const PullFramed: Story = {
  args: { variant: "pull", framed: true, author: "Head of timber", detail: "North store" },
  render: (args) => (
    <div style={ground}>
      <Quote {...args} style={{ maxInlineSize: "calc(var(--space-32) * 4)" }} />
    </div>
  ),
};

export const WithAvatar: Story = {
  args: {
    variant: "pull",
    author: "Ana García",
    detail: "Head of timber",
    avatar: <Avatar name="Ana García" size="s" />,
  },
  render: (args) => (
    <div style={ma}>
      <Quote {...args} />
    </div>
  ),
};

export const LinkedSource: Story = {
  args: {
    author: "Head of timber",
    source: <a href="https://example.com/journal">Timber journal</a>,
    cite: "https://example.com/journal",
  },
};

export const InCarousel: Story = {
  render: () => (
    <Carousel
      slides={[
        <Quote
          key="1"
          variant="pull"
          author="Marta Ruiz"
          detail="Cocina en Valencia"
          lang="es"
          style={{ padding: "var(--space-12)" }}
        >
          La mesa llegó con las vetas a la vista y sin una sola astilla.
        </Quote>,
        <Quote
          key="2"
          variant="pull"
          author="Jorge Pons"
          detail="Estudio en Madrid"
          lang="es"
          style={{ padding: "var(--space-12)" }}
        >
          Cada tabla viene con el nombre de quien la cortó.
        </Quote>,
      ]}
    />
  ),
};

export const Japanese: Story = {
  args: {
    variant: "pull",
    lang: "ja",
    author: "木工職人",
    detail: "北店",
    children: "この店の板は、どれも誰かのためにある。",
  },
  render: (args) => (
    <div style={stack}>
      <Quote {...args} />
      <Quote {...args} variant="block" marks />
    </div>
  ),
};

export const Spanish: Story = {
  args: {
    variant: "pull",
    lang: "es",
    author: "Marta Ruiz",
    detail: "Cocina en Valencia",
    children: "Electrodomésticos incomparablemente bien instalados, anticonstitucionalmente.",
  },
  render: (args) => (
    <div style={{ ...ma, maxInlineSize: "calc(var(--space-32) * 2)" }}>
      <Quote {...args} />
    </div>
  ),
};

export const Narrow: Story = {
  args: {
    variant: "pull",
    framed: true,
    lang: "es",
    author: "Marta Ruiz",
    children: "Electrodomésticos incomparablemente bien instalados.",
  },
  render: (args) => (
    <div style={{ inlineSize: "320px" }}>
      <Quote {...args} />
    </div>
  ),
};

export const NarrowLongAuthor: Story = {
  args: {
    variant: "pull",
    framed: true,
    author:
      "Wolfeschlegelsteinhausenbergerdorffvoralternwarengewissenhaftschaferswessenschafewarenwohlgepflege",
    detail: "North store",
    children: "Every board belongs to someone.",
  },
  render: (args) => (
    <div style={{ inlineSize: "320px" }}>
      <Quote {...args} />
    </div>
  ),
};

export const Repeated: Story = {
  args: { variant: "pull", repeated: true, author: "Head of timber" },
};

export const Inline: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <p>
        She asked for a table that is{" "}
        <InlineQuote cite="https://example.com">quiet in a loud room</InlineQuote> and got one.
      </p>
      <p>
        He said{" "}
        <InlineQuote>
          she called it <InlineQuote>the quiet table</InlineQuote> from day one
        </InlineQuote>
        .
      </p>
      <p lang="ja">
        職人は<InlineQuote lang="ja">木は生きている</InlineQuote>と言った。
      </p>
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
            gap: "var(--space-12)",
            padding: "var(--space-8)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        >
          <Quote marks author="Head of timber" detail="North store" source="Timber journal">
            Every board in this store already belongs to someone.
          </Quote>
          <Quote variant="pull" author="Head of timber" detail="North store">
            Every board in this store already belongs to someone.
          </Quote>
          <Quote variant="pull" framed author="Head of timber" detail="North store">
            Every board here already belongs to someone.
          </Quote>
          <Quote variant="pull" lang="ja" author="木工職人">
            この店の板は、どれも誰かのためにある。
          </Quote>
          <p>
            She said <InlineQuote>make it quiet</InlineQuote> twice.
          </p>
        </div>
      ))}
    </div>
  ),
};
