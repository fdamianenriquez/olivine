import type { Meta, StoryObj } from "@storybook/react-vite";

import { Root } from "../Root";
import { Stack } from "../Stack";
import { Pagination } from "./Pagination";

const meta = {
  title: "Navigation/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  args: { total: 12, defaultPage: 5 },
  parameters: {
    docs: {
      description: {
        component: `Pagination is a row of joined square cells with page numbers (not zero-padded, so each number is part of its accessible name, "Page 1"); the current page is ink-filled.

- Do use \`siblings\` to widen the window around the current page.
- Do pass \`page\` and \`onChange\` to keep the page in your own state or URL.
- Don't use it for fewer than two pages.`,
      },
    },
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FewPages: Story = { args: { total: 4, defaultPage: 1 } };

export const ManyPages: Story = { args: { total: 120, defaultPage: 60 } };

export const Siblings2: Story = { args: { total: 20, defaultPage: 10, siblings: 2 } };

export const Small: Story = { args: { total: 4, defaultPage: 1, size: "s" } };

export const WithLinks: Story = {
  args: { total: 12, defaultPage: 5, getHref: (page: number) => `?page=${String(page)}` },
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Stack gap={4}>
            <Pagination total={12} defaultPage={5} />
            <Pagination total={4} defaultPage={1} size="s" />
          </Stack>
        </Root>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <Stack gap={4}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Pagination total={12} defaultPage={5} />
        </Root>
      ))}
    </Stack>
  ),
};
