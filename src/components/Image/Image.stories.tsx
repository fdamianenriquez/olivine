import type { Meta, StoryObj } from "@storybook/react-vite";

import { Ratio } from "../Ratio";
import { Image } from "./Image";

const svg = (body: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120">${body}</svg>`);

const red = svg(
  '<rect width="160" height="120" fill="#c22f17"/><rect x="40" y="30" width="80" height="60" fill="#111110"/>',
);
const sand = svg(
  '<rect width="160" height="120" fill="#e7e4dc"/><circle cx="80" cy="60" r="30" fill="#111110"/>',
);
const blue = svg(
  '<rect width="160" height="120" fill="#23408e"/><rect y="80" width="160" height="40" fill="#c22f17"/>',
);

const meta = {
  title: "Content/Image",
  component: Image,
  tags: ["autodocs"],
  args: { src: red, alt: "Composition", width: 160, height: 120 },
  parameters: {
    docs: {
      description: {
        component: `Image is a responsive \`<img>\`; \`framed\` adds an ink frame with a paper mat, \`mono\` shows grayscale until hover.

**Props** — \`framed\`, \`mono\`, \`alt\` (required; \`alt=""\` for decorative images), native img props.

- Do describe meaningful images in \`alt\`, and pass \`alt=""\` for decorative ones.
- Do keep information in \`alt\` or nearby text; grayscale (\`mono\`) is decoration, never the only way to convey meaning.
- Do give images \`width\` and \`height\` to avoid layout shift.
- Don't use \`mono\` for images whose colour carries meaning (charts, status).`,
      },
    },
  },
} satisfies Meta<typeof Image>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const Framed: Story = { args: { src: sand, alt: "Framed", framed: true } };

export const Mono: Story = {
  args: { src: blue, alt: "Monochrome until hover", mono: true },
};

export const InsideRatio: Story = {
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <Ratio ratio="16/9">
        <Image {...args} src={blue} alt="Cropped to 16/9" />
      </Ratio>
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{
            display: "flex",
            gap: "var(--space-4)",
            flexWrap: "wrap",
            padding: "var(--space-4)",
            background: "var(--paper)",
          }}
        >
          <Image src={red} alt="Composition" width={160} height={120} />
          <Image src={sand} alt="Framed" width={160} height={120} framed />
          <Image src={blue} alt="Monochrome until hover" width={160} height={120} mono />
        </div>
      ))}
    </div>
  ),
};
