import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";

import { Fab } from "../Fab";
import { BottomNav, type BottomNavItem, type BottomNavProps } from "./BottomNav";

const five: BottomNavItem[] = [
  { key: "workshop", label: "Workshop", mark: "工" },
  { key: "orders", label: "Orders", mark: "注", badge: 3 },
  { key: "stock", label: "Stock", mark: "庫" },
  { key: "makers", label: "Makers", mark: "匠" },
  { key: "notes", label: "Notes", mark: "§" },
];

const three: BottomNavItem[] = [
  { key: "home", label: "Home", mark: "家" },
  { key: "orders", label: "Orders", mark: "注", badge: 12 },
  { key: "account", label: "Account", mark: "私" },
];

const japanese: BottomNavItem[] = [
  { key: "home", label: "ホーム", mark: "家" },
  { key: "orders", label: "注文", mark: "注", badge: 3 },
  { key: "stock", label: "在庫", mark: "庫" },
  { key: "makers", label: "職人", mark: "匠" },
  { key: "account", label: "私", mark: "私" },
];

const spanish: BottomNavItem[] = [
  { key: "taller", label: "Taller", mark: "工" },
  { key: "pedidos", label: "Pedidos", mark: "注", badge: 3 },
  { key: "existencias", label: "Existencias", mark: "庫" },
  { key: "artesanos", label: "Artesanos largos", mark: "匠" },
  { key: "notas", label: "Notas", mark: "§" },
];

const models = [
  ["Norikura", "¥280,000"],
  ["Utsukushi", "¥340,000"],
  ["Kaichi", "¥410,000"],
  ["Custom shop", "¥525,000"],
] as const;

const frame = (width: number): CSSProperties => ({
  position: "relative",
  width,
  height: 560,
  overflow: "hidden",
  border: "var(--stroke-hair) solid var(--rule)",
  background: "var(--paper)",
});

const scroller: CSSProperties = {
  height: "100%",
  overflowY: "auto",
  paddingInline: "var(--space-4)",
  paddingBlockStart: "var(--space-4)",
  boxSizing: "border-box",
};

/** A small product page, so the bar is seen over real content. */
function Page({ rows = 1 }: { rows?: number }) {
  const list = Array.from({ length: rows }, () => models).flat();
  return (
    <>
      <p className="ol-label" style={{ margin: 0 }}>
        Models
      </p>
      <h1
        style={{
          margin: "var(--space-2) 0 var(--space-6)",
          fontFamily: "var(--text-display-m-family)",
          fontSize: "var(--text-display-m-size)",
          fontWeight: "var(--text-display-m-weight)",
          lineHeight: "var(--text-display-m-leading)",
        }}
      >
        Three shapes, all our own.
      </h1>
      {list.map(([name, price], i) => (
        <div
          key={`${name}-${String(i)}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "var(--space-4) 0",
            borderTop: "var(--stroke-hair) solid var(--line-soft)",
          }}
        >
          <span>{name}</span>
          <span
            style={{
              fontFamily: "var(--text-figure-s-family)",
              fontSize: "var(--text-figure-s-size)",
            }}
          >
            {price}
          </span>
        </div>
      ))}
    </>
  );
}

interface PhoneProps {
  /** Frame width in px: 320 and 390 are the widths the design is checked at. */
  width?: number;
  theme?: "washi" | "sumi";
  rows?: number;
  children: (scroll: React.RefObject<HTMLDivElement | null>) => ReactNode;
}

/**
 * A phone-sized frame. The `.ol` wrapper receives `--ol-dock` from a contained bar, so a
 * contained Fab inside lifts above it.
 */
function Phone({ width = 390, theme, rows = 3, children }: PhoneProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div className="ol" data-theme={theme} style={frame(width)}>
      <div
        ref={ref}
        className="ol-has-bottomnav"
        style={scroller}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (Safari)
        tabIndex={0}
        role="region"
        aria-label="Page"
      >
        <Page rows={rows} />
      </div>
      {children(ref)}
    </div>
  );
}

/** A stateful bar: selecting a destination moves the olivo edge. */
function Bar(props: Partial<BottomNavProps>) {
  const [active, setActive] = useState(props.active ?? "orders");
  return <BottomNav items={five} active={active} onSelect={setActive} contained {...props} />;
}

const meta = {
  title: "Navigation/BottomNav",
  component: BottomNav,
  tags: ["autodocs"],
  args: { items: five, active: "orders", label: "Main", contained: true },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'BottomNav is the primary navigation of a tool on compact screens (below 720px, `bp-md`): a bar fixed to the bottom edge with 3 to 5 destinations, each a mark with its word under it. The word is always visible. It does not switch itself: render it or the NavigationRail (`useMediaQuery`), never both.\n\n**Props** — `items` (`[{key, label, mark, href, badge}]`, the same shape as NavigationRail), `active`, `onSelect(key, event)`, `label`, `hideOnScroll`, `scrollTarget`, `contained`, `scrollHint`; other props go to the `nav`, `ref` points to it.\n\n- The current destination is `paper-2` with a 3px olivo edge along the top of its cell and `aria-current="page"`. It is never bold and never a pill.\n- Cells share hairlines. Hover (pointer devices only) and press invert a cell to ink.\n- `mark` is a kanji or a typographic glyph, hidden from assistive tech: the label is always the name. Labels wrap to two lines, then end in an ellipsis.\n- A `badge` is a maple count read after the label ("Orders, 3"). Counts only: no dot-only badge.\n- Items with an `href` are links; call `event.preventDefault()` in `onSelect` to route on the client.\n- Tab moves through the destinations; Enter activates a link, Enter or Space a button. There is no arrow roving: it is a list of links, not tabs.\n- The bar adds the safe-area insets as padding. The page needs `viewport-fit=cover` for them to be non-zero.\n- Give the scroll container `ol-has-bottomnav` so the last content and a focused control are never covered.\n- `hideOnScroll` (off by default) slides the bar away while scrolling down past its own height. It returns on scroll up, at the top, or when focus enters it, and its items stay in the tab order. It never hides under reduced motion.\n- `scrollHint` (off by default) shows a small ↓ tab on the top edge of the bar, centred, while there is more content below the viewport (or the `scrollTarget`). It fades out at the end of the content or when everything fits, and is decorative: nothing is announced. Use it when a page scrolls and nothing else says so.\n- The bar publishes its rendered height as `--ol-dock` (`0px` while hidden) so a Fab rides above it and slides with it.\n- Not portalled. A `transform` or `filter` on an ancestor becomes the containing block of the fixed bar: put it outside, or use `contained`.\n- Hidden in print.\n\n- Do keep to 3–5 destinations of equal importance, with one-word labels, in the same order as the NavigationRail.\n- Don\'t add a "More" tab, actions (use Fab or Toolbar), in-page tabs (use Tabs), or a disabled destination.\n- Don\'t show a bottom Toast: it would cover the bar. Use the top.',
      },
    },
  },
} satisfies Meta<typeof BottomNav>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Five destinations with a count: the approved frame. */
export const FiveItems: Story = {
  render: (args) => <Phone>{() => <Bar {...args} />}</Phone>,
};

export const ThreeItems: Story = {
  args: { items: three, active: "home" },
  render: (args) => <Phone>{() => <Bar {...args} />}</Phone>,
};

/** Kanji labels with kanji marks, for a Japanese interface. */
export const JapaneseMarks: Story = {
  args: { items: japanese, label: "メイン" },
  render: (args) => (
    <div lang="ja">
      <Phone>{() => <Bar {...args} />}</Phone>
    </div>
  ),
};

/** Items with an `href` are links; here `onSelect` keeps the page in place. */
export const Links: Story = {
  args: { items: five.map((item) => ({ ...item, href: `#${item.key}` })) },
  render: (args) => (
    <Phone>
      {() => (
        <Bar
          {...args}
          onSelect={(_key, event) => {
            event.preventDefault();
          }}
        />
      )}
    </Phone>
  ),
};

/** The narrowest width: five cells of 64px; Spanish words wrap to two lines, then clip. */
export const Narrow: Story = {
  args: { items: spanish, label: "Principal" },
  render: (args) => (
    <div lang="es">
      <Phone width={320}>{() => <Bar {...args} />}</Phone>
    </div>
  ),
};

/** Long content in a contained frame: the ↓ tab on the bar's edge says there is more below. */
export const ScrollHint: Story = {
  render: (args) => (
    <Phone rows={6}>{(scroll) => <Bar {...args} scrollHint scrollTarget={scroll} />}</Phone>
  ),
};

/** The same page without the hint, for contrast: nothing says it scrolls. */
export const WithoutScrollHint: Story = {
  render: (args) => <Phone rows={6}>{(scroll) => <Bar {...args} scrollTarget={scroll} />}</Phone>,
};

/** At 320px the hint, a count on the middle destination and an extended Fab all fit. */
export const ScrollHintNarrow: Story = {
  args: { items: five.map((item) => (item.key === "stock" ? { ...item, badge: 7 } : item)) },
  render: (args) => (
    <Phone width={320} rows={6}>
      {(scroll) => (
        <>
          <Bar {...args} scrollHint scrollTarget={scroll} />
          <Fab label="Start a build" contained />
        </>
      )}
    </Phone>
  ),
};

export const ScrollHintSumi: Story = {
  render: (args) => (
    <Phone theme="sumi" rows={6}>
      {(scroll) => <Bar {...args} scrollHint scrollTarget={scroll} />}
    </Phone>
  ),
};

const counts: BottomNavItem[] = [
  { key: "workshop", label: "Workshop", mark: "工", badge: 1 },
  { key: "orders", label: "Orders", mark: "注", badge: 12 },
  { key: "stock", label: "Stock", mark: "庫", badge: "99+" },
  { key: "makers", label: "Makers", mark: "匠", badge: 999 },
  { key: "notes", label: "Notes", mark: "§", badge: 5 },
];

/** Counts of one, two and three digits at 320px: the badge straddles the top edge and the marks stay visible. */
export const LargeCounts: Story = {
  args: { items: counts },
  render: (args) => <Phone width={320}>{() => <Bar {...args} />}</Phone>,
};

function WithFabDemo(args: BottomNavProps) {
  const [active, setActive] = useState("orders");
  return (
    <Phone>
      {() => (
        <>
          <BottomNav {...args} active={active} onSelect={setActive} />
          <Fab label="Start a build" contained />
        </>
      )}
    </Phone>
  );
}

/** The Fab rides above the bar: the bar publishes its height as `--ol-dock`. */
export const WithFab: Story = {
  render: (args) => <WithFabDemo {...args} />,
};

function HideOnScrollDemo(args: BottomNavProps) {
  const [active, setActive] = useState("orders");
  return (
    <Phone rows={6}>
      {(scroll) => (
        <>
          <BottomNav
            {...args}
            active={active}
            onSelect={setActive}
            hideOnScroll
            scrollTarget={scroll}
          />
          <Fab label="Start a build" contained collapseOnScroll scrollTarget={scroll} />
        </>
      )}
    </Phone>
  );
}

/** Scroll the page: down hides the bar (the Fab slides with it), up or Tab brings it back. */
export const HideOnScroll: Story = {
  render: (args) => <HideOnScrollDemo {...args} />,
};

/** With reduced motion the bar never hides, even with `hideOnScroll`. */
export const ReducedMotion: Story = {
  render: (args) => (
    <div className="ol-reduce-motion">
      <Phone rows={6}>{(scroll) => <Bar {...args} hideOnScroll scrollTarget={scroll} />}</Phone>
    </div>
  ),
};

export const Sumi: Story = {
  render: (args) => (
    <Phone theme="sumi">
      {() => (
        <>
          <Bar {...args} />
          <Fab label="Start a build" contained />
        </>
      )}
    </Phone>
  ),
};

/** Both themes side by side: the frames the owner approves. */
export const Themes: Story = {
  parameters: { flush: true, layout: "fullscreen" },
  render: (args) => (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-6)",
        padding: "var(--space-6)",
        background: "var(--paper-3)",
      }}
    >
      {(["washi", "sumi"] as const).map((theme) => (
        <Phone key={theme} theme={theme}>
          {() => <Bar {...args} label={`${theme} main`} />}
        </Phone>
      ))}
    </div>
  ),
};
