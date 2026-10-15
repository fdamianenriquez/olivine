import type { Meta, StoryObj } from "@storybook/react-vite";

import { Col } from "../Col";
import { Label } from "../Label";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { Grid } from "./Grid";

const meta = {
  title: "Foundations/Grid",
  component: Grid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Grid is a 12-column CSS grid; `ruled` swaps gutters for ink lines between cells, the signature brutalist index layout.",
          "",
          "- Do use `ruled` for indexes, specs and contact sheets; plain gutters for content.",
          "- Children are `Col`; each cell chooses its own span and spans the full row below the medium breakpoint (720px).",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

const spans = [3, 3, 6];

const content = (
  <Stack gap={6}>
    <Grid cols={12} gap={4}>
      {spans.map((span, i) => (
        <Col key={i} span={span}>
          <div style={{ background: "var(--paper-2)", padding: "var(--space-3)" }}>
            <Label index={i + 1}>Span {span}</Label>
          </div>
        </Col>
      ))}
    </Grid>
    <Grid cols={4} ruled>
      {["静", "間", "無", "空"].map((kanji, i) => (
        <Col key={kanji}>
          <Label index={i + 1}>Cell</Label>
          <Text variant="kanji" as="p" lang="ja" style={{ marginTop: "var(--space-2)" }}>
            {kanji}
          </Text>
        </Col>
      ))}
    </Grid>
  </Stack>
);

export const Default: Story = {
  render: () => content,
};

export const Ruled: Story = {
  render: () => (
    <Grid cols={3} ruled>
      {["Plan", "Section", "Elevation"].map((name, i) => (
        <Col key={name}>
          <Label index={i + 1}>{name}</Label>
        </Col>
      ))}
    </Grid>
  ),
};

export const Themes: Story = {
  render: () => (
    <Grid cols={2} gap={1}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Col
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ background: "var(--paper)", padding: "var(--space-6)" }}
        >
          {content}
        </Col>
      ))}
    </Grid>
  ),
};
