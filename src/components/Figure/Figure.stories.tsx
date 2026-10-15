import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label";
import { Ratio } from "../Ratio";
import { Root } from "../Root";
import { Figure } from "./Figure";

const meta = {
  title: "Content/Figure",
  component: Figure,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `Figure pairs media with a mono caption line: "FIG. 01 — caption …… credit".

**Props** — \`index\`, \`caption\`, \`credit\`; children are the media.

- Do put the media as children, usually inside a \`Ratio\`.
- Do give the media its own \`alt\`; the caption names the figure, it does not replace \`alt\`.
- Do number figures in reading order; a number is zero-padded.
- Don't put essential information only in the credit.
- Don't add the "Fig." word yourself; it comes from the locale.`,
      },
    },
  },
} satisfies Meta<typeof Figure>;

export default meta;

type Story = StoryObj<typeof meta>;

const placeholder = {
  background: "var(--paper-2)",
  display: "grid",
  placeItems: "center",
} as const;

function Media() {
  return (
    <Ratio ratio="3/1">
      <div style={placeholder} role="img" aria-label="Kitchen, Meguro">
        <Label aria-hidden="true">3 / 1</Label>
      </div>
    </Ratio>
  );
}

export const Default: Story = {
  args: { index: 1, caption: "Kitchen 04, Meguro", credit: "Photo: Studio" },
  render: (args) => (
    <Figure {...args}>
      <Media />
    </Figure>
  ),
};

export const WithHalftone: Story = {
  args: { index: 2, caption: "Study in halftone", credit: "Photo: Studio" },
  render: (args) => (
    <Figure {...args}>
      <Ratio ratio="4/3">
        <div className="ol-halftone" aria-hidden="true" />
      </Ratio>
    </Figure>
  ),
};

export const WithoutCredit: Story = {
  args: { index: 3, caption: "Kitchen 04, Meguro" },
  render: (args) => (
    <Figure {...args}>
      <Media />
    </Figure>
  ),
};

export const Themes: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-6)", background: "var(--paper)", color: "var(--ink)" }}
        >
          <Figure index={1} caption="Kitchen 04, Meguro" credit="Photo: Studio">
            <Media />
          </Figure>
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Figure index={1} caption="Kitchen 04, Meguro" credit="Photo: Studio">
            <Media />
          </Figure>
        </Root>
      ))}
    </div>
  ),
};
