import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentType, type CSSProperties, type ReactNode, useRef } from "react";

import { Fab as FabComponent, type FabAction, type FabProps } from "./Fab";

/** Story controls take `label` and `aria-label` together; the component needs one of them. */
type FabArgs = Omit<FabProps, "label" | "aria-label"> & {
  label?: string | undefined;
  "aria-label"?: string | undefined;
};
const Fab = FabComponent as unknown as ComponentType<FabArgs>;

const related: FabAction[] = [
  { label: "Start a build", glyph: "+" },
  { label: "Book a workshop visit", glyph: "→" },
  { label: "Ask a luthier", glyph: "?" },
];

const models = [
  ["Norikura", "¥280,000"],
  ["Utsukushi", "¥340,000"],
  ["Kaichi", "¥410,000"],
  ["Custom shop", "¥525,000"],
] as const;

const frame: CSSProperties = {
  position: "relative",
  width: 360,
  height: 420,
  overflow: "hidden",
  border: "var(--stroke-hair) solid var(--rule)",
  background: "var(--paper)",
};

const scroller: CSSProperties = {
  height: "100%",
  overflowY: "auto",
  padding: "var(--space-4)",
  boxSizing: "border-box",
};

/** A small product page, so the Fab is seen over real content. */
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

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={frame}>
      <div className="ol-has-fab" style={scroller}>
        <Page />
      </div>
      {children}
    </div>
  );
}

const meta = {
  title: "Actions/Fab",
  component: Fab,
  tags: ["autodocs"],
  args: { label: "Start a build", contained: true },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Fab is the one primary action of a view, fixed to a bottom corner: a raised square in olivo with a block shadow. A press pushes it 2px into the paper. With a `label` it is extended; the label is always its accessible name. With `actions` it becomes a menu button whose list unrolls upward (kakejiku, no rod) and its glyph wipes to ×.\n\nThe menu follows the menu-button pattern: Enter, Space or ↓ open on the first item, ↑ on the last; arrows wrap, Home/End and typeahead move; Escape (from the Fab or the menu) closes and returns focus; Tab, an outside press or focus leaving close it. With `actions`, `onClick` is not called: use `onOpenChange`. The menu is named after the Fab unless `menuLabel` is given, so the Fab renders no words of its own.\n\nA non-contained Fab renders in a portal at `z-sticky`, above the page and below menus, modals and toasts; offsets add the safe-area insets. `contained` positions it inside the nearest positioned ancestor (previews, panels). `collapseOnScroll` folds the label while scrolling down (not under reduced motion, not while the menu is open). Give the scroll container `ol-has-fab` so a focused control at the end of the page is never fully covered. Hidden in print. Render the Fab with the page: a Modal that opens later makes it inert.\n\n- Do use one per view, for a verb people expect everywhere on that screen (Start a build).\n- Do keep labels to one to three words; long ones end in an ellipsis.\n- Don't put two Fabs on one screen, or a destructive action or navigation in one.\n- Don't use an icon or emoji: the glyph is typographic.\n- Don't put a Dropdown, Popover or toast in the same corner, and don't disable the Fab: hide it.\n- Don't mount a Fab inside a Modal or while one is open: it would stay reachable behind the scrim.",
      },
    },
  },
  decorators: [
    (Story, { parameters }) =>
      parameters.framed === false ? (
        <Story />
      ) : (
        <Frame>
          <Story />
        </Frame>
      ),
  ],
} satisfies Meta<typeof Fab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Extended: Story = {};

export const GlyphOnly: Story = {
  args: { label: undefined, "aria-label": "Start a build" },
};

export const WithMenu: Story = {
  args: { label: undefined, "aria-label": "Start a build", actions: related },
};

/** The approved board frame: the menu unrolled above the Fab. */
export const MenuOpen: Story = {
  args: { label: undefined, "aria-label": "Start a build", actions: related, defaultOpen: true },
};

export const ExtendedWithMenu: Story = {
  args: { actions: related, defaultOpen: true },
};

export const Variants: Story = {
  parameters: { framed: false },
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-6)" }}>
      {(["accent", "ink", "paper"] as const).map((variant) => (
        <div key={variant} style={{ ...frame, width: 200, height: 140 }}>
          <Fab {...args} variant={variant} label={variant === "accent" ? "Start" : "New"} />
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <>
      <Fab {...args} label={undefined} aria-label="Small" size="s" placement="start" />
      <Fab {...args} label={undefined} aria-label="Medium" size="m" placement="center" />
      <Fab {...args} label={undefined} aria-label="Large" size="l" />
    </>
  ),
};

export const Placements: Story = {
  render: (args) => (
    <>
      <Fab {...args} label="Start" placement="start" />
      <Fab {...args} label={undefined} aria-label="Centre" placement="center" variant="ink" />
      <Fab {...args} label="End" placement="end" variant="paper" />
    </>
  ),
};

/** Long labels stop at the frame's edge with an ellipsis; the name stays complete. */
export const LongLabel: Story = {
  args: { label: "Iniciar una construcción a medida en el taller" },
};

function CollapsingDemo(args: FabArgs) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={frame}>
      <div ref={ref} className="ol-has-fab" style={scroller}>
        <Page rows={4} />
      </div>
      <Fab {...args} label="Start a build" contained collapseOnScroll scrollTarget={ref} />
    </div>
  );
}

/** Scroll the list: down folds the label away, up brings it back. Not under reduced motion. */
export const CollapseOnScroll: Story = {
  parameters: { framed: false },
  render: (args) => <CollapsingDemo {...args} />,
};

/** With reduced motion the menu appears at once and the label never folds. */
export const ReducedMotion: Story = {
  args: { actions: related, defaultOpen: true },
  decorators: [
    (Story) => (
      <div className="ol-reduce-motion">
        <Story />
      </div>
    ),
  ],
};

/** Not contained: fixed to the viewport corner through a portal, above the page. */
export const Viewport: Story = {
  args: { contained: false, actions: related },
  parameters: { layout: "fullscreen", framed: false },
  render: (args) => (
    <div className="ol-has-fab" style={{ padding: "var(--space-6)", maxWidth: 560 }}>
      <Page rows={3} />
      <Fab {...args} />
    </div>
  ),
};
