import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Link } from "../Link";
import { Navbar } from "../Navbar";
import { Root } from "../Root";
import { Banner } from "./Banner";

const meta = {
  title: "Feedback/Banner",
  component: Banner,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `Banner is a page-wide message in a ruled strip under the Navbar: a status word, the message, up to two actions and an optional dismiss. It sits in the page flow (never over content), stays until the reader acts or dismisses it, and never takes focus. Use \`Alert\` for a message tied to a section, \`Toast\` for brief feedback, \`AlertDialog\` when an answer is required.

- Do place it before the page content, directly under the Navbar (or above it for a site-wide notice), and render it in the first paint when it is known at load.
- Do keep the message to one or two lines of plain words and one primary action; put the detail behind a "Learn more" link. More than two actions log a development warning.
- Do pass \`live="polite"\` only for a banner mounted after load that is worth hearing, and \`live="assertive"\` only for something urgent. A live region present at load is not announced, so mount it (or flip \`open\`) when the condition arises. By default it is a labelled region and stays silent; the tone never chooses the role.
- Do give each banner on a page its own \`label\` or \`title\` when there is more than one.
- Don't use a banner for field errors or a result tied to one place (\`Alert\`), or for brief feedback (\`Toast\`).
- Don't show more than one banner at a time: merge related messages or show the one with the highest priority; two stacked banners share one hairline and are the limit.
- Do use \`sticky\` only for a message the reader needs while they work (connection lost, session ending, maintenance running), and keep it to one or two lines and one action.
- Don't use \`sticky\` for a policy notice or a long message, and don't wrap a Banner in your own \`position: fixed\`: it would cover focused content and eat the viewport. The built-in sticky switches itself off on small screens and sets the scroll-padding for you.
- Don't use colour alone for meaning: the tag word carries the status. \`shu\` is not used.
- Don't omit \`onClose\` on a banner that is not important to keep (demo, policy notice); do omit it for a problem the reader must fix before going on.
- Don't set \`appear\` for a banner that is known at load: render it in the first paint with no motion; use \`appear\` for one that mounts after the page is interactive (read from storage, shown after an event).

**Sticky.** \`sticky\` keeps the strip at the top of the page while scrolling. It is sticky only when the viewport is at least 720 by 480 CSS px, so phones and zoomed pages scroll it away. It stacks under or over a sticky Navbar by itself and publishes the height of the stuck chrome as \`--ol-sticky-offset\` on the root, which sets the page's \`scroll-padding\` so focus and in-page links stop below it. For a scroll container that is not the page, add \`.ol-has-sticky\` to it. Page-level banners only. On a long page, give a dismissible sticky banner a \`returnFocus\` near the reader's place: by default focus moves to the next focusable element after the banner, which may scroll the page far up. Server-rendered, the first stuck frame uses \`top: 0\` until hydration measures the stack.

**Motion.** The strip unrolls (kakejiku) when \`open\` turns true after the first render (keep \`<Banner open={condition}>\` mounted and flip \`open\`), or when it first mounts on the client with \`appear\` (\`{condition && <Banner appear />}\`). A banner in the server-rendered page never unrolls, with or without \`appear\`; without it, one mounted later simply appears. It rolls back up on close, then unmounts. Only \`clip-path\` animates, so the content below moves in one step. Reduced motion makes both instant; \`animated={false}\` turns the motion off for everyone, \`appear\` included.

**Promo.** \`variant="promo"\` is an announcement, not a state: a full \`maple\` strip under the Navbar, all content in \`on-maple\`, the localised tag (New, Novedad, 新着) in place of the status word, up to two actions (\`Button size="s"\` outline, then ghost) and a dismiss. It ignores \`tone\` and \`live\`, is never sticky (a development warning if you set \`sticky\`; the Navbar stays sticky), and is a labelled \`<section>\` named by its tag, not a live region. Show at most one per page. On maple the focus ring would be 1.95:1, so focus is an inset \`on-maple\` band. At 30rem of its own width or less the message wraps and the actions move below. Unroll and roll-up are the kakejiku above; the roll-up takes \`--dur-m\`.

**Focus.** Dismissing moves focus to the next focusable element after the banner (or \`returnFocus\`), so it is never dropped.`,
      },
    },
  },
  args: {
    tone: "info",
    title: "Studio closed 1–3 Nov",
    children: "Orders placed now ship on the 4th.",
  },
} satisfies Meta<typeof Banner>;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const stack = { display: "grid", gap: "var(--space-6)" } as const;
const page = { padding: "var(--space-6)", margin: 0 } as const;

const twoActions = (
  <>
    <Button size="s">Update now</Button>
    <Button size="s" variant="ghost">
      Later
    </Button>
  </>
);

export const Default: Story = {};

export const Tones: Story = {
  render: () => (
    <div>
      <Banner tone="neutral" title="Demo shop" onClose={noop}>
        Nothing you order here will be charged or shipped.
      </Banner>
      <Banner tone="info" title="Studio closed 1–3 Nov" onClose={noop}>
        Orders placed now ship on the 4th.
      </Banner>
      <Banner tone="success" title="Back online">
        Your changes have synced.
      </Banner>
      <Banner tone="warning" title="Maintenance on Sunday" onClose={noop}>
        The shop is read-only from 02:00 to 04:00.
      </Banner>
      <Banner tone="danger" title="Connection lost">
        Changes are saved on this device until the connection returns.
      </Banner>
    </div>
  ),
};

export const WithActions: Story = {
  args: {
    tone: "info",
    title: "A new version is ready",
    children: "Reload to get the new order form.",
    actions: twoActions,
    onClose: noop,
  },
};

export const WithLink: Story = {
  args: {
    tone: "neutral",
    tag: "Policy",
    title: "Cookies",
    children: (
      <>
        We only keep what the cart needs. <Link href="#privacy">Learn more</Link>
      </>
    ),
    onClose: noop,
  },
};

export const NarrowAndWide: Story = {
  name: "Narrow (320px) and wide",
  render: () => (
    <div style={{ ...stack, padding: "var(--space-6)" }}>
      {["320px", "100%"].map((width) => (
        <div key={width} style={{ width, outline: "var(--stroke-hair) dashed var(--rule)" }}>
          <Banner
            tone="warning"
            title="Maintenance on Sunday"
            actions={twoActions}
            onClose={noop}
            label={`Notice ${width}`}
          >
            The shop is read-only from 02:00 to 04:00 while the catalogue moves to the new
            warehouse.
          </Banner>
        </div>
      ))}
    </div>
  ),
};

export const Dismissible: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Banner
          tone="neutral"
          title="Demo shop"
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        >
          Nothing you order here will be charged or shipped.
        </Banner>
        <div style={page}>
          <Button
            size="s"
            onClick={() => {
              setOpen(true);
            }}
          >
            Show banner again
          </Button>
        </div>
      </div>
    );
  },
};

export const AppearsAfterLoad: Story = {
  name: "Appears after load (polite)",
  render: function Render() {
    const [online, setOnline] = useState(true);
    return (
      <div>
        <Banner
          tone="danger"
          title="Connection lost"
          live="polite"
          open={!online}
          onClose={() => {
            setOnline(true);
          }}
        >
          Changes are saved on this device until the connection returns.
        </Banner>
        <div style={page}>
          <Button
            size="s"
            onClick={() => {
              setOnline(!online);
            }}
          >
            {online ? "Go offline" : "Go online"}
          </Button>
        </div>
      </div>
    );
  },
};

export const UnderStickyNavbar: Story = {
  name: "Under a sticky Navbar",
  render: () => (
    <div style={{ height: "24rem", overflow: "auto" }}>
      <Navbar
        brand="Shirakaba"
        sticky
        links={[
          { label: "Shop", href: "#shop", active: true },
          { label: "Journal", href: "#journal" },
        ]}
      />
      <Banner tone="neutral" title="Demo shop" onClose={noop}>
        Nothing you order here will be charged or shipped.
      </Banner>
      <main style={page}>
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i}>
            The banner scrolls away with the page; only the Navbar stays. Birch stools, oak benches
            and cedar crates are made to order in the workshop.
          </p>
        ))}
      </main>
    </div>
  ),
};

const longPage = (
  <>
    {Array.from({ length: 4 }, (_, section) => (
      <section key={section} aria-labelledby={`sticky-s${String(section + 1)}`}>
        <h2 id={`sticky-s${String(section + 1)}`}>Section {section + 1}</h2>
        {Array.from({ length: 5 }, (_, i) => (
          <p key={i}>
            Birch stools, oak benches and cedar crates are made to order in the workshop. Scroll:
            the strip and the Navbar stay at the top, one under the other, and focus never lands
            beneath them.
          </p>
        ))}
        <p>
          <Button size="s" variant="outline">
            Save draft {section + 1}
          </Button>
        </p>
      </section>
    ))}
  </>
);

const renderSticky = () => (
  <div>
    <Navbar
      brand="Shirakaba"
      sticky
      links={[
        { label: "Shop", href: "#shop", active: true },
        { label: "Journal", href: "#journal" },
      ]}
    />
    <Banner sticky tone="danger" title="Connection lost" actions={<Button size="s">Retry</Button>}>
      Changes are saved on this device until the connection returns.
    </Banner>
    <main style={page}>
      <p>
        <Link href="#sticky-s3">Jump to section 3</Link>
      </p>
      {longPage}
    </main>
  </div>
);

/**
 * The page itself scrolls. Both stick and stack; the root gets `--ol-sticky-offset`, so the jump
 * link and Tab (try Shift+Tab back up from a lower button) stop below the strip. Narrower than
 * 720px or shorter than 480px, the banner scrolls away and only the Navbar stays.
 */
export const Sticky: Story = {
  name: "Sticky under a sticky Navbar",
  render: renderSticky,
};

/**
 * Under 720 by 480 CSS px (here a phone) the banner is static and scrolls away with the page;
 * only the Navbar stays, and the scroll-padding counts the Navbar alone.
 */
export const StickyOnPhone: Story = {
  name: "Sticky on a phone (static)",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: renderSticky,
};

/** A site-wide notice above the Navbar: the banner sticks at 0 and the Navbar stacks below it. */
export const StickyAboveNavbar: Story = {
  name: "Sticky above a sticky Navbar",
  render: () => (
    <div>
      <Banner sticky tone="warning" title="Maintenance running" onClose={noop}>
        The shop is read-only until 04:00.
      </Banner>
      <Navbar
        brand="Shirakaba"
        sticky
        links={[
          { label: "Shop", href: "#shop", active: true },
          { label: "Journal", href: "#journal" },
        ]}
      />
      <main style={page}>
        <p>
          <Link href="#sticky-s3">Jump to section 3</Link>
        </p>
        {longPage}
      </main>
    </div>
  ),
};

/**
 * The first banner is known at load: it is in the first paint, without \`appear\`, and does not
 * unroll. The button mounts a second one with \`appear\`, which unrolls on that first client mount;
 * "Close banner" (or the dismiss) sets \`open\` to false, so it rolls back up and unmounts in
 * \`onExited\`.
 */
export const Appear: Story = {
  render: function Render() {
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    return (
      <div>
        <Banner tone="neutral" title="Demo shop">
          Known at load: in the first paint, no motion.
        </Banner>
        {mounted ? (
          <Banner
            appear
            open={open}
            tone="info"
            title="New this week"
            live="polite"
            onClose={() => {
              setOpen(false);
            }}
            onExited={() => {
              setMounted(false);
            }}
          >
            Mounted after an event with appear: it unrolls once.
          </Banner>
        ) : null}
        <div style={page}>
          <Button
            size="s"
            onClick={() => {
              // While it rolls up the press does nothing; the button stays enabled so it keeps focus.
              if (mounted && !open) return;
              if (mounted) {
                setOpen(false);
              } else {
                setMounted(true);
                setOpen(true);
              }
            }}
          >
            {mounted ? "Close banner" : "Mount banner"}
          </Button>
        </div>
      </div>
    );
  },
};

export const Stacked: Story = {
  render: () => (
    <div>
      <Banner tone="warning" title="Maintenance on Sunday" label="Maintenance">
        The shop is read-only from 02:00 to 04:00.
      </Banner>
      <Banner tone="neutral" title="Demo shop" onClose={noop}>
        Nothing you order here will be charged or shipped.
      </Banner>
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div>
      <Root locale="en">
        <Banner tone="warning" title="Maintenance" onClose={noop}>
          The shop is read-only on Sunday from 02:00 to 04:00.
        </Banner>
      </Root>
      <Root locale="es">
        <Banner tone="warning" title="Mantenimiento" onClose={noop}>
          La tienda será de solo lectura el domingo de 02:00 a 04:00.
        </Banner>
      </Root>
      <Root locale="ja">
        <Banner tone="warning" title="メンテナンス" onClose={noop}>
          日曜日の2時から4時まで、ショップは閲覧のみになります。詳しくは example.com/maintenance
          をご覧ください。
        </Banner>
      </Root>
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          style={{ padding: "var(--space-6) 0", background: "var(--paper)", color: "var(--ink)" }}
        >
          {(["neutral", "info", "success", "warning", "danger"] as const).map((tone) => (
            <Banner
              key={tone}
              tone={tone}
              title={`Banner ${tone} (${theme})`}
              actions={<Button size="s">Action</Button>}
              onClose={noop}
            >
              Body text in ink on the sunken strip.
            </Banner>
          ))}
        </div>
      ))}
    </div>
  ),
};

/** The `ol-reduce-motion` class stands in for the system setting: open and close are instant. */
export const ReducedMotion: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <div className="ol-reduce-motion">
        <Banner
          tone="info"
          title="Reduced motion"
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        >
          Appears and disappears without the unroll.
        </Banner>
        <div style={page}>
          <Button
            size="s"
            onClick={() => {
              setOpen(!open);
            }}
          >
            Toggle
          </Button>
        </div>
      </div>
    );
  },
};

/**
 * In Windows High Contrast the strip is Canvas with a CanvasText bottom line, and the tag
 * loses its fill and becomes a bordered word. Turn on forced colours in the browser's
 * rendering tools to check it.
 */
export const ForcedColors: Story = {
  render: () => (
    <div>
      <Banner tone="danger" title="Connection lost" onClose={noop}>
        Changes are saved on this device. <Link href="#help">Learn more</Link>
      </Banner>
      <Banner tone="neutral" tag="Demo" title="Demo shop" onClose={noop}>
        Nothing you order here will be charged or shipped.
      </Banner>
    </div>
  ),
};

const promoActions = (
  <>
    <Button size="s">Reserve one</Button>
    <Button size="s" variant="ghost">
      See the build
    </Button>
  </>
);

const promoText = "The Kaichi chambered slab is back: twelve built this spring in Matsumoto.";

const hero = (
  <div
    style={{
      padding: "var(--space-16) var(--space-6)",
      borderBottom: "var(--stroke-hair) solid var(--rule)",
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-display-l-size)",
      lineHeight: "var(--text-display-l-leading)",
    }}
  >
    Guitars made at
    <br />
    the foot of the Alps.
  </div>
);

/** An announcement under the Navbar: a full maple strip that scrolls away; the Navbar stays. */
export const Promo: Story = {
  name: "Promo: on the page",
  args: { variant: "promo", tone: "neutral", title: undefined, children: promoText },
  render: (args) => (
    <div>
      <Navbar
        brand="Shirakaba"
        kanji="白樺楽器"
        sticky
        links={[
          { label: "Workshop", href: "#workshop" },
          { label: "Models", href: "#models", active: true },
        ]}
      />
      <Banner {...args} actions={promoActions} onClose={noop} />
      {hero}
    </div>
  ),
};

/** Narrow: at 30rem of its own width or less the message wraps and the actions move below. */
export const PromoNarrow: Story = {
  name: "Promo: narrow (390px)",
  render: () => (
    <div style={{ ...stack, padding: "var(--space-6)" }}>
      {["390px", "100%"].map((width) => (
        <div key={width} style={{ width, outline: "var(--stroke-hair) dashed var(--rule)" }}>
          <Banner variant="promo" actions={promoActions} onClose={noop} label={`News ${width}`}>
            {promoText}
          </Banner>
        </div>
      ))}
    </div>
  ),
};

/** One action, two actions (outline then ghost), without a close, and the message alone. */
export const PromoActionsAndClose: Story = {
  name: "Promo: actions and close",
  render: () => (
    <div style={stack}>
      <Banner
        variant="promo"
        label="One action"
        onClose={noop}
        actions={<Button size="s">Reserve one</Button>}
      >
        {promoText}
      </Banner>
      <Banner variant="promo" label="Two actions" onClose={noop} actions={promoActions}>
        {promoText}
      </Banner>
      <Banner variant="promo" label="No close" actions={promoActions}>
        {promoText}
      </Banner>
      <Banner variant="promo" label="Message only" onClose={noop}>
        {promoText}
      </Banner>
      <Banner variant="promo" tag="Sale" onClose={noop}>
        A custom tag replaces the localised word, and names the section.
      </Banner>
    </div>
  ),
};

export const PromoLocales: Story = {
  name: "Promo: three languages",
  render: () => (
    <div style={stack}>
      <Root locale="en">
        <Banner variant="promo" onClose={noop} actions={promoActions}>
          {promoText}
        </Banner>
      </Root>
      <Root locale="es">
        <Banner
          variant="promo"
          onClose={noop}
          actions={
            <>
              <Button size="s">Reservar una</Button>
              <Button size="s" variant="ghost">
                Ver el proceso
              </Button>
            </>
          }
        >
          Vuelve la Kaichi de cuerpo con cámaras: doce construidas esta primavera en Matsumoto.
        </Banner>
      </Root>
      <Root locale="ja">
        <Banner
          variant="promo"
          onClose={noop}
          actions={
            <>
              <Button size="s">予約する</Button>
              <Button size="s" variant="ghost">
                製作を見る
              </Button>
            </>
          }
        >
          開智チェンバードスラブが戻りました。今春、松本で十二本を製作。
        </Banner>
      </Root>
    </div>
  ),
};

/**
 * On maple the olivo ring would be 1.95:1 (washi) and 1.05:1 (sumi), so focus is an inset
 * `on-maple` band (6.13:1 / 8.41:1), on-ink while an ink hover fills the control. Tab through the
 * strip, or use the keyboard to reach the links and the close button.
 */
export const PromoFocus: Story = {
  name: "Promo: focus band",
  render: () => (
    <div>
      <Banner
        variant="promo"
        onClose={noop}
        actions={
          <>
            <Button size="s">Reserve one</Button>
            <Button size="s" variant="ghost">
              See the build
            </Button>
          </>
        }
      >
        {promoText} <Link href="#journal">Read the journal</Link>
      </Banner>
      <p style={page}>Press Tab to move the focus band across the links, the buttons and close.</p>
    </div>
  ),
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>(".ol-banner__actions button")?.focus();
  },
};

/** Kakejiku: unrolls when `open` turns true, rolls up on dismiss. Instant under reduced motion. */
export const PromoMotion: Story = {
  name: "Promo: motion (kakejiku)",
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Banner
          variant="promo"
          open={open}
          actions={promoActions}
          onClose={() => {
            setOpen(false);
          }}
        >
          {promoText}
        </Banner>
        <div style={page}>
          <Button
            size="s"
            onClick={() => {
              setOpen(true);
            }}
          >
            Replay unroll
          </Button>
          <p>
            Press the close button to see it roll up. With prefers-reduced-motion there is no
            animation and the strip goes at once.
          </p>
        </div>
      </div>
    );
  },
};

export const PromoThemes: Story = {
  name: "Promo: both themes",
  render: () => (
    <div>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          style={{ padding: "var(--space-6) 0", background: "var(--paper)", color: "var(--ink)" }}
        >
          <Banner variant="promo" label={`Promo ${theme}`} actions={promoActions} onClose={noop}>
            {promoText}
          </Banner>
        </div>
      ))}
    </div>
  ),
};
