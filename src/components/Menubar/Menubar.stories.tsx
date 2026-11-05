import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Navbar } from "../Navbar";
import { Menubar, type MenubarItem } from "./Menubar";

/** The menus of an editor. The app holds the state of the checkable items; the bar holds none. */
function useEditorItems(): MenubarItem[] {
  const [grid, setGrid] = useState(true);
  const [rulers, setRulers] = useState(false);
  const [theme, setTheme] = useState("washi");
  return [
    {
      label: "File",
      items: [
        { label: "New", kbd: "mod+n" },
        { label: "Open…", kbd: "mod+o" },
        {
          label: "Open recent",
          items: [{ label: "report.md" }, { label: "notes.md" }, { label: "ledger.csv" }],
        },
        { divider: true },
        { label: "Save", kbd: "mod+s" },
        { label: "Save as…", kbd: "mod+shift+s", disabled: true },
        { divider: true },
        { label: "Quit", kbd: "mod+q" },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", kbd: "mod+z" },
        { label: "Redo", kbd: "mod+shift+z" },
        { divider: true },
        { label: "Cut", kbd: "mod+x" },
        { label: "Copy", kbd: "mod+c" },
        { label: "Paste", kbd: "mod+v" },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Show grid", checked: grid, onCheckedChange: setGrid, kbd: "mod+'" },
        { label: "Show rulers", checked: rulers, onCheckedChange: setRulers },
        { divider: true },
        {
          radios: {
            label: "Theme",
            value: theme,
            onValueChange: setTheme,
            options: [
              { value: "washi", label: "Washi" },
              { value: "sumi", label: "Sumi" },
              { value: "auto", label: "Match system" },
            ],
          },
        },
      ],
    },
    { label: "Help" },
  ];
}

const meta = {
  title: "Navigation/Menubar",
  component: Menubar,
  tags: ["autodocs"],
  args: { items: [], menuClassName: "ol-motion-noren" },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Menubar is the horizontal bar of an application: File, Edit, View, Help. Each entry opens a menu of the same items as Dropdown (actions, checkable items, radio groups, one level of submenus, headers, dividers) or runs an action. The whole bar is one tab stop; Left and Right move between entries and, once a menu is open, between menus; Down opens, Escape closes and returns focus to the entry. Entries share hairlines and invert to ink when hovered or open. The menus hang from the bar and switch instantly while one is open. The stories enable the noren curtain with `menuClassName=\"ol-motion-noren\"`, which needs `motion-extras.css`.\n\n- Do use it for the commands of an application or editor, with 3 to 7 entries.\n- Do keep the same items and `kbd` hints in the menu and in your own shortcut handling; `kbd` is a hint, not a binding.\n- Do give the bar a `label` when more than one menu bar or navigation exists.\n- Do set `restoreFocus` to a function when choosing an item moves focus (for example to the document).\n- Don't use it for site navigation (use Nav or Navbar) or for one menu on one object (use Dropdown).\n- Don't nest more than one submenu level, and don't hide the only way to do something in a submenu.\n- Don't use it on narrow screens: below 720 px swap to Navbar's fold or a Dropdown.",
      },
    },
  },
} satisfies Meta<typeof Menubar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render(args) {
    return <Menubar {...args} items={useEditorItems()} label="Editor" />;
  },
};

/** A menu open from the start, as it looks in use: shortcut hints, a disabled item, a submenu row. */
export const OpenMenu: Story = {
  decorators: [
    (Story) => (
      <div
        style={{ minHeight: "calc(var(--space-12) * 7)", minWidth: "calc(var(--space-12) * 8)" }}
      >
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    return <Menubar {...args} items={useEditorItems()} label="Editor" defaultValue="0" />;
  },
};

/** Checkable items and a radio group, controlled by the app. */
export const CheckableAndRadios: Story = {
  decorators: [
    (Story) => (
      <div
        style={{ minHeight: "calc(var(--space-12) * 6)", minWidth: "calc(var(--space-12) * 8)" }}
      >
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    return <Menubar {...args} items={useEditorItems()} label="Editor" defaultValue="2" />;
  },
};

/** A disabled entry, an entry with no items, and a plain action entry. */
export const DisabledAndActionEntries: Story = {
  render: function Render(args) {
    return (
      <Menubar
        {...args}
        label="Editor"
        items={[
          { label: "File", items: [{ label: "New" }, { label: "Open…" }] },
          { label: "Edit", disabled: true, items: [{ label: "Undo" }] },
          { label: "Window", items: [] },
          { label: "Help" },
        ]}
      />
    );
  },
};

/** `value` / `onValueChange` drive the open entry; the buttons set it from outside the bar. */
export const Controlled: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: "calc(var(--space-12) * 6)",
          minWidth: "calc(var(--space-12) * 8)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    const items = useEditorItems();
    const [value, setValue] = useState<string | null>("1");
    return (
      <div style={{ display: "grid", gap: "var(--space-4)", justifyItems: "start" }}>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <Button
            size="s"
            onClick={() => {
              setValue("0");
            }}
          >
            Open File
          </Button>
          <Button
            size="s"
            onClick={() => {
              setValue("2");
            }}
          >
            Open View
          </Button>
          <Button
            size="s"
            variant="ghost"
            onClick={() => {
              setValue(null);
            }}
          >
            Close
          </Button>
          <span style={{ fontFamily: "var(--font-mono)" }}>open entry: {value ?? "none"}</span>
        </div>
        <Menubar {...args} items={items} label="Editor" value={value} onValueChange={setValue} />
      </div>
    );
  },
};

/** The bar in the end slot of a sticky Navbar: the menus stack above it. */
export const InNavbar: Story = {
  parameters: { layout: "fullscreen" },
  render: function Render(args) {
    const items = useEditorItems();
    return (
      <div style={{ height: 420, overflow: "auto" }}>
        <Navbar
          sticky
          brand="Olivine"
          kanji="橄"
          label="Application"
          end={<Menubar {...args} items={items} label="Editor" />}
        />
        <div style={{ height: 800, padding: "var(--space-6)" }}>
          Scroll: the bar stays at the top.
        </div>
      </div>
    );
  },
};

/** A bar docked to the bottom of its frame: the menus open upward. */
export const Up: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          minHeight: "calc(var(--space-12) * 7)",
          minWidth: "calc(var(--space-12) * 8)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    return <Menubar {...args} items={useEditorItems()} label="Editor" up defaultValue="1" />;
  },
};

/** The arrow keys and the menus mirror in a right-to-left page. */
export const RightToLeft: Story = {
  decorators: [
    (Story) => (
      <div
        dir="rtl"
        style={{ minHeight: "calc(var(--space-12) * 7)", minWidth: "calc(var(--space-12) * 8)" }}
      >
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    return <Menubar {...args} items={useEditorItems()} label="Editor" defaultValue="0" />;
  },
};

/** Both themes, a menu open on each. */
export const Themes: Story = {
  parameters: { layout: "padded" },
  render: function Render(args) {
    const items = useEditorItems();
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        {(["washi", "sumi"] as const).map((theme) => (
          <div
            key={theme}
            className="ol"
            data-theme={theme}
            style={{
              minHeight: "calc(var(--space-12) * 7)",
              padding: "var(--space-4)",
              background: "var(--paper)",
            }}
          >
            <Menubar {...args} items={items} label="Editor" defaultValue="2" />
          </div>
        ))}
      </div>
    );
  },
};
