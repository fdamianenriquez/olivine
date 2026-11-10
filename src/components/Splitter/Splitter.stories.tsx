import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useRef, useState } from "react";

import { Button } from "../Button";
import { Card } from "../Card";
import { Splitter, type SplitterActions } from "./Splitter";

/** A panel body: padded copy, so the panel's own scroll stays clear of the handle's hit area. */
function Pane({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-2)" }}>
      <span className="ol-label">{title}</span>
      {children && <p style={{ margin: 0 }}>{children}</p>}
    </div>
  );
}

const area = { blockSize: "calc(var(--space-32) * 2.5)" };

const meta = {
  title: "Foundations/Splitter",
  component: Splitter,
  tags: ["autodocs"],
  args: { "aria-label": "Workspace" },
  parameters: {
    docs: {
      description: {
        component:
          "Splitter divides an area into two or more panels and gives the reader a handle between each pair to trade space. The handle is a hairline in `rule` with a small ink grip; it turns `ink` on hover and `olivo` while focused or dragged, and adjacent panels share its line. Every handle is a keyboard-operable window splitter (arrows, Shift+arrows and Page keys, Home / End, Enter to collapse or restore, double-click to collapse or reset) with a spoken name and value. Nothing animates: the layout follows the pointer.\n\n- Do give every panel a `label`, so each handle has a distinct name.\n- Do set `min` on panels whose content breaks when narrow; use a pixel `min` for sidebars and a percent for content areas.\n- Do save `onSizesCommit` and pass it back as `defaultSizes` to remember the layout; the component never stores anything itself.\n- Do give the Splitter a size from its parent (a height for `horizontal`, a width for `vertical`) and let each panel scroll on its own.\n- Do offer a visible control for collapsing a major pane (a `Button` calling `actionRef`), because some readers cannot drag.\n- Don't use Splitter for a layout that never changes; use `Grid` or `Stack`.\n- Don't hide a pane that matters behind `collapsible` without another way to open it.\n- Don't put a pane scrollbar flush against the handle; leave space or use `ScrollArea` so the 24px hit area does not cover it.\n- Don't nest more than two levels; narrow panels lose their meaning.\n- Don't add a second border to a panel edge that touches a handle; the handle is the line.",
      },
    },
  },
} satisfies Meta<typeof Splitter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Splitter {...args} style={area}>
      <Splitter.Panel label="Index" defaultSize={35}>
        <Pane title="Index">Kitchens, storage, lighting.</Pane>
      </Splitter.Panel>
      <Splitter.Panel label="Detail">
        <Pane title="Detail">Oak and blackened steel for a Tokyo apartment.</Pane>
      </Splitter.Panel>
    </Splitter>
  ),
};

export const ThreePanels: Story = {
  render: (args) => (
    <Splitter {...args} style={area}>
      <Splitter.Panel label="Files" defaultSize={25}>
        <Pane title="Files" />
      </Splitter.Panel>
      <Splitter.Panel label="Editor" defaultSize={50}>
        <Pane title="Editor" />
      </Splitter.Panel>
      <Splitter.Panel label="Preview">
        <Pane title="Preview" />
      </Splitter.Panel>
    </Splitter>
  ),
};

export const Vertical: Story = {
  render: (args) => (
    <Splitter {...args} orientation="vertical" style={area}>
      <Splitter.Panel label="Editor" defaultSize={70}>
        <Pane title="Editor" />
      </Splitter.Panel>
      <Splitter.Panel label="Console">
        <Pane title="Console" />
      </Splitter.Panel>
    </Splitter>
  ),
};

export const Nested: Story = {
  render: (args) => (
    <Splitter {...args} style={{ blockSize: "calc(var(--space-32) * 3.5)" }}>
      <Splitter.Panel label="Files" defaultSize={25} min="160px">
        <Pane title="Files" />
      </Splitter.Panel>
      <Splitter.Panel label="Work area">
        <Splitter orientation="vertical" bordered={false} style={{ blockSize: "100%" }}>
          <Splitter.Panel label="Editor" defaultSize={70}>
            <Pane title="Editor" />
          </Splitter.Panel>
          <Splitter.Panel label="Console" collapsible min={15}>
            <Pane title="Console" />
          </Splitter.Panel>
        </Splitter>
      </Splitter.Panel>
    </Splitter>
  ),
};

export const Limits: Story = {
  render: (args) => (
    <Splitter {...args} style={area}>
      <Splitter.Panel label="Sidebar" defaultSize={30} min="200px" max="360px">
        <Pane title="Sidebar">At least 200px, at most 360px.</Pane>
      </Splitter.Panel>
      <Splitter.Panel label="Content" min={40}>
        <Pane title="Content">At least 40 % of the space.</Pane>
      </Splitter.Panel>
    </Splitter>
  ),
};

export const CollapsibleSidebar: Story = {
  render: function Render(args) {
    const actions = useRef<SplitterActions>(null);
    const [open, setOpen] = useState(true);
    return (
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button
            size="s"
            aria-expanded={open}
            aria-controls="story-sidebar"
            onClick={() => actions.current?.toggle(0)}
          >
            Toggle sidebar
          </Button>
          <Button size="s" variant="ghost" onClick={() => actions.current?.reset()}>
            Reset layout
          </Button>
        </div>
        <Splitter
          {...args}
          actionRef={actions}
          onSizesChange={(sizes) => {
            setOpen((sizes[0] ?? 0) > 0);
          }}
          style={area}
        >
          <Splitter.Panel id="story-sidebar" label="Sidebar" defaultSize={30} min={20} collapsible>
            <Pane title="Sidebar">Press Enter or double-click the handle to collapse.</Pane>
          </Splitter.Panel>
          <Splitter.Panel label="Content">
            <Pane title="Content" />
          </Splitter.Panel>
        </Splitter>
      </div>
    );
  },
};

export const Collapsed: Story = {
  render: (args) => (
    <Splitter {...args} defaultSizes={[0, 100]} style={area}>
      <Splitter.Panel label="Sidebar" min={20} collapsible>
        <Pane title="Sidebar" />
      </Splitter.Panel>
      <Splitter.Panel label="Content">
        <Pane title="Content">The sidebar is collapsed; its handle stays to restore it.</Pane>
      </Splitter.Panel>
    </Splitter>
  ),
};

/** Outer panels collapsed to nothing: the handle lies on the frame and the grip stays inside. */
export const CollapsedEdges: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <Splitter {...args} defaultSizes={[0, 100]} style={area}>
        <Splitter.Panel label="Sidebar" min={20} collapsible>
          <Pane title="Sidebar" />
        </Splitter.Panel>
        <Splitter.Panel label="Content">
          <Pane title="Content">Start edge</Pane>
        </Splitter.Panel>
      </Splitter>
      <Splitter {...args} defaultSizes={[100, 0]} style={area}>
        <Splitter.Panel label="Content">
          <Pane title="Content">End edge</Pane>
        </Splitter.Panel>
        <Splitter.Panel label="Inspector" min={20} collapsible>
          <Pane title="Inspector" />
        </Splitter.Panel>
      </Splitter>
      <Splitter {...args} orientation="vertical" defaultSizes={[100, 0]} style={area}>
        <Splitter.Panel label="Editor">
          <Pane title="Editor">Bottom edge</Pane>
        </Splitter.Panel>
        <Splitter.Panel label="Console" min={20} collapsible>
          <Pane title="Console" />
        </Splitter.Panel>
      </Splitter>
    </div>
  ),
};

/** The app saves `onSizesCommit` (here in state; in an app, storage) and passes it back. */
export const SavedLayout: Story = {
  render: function Render(args) {
    const [saved, setSaved] = useState<number[]>([40, 60]);
    const [live, setLive] = useState<number[]>(saved);
    return (
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <Splitter
          {...args}
          defaultSizes={saved}
          onSizesChange={setLive}
          onSizesCommit={setSaved}
          style={area}
        >
          <Splitter.Panel label="List">
            <Pane title="List" />
          </Splitter.Panel>
          <Splitter.Panel label="Detail">
            <Pane title="Detail" />
          </Splitter.Panel>
        </Splitter>
        <p className="ol-label" style={{ margin: 0 }}>
          Live {live.map((size) => size.toFixed(0)).join(" / ")} · saved{" "}
          {saved.map((size) => size.toFixed(0)).join(" / ")}
        </p>
      </div>
    );
  },
};

export const NoGrip: Story = { ...ThreePanels, args: { grip: false } };

export const Disabled: Story = { ...ThreePanels, args: { disabled: true } };

export const InsideACard: Story = {
  render: (args) => (
    <Card title="Studio notes" style={{ maxInlineSize: "calc(var(--space-32) * 6)" }}>
      <Splitter {...args} bordered={false} style={{ blockSize: "calc(var(--space-32) * 1.5)" }}>
        <Splitter.Panel label="Notes" defaultSize={40}>
          <Pane title="Notes" />
        </Splitter.Panel>
        <Splitter.Panel label="Sketch">
          <Pane title="Sketch" />
        </Splitter.Panel>
      </Splitter>
    </Card>
  ),
};

export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <Splitter {...args} style={area}>
        <Splitter.Panel label="القائمة" defaultSize={35}>
          <Pane title="القائمة" />
        </Splitter.Panel>
        <Splitter.Panel label="التفاصيل">
          <Pane title="التفاصيل" />
        </Splitter.Panel>
      </Splitter>
    </div>
  ),
};

export const Japanese: Story = {
  globals: { locale: "ja" },
  render: (args) => (
    <Splitter {...args} style={area}>
      <Splitter.Panel label="一覧" defaultSize={35}>
        <Pane title="一覧" />
      </Splitter.Panel>
      <Splitter.Panel label="詳細">
        <Pane title="詳細" />
      </Splitter.Panel>
    </Splitter>
  ),
};

export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "grid",
            gap: "var(--space-6)",
            padding: "var(--space-6)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        >
          <Splitter {...args} style={area}>
            <Splitter.Panel label="Files" defaultSize={25}>
              <Pane title="Files" />
            </Splitter.Panel>
            <Splitter.Panel label="Editor" defaultSize={50}>
              <Pane title="Editor" />
            </Splitter.Panel>
            <Splitter.Panel label="Preview">
              <Pane title="Preview" />
            </Splitter.Panel>
          </Splitter>
          <Splitter {...args} orientation="vertical" grip={false} style={area}>
            <Splitter.Panel label="Editor" defaultSize={60}>
              <Pane title="Editor" />
            </Splitter.Panel>
            <Splitter.Panel label="Console">
              <Pane title="Console" />
            </Splitter.Panel>
          </Splitter>
          <Splitter {...args} disabled style={{ blockSize: "calc(var(--space-32) * 1.5)" }}>
            <Splitter.Panel label="Fixed">
              <Pane title="Disabled" />
            </Splitter.Panel>
            <Splitter.Panel label="Panel">
              <Pane title="Panel" />
            </Splitter.Panel>
          </Splitter>
        </div>
      ))}
    </div>
  ),
};
