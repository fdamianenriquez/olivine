import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Root } from "../Root";
import type { TreeNode } from "./tree";
import { TreeView } from "./TreeView";

const FILES: TreeNode[] = [
  {
    id: "drawings",
    label: "Drawings",
    children: [
      { id: "kitchen", label: "Kitchen 04", meta: "12 sheets" },
      { id: "storage", label: "Storage wall", meta: "6 sheets" },
      { id: "stair", label: "Stair", meta: "3 sheets" },
    ],
  },
  {
    id: "materials",
    label: "Materials",
    children: [
      {
        id: "wood",
        label: "Wood",
        children: [
          { id: "oak", label: "Oak" },
          { id: "walnut", label: "Walnut" },
          { id: "hinoki", label: "Hinoki" },
        ],
      },
      {
        id: "metal",
        label: "Metal",
        children: [
          { id: "steel", label: "Blackened steel" },
          { id: "brass", label: "Brass" },
        ],
      },
      { id: "paper", label: "Washi paper" },
    ],
  },
  { id: "notes", label: "Site notes" },
  { id: "invoice", label: "Invoice 0412" },
];

const meta = {
  title: "Navigation/TreeView",
  component: TreeView,
  tags: ["autodocs"],
  args: { label: "Project files", items: FILES },
  parameters: {
    docs: {
      description: {
        component: `TreeView is an expandable hierarchy of ruled rows: a +/− sign, an optional check mark, a label with an optional description and meta, indented by level. It has one tab stop; Up and Down move through the visible nodes, Right and Left open, close and climb, Home and End jump, typing finds a node by its first letters and \`*\` opens all siblings. It can select one node, several, or tick checkboxes whose parents follow their children and show a mixed mark; children can load on demand. Selected rows are ink, the keyboard focus is the olive inset ring and \`current\` marks where you are with an olive edge. Use \`Accordion\` for independent sections, \`Listbox\` for a flat list of choices, \`Nav\` or \`Sidebar\` for navigation.

- Do name the tree (\`label\`) and give every node a stable, unique \`id\`.
- Do use \`checkboxes\` for "tick many, parents follow", and \`selectionMode="single"\` for "pick one thing".
- Do load deep or huge hierarchies lazily with \`hasChildren\` and \`onLoadChildren\`.
- Do pass \`textValue\` when a label is an icon, an amount or markup, or a kanji label that Latin typing should find.
- Do give long trees a \`rows\` height so they scroll inside themselves.
- Don't use it as the site menu: navigation with show/hide groups is \`Nav\`, \`Sidebar\` or \`Disclosure\`.
- Don't put buttons, links or inputs inside a node label: the whole row is the control.
- Don't render thousands of open rows at once: there is no virtualisation.
- Don't use selection and \`current\` to mean the same thing: \`current\` is where you are, selection is what you picked.
- Don't rely on \`fold\` to explain a change: the sign and \`aria-expanded\` already do.`,
      },
    },
  },
} satisfies Meta<typeof TreeView>;

export default meta;

type Story = StoryObj<typeof meta>;

const column: CSSProperties = { width: "calc(var(--space-32) * 2.5)", maxWidth: "100%" };
const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "var(--space-6)" };
const output: CSSProperties = {
  margin: "var(--space-3) 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-body-s-size)",
  overflowWrap: "anywhere",
};

function DefaultDemo({ label }: { label: string }) {
  const [last, setLast] = useState<string>("none yet");
  return (
    <div style={column}>
      <TreeView
        label={label}
        items={FILES}
        boxed
        defaultExpanded={["materials"]}
        onAction={(id) => {
          setLast(id);
        }}
      />
      <p style={output}>onAction: {last}</p>
    </div>
  );
}

/** No selection: a click on a parent opens it, `onAction` reports the click or Enter. */
export const Default: Story = {
  render: (args) => <DefaultDemo label={args.label ?? "Project files"} />,
};

function SingleDemo({ label }: { label: string }) {
  const [value, setValue] = useState<string | null>("walnut");
  return (
    <div style={column}>
      <TreeView
        label={label}
        items={FILES}
        boxed
        selectionMode="single"
        defaultExpanded={["materials", "wood"]}
        value={value}
        onChange={setValue}
      />
      <p style={output}>{JSON.stringify(value)}</p>
    </div>
  );
}

/** One selected node: a click selects the row, only the sign opens it; Enter opens, Space selects. */
export const Single: Story = {
  render: (args) => <SingleDemo label={args.label ?? "Project files"} />,
};

function MultipleDemo({ label }: { label: string }) {
  const [value, setValue] = useState<string[]>(["oak", "brass"]);
  return (
    <div style={column}>
      <TreeView
        label={label}
        items={FILES}
        boxed
        selectionMode="multiple"
        defaultExpanded={["materials", "wood", "metal"]}
        value={value}
        onChange={setValue}
      />
      <p style={output}>{JSON.stringify(value)}</p>
    </div>
  );
}

/** Several selected nodes: Space toggles, Shift+Arrow moves and toggles, Shift+Space selects a range, Ctrl+A selects every loaded node. */
export const Multiple: Story = {
  render: (args) => <MultipleDemo label={args.label ?? "Project files"} />,
};

function CheckboxesDemo({ label }: { label: string }) {
  const [value, setValue] = useState<string[]>(["oak", "hinoki", "brass"]);
  return (
    <div style={column}>
      <TreeView
        label={label}
        items={FILES}
        boxed
        checkboxes
        defaultExpanded={["materials", "wood", "metal"]}
        value={value}
        onChange={setValue}
      />
      <p style={output}>{JSON.stringify(value)}</p>
    </div>
  );
}

/** Checkboxes: parents follow their children and show a mixed mark; the value includes the parent ids. */
export const Checkboxes: Story = {
  render: (args) => <CheckboxesDemo label={args.label ?? "Project files"} />,
};

const SHELF: TreeNode[] = [
  {
    id: "shelf",
    label: "Shelf",
    children: [
      { id: "frame", label: "Frame" },
      { id: "doors", label: "Doors", disabled: true, description: "Out of stock" },
      { id: "handles", label: "Handles" },
    ],
  },
  {
    id: "group",
    label: "Finishes (group only)",
    selectable: false,
    children: [
      { id: "oil", label: "Oil" },
      { id: "wax", label: "Wax" },
    ],
  },
];

/** A disabled child is left out of its parent's state; a node with `selectable: false` only groups. */
export const CheckboxRules: Story = {
  render: (args) => (
    <div style={column}>
      <TreeView
        label={args.label}
        items={SHELF}
        boxed
        checkboxes
        defaultExpanded={["shelf", "group"]}
        defaultValue={["frame", "handles"]}
      />
    </div>
  ),
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const LOADABLE: TreeNode[] = [
  { id: "archive", label: "Archive", hasChildren: true, meta: "on demand" },
  { id: "broken", label: "Offline share", hasChildren: true, meta: "fails" },
  { id: "current", label: "Current year" },
];

function LazyDemo({ label }: { label: string }) {
  const [items, setItems] = useState<TreeNode[]>(LOADABLE);
  return (
    <div style={column}>
      <TreeView
        label={label}
        items={items}
        boxed
        onLoadChildren={async (node) => {
          await wait(900);
          if (node.id === "broken") throw new Error("offline");
          setItems((prev) =>
            prev.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    children: [
                      { id: `${n.id}-2023`, label: "2023" },
                      { id: `${n.id}-2024`, label: "2024" },
                      { id: `${n.id}-2025`, label: "2025", hasChildren: true },
                    ],
                  }
                : n,
            ),
          );
        }}
      />
    </div>
  );
}

/** Children load when a branch first opens: a loading row, a status for the result, a retry after a failure. */
export const LazyLoading: Story = {
  render: (args) => <LazyDemo label={args.label ?? "Project files"} />,
};

/** `current` is an olive edge for where you are; selection is separate and keeps the ink row. */
export const Current: Story = {
  render: (args) => (
    <div style={column}>
      <TreeView
        label={args.label}
        items={FILES}
        boxed
        selectionMode="single"
        defaultExpanded={["drawings", "materials"]}
        defaultValue="stair"
        current="kitchen"
      />
    </div>
  ),
};

const WITH_DISABLED: TreeNode[] = [
  {
    id: "open",
    label: "Shared",
    children: [
      { id: "plan", label: "Floor plan" },
      { id: "locked", label: "Contract", disabled: true, description: "Signed copies only" },
      {
        id: "private",
        label: "Private",
        disabled: true,
        children: [{ id: "inside", label: "Reachable inside a disabled parent" }],
      },
    ],
  },
];

/** Disabled nodes are skipped by the keys and cannot be selected or toggled; their open children stay reachable. */
export const DisabledNodes: Story = {
  render: (args) => (
    <div style={{ ...row, alignItems: "start" }}>
      <div style={column}>
        <TreeView
          label={args.label}
          items={WITH_DISABLED}
          boxed
          selectionMode="single"
          defaultExpanded={["open", "private"]}
          defaultValue="plan"
        />
      </div>
      <div style={column}>
        <TreeView
          label="Whole tree disabled"
          items={FILES}
          boxed
          disabled
          selectionMode="single"
          defaultExpanded={["materials"]}
          defaultValue="walnut"
        />
      </div>
    </div>
  ),
};

const DETAILED: TreeNode[] = [
  {
    id: "orders",
    label: "Orders",
    meta: "3",
    description: "Open and shipped",
    children: [
      { id: "o1", label: "Kitchen 04", description: "Oak, blackened steel", meta: "12 weeks" },
      { id: "o2", label: "Storage wall", description: "Hinoki, washi", meta: "8 weeks" },
      { id: "o3", label: "Stair", description: "Walnut", meta: "Shipped" },
    ],
  },
  { id: "samples", label: "Samples", meta: "9", description: "Boards and swatches" },
];

/** A description under the label and a trailing meta; both are read as the node's description. */
export const DescriptionsAndMeta: Story = {
  render: (args) => (
    <div style={column}>
      <TreeView
        label={args.label}
        items={DETAILED}
        boxed
        selectionMode="single"
        defaultExpanded={["orders"]}
        defaultValue="o2"
      />
    </div>
  ),
};

/** `size="m"`: 44px rows, as on touch screens. */
export const SizeM: Story = {
  render: (args) => (
    <div style={column}>
      <TreeView
        label={args.label}
        items={FILES}
        boxed
        size="m"
        selectionMode="single"
        defaultExpanded={["materials"]}
        defaultValue="oak"
      />
    </div>
  ),
};

const LONG: TreeNode[] = Array.from({ length: 8 }, (_, g) => ({
  id: `group-${String(g)}`,
  label: `Batch ${String(g + 1)}`,
  children: Array.from({ length: 6 }, (_, i) => ({
    id: `group-${String(g)}-${String(i)}`,
    label: `Board ${String(g + 1)}.${String(i + 1)}`,
  })),
}));

/** `rows` caps the height at whole rows; the tree scrolls inside itself, never the page. */
export const Rows: Story = {
  render: (args) => (
    <div style={column}>
      <TreeView
        label={args.label}
        items={LONG}
        boxed
        rows={8}
        selectionMode="single"
        defaultExpanded={["group-0", "group-1"]}
        defaultValue="group-1-3"
      />
    </div>
  ),
};

/** Right to left: the indent, the sign, the edge and Left/Right all follow the writing direction. */
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl" style={column}>
      <TreeView
        label={args.label}
        items={FILES}
        boxed
        selectionMode="single"
        defaultExpanded={["materials", "wood"]}
        defaultValue="oak"
        current="notes"
      />
    </div>
  ),
};

const NIPPON: TreeNode[] = [
  {
    id: "kanto",
    label: "関東",
    textValue: "kanto",
    children: [
      { id: "tokyo", label: "東京", textValue: "tokyo", meta: "23区" },
      { id: "kanagawa", label: "神奈川", textValue: "kanagawa" },
    ],
  },
  {
    id: "kansai",
    label: "関西",
    textValue: "kansai",
    children: [
      { id: "kyoto", label: "京都", textValue: "kyoto", description: "古都" },
      { id: "osaka", label: "大阪", textValue: "osaka" },
    ],
  },
];

/** Japanese labels: `textValue` holds a reading, so typing "k" then "o" finds 京都 with a Latin keyboard. */
export const Japanese: Story = {
  render: () => (
    <Root locale="ja">
      <div style={row}>
        <div style={column}>
          <TreeView
            label="地域"
            items={NIPPON}
            boxed
            checkboxes
            defaultExpanded={["kanto", "kansai"]}
            defaultValue={["tokyo"]}
          />
        </div>
        <div style={column}>
          <TreeView label="候補" items={[]} boxed />
        </div>
      </div>
    </Root>
  ),
};

/** `fold`: a branch opens like a folding screen, hinged on the row above. Only a click or a key animates; `*` and Expand all are instant. */
export const Fold: Story = {
  render: (args) => (
    <div style={column}>
      <TreeView
        label={args.label}
        items={FILES}
        boxed
        fold
        defaultExpanded={["materials"]}
        selectionMode="single"
        expandOn="row"
      />
    </div>
  ),
};

/** Under reduced motion the fold is instant; the tree is correct without it. */
export const ReducedMotion: Story = {
  render: (args) => (
    <div className={REDUCE_MOTION_CLASS} style={column}>
      <TreeView label={args.label} items={FILES} boxed fold />
    </div>
  ),
};

/** No nodes: the root becomes a plain group with the locale's "No items", or `empty`. */
export const Empty: Story = {
  render: () => (
    <div style={row}>
      <div style={column}>
        <TreeView label="Files" items={[]} boxed />
      </div>
      <div style={column}>
        <TreeView label="Files" items={[]} boxed empty="Nothing in this folder" />
      </div>
    </div>
  ),
};

/** `loading`: the tree is busy and a status row sits under the nodes, which stay usable. */
export const Loading: Story = {
  render: () => (
    <div style={row}>
      <div style={column}>
        <TreeView label="Files" items={FILES.slice(0, 2)} boxed loading />
      </div>
      <div style={column}>
        <TreeView label="Files" items={[]} boxed loading />
      </div>
    </div>
  ),
};

function Gallery() {
  return (
    <div style={{ ...row, alignItems: "start" }}>
      <div style={column}>
        <TreeView
          label="Single"
          items={FILES}
          boxed
          selectionMode="single"
          defaultExpanded={["materials", "wood"]}
          defaultValue="walnut"
          current="notes"
        />
      </div>
      <div style={column}>
        <TreeView
          label="Checkboxes"
          items={FILES}
          boxed
          checkboxes
          defaultExpanded={["materials", "wood", "metal"]}
          defaultValue={["oak", "hinoki", "brass"]}
        />
      </div>
      <div style={{ ...column, display: "grid", gap: "var(--space-6)" }}>
        <TreeView
          label="Details"
          items={DETAILED}
          boxed
          selectionMode="multiple"
          defaultExpanded={["orders"]}
          defaultValue={["o1"]}
        />
        <TreeView
          label="Disabled nodes"
          items={WITH_DISABLED}
          boxed
          selectionMode="single"
          defaultExpanded={["open"]}
          defaultValue="plan"
        />
        <TreeView label="Loading" items={LOADABLE.slice(0, 1)} boxed loading />
      </div>
    </div>
  );
}

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Gallery />
        </Root>
      ))}
    </div>
  ),
};
