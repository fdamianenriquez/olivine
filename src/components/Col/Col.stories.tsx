import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { Grid } from "../Grid";
import { Label } from "../Label";
import { Col } from "./Col";

const meta = {
  title: "Foundations/Col",
  component: Col,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Col is a cell of `Grid` that spans `span` columns. A number applies from the medium breakpoint (720px) up; below it cells stack. Pass an object to set spans per breakpoint (`base`, `sm` 480px, `md` 720px, `lg` 1024px, `xl` 1280px); missing breakpoints inherit from the next smaller one.",
          "",
          "- Do offset with `start` to create asymmetric white space instead of empty Cols.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof Col>;

export default meta;

type Story = StoryObj<typeof meta>;

const cell = (children: ReactNode) => (
  <div style={{ background: "var(--paper-2)", padding: "var(--space-3)" }}>{children}</div>
);

export const Default: Story = {
  render: () => (
    <Grid cols={12} gap={4}>
      {[3, 3, 6].map((s, i) => (
        <Col key={i} span={s}>
          {cell(<Label index={i + 1}>span {s}</Label>)}
        </Col>
      ))}
    </Grid>
  ),
};

export const Offset: Story = {
  render: () => (
    <Grid cols={12} gap={4}>
      <Col span={4}>{cell(<Label>span 4</Label>)}</Col>
      <Col span={4} start={9}>
        {cell(<Label>span 4, start 9</Label>)}
      </Col>
    </Grid>
  ),
};

export const Responsive: Story = {
  render: () => (
    <Grid cols={12} gap={4}>
      {[1, 2, 3, 4].map((n) => (
        <Col key={n} span={{ base: 12, sm: 6, lg: 4, xl: 3 }}>
          {cell(<Label index={n}>12 / 6 / 4 / 3</Label>)}
        </Col>
      ))}
    </Grid>
  ),
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
          <Grid cols={12} gap={4}>
            {[3, 3, 6].map((s, i) => (
              <Col key={i} span={s}>
                {cell(<Label index={i + 1}>span {s}</Label>)}
              </Col>
            ))}
          </Grid>
        </div>
      ))}
    </div>
  ),
};
