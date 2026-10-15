import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button";
import { Root } from "../Root";
import { Navbar } from "./Navbar";

const links = [
  { label: "Works", href: "#works", active: true },
  { label: "Studio", href: "#studio" },
  { label: "Journal", href: "#journal" },
];

const meta = {
  title: "Navigation/Navbar",
  component: Navbar,
  tags: ["autodocs"],
  args: {
    brand: "Olivine",
    kanji: "橄",
    links,
    end: (
      <Button size="s" variant="accent" arrow>
        Contact
      </Button>
    ),
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Navbar is the top bar: brand cell, link cells and an end cell, all divided by hairlines. Under 720px the links fold behind a menu button; Escape and choosing a link close it.\n\n- Do mark the current page with `active`: it gets an olive dot, not a colour change.\n- Do pass `label` when the brand is not plain text or the page has several navigations.\n- Do keep to five links or fewer.\n- Don't put long labels or more than one button in the end cell.\n- Don't hide the brand; it is the way home.",
      },
    },
  },
} satisfies Meta<typeof Navbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sticky: Story = {
  args: { sticky: true },
  render: (args) => (
    <div style={{ height: 240, overflow: "auto" }}>
      <Navbar {...args} />
      <div style={{ height: 800, padding: "var(--space-6)" }}>
        Scroll: the bar stays at the top.
      </div>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => (
    <div style={{ width: 360, margin: "0 auto", border: "var(--stroke-hair) solid var(--rule)" }}>
      <Navbar {...args} />
    </div>
  ),
};

export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div key={theme} className="ol" data-theme={theme} style={{ background: "var(--paper)" }}>
          <Navbar {...args} />
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <div style={{ width: 360 }}>
            <Navbar {...args} />
          </div>
        </Root>
      ))}
    </div>
  ),
};
