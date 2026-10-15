import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label";
import { Container } from "./Container";

const meta = {
  title: "Foundations/Container",
  component: Container,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Container centres content at a 1280px max width with `space-6` side gutters.",
          "",
          "- Do leave `space-16`+ above the first display title inside it.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof Container>;

export default meta;

type Story = StoryObj<typeof meta>;

const frame = {
  border: "var(--stroke-hair) dashed var(--rule)",
  padding: "var(--space-4) var(--space-6)",
};

export const Default: Story = {
  args: {
    style: frame,
    children: <Label>Container · max 1280 · gutter space-6</Label>,
  },
};

export const Fluid: Story = {
  args: {
    fluid: true,
    style: frame,
    children: <Label>Container · fluid</Label>,
  },
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ background: "var(--paper)", padding: "var(--space-6)" }}
        >
          <Container style={frame}>
            <Label>{theme}</Label>
          </Container>
        </div>
      ))}
    </div>
  ),
};
