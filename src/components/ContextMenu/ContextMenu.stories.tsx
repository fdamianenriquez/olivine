import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

import { Dropdown } from "../Dropdown";
import { Input } from "../Input";
import { Root } from "../Root";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-4)",
  padding: "var(--space-2) var(--space-4)",
  borderBottom: "var(--stroke-hair) solid var(--rule)",
  fontFamily: "var(--text-ui-family)",
  fontSize: "var(--text-ui-size)",
  color: "var(--ink)",
};

const boxStyle: CSSProperties = {
  border: "var(--stroke-hair) solid var(--rule)",
  background: "var(--paper)",
  color: "var(--ink)",
};

const areaStyle: CSSProperties = { ...boxStyle, padding: "var(--space-6)", minWidth: 280 };

/** Opens the menu of the first area inside once the story has rendered, for screenshots and docs. */
const DEFAULT_AT: [number, number] = [24, 16];

function OpenOnMount({
  children,
  how = "pointer",
  at = DEFAULT_AT,
}: {
  children: ReactNode;
  how?: "pointer" | "keyboard" | "touch";
  at?: [number, number];
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const area = host.current?.querySelector<HTMLElement>(".ol-context-menu");
      if (!area) return;
      if (how === "keyboard") {
        area.focus();
        area.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "F10",
            shiftKey: true,
            bubbles: true,
            cancelable: true,
          }),
        );
        return;
      }
      const box = area.getBoundingClientRect();
      area.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: box.left + at[0],
          clientY: box.top + at[1],
        }),
      );
    }, 120);
    return () => {
      window.clearTimeout(timer);
    };
  }, [how, at]);
  return <div ref={host}>{children}</div>;
}

const fileItems: ContextMenuItem[] = [
  { label: "Open", kbd: "enter" },
  { label: "Rename", kbd: "f2" },
  { label: "Duplicate", kbd: "mod+d" },
  { label: "Archive", disabled: true },
  { divider: true },
  { label: "Delete", danger: true, kbd: "delete" },
];

const files = ["report.md", "ledger.csv", "notes.txt"];

const meta = {
  title: "Navigation/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
  args: { items: fileItems, label: "File actions", menuClassName: "ol-motion-noren" },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "ContextMenu wraps an area and opens a menu of the same items as Dropdown where the user asks for it: a right-click, a touch long-press (500 ms), Shift+F10 or the ContextMenu key. With the pointer the menu's corner sits on the point; from the keyboard it hangs from the focused element, takes focus on its first item and gives focus back on close. The area has no look of its own; it carries `data-state` and, while a touch is held, `data-pressing`.\n\nThe browser's own menu still shows in text fields and editable content (widen `native` to keep more), with Shift+right-click, and wherever the menu is `disabled` or has no items. A press outside closes the menu and its click does not reach what is under it. A menu opened at the pointer closes when the page scrolls or resizes; one opened from the keyboard follows its element. The stories enable the noren curtain with `menuClassName=\"ol-motion-noren\"`, which needs `motion-extras.css`.\n\nIt is a shortcut, not the only way: every command also needs a visible control (a Dropdown on the row, a toolbar, a keyboard shortcut).\n\n- Do offer the same commands somewhere visible.\n- Do make the thing inside the area focusable (a row, card or canvas with `tabIndex`) so Shift+F10 and the ContextMenu key have something to start from.\n- Do keep the menu short and specific to what was clicked; put destructive items last after a divider with `danger`.\n- Do wrap rows and cards, not the whole page, so the browser menu stays available elsewhere.\n- Don't use it to open a menu from a button (use Dropdown) or for application commands (use Menubar).\n- Don't use it on text fields or links users copy from, unless the app adds those commands itself.\n- Don't nest areas that open different menus on the same object.",
      },
    },
  },
} satisfies Meta<typeof ContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const hint: CSSProperties = {
  margin: 0,
  color: "var(--ink-2)",
  fontFamily: "var(--text-body-s-family)",
  fontSize: "var(--text-body-s-size)",
};

/** An area with its text and the visible control that offers the same commands. */
const withActions: CSSProperties = {
  ...areaStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-6)",
};

/** The visible alternative every context menu needs: a Dropdown with the same items. */
function Actions({ items }: { items: readonly ContextMenuItem[] }) {
  return <Dropdown label="Actions" size="s" variant="ghost" items={items} />;
}

export const Default: Story = {
  render: (args) => (
    <ContextMenu {...args} style={withActions} tabIndex={0}>
      <p style={hint}>Right-click here, or focus this box and press Shift+F10.</p>
      <Actions items={args.items} />
    </ContextMenu>
  ),
};

/** Rows are the areas, each focusable, with a visible Dropdown beside it as the required alternative. */
export const FileList: Story = {
  render: (args) => (
    <div style={{ ...boxStyle, minWidth: 360 }}>
      {files.map((name) => (
        <ContextMenu key={name} {...args} label={`${name} actions`} style={rowStyle} tabIndex={0}>
          <span>{name}</span>
          <Actions items={args.items} />
        </ContextMenu>
      ))}
    </div>
  ),
};

export const FileListOpen: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <OpenOnMount at={[60, 12]}>
      <div style={{ ...boxStyle, minWidth: 360, minHeight: 320 }}>
        {files.map((name) => (
          <ContextMenu key={name} {...args} label={`${name} actions`} style={rowStyle} tabIndex={0}>
            <span>{name}</span>
            <Actions items={args.items} />
          </ContextMenu>
        ))}
      </div>
    </OpenOnMount>
  ),
};

function CanvasDemo({ args }: { args: Partial<React.ComponentProps<typeof ContextMenu>> }) {
  const [grid, setGrid] = useState(true);
  const [rulers, setRulers] = useState(false);
  const [zoom, setZoom] = useState("100");
  const items: ContextMenuItem[] = [
    { header: "View" },
    { label: "Show grid", checked: grid, onCheckedChange: setGrid },
    { label: "Show rulers", checked: rulers, onCheckedChange: setRulers },
    { divider: true },
    {
      radios: {
        label: "Zoom",
        value: zoom,
        onValueChange: setZoom,
        options: [
          { value: "50", label: "50%" },
          { value: "100", label: "100%" },
          { value: "200", label: "200%" },
        ],
      },
    },
    { divider: true },
    {
      label: "Export as",
      icon: "出",
      items: [{ label: "PNG" }, { label: "SVG" }, { label: "PDF" }],
    },
    { label: "Clear canvas", danger: true },
  ];
  return (
    <ContextMenu
      {...args}
      label="Canvas"
      style={{ ...withActions, minHeight: 200, minWidth: 420, alignItems: "start" }}
      tabIndex={0}
      items={items}
    >
      <p style={hint}>
        Grid {grid ? "on" : "off"}, rulers {rulers ? "on" : "off"}, zoom {zoom}%.
      </p>
      <Actions items={items} />
    </ContextMenu>
  );
}

/** Checkable items, a radio group, an icon and a submenu: Dropdown's items, unchanged. */
export const CheckableRadiosAndSubmenu: Story = {
  render: (args) => <CanvasDemo args={args} />,
};

export const CheckableRadiosAndSubmenuOpen: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <OpenOnMount at={[80, 40]}>
      <div style={{ minHeight: 420, minWidth: 560 }}>
        <CanvasDemo args={args} />
      </div>
    </OpenOnMount>
  ),
};

/** Opened from the keyboard: the menu hangs from the focused row and takes the first item. */
export const FromKeyboard: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <OpenOnMount how="keyboard">
      <div style={{ minHeight: 320, minWidth: 420 }}>
        <ContextMenu {...args} style={rowStyle} tabIndex={0}>
          <span>report.md</span>
          <Actions items={args.items} />
        </ContextMenu>
      </div>
    </OpenOnMount>
  ),
};

/** Text fields keep the browser's menu (spellcheck, paste); the rest of the area opens ours. */
export const EditableFieldKeepsBrowserMenu: Story = {
  render: (args) => (
    <ContextMenu {...args} style={{ ...areaStyle, display: "grid", gap: "var(--space-4)" }}>
      <p style={hint}>Right-click the field: the browser&apos;s menu. Right-click here: ours.</p>
      <Input aria-label="Name" defaultValue="report.md" />
    </ContextMenu>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <ContextMenu {...args} style={areaStyle} tabIndex={0}>
      <p style={hint}>Disabled: the browser&apos;s menu shows.</p>
    </ContextMenu>
  ),
};

/** A sumi panel on a washi page: the menu copies the island's theme into its portal. */
export const SumiIsland: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <OpenOnMount>
      <div style={{ minHeight: 360, minWidth: 420, padding: "var(--space-4)" }}>
        <Root theme="sumi" style={{ background: "var(--paper)" }}>
          <ContextMenu {...args} style={withActions} tabIndex={0}>
            <p style={hint}>A sumi island.</p>
            <Actions items={args.items} />
          </ContextMenu>
        </Root>
      </div>
    </OpenOnMount>
  ),
};

/** In right-to-left text the menu opens to the left of the pointer. */
export const RightToLeft: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <OpenOnMount at={[300, 20]}>
      <div dir="rtl" style={{ minHeight: 320, minWidth: 420 }}>
        <ContextMenu {...args} style={withActions} tabIndex={0}>
          <p style={hint}>انقر بزر الفأرة الأيمن هنا (right-click here).</p>
          <Actions items={args.items} />
        </ContextMenu>
      </div>
    </OpenOnMount>
  ),
};

/**
 * Touch and pen: hold for 500 ms (`longPress` also takes a delay in ms; `false` turns it off
 * where users must select text by touch). Use the browser's touch emulation to try it.
 */
export const TouchLongPress: Story = {
  args: { longPress: 500 },
  render: (args) => (
    <ContextMenu {...args} style={withActions} tabIndex={0}>
      <p style={hint}>Touch and hold. The area shows data-pressing while the finger is down.</p>
      <Actions items={args.items} />
    </ContextMenu>
  ),
};

/**
 * A point at the bottom-right corner of the window: the menu flips and shifts to stay inside
 * it (floating-ui falls back to the opposite side), so it never opens off screen.
 */
export const NearViewportEdge: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <OpenOnMount at={[170, 150]}>
      <div
        style={{
          display: "grid",
          justifyContent: "end",
          alignContent: "end",
          // The canvas already pads the viewport by space-6 on each side and fills it.
          boxSizing: "border-box",
          minHeight: "calc(100vh - var(--space-6) * 2)",
        }}
      >
        <ContextMenu
          {...args}
          style={{ ...withActions, minHeight: 170, minWidth: 200 }}
          tabIndex={0}
        >
          <p style={hint}>Corner</p>
          <Actions items={args.items} />
        </ContextMenu>
      </div>
    </OpenOnMount>
  ),
};

/** Both themes side by side, menus open. */
export const Themes: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div style={{ padding: "var(--space-4)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        {(["washi", "sumi"] as const).map((theme) => (
          <div
            key={theme}
            className="ol"
            data-theme={theme}
            style={{ minHeight: 360, padding: "var(--space-4)", background: "var(--paper)" }}
          >
            <OpenOnMount>
              <ContextMenu {...args} style={withActions} tabIndex={0}>
                <p style={hint}>{theme}</p>
                <Actions items={args.items} />
              </ContextMenu>
            </OpenOnMount>
          </div>
        ))}
      </div>
    </div>
  ),
};
