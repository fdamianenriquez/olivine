import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Avatar } from "../Avatar";
import { Button } from "../Button";
import { Chip } from "../Chip";
import { Field } from "../Field";
import { Root } from "../Root";
import { ToastProvider, useToast } from "../ToastStack";
import { ChipGroup } from "./ChipGroup";

const meta = {
  title: "Actions/ChipGroup",
  component: ChipGroup,
  tags: ["autodocs"],
  args: { label: "Woods" },
  parameters: {
    docs: {
      description: {
        component: `ChipGroup is a wrapping set of \`Chip\`s with one shared selection, one Tab stop and arrow-key navigation: a labelled toolbar of toggle buttons. Arrows, Home and End move focus (Up and Down by visual row), Space or Enter toggles, Delete or Backspace removes a removable chip, Escape clears the selection. After a removal it moves focus to the neighbouring chip and announces it.

- Do give the group a short visible or accessible name ("Filters", "Recipients").
- Do use \`selectionMode="multiple"\` for filters and \`none\` for suggestion or input chips, with \`onRemove\` for the latter.
- Do give every chip a stable \`value\` (an id, not an array index) so selection and focus survive reordering and removal.
- Do keep chip labels to one to three words and add \`textValue\` when a label is not plain text.
- Don't use it for an exclusive, always-set value (use \`SegmentedControl\`), or to switch panels (use \`Tabs\`).
- Don't put the group inside another roving container (a \`Toolbar\`); the outer toolbar owns arrows and the chips become plain chips.
- Don't hide the group's name; without it screen-reader users hear only "toolbar".
- Don't remove the focused chip and leave focus on \`body\`; update the list and let the group move focus.

The group checks for a removal when it re-renders: keep the chip list in the component that renders \`ChipGroup\` (or above it), so removing a chip re-renders the group and focus moves to the neighbour.`,
      },
    },
  },
} satisfies Meta<typeof ChipGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const stack = { display: "grid", gap: "var(--space-6)" } as const;

const woods = [
  { value: "walnut", label: "Walnut" },
  { value: "oak", label: "Oak" },
  { value: "alder", label: "Alder" },
  { value: "ash", label: "Ash" },
  { value: "maple", label: "Maple" },
];

const people = [
  { value: "u1", label: "Yui Tanaka" },
  { value: "u2", label: "Haruka Mori" },
  { value: "u3", label: "Daichi Ueno" },
];

function Filters() {
  const [value, setValue] = useState(["walnut", "alder"]);
  return (
    <ChipGroup label="Woods" selectionMode="multiple" value={value} onChange={setValue}>
      {woods.map((w) => (
        <Chip key={w.value} value={w.value}>
          {w.label}
        </Chip>
      ))}
    </ChipGroup>
  );
}

function Recipients({ initial = people }: { initial?: typeof people }) {
  const [list, setList] = useState(initial);
  return (
    <ChipGroup
      label="Recipients"
      empty="No recipients"
      onRemove={(value) => {
        setList((prev) => prev.filter((p) => p.value !== value));
      }}
    >
      {list.map((p) => (
        <Chip key={p.value} value={p.value} leading={<Avatar name={p.label} size="xs" />}>
          {p.label}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/** Filters: each press toggles one chip; Escape clears. */
export const Default: Story = { render: () => <Filters /> };

/** One filter at a time; pressing the selected chip again keeps it (`disallowEmptySelection`). */
export const Single: Story = {
  render: () => (
    <ChipGroup
      label="Sort by"
      selectionMode="single"
      defaultValue={["newest"]}
      disallowEmptySelection
    >
      <Chip value="newest">Newest</Chip>
      <Chip value="price">Price</Chip>
      <Chip value="wood">Wood</Chip>
    </ChipGroup>
  ),
};

/** Remove-only chips: Delete or Backspace on a chip, or its ×; focus moves to the neighbour. */
export const Removable: Story = { render: () => <Recipients /> };

/** Mode `none`: action chips, no selection. */
export const Suggestions: Story = {
  render: () => (
    <ChipGroup label="Suggestions">
      <Chip value="add" onClick={() => undefined}>
        Add walnut
      </Chip>
      <Chip value="compare" onClick={() => undefined}>
        Compare bodies
      </Chip>
      <Chip value="fitting" onClick={() => undefined} leading="→">
        Book a fitting
      </Chip>
    </ChipGroup>
  ),
};

/** Rows wrap in a narrow container; Up and Down move by visual row. */
export const Wrapped: Story = {
  render: () => (
    <div style={{ inlineSize: "calc(var(--space-32) * 2)" }}>
      <ChipGroup label="Woods" selectionMode="multiple" defaultValue={["oak"]}>
        {[...woods, { value: "cherry", label: "Cherry" }, { value: "birch", label: "Birch" }].map(
          (w) => (
            <Chip key={w.value} value={w.value}>
              {w.label}
            </Chip>
          ),
        )}
      </ChipGroup>
    </div>
  ),
};

/** A disabled chip is skipped by the arrows and keeps its selection through Escape. */
export const DisabledChip: Story = {
  render: () => (
    <div style={stack}>
      <ChipGroup label="Woods" selectionMode="multiple" defaultValue={["oak", "alder"]}>
        {woods.map((w) => (
          <Chip key={w.value} value={w.value} disabled={w.value === "alder"}>
            {w.label}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label="Woods (disabled)" selectionMode="multiple" defaultValue={["oak"]} disabled>
        {woods.map((w) => (
          <Chip key={w.value} value={w.value}>
            {w.label}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  ),
};

/** No chips: the `empty` content shows and the root is a plain group. */
export const Empty: Story = { render: () => <Recipients initial={[]} /> };

/** Named by its own `label`; the Field adds the hint and the error to the description. */
export const InField: Story = {
  name: "In a Field",
  render: () => (
    <Field hint="Pick the woods you want quoted." error="Pick at least one wood.">
      <ChipGroup label="Woods" selectionMode="multiple" name="woods">
        {woods.map((w) => (
          <Chip key={w.value} value={w.value}>
            {w.label}
          </Chip>
        ))}
      </ChipGroup>
    </Field>
  ),
};

function UndoList() {
  const toast = useToast();
  const [list, setList] = useState(people);
  return (
    <ChipGroup
      label="Recipients"
      empty="No recipients"
      onRemove={(value) => {
        const index = list.findIndex((p) => p.value === value);
        const removed = list[index];
        if (!removed) return;
        setList((prev) => prev.filter((p) => p.value !== value));
        const id = toast.show({
          title: `${removed.label} removed`,
          description: (
            <Button
              size="s"
              variant="outline"
              onClick={() => {
                setList((prev) => {
                  const next = [...prev];
                  next.splice(Math.min(index, next.length), 0, removed);
                  return next;
                });
                toast.dismiss(id);
              }}
            >
              Undo
            </Button>
          ),
        });
      }}
      // The toast says it; the group stays silent.
      announce={false}
    >
      {list.map((p) => (
        <Chip key={p.value} value={p.value}>
          {p.label}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/**
 * The app side of removal: update the list, offer an undo. ToastStack has no action slot yet, so
 * this story puts the Undo button in the toast's description.
 */
export const RemoveWithUndo: Story = {
  name: "Remove with undo toast",
  render: () => (
    <ToastProvider duration={8000}>
      <UndoList />
    </ToastProvider>
  ),
};

/** The ✓ appears at once: the chip's hanko collapses under reduced motion. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <Filters />
    </div>
  ),
};

function Gallery() {
  return (
    <div style={stack}>
      <Filters />
      <ChipGroup label="Woods" selectionMode="multiple" defaultValue={["oak"]} disabled>
        {woods.slice(0, 3).map((w) => (
          <Chip key={w.value} value={w.value}>
            {w.label}
          </Chip>
        ))}
      </ChipGroup>
      <Recipients />
      <Recipients initial={[]} />
    </div>
  );
}

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Gallery />
        </Root>
      ))}
    </div>
  ),
};
