import type { Meta, StoryObj } from "@storybook/react-vite";

import { Root } from "../Root";
import { Breadcrumb } from "./Breadcrumb";

const items = [
  { label: "Index", href: "#" },
  { label: "Works", href: "#" },
  { label: "2026", href: "#" },
  { label: "Kitchen 04" },
];

const meta = {
  title: "Navigation/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
  args: { items },
  parameters: {
    docs: {
      description: {
        component:
          'Breadcrumb shows the path as labels separated by "/"; the last item is the current page.\n\n**Props** — `items` (`[{label, href}]`), `label` (overrides the localized navigation name).\n\n- The last item is the current page: it is not a link and carries `aria-current="page"`.\n- Separators are decorative and are not announced.\n- Long trails wrap onto further lines.',
      },
    },
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongTrail: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "24rem" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    items: [
      { label: "Index", href: "#" },
      { label: "Works", href: "#" },
      { label: "Residential", href: "#" },
      { label: "2026", href: "#" },
      { label: "North district", href: "#" },
      { label: "Kitchens", href: "#" },
      { label: "Kitchen 04" },
    ],
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
          <Breadcrumb {...args} />
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
          <Breadcrumb {...args} />
        </Root>
      ))}
    </div>
  ),
};
