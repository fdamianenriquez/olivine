import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

import { Avatar } from "../Avatar";
import { Button } from "../Button";
import { Sidebar, type SidebarProps, type SidebarSection } from "./Sidebar";

const sections: SidebarSection[] = [
  {
    key: "overview",
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", mark: "概", href: "#dashboard", badge: 3 },
      { key: "reports", label: "Reports", mark: "報", href: "#reports" },
      { key: "inbox", label: "Inbox", mark: "受", href: "#inbox", badge: 12 },
    ],
  },
  {
    key: "library",
    title: "Library",
    collapsible: true,
    items: [
      {
        key: "components",
        label: "Components",
        mark: "部",
        href: "#components",
        children: [
          { key: "buttons", label: "Buttons", href: "#buttons" },
          { key: "forms", label: "Forms", href: "#forms", badge: 2 },
          { key: "navigation", label: "Navigation", href: "#navigation" },
          { key: "overlays", label: "Overlays", href: "#overlays", disabled: true },
        ],
      },
      {
        key: "tokens",
        label: "Tokens",
        mark: "§",
        children: [
          { key: "colour", label: "Colour", href: "#colour" },
          { key: "type", label: "Type", href: "#type" },
          { key: "motion", label: "Motion", href: "#motion" },
        ],
      },
      { key: "patterns", label: "Patterns", mark: "型", href: "#patterns" },
    ],
  },
  {
    key: "workspace",
    title: "Workspace",
    collapsible: true,
    items: [
      { key: "members", label: "Members", mark: "員", href: "#members" },
      { key: "billing", label: "Billing", mark: "請", href: "#billing" },
      { key: "archive", label: "Archive", mark: "蔵", href: "#archive", disabled: true },
    ],
  },
];

const japanese: SidebarSection[] = [
  {
    key: "main",
    title: "メイン",
    items: [
      { key: "home", label: "ホーム", mark: "家", href: "#home" },
      { key: "orders", label: "注文", mark: "注", href: "#orders", badge: 4 },
    ],
  },
  {
    key: "catalogue",
    title: "カタログ",
    collapsible: true,
    items: [
      {
        key: "goods",
        label: "商品",
        mark: "品",
        children: [
          { key: "paper", label: "和紙", href: "#paper" },
          { key: "ink", label: "墨", href: "#ink" },
        ],
      },
      { key: "makers", label: "職人", mark: "匠", href: "#makers" },
    ],
  },
];

const brand = (
  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
    <span className="ol-label">Olivine</span>
  </div>
);

const account = (
  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
    <Avatar name="Aiko Mori" size="s" />
    <span className="ol-label">Aiko Mori</span>
  </div>
);

/** A stateful sidebar: choosing a destination moves the olivo edge. */
function Docs({ items, sections: own, ...props }: Partial<SidebarProps>) {
  const [active, setActive] = useState("reports");
  return (
    <Sidebar
      {...(items ? { items } : { sections: own ?? sections })}
      label="Documentation"
      active={active}
      onSelect={(key, event) => {
        event.preventDefault();
        setActive(key);
      }}
      {...props}
    />
  );
}

/** The page the sidebar sits beside. */
function Page({ children }: { children?: ReactNode }) {
  return (
    <main style={{ flex: 1, minWidth: 0, padding: "var(--space-8)" }}>
      {children ?? <p className="ol-label">Page content</p>}
    </main>
  );
}

const meta = {
  title: "Navigation/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  args: { sections, label: "Documentation", active: "reports" },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'Sidebar is the persistent side navigation of a content-heavy product: titled sections of links, sections that fold shut, one nested level, counts, and a header and footer for the brand and the account. It sits in the page flow at 280px; as a modal, or below `modalBelow`, the same content opens in an Offcanvas. It is a `nav` (links with `aria-current="page"` on the current one), not a menu or a tree.\n\n**Props** — `sections` (`[{key, title, items, collapsible}]`) or `items` for one untitled section, `active`, `onSelect(key, event)`, `expanded` / `defaultExpanded` / `onExpandedChange`, `header`, `footer`, `label`, `variant` (`standard` / `modal`), `modalBelow`, `open` / `defaultOpen` / `onOpenChange`, `closeOnSelect`, `placement` (`start` / `end`).\n\n- The current destination is `paper-2` with a 3px olivo edge and `aria-current="page"`; only a leaf carries it. A folded parent or section that holds it is ink and says so to assistive tech.\n- Hover inverts a row to ink. Tab moves through links and toggles in order; Enter or Space folds a section or a parent.\n- Section titles are list labels, not headings. Collapsible titles carry a −/+ sign.\n- `item.children` nests one level. A parent with an `href` keeps its link and gets a separate toggle; without one the whole row toggles.\n- `mark` is a kanji or a typographic glyph, set in the jp face and hidden from assistive tech: the label is always the name.\n- Sections and nested lists fold open like a folding screen (the same fold as TreeView): the rows swing from edge-on to flat, each darker while it turns. Reduced motion shows them at once.\n- The narrow form is NavigationRail with the same items; there is no collapse-to-icons mode.\n\n- Do group long lists into a few sections with short sentence-case titles, and label the landmark when the page has other navigation.\n- Don\'t use it for 3–7 flat destinations (NavigationRail), for in-page tabs (Tabs), or for nesting past one level (TreeView).',
      },
    },
  },
  decorators: [
    (Story, { parameters }) =>
      parameters.framed === false ? (
        <Story />
      ) : (
        <div style={{ height: "40rem", display: "flex" }}>
          <Story />
          <Page />
        </div>
      ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Docs {...args} />,
};

/** Every section and parent folded shut; the one holding the current page says so. */
export const Folded: Story = {
  args: { defaultExpanded: [], active: "buttons" },
  render: (args) => <Docs {...args} />,
};

/** The current page is inside a parent: its ancestors open on their own. */
export const NestedCurrent: Story = {
  args: { active: "colour" },
  render: (args) => <Docs {...args} />,
};

export const WithHeaderAndFooter: Story = {
  render: (args) => <Docs {...args} header={brand} footer={account} />,
};

export const FlatItems: Story = {
  render: (args) => (
    <Docs
      {...args}
      items={[
        { key: "dashboard", label: "Dashboard", href: "#dashboard" },
        { key: "reports", label: "Reports", href: "#reports", badge: 3 },
        { key: "settings", label: "Settings", href: "#settings" },
      ]}
    />
  ),
};

/** Kanji marks and Japanese labels; the marks never stand alone. */
export const JapaneseMarks: Story = {
  args: { sections: japanese, active: "orders", label: "メイン" },
  render: (args) => <Docs {...args} header={brand} />,
};

export const EndEdge: Story = {
  parameters: { framed: false },
  render: (args) => (
    <div style={{ height: "40rem", display: "flex" }}>
      <Page />
      <Docs {...args} placement="end" />
    </div>
  ),
};

/** The same sidebar under a right-to-left direction. */
export const RightToLeft: Story = {
  parameters: { framed: false },
  render: (args) => (
    <div dir="rtl" style={{ height: "40rem", display: "flex" }}>
      <Docs {...args} />
      <Page />
    </div>
  ),
};

/** The app owns the control that shows and hides it; it slides along the inline axis. */
export const ShowAndHide: Story = {
  parameters: { framed: false },
  render: (args) => {
    function Shell() {
      const [open, setOpen] = useState(true);
      return (
        <div style={{ height: "40rem", display: "flex" }}>
          <Docs {...args} id="docs-nav" open={open} onOpenChange={setOpen} />
          <Page>
            <Button
              aria-expanded={open}
              aria-controls="docs-nav"
              onClick={() => {
                setOpen(!open);
              }}
            >
              {open ? "Hide sidebar" : "Show sidebar"}
            </Button>
          </Page>
        </div>
      );
    }
    return <Shell />;
  },
};

/** A drawer in an Offcanvas; choosing a destination closes it. */
export const Modal: Story = {
  parameters: { framed: false },
  render: (args) => {
    function Shell() {
      const [open, setOpen] = useState(false);
      return (
        <div style={{ padding: "var(--space-8)" }}>
          <Button
            aria-expanded={open}
            aria-controls="docs-drawer"
            onClick={() => {
              setOpen(!open);
            }}
          >
            Open menu
          </Button>
          <Docs
            {...args}
            id="docs-drawer"
            variant="modal"
            open={open}
            onOpenChange={setOpen}
            header={brand}
            footer={account}
          />
        </div>
      );
    }
    return <Shell />;
  },
};

/** In the flow above 1024px, a drawer below it. Resize the canvas to cross the width. */
export const ModalBelow: Story = {
  parameters: { framed: false },
  render: (args) => {
    function Shell() {
      const [open, setOpen] = useState(true);
      return (
        <div style={{ height: "40rem", display: "flex" }}>
          <Docs
            {...args}
            id="docs-responsive"
            modalBelow={1024}
            open={open}
            onOpenChange={setOpen}
          />
          <Page>
            <Button
              aria-expanded={open}
              aria-controls="docs-responsive"
              onClick={() => {
                setOpen(!open);
              }}
            >
              Menu
            </Button>
          </Page>
        </div>
      );
    }
    return <Shell />;
  },
};

/** Both themes, standard and folded: the frames the owner approves. */
export const Themes: Story = {
  parameters: { flush: true, framed: false },
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "flex",
            gap: "var(--space-6)",
            padding: "var(--space-6)",
            background: "var(--paper-3)",
            height: "44rem",
          }}
        >
          <Docs {...args} label={`${theme} open`} active="colour" header={brand} footer={account} />
          <Docs {...args} label={`${theme} folded`} active="buttons" defaultExpanded={[]} />
        </div>
      ))}
    </div>
  ),
};
