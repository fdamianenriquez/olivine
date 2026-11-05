import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, Fragment, type ReactNode, useRef, useState } from "react";

import { LocaleContext, locales } from "../../locale";
import { Button } from "../Button";
import { Text } from "../Text";
import { TableOfContents, type TableOfContentsItem } from "./TableOfContents";
import { useHeadings } from "./useHeadings";

interface Section {
  id: string;
  title: string;
  level: 2 | 3 | 4;
  /** Paragraphs of text under the heading: the longer, the more the page scrolls. */
  length: number;
}

const sections: Section[] = [
  { id: "overview", title: "Overview", level: 2, length: 3 },
  { id: "install", title: "Installation", level: 2, length: 1 },
  { id: "npm", title: "With npm", level: 3, length: 2 },
  { id: "pnpm", title: "With pnpm", level: 3, length: 2 },
  { id: "usage", title: "Usage", level: 2, length: 2 },
  { id: "basic", title: "A basic example", level: 3, length: 3 },
  { id: "options", title: "Options", level: 3, length: 1 },
  { id: "defaults", title: "Defaults and overrides", level: 4, length: 2 },
  { id: "api", title: "API reference", level: 2, length: 3 },
  { id: "credits", title: "Credits", level: 2, length: 1 },
];

const items: TableOfContentsItem[] = sections.map(({ id, title, level }) => ({
  id,
  label: title,
  level,
}));

const prose =
  "A kitchen is a room of verbs: cut, wash, wait. Plan the work triangle first, then let the light decide where the table goes. Oak, steel and washi keep the room quiet; a single warm lamp is enough.";

/** A long article. Headings carry `.ol-anchor`, so a click and the spy stop below sticky chrome. */
function Article({ marked = true }: { marked?: boolean }) {
  return (
    <article style={{ minWidth: 0 }}>
      <Text variant="h1" as="h1">
        The kitchen guide
      </Text>
      {sections.map(({ id, title, level, length }) => (
        <Fragment key={id}>
          <Text
            as={`h${String(level)}` as "h2"}
            variant={level === 2 ? "h2" : "h3"}
            id={marked ? id : undefined}
            className="ol-anchor"
            style={{ marginBlockStart: "var(--space-12)" }}
          >
            {title}
          </Text>
          {Array.from({ length }, (_, i) => (
            <Text key={i} style={{ marginBlockStart: "var(--space-4)" }}>
              {prose}
            </Text>
          ))}
        </Fragment>
      ))}
      <div style={{ blockSize: "var(--space-32)" }} aria-hidden="true" />
    </article>
  );
}

const columns: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) calc(var(--space-32) * 2)",
  alignItems: "start",
  gap: "var(--space-12)",
  padding: "var(--space-8)",
  maxInlineSize: "calc(var(--space-32) * 7)",
  marginInline: "auto",
};

const meta = {
  title: "Navigation/TableOfContents",
  component: TableOfContents,
  tags: ["autodocs"],
  args: { items },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'TableOfContents is the "On this page" index of a long document: links to its headings, nested by level, with a scroll-spy that marks the section being read. A hairline rail runs down the inline start side and a 3px olivo stroke travels along it like a brush: the edge that leads reaches the next entry first, the other follows, and the stroke lets go of the last. It is a `nav` of `#fragment` links; the current link carries `aria-current="location"`, not `page`. Use Nav (`vertical`) for a fixed list that does not follow scrolling, Tabs to switch panels, Sidebar for site navigation, TreeView for expandable hierarchies.\n\n' +
          "**Props** — `items` (`{ id, label, level?, href? }`, flat, in document order; nesting comes from `level` relative to the smallest one), `maxDepth` (1 to 3, default 2), `active` / `defaultActive` / `onActiveChange`, `spy`, `scrollRoot`, `offset`, `onSelect(id, event)`, `sticky` (at `--ol-toc-top`, which falls back to `--ol-anchor-offset`), `title`, `label`. The `useHeadings` hook builds `items` from a rendered page.\n\n" +
          "**Behaviour** — The current entry is the last heading whose top is at or above the reading line. The line sits at `offset` px from the top of the scroll area; by default that is the first heading's `scroll-margin-block-start`, so the `.ol-anchor` class (with `--ol-anchor-offset`) positions the click and the spy alike. At the end of the page the last heading that is in view wins, so a short last section stays reachable. A click makes its entry current at once and holds it until the reader scrolls. The hash changes only when a link is followed; scrolling never writes it. On load, and on Back and Forward, the hash picks the entry. Smooth scrolling is the page's choice: opt in with `html { scroll-behavior: smooth }` inside `@media (prefers-reduced-motion: no-preference)`.\n\n" +
          "**States** — Links are `ink-2`, ink on hover (with a hover-capable pointer). The current link and the ones that hold it are ink; only the current one has the stroke and `aria-current`. Before the stroke is measured (server HTML, first paint) the current link draws its own olivo edge. Reduced motion: the stroke jumps.\n\n" +
          "- Do give every heading an `id` and the `.ol-anchor` class; build `items` at build time when you can.\n- Do keep it to the document's h2 and h3, and give each `nav` on the page its own name.\n- Don't use it for site navigation or for switching panels.\n- Don't announce the current entry in a live region, write the hash while scrolling, nest past three levels or truncate headings.",
      },
    },
  },
} satisfies Meta<typeof TableOfContents>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A documentation page: the article beside a sticky index with a visible title. */
export const Default: Story = {
  render: (args) => (
    <div style={columns}>
      <Article />
      <aside style={{ alignSelf: "stretch" }}>
        <TableOfContents {...args} sticky title />
      </aside>
    </div>
  ),
};

/** A header that sticks to the top: `--ol-anchor-offset` leaves room for it, for the headings and the sticky index alike. */
export const StickyHeader: Story = {
  render: (args) => (
    <div
      style={
        {
          "--ol-anchor-offset": "calc(var(--control-xl) + var(--space-4))",
        } as CSSProperties
      }
    >
      <header
        style={{
          position: "sticky",
          insetBlockStart: 0,
          zIndex: "var(--z-raised)",
          display: "flex",
          alignItems: "center",
          blockSize: "var(--control-xl)",
          paddingInline: "var(--space-8)",
          background: "var(--paper)",
          borderBlockEnd: "var(--stroke-hair) solid var(--rule)",
        }}
      >
        <span className="ol-label">Olivine docs</span>
      </header>
      <div style={columns}>
        <Article />
        <aside style={{ alignSelf: "stretch" }}>
          <TableOfContents {...args} sticky title />
        </aside>
      </div>
    </div>
  ),
};

/** A document inside a scrolling panel: `scrollRoot` points the spy at it. */
export const ScrollRoot: Story = {
  render: (args) => {
    const panel = useRef<HTMLDivElement | null>(null);
    return (
      <div style={{ ...columns, alignItems: "stretch" }}>
        <div
          ref={panel}
          role="region"
          aria-label="Article"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be reachable by keyboard
          tabIndex={0}
          style={{
            blockSize: "calc(var(--space-32) * 4)",
            overflowY: "auto",
            paddingInlineEnd: "var(--space-4)",
            border: "var(--stroke-hair) solid var(--rule)",
            padding: "var(--space-4)",
          }}
        >
          <Article />
        </div>
        <aside>
          <TableOfContents {...args} scrollRoot={panel} offset={0} title />
        </aside>
      </div>
    );
  },
};

/** One, two or three levels. Deeper entries are dropped; their sections belong to the entry above. */
export const Depth: Story = {
  render: (args) => (
    <div style={{ ...columns, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
      {([1, 2, 3] as const).map((depth) => (
        <TableOfContents
          key={depth}
          {...args}
          spy={false}
          maxDepth={depth}
          active={depth === 3 ? "defaults" : "basic"}
          label={`maxDepth ${String(depth)}`}
          title={`maxDepth ${String(depth)}`}
        />
      ))}
    </div>
  ),
};

/** The app owns the current entry: `active` with `spy={false}`. */
export const Controlled: Story = {
  render: (args) => {
    const [active, setActive] = useState<string | null>("install");
    const at = items.findIndex((item) => item.id === active);
    return (
      <div style={{ ...columns, gridTemplateColumns: "calc(var(--space-32) * 2) auto" }}>
        <TableOfContents
          {...args}
          spy={false}
          active={active}
          onActiveChange={setActive}
          onSelect={(_, event) => {
            event.preventDefault();
          }}
          title
        />
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button
            variant="outline"
            disabled={at <= 0}
            onClick={() => {
              setActive(items[at - 1]?.id ?? null);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={at === items.length - 1}
            onClick={() => {
              setActive(items[at + 1]?.id ?? null);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    );
  },
};

function Rendered({ children }: { children: ReactNode }) {
  const list = useHeadings({ levels: [2, 3] });
  return (
    <div style={columns}>
      {children}
      <aside style={{ alignSelf: "stretch" }}>
        <TableOfContents items={list} sticky title />
      </aside>
    </div>
  );
}

/** `useHeadings` reads the headings of the rendered page. Prefer building `items` at build time. */
export const FromHeadings: Story = {
  render: () => (
    <Rendered>
      <Article />
    </Rendered>
  ),
};

/** The landmark name and the title come from the locale; headings are the page's own words. */
export const Languages: Story = {
  render: () => (
    <div style={{ ...columns, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      <LocaleContext.Provider value={locales.es}>
        <TableOfContents
          title
          spy={false}
          active="uso"
          items={[
            { id: "resumen", label: "Resumen", level: 2 },
            { id: "instalacion", label: "Instalación", level: 2 },
            { id: "uso", label: "Uso", level: 2 },
            { id: "ejemplo", label: "Un ejemplo básico", level: 3 },
          ]}
        />
      </LocaleContext.Provider>
      <LocaleContext.Provider value={locales.ja}>
        <TableOfContents
          title
          spy={false}
          active="shiyou"
          items={[
            { id: "gaiyou", label: "概要", level: 2 },
            { id: "install", label: "インストール", level: 2 },
            { id: "shiyou", label: "使い方", level: 2 },
            { id: "rei", label: "基本の例", level: 3 },
          ]}
        />
      </LocaleContext.Provider>
    </div>
  ),
};

/** Right to left: the rail, the stroke and the indent sit on the right. */
export const RightToLeft: Story = {
  render: () => (
    <div
      dir="rtl"
      lang="ar"
      style={{ ...columns, gridTemplateColumns: "calc(var(--space-32) * 2)" }}
    >
      <TableOfContents
        title="في هذه الصفحة"
        spy={false}
        active="install"
        items={[
          { id: "overview", label: "نظرة عامة", level: 2 },
          { id: "install", label: "التثبيت", level: 2 },
          { id: "npm", label: "باستخدام npm", level: 3 },
          { id: "usage", label: "الاستخدام", level: 2 },
        ]}
      />
    </div>
  ),
};

/** Both themes, with a nested entry current. */
export const Themes: Story = {
  parameters: { flush: true },
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-8)", background: "var(--paper)" }}
        >
          <TableOfContents {...args} spy={false} active="pnpm" title={`On this page (${theme})`} />
        </div>
      ))}
    </div>
  ),
};
