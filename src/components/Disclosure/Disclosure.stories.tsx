import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Disclosure } from "./Disclosure";

const shipping =
  "Orders ship within ten days from our workshop in Nagano. Each piece is wrapped in washi and packed in a cedar crate; delivery to Europe takes about two weeks.";

const meta = {
  title: "Content/Disclosure",
  component: Disclosure,
  tags: ["autodocs"],
  args: { summary: "Shipping and returns", children: shipping },
  parameters: {
    docs: {
      description: {
        component:
          "Disclosure is one show/hide section: a full-width button with a +/− sign over a hairline-ruled panel that unrolls like a hanging scroll. It keeps the page's reading order and never floats.\n\n- Use one for a single self-contained section; use `Accordion` for three or more related sections.\n- Write a summary of one to five words that names the content, and keep it the same open or closed: `aria-expanded` already says the state.\n- Pick `headingLevel` to fit the page outline when the summary acts as a section title.\n- Closed content is not rendered. Use `keepMounted` to preserve form fields or media, and `findable` for long reference text readers search with find-in-page (Chromium-family browsers). A find-in-page reveal is instant, with no unroll. A controlled `findable` parent must accept `onOpenChange(true)`: the browser has already removed `hidden` when the match fires.\n- Only `clip-path` animates, so the content below moves in one step when the panel opens and when it finishes closing. Reduced motion needs no prop: the motion tokens shorten the roll.\n- Don't hide errors, required fields or legal text inside a closed disclosure.",
      },
    },
  },
} satisfies Meta<typeof Disclosure>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

export const Bare: Story = {
  args: { variant: "bare", summary: "Show advanced options", defaultOpen: true },
};

export const HeadingLevel: Story = { args: { headingLevel: 2, defaultOpen: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Region: Story = { args: { panelRole: "region", defaultOpen: true } };

export const Controlled: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        <Disclosure {...args} open={open} onOpenChange={setOpen} />
        <p className="ol-label" style={{ margin: 0 }}>
          {open ? "The parent holds it open." : "The parent holds it closed."}
        </p>
      </div>
    );
  },
};

export const KeepMounted: Story = {
  args: { keepMounted: true, summary: "Delivery address", defaultOpen: true },
  render: (args) => (
    <Disclosure {...args}>
      <label className="ol-label" htmlFor="disclosure-postcode">
        Postcode
      </label>
      <input id="disclosure-postcode" className="ol-input" defaultValue="390-0000" />
    </Disclosure>
  ),
};

export const Findable: Story = {
  args: { findable: true, summary: "Care instructions" },
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <p style={{ margin: 0 }}>
        Search this page for &ldquo;beeswax&rdquo; in a Chromium-family browser: the closed section
        opens on the match.
      </p>
      <Disclosure {...args}>
        Wipe with a dry cloth. Once a year, rub in a little beeswax and let it rest overnight.
      </Disclosure>
    </div>
  ),
};

export const Stacked: Story = {
  render: () => (
    <div>
      <Disclosure summary="Shipping and returns" defaultOpen>
        {shipping}
      </Disclosure>
      <Disclosure summary="Materials">Solid oak, blackened steel, paper.</Disclosure>
      <Disclosure summary="Care">Wipe with a dry cloth.</Disclosure>
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
            padding: "var(--space-6)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        >
          <Disclosure {...args} defaultOpen />
          <Disclosure {...args} summary="Materials" disabled />
          <Disclosure {...args} variant="bare" summary="Show advanced options" defaultOpen />
        </div>
      ))}
    </div>
  ),
};
