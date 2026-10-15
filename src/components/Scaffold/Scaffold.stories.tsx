import type { Meta, StoryObj } from "@storybook/react-vite";

import { Scaffold } from "./Scaffold";

const meta = {
  title: "Internal/Scaffold",
  component: Scaffold,
  args: { children: "Olivine" },
} satisfies Meta<typeof Scaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
