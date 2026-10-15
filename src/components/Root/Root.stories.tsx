import type { Meta, StoryObj } from "@storybook/react-vite";

import { useLabels } from "../../locale";
import { Root } from "./Root";

function LabelSample() {
  const l = useLabels();
  return (
    <ul>
      <li>{l.close}</li>
      <li>{l.menu}</li>
      <li>
        {l.switchOn} / {l.switchOff}
      </li>
      <li>{l.fileBrowse}</li>
      <li>{l.tags.warning}</li>
    </ul>
  );
}

const meta = {
  title: "Foundations/Root",
  component: Root,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Root sets the Olivine ground, fonts and focus ring, and the language of every built-in label; wrap the app in exactly one.",
          "",
          "- Built-in labels are every word a component writes or announces on its own: close buttons, the navbar menu toggle, Switch on/off, FileInput's button and empty state, Alert tags, Toast's default meta, Spinner, and the screen-reader names of Pagination, Breadcrumb and Carousel. `Root.locales` exposes the dictionaries to copy or extend.",
          "- Props passed to a component (`label`, `tag`, `meta`, `browseLabel`) always win over the locale.",
          "- Do put `theme` on `<html data-theme>` for whole-app theming; use `Root theme` only for an inverted island.",
        ].join("\n"),
      },
    },
  },
  args: { children: "Olivine" },
} satisfies Meta<typeof Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-4)" }}>
          <LabelSample />
        </Root>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale} style={{ padding: "var(--space-4)" }}>
          <LabelSample />
        </Root>
      ))}
    </div>
  ),
};
