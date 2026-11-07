import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

import { Badge } from "../Badge";
import { Button } from "../Button";
import { Card } from "../Card";
import { Link } from "../Link";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { DescriptionList, type DescriptionListEntry } from "./DescriptionList";

/** The Shirakaba demo's guitar, as a spec sheet. */
const spec: DescriptionListEntry[] = [
  { term: "Body wood", description: "Birch, 38 mm" },
  { term: "Neck", description: "Maple, satin finish" },
  { term: "Scale length", description: "648", numeric: true, unit: "mm" },
  { term: "Lead time", description: "14", numeric: true, unit: "weeks" },
  { term: "Price", description: "¥480,000", numeric: true },
  { term: "Serial", description: "SK-0042-A", mono: true },
];

const meta = {
  title: "Content/DescriptionList",
  component: DescriptionList,
  tags: ["autodocs"],
  args: { items: spec },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
    variant: { control: "inline-radio", options: ["ruled", "bordered", "plain"] },
    termWidth: { control: "inline-radio", options: ["s", "m", "l"] },
  },
  parameters: {
    docs: {
      description: {
        component: `DescriptionList is the spec sheet: the attributes of one thing as terms and values, on the native \`dl\`, \`dt\` and \`dd\`. It is a Table turned sideways without a header.

**Props** — \`items\` (\`{ key, term, description, numeric, mono, unit }[]\`), \`orientation\` (\`horizontal\` stacks by itself in a narrow container), \`variant\` (\`ruled\`, \`bordered\`, \`plain\`), \`dense\`, \`termWidth\` (\`s\`, \`m\`, \`l\`), \`emptyValue\`. Compound parts: \`DescriptionList.Item\` (\`term\`, \`numeric\`, \`mono\`, \`unit\`, \`emptyValue\`), \`.Term\`, \`.Description\`.

- Do set terms in one to three words, sentence case, without a colon.
- Do put amounts and quantities in \`numeric\` values and their units in \`unit\`, so the figure face holds digits and symbols only.
- Do show a missing value as an empty value instead of omitting the row.
- Do give the list a heading before it: a \`dl\` cannot carry a name.
- Do use \`bordered\` for a standalone sheet, \`ruled\` in running content and \`plain\` inside a Card.
- Do give the list a parent with a width: it is a size container (\`container-type: inline-size\`), so shrink-to-fit parents (\`inline-flex\`, floats, \`auto\` grid tracks) collapse it. In a flex row give it \`flex: 1\` or an \`inline-size\`.
- Do pass \`emptyValue\` a non-interactive glyph or word: it is rendered inside \`aria-hidden\`.
- Don't add ARIA roles, \`aria-label\` or \`tabindex\`; rows are not clickable. Put a status in a value as a Badge with a word.
- Don't use it for several records with shared columns (Table) or for long paragraphs.`,
      },
    },
  },
} satisfies Meta<typeof DescriptionList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A heading before the list names it, as the guideline asks. */
function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 style={{ marginBlock: "0 var(--space-3)" }}>{title}</h3>
      {children}
    </section>
  );
}

export const Default: Story = {
  render: (args) => (
    <Sheet title="Model 04 specification">
      <DescriptionList {...args} />
    </Sheet>
  ),
};

export const Bordered: Story = {
  args: { variant: "bordered" },
  render: (args) => (
    <Sheet title="Model 04 specification">
      <DescriptionList {...args} />
    </Sheet>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-6)", maxInlineSize: "24rem" }}>
      <DescriptionList {...args} />
      <DescriptionList {...args} variant="bordered" />
    </div>
  ),
};

export const Dense: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      <DescriptionList {...args} dense />
      <DescriptionList {...args} dense variant="bordered" />
    </div>
  ),
};

export const TermWidths: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      {(["s", "m", "l"] as const).map((width) => (
        <Sheet key={width} title={`termWidth="${width}"`}>
          <DescriptionList {...args} variant="bordered" termWidth={width} />
        </Sheet>
      ))}
    </div>
  ),
};

/** Drag the corner: below 30rem of container width the rows stack by themselves. */
export const NarrowContainer: Story = {
  render: (args) => (
    <div
      style={{
        inlineSize: "36rem",
        maxInlineSize: "100%",
        minInlineSize: "12rem",
        overflow: "auto",
        resize: "horizontal",
        padding: "var(--space-3)",
        border: "var(--stroke-hair) dashed var(--rule)",
      }}
    >
      <DescriptionList {...args} variant="bordered" />
    </div>
  ),
};

export const NumericWithUnit: Story = {
  args: {
    items: [
      { term: "Scale length", description: "648", numeric: true, unit: "mm" },
      { term: "Nut width", description: "42.5", numeric: true, unit: "mm" },
      { term: "Weight", description: "3.4", numeric: true, unit: "kg" },
      { term: "Lead time", description: "14", numeric: true, unit: "weeks" },
      { term: "Subtotal", description: "¥480,000", numeric: true },
      { term: "Tax", description: "¥48,000", numeric: true },
      { term: "Total", description: "¥528,000", numeric: true },
    ],
  },
};

export const MonoIds: Story = {
  args: {
    items: [
      { term: "Order", description: "ORD-2026-11-0042", mono: true },
      { term: "Serial", description: "SK-0042-A", mono: true },
      { term: "Placed", description: "2026-11-06 09:41 JST", mono: true },
      { term: "Shipped to", description: "Kyoto, Japan" },
    ],
  },
};

export const SeveralTermsAndValues: Story = {
  render: (args) => (
    <DescriptionList {...args} variant="bordered">
      <DescriptionList.Item term={["Neck", "Fretboard"]}>Maple</DescriptionList.Item>
      <DescriptionList.Item term="Pickups">
        <DescriptionList.Description>Bridge: humbucker</DescriptionList.Description>
        <DescriptionList.Description>Neck: single coil</DescriptionList.Description>
      </DescriptionList.Item>
      <DescriptionList.Item>
        <DescriptionList.Term>Colour</DescriptionList.Term>
        <DescriptionList.Term>Colourway</DescriptionList.Term>
        <DescriptionList.Description>Natural</DescriptionList.Description>
        <DescriptionList.Description>Black</DescriptionList.Description>
      </DescriptionList.Item>
      <DescriptionList.Item term="Weight" numeric unit="kg">
        3.4
      </DescriptionList.Item>
    </DescriptionList>
  ),
};

export const RichValues: Story = {
  render: (args) => (
    <DescriptionList {...args}>
      <DescriptionList.Item term="Status">
        <Badge tone="success" dot>
          In stock
        </Badge>
      </DescriptionList.Item>
      <DescriptionList.Item term="Manual">
        <Link href="#manual">Read the manual</Link>
      </DescriptionList.Item>
      <DescriptionList.Item term="Maker">Shirakaba Guitars, Kyoto</DescriptionList.Item>
    </DescriptionList>
  ),
};

export const EmptyValues: Story = {
  args: {
    variant: "bordered",
    items: [
      { term: "Body wood", description: "Birch, 38 mm" },
      { term: "Finish", description: null },
      { term: "Weight", description: undefined, numeric: true, unit: "kg" },
      { term: "Serial", description: "", mono: true },
      { term: "Defects", description: 0, numeric: true },
    ],
  },
};

export const CustomEmptyValue: Story = {
  args: { emptyValue: "n/a", items: spec.map((e, i) => (i % 2 ? { ...e, description: null } : e)) },
};

/** In a flex row the list needs `flex: 1` (or an `inline-size`); without it the row would collapse it. */
export const InFlexRow: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "flex-start" }}>
      <DescriptionList {...args} variant="bordered" style={{ flex: 1 }} />
      <DescriptionList {...args} variant="bordered" style={{ flex: 1 }} dense />
    </div>
  ),
};

/** A list inside a value keeps its own variant: the outer variant does not reach it. */
export const Nested: Story = {
  render: (args) => (
    <DescriptionList {...args} variant="bordered">
      <DescriptionList.Item term="Model">Shirakaba 04</DescriptionList.Item>
      <DescriptionList.Item term="Neck">
        <DescriptionList
          variant="plain"
          dense
          termWidth="s"
          items={[
            { term: "Wood", description: "Maple" },
            { term: "Radius", description: "305", numeric: true, unit: "mm" },
          ]}
        />
      </DescriptionList.Item>
    </DescriptionList>
  ),
};

export const InsideCard: Story = {
  render: (args) => (
    <div style={{ maxInlineSize: "28rem" }}>
      <Card title="Model 04" meta="Spec" index={4}>
        <DescriptionList {...args} variant="plain" dense termWidth="s" />
      </Card>
    </div>
  ),
};

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Show specification
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Model 04"
        footer={
          <Button
            onClick={() => {
              setOpen(false);
            }}
          >
            Close
          </Button>
        }
      >
        <DescriptionList items={spec} variant="plain" />
      </Modal>
    </>
  );
}

export const InsideModal: Story = {
  render: () => <ModalDemo />,
};

export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl" lang="ar">
      <DescriptionList
        {...args}
        variant="bordered"
        items={[
          { term: "الخشب", description: "البتولا" },
          { term: "طول المقياس", description: "648", numeric: true, unit: "مم" },
          { term: "السعر", description: "480,000", numeric: true },
          { term: "الرقم التسلسلي", description: "SK-0042-A", mono: true },
          { term: "التشطيب", description: null },
        ]}
      />
    </div>
  ),
};

const jaSpec: DescriptionListEntry[] = [
  { term: "ボディ材", description: "バーチ、38 mm" },
  { term: "スケール長", description: "648", numeric: true, unit: "mm" },
  { term: "納期", description: "14", numeric: true, unit: "週間" },
  { term: "仕上げ", description: null },
];

const esSpec: DescriptionListEntry[] = [
  { term: "Madera del cuerpo", description: "Abedul, 38 mm" },
  { term: "Longitud de escala", description: "648", numeric: true, unit: "mm" },
  { term: "Plazo de entrega", description: "14", numeric: true, unit: "semanas" },
  { term: "Acabado", description: null },
];

/** The spoken empty value follows the locale; terms and values are the app's content. */
export const Locales: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      <Root locale="es">
        <DescriptionList {...args} variant="bordered" items={esSpec} />
      </Root>
      <Root locale="ja">
        <DescriptionList {...args} variant="bordered" items={jaSpec} />
      </Root>
    </div>
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
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <DescriptionList {...args} />
          <DescriptionList {...args} variant="bordered" />
          <DescriptionList {...args} orientation="vertical" dense variant="bordered" />
        </div>
      ))}
    </div>
  ),
};
