import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Text } from "../Text";
import { Tabs } from "./Tabs";

const meta = {
  title: "Navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: { label: "Project sections", children: null },
  parameters: {
    docs: {
      description: {
        component:
          "Tabs switch between panels in place; the selected tab is an ink-outlined box with an olive top edge that slides to the next tab. Arrow keys move between tabs, Home and End jump to the ends, and a list that is wider than its container scrolls with buttons at its ends. Use Tabs to split related content of equal weight; use SegmentedControl to pick a value, links or Nav for pages, Accordion for stacked disclosure.\n\n" +
          "**Behaviour** — One Tab stop on the selected tab, then the panel. Arrows wrap and skip disabled tabs; Left and Right swap in right-to-left text; vertical tabs use Up and Down. Keys held with Ctrl, Alt or Meta are left to the browser. If the selected tab is disabled or missing, the first enabled tab is shown selected. A panel is a Tab stop only when it has no focusable content. When the list overflows, the selected tab is scrolled into view and buttons appear at the ends (pointer aids: not Tab stops, hidden from screen readers). Inactive panels stay mounted unless `keepMounted={false}`.\n\n" +
          "**States** — Selected: ink-outlined box with an olive edge (top; inline start when vertical). The box changes at once; the top edge slides on `--dur-m` / `--ease-move`, labels cross over on `--dur-s`. Reduced motion: the edge jumps.\n\n" +
          '- Do give the list a short name ("Sections").\n- Do keep tab labels to one or two words.\n- Do use `activation="manual"` when a panel loads data or is expensive to render.\n- Don\'t use Tabs for page navigation (links) or to hide steps the user must complete.\n- Don\'t nest Tabs or use more than about seven tabs; use Select or a different structure.',
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

const panels = [
  <Tabs.Tab key="1" label="Concept">
    <Text tone="muted">A kitchen is a room of verbs: cut, wash, wait.</Text>
  </Tabs.Tab>,
  <Tabs.Tab key="2" label="Material">
    <Text tone="muted">Oak, steel, washi.</Text>
  </Tabs.Tab>,
  <Tabs.Tab key="3" label="Process">
    <Text tone="muted">Drawings, models, mock-ups.</Text>
  </Tabs.Tab>,
];

const rooms = [
  "Entrance",
  "Kitchen",
  "Dining",
  "Living",
  "Study",
  "Tatami",
  "Bath",
  "Engawa",
  "Garden",
  "Storage",
  "Roof",
  "Notes",
].map((room) => (
  <Tabs.Tab key={room} label={room}>
    <Text tone="muted">{room}: plans, finishes and the open questions for this room.</Text>
  </Tabs.Tab>
));

export const Default: Story = { render: (args) => <Tabs {...args}>{panels}</Tabs> };

export const Indexed: Story = {
  render: (args) => (
    <Tabs {...args} indexed>
      {panels}
    </Tabs>
  ),
};

export const Fill: Story = {
  render: (args) => (
    <Tabs {...args} fill>
      {panels}
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  render: (args) => (
    <Tabs {...args} indexed>
      {panels}
      <Tabs.Tab label="Locked" disabled />
    </Tabs>
  ),
};

/** A selected index that points at a disabled tab shows the first enabled tab instead. */
export const DisabledSelectedFallback: Story = {
  render: (args) => (
    <Tabs {...args} defaultValue={0}>
      <Tabs.Tab label="Archive" disabled />
      {panels}
    </Tabs>
  ),
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState(1);
    return (
      <Tabs {...args} value={value} onChange={setValue}>
        {panels}
      </Tabs>
    );
  },
};

/** Arrows move focus only; Space or Enter selects. For panels that load data. */
export const ManualActivation: Story = {
  args: { activation: "manual" },
  render: (args) => <Tabs {...args}>{panels}</Tabs>,
};

/** Twelve tabs in a narrow frame, starting on a tab that is off-screen. */
export const Scrollable: Story = {
  render: (args) => (
    <div style={{ maxWidth: "calc(var(--space-32) * 4)" }}>
      <Tabs {...args} label="Rooms" defaultValue={7}>
        {rooms}
      </Tabs>
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <Tabs {...args} indexed>
      {panels}
      <Tabs.Tab label="Locked" disabled />
    </Tabs>
  ),
};

/** A vertical list in a frame of fixed height scrolls with buttons above and below. */
export const VerticalScrollable: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <Tabs {...args} label="Rooms" defaultValue={6} style={{ height: "calc(var(--space-32) * 2)" }}>
      {rooms}
    </Tabs>
  ),
};

export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl" style={{ maxWidth: "calc(var(--space-32) * 4)" }}>
      <Tabs {...args} label="Rooms" defaultValue={3}>
        {rooms}
      </Tabs>
    </div>
  ),
};

export const RightToLeftVertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div dir="rtl">
      <Tabs
        {...args}
        label="Rooms"
        defaultValue={6}
        style={{ height: "calc(var(--space-32) * 2)" }}
      >
        {rooms}
      </Tabs>
    </div>
  ),
};

/** Inactive panels keep their state by default; with `keepMounted={false}` they unmount. */
export const PanelWithForm: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-8)" }}>
      {[true, false].map((keepMounted) => (
        <Tabs
          key={String(keepMounted)}
          {...args}
          label={keepMounted ? "Kept mounted" : "Unmounted"}
          keepMounted={keepMounted}
        >
          <Tabs.Tab label={keepMounted ? "Note (kept)" : "Note (reset)"}>
            <label>
              <Text as="span" tone="muted">
                Type, switch tabs and come back:{" "}
              </Text>
              <input defaultValue="" />
            </label>
          </Tabs.Tab>
          {panels}
        </Tabs>
      ))}
    </div>
  ),
};

const themed = (render: (theme: "washi" | "sumi") => React.ReactNode) => (
  <div style={{ display: "grid", gap: "var(--space-4)" }}>
    {(["washi", "sumi"] as const).map((theme) => (
      <div
        key={theme}
        className="ol"
        data-theme={theme}
        style={{ padding: "var(--space-4)", background: "var(--paper)" }}
      >
        {render(theme)}
      </div>
    ))}
  </div>
);

export const Themes: Story = {
  render: (args) =>
    themed(() => (
      <Tabs {...args} indexed>
        {panels}
        <Tabs.Tab label="Locked" disabled />
      </Tabs>
    )),
};

export const ThemesScrollable: Story = {
  render: (args) =>
    themed(() => (
      <div style={{ maxWidth: "calc(var(--space-32) * 4)" }}>
        <Tabs {...args} label="Rooms" defaultValue={7}>
          {rooms}
        </Tabs>
      </div>
    )),
};

export const ThemesVertical: Story = {
  args: { orientation: "vertical" },
  render: (args) =>
    themed(() => (
      <Tabs {...args} indexed>
        {panels}
        <Tabs.Tab label="Locked" disabled />
      </Tabs>
    )),
};
