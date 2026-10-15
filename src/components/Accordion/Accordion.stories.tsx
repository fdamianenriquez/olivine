import type { Meta, StoryObj } from "@storybook/react-vite";

import { Accordion } from "./Accordion";

const items = [
  {
    title: "What is ma?",
    content: "The pause between things — the space that gives form its meaning.",
  },
  { title: "Lead times", content: "Six to ten weeks from approved drawings." },
  { title: "Materials", content: "Solid oak, blackened steel, paper." },
];

const meta = {
  title: "Content/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  args: { items, defaultOpen: [0] },
  parameters: {
    docs: {
      description: {
        component:
          "Accordion is a ruled list of disclosure rows: index, title and a +/− sign; the open row's index turns olive.\n\n- Use it for long, skimmable content where readers need only a few rows.\n- Keep titles short and self-explanatory.\n- Pick `headingLevel` to fit the page outline.\n- Arrow keys, Home and End move between row headers.",
      },
    },
  },
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = { args: { multiple: true, defaultOpen: [0, 2] } };

export const HeadingLevel: Story = { args: { headingLevel: 2 } };

export const Themes: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-5)", background: "var(--bg)", color: "var(--ink)" }}
        >
          <Accordion {...args} />
        </div>
      ))}
    </div>
  ),
};
