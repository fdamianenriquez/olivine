import type { Meta, StoryObj } from "@storybook/react-vite";

import { Root } from "../Root";
import { Link } from "./Link";

const meta = {
  title: "Actions/Link",
  component: Link,
  tags: ["autodocs"],
  args: { href: "#", children: "Underlined link" },
  parameters: {
    docs: {
      description: {
        component:
          'Link is inline text navigation with a 1px underline offset 4px; hover turns it olive.\n\n**Props** — `plain` (underline draws in on hover), `external` (adds ↗ and opens in a new tab), plus anchor props.\n\n- Keep link text meaningful out of context.\n- Use `plain` only outside running text (nav rows, footers, link lists); inline links keep the default underline.\n- Standalone `plain` links need a target of at least 24px: add padding or `display: block`.\n- The olivo hover is 4.2:1 on `paper-2`: on sunken fills keep links large or bold, or rely on the underline.\n- `external` adds `target` and `rel` only on an `a` or a component (router link); a `target` you pass wins.\n- `external` announces "opens in a new tab" to assistive tech.',
      },
    },
  },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = { display: "flex", gap: "var(--space-6)", flexWrap: "wrap" } as const;

export const Default: Story = {};

export const Inline: Story = {
  render: () => (
    <p style={{ maxWidth: "48ch" }}>
      Read the <Link href="#">full guideline</Link> before you start, or skim the{" "}
      <Link href="#">changelog</Link> and the{" "}
      <Link external href="#">
        source
      </Link>
      .
    </p>
  ),
};

export const Plain: Story = {
  render: () => (
    <nav aria-label="Footer" style={{ display: "flex", gap: "var(--space-2)" }}>
      {["Docs", "Changelog", "Source"].map((label) => (
        <Link
          key={label}
          plain
          href="#"
          style={{ display: "block", padding: "var(--space-2) var(--space-3)" }}
        >
          {label}
        </Link>
      ))}
    </nav>
  ),
};

export const External: Story = { args: { external: true, children: "readymag.com" } };

const sample = (
  <div style={row}>
    <Link href="#">Underlined link</Link>
    <Link plain href="#">
      Plain until hover
    </Link>
    <Link external href="#">
      readymag.com
    </Link>
  </div>
);

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)" }}
        >
          {sample}
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Link external href="#">
            {locale}
          </Link>
        </Root>
      ))}
    </div>
  ),
};
