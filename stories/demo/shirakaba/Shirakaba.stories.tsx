import type { Meta, StoryObj } from "@storybook/react-vite";

import { ShirakabaPage } from "./ShirakabaPage";

const meta = {
  title: "Demo/Shirakaba Gakki",
  component: ShirakabaPage,
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    // Draw to the edge of the frame instead of inside the canvas padding.
    flush: true,
    docs: {
      description: {
        component:
          "A single-page site for a fictional custom-guitar workshop, built only with Olivine components. Brand, models, prices and people are invented; nothing is sent, stored or charged.",
      },
    },
  },
} satisfies Meta<typeof ShirakabaPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Page: Story = {};
