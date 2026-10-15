import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Ratio } from "../Ratio";
import { Root } from "../Root";
import { Stack } from "../Stack";
import { Carousel } from "./Carousel";

const swatch = (kanji: string, tone: string) => (
  <Ratio key={kanji} ratio="3/1">
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100%",
        background: tone,
        color: "var(--ink)",
        fontFamily: "var(--font-jp)",
        fontSize: "var(--text-display-m-size)",
      }}
    >
      {kanji}
    </div>
  </Ratio>
);

const slides = [
  swatch("一", "var(--paper)"),
  swatch("二", "var(--olivo)"),
  swatch("三", "var(--maple)"),
  swatch("四", "var(--paper-2)"),
];

const meta = {
  title: "Content/Carousel",
  component: Carousel,
  tags: ["autodocs"],
  args: { slides },
  parameters: {
    docs: {
      description: {
        component: `Carousel shows one slide at a time with a tick bar, a "01 / 03" counter and ← → cells; arrow keys work when focused.

- Do prefer manual; auto-advance only for decorative content.
- Do pass \`index\` and \`onIndexChange\` to control the visible slide.
- Autoplay pauses on hover and focus, is off under reduced motion, and always shows a play/pause button.
- Don't put essential content in an auto-advancing carousel.`,
      },
    },
  },
} satisfies Meta<typeof Carousel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Manual: Story = {};

export const Autoplay: Story = { args: { interval: 3000 } };

export const Controlled: Story = {
  render: (args) => {
    const [index, setIndex] = useState(2);
    return (
      <Stack gap={4}>
        <Carousel {...args} index={index} onIndexChange={setIndex} />
        <span className="ol-label">Index: {index}</span>
      </Stack>
    );
  },
};

export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)", flex: "1 1 24rem" }}>
          <Carousel {...args} interval={4000} />
        </Root>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: (args) => (
    <Stack gap={6}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Carousel {...args} interval={4000} />
        </Root>
      ))}
    </Stack>
  ),
};
