import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "../Badge";
import { Grid } from "../Grid";
import { Link } from "../Link";
import { Ratio } from "../Ratio";
import { Card } from "./Card";

const meta = {
  title: "Content/Card",
  component: Card,
  tags: ["autodocs"],
  args: { title: "Kitchen 04", text: "Oak and blackened steel for a Tokyo apartment." },
  parameters: {
    docs: {
      description: {
        component:
          "Card is an ink-framed box with optional head (index + meta), media, body and foot, each split by a rule.\n\n**Props** — `index`, `meta`, `media` (node), `title`, `text`, `footer` (node), `interactive` (lifts with `shadow-press` on hover), `flat` (top rule only), `href`, `as`, `headingLevel`; children go in the body.\n\n- Do use `interactive` only when the whole card is one link.\n- With `href` the title is the link and it is stretched over the card, so the card is announced by its title and footer controls stay clickable.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

const media = (
  <Ratio ratio="4/3">
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100%",
        background: "var(--maple)",
        color: "var(--ink)",
        fontFamily: "var(--font-kanji)",
        fontSize: "var(--text-h1-size)",
      }}
    >
      楓
    </div>
  </Ratio>
);

export const Default: Story = {
  args: { index: 2, meta: "Identity", media, title: "Maple Press" },
};

export const InteractiveLink: Story = {
  args: {
    index: 1,
    meta: "2026",
    interactive: true,
    href: "#",
    footer: (
      <>
        <Badge>Interior</Badge>
        <span aria-hidden="true">→</span>
      </>
    ),
  },
};

export const Flat: Story = {
  args: {
    flat: true,
    title: "Flat card",
    text: "Only a top rule. For lists of articles and editorial grids.",
    children: (
      <Link href="#" plain>
        Read →
      </Link>
    ),
  },
};

export const WithFooterActions: Story = {
  args: {
    index: 3,
    title: "Studio notes",
    footer: (
      <>
        <Link href="#">Share</Link>
        <Link href="#">Save</Link>
      </>
    ),
  },
};

export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <Grid cols={3} gap={6}>
            <Card {...args} index={1} meta="2026" interactive href="#" />
            <Card {...args} index={2} media={media} title="Maple Press" text={undefined} />
            <Card {...args} flat title="Flat card" />
          </Grid>
        </div>
      ))}
    </div>
  ),
};
