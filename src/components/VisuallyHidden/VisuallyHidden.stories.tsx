import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "../Badge";
import { VisuallyHidden } from "./VisuallyHidden";

const meta = {
  title: "Utilities/VisuallyHidden",
  component: VisuallyHidden,
  tags: ["autodocs"],
  args: { children: " unread" },
  parameters: {
    docs: {
      description: {
        component:
          "Text that screen readers announce but nobody sees: the unit after a bare number, the name of a glyph-only button. It is the `.ol-sr` class as a component. With `focusable` it shows while it has keyboard focus, which is how a skip link is made.\n\n- Do pass a locale string, never a hard-coded word (the stories use English text for brevity).\n- Do make a skip link the first focusable element inside `Root`, pointing at `#main`; give the target `tabIndex={-1}`.\n- Don't hide interactive content unless `focusable`.\n- Don't repeat what is already visible or already in `aria-label`.",
      },
    },
  },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The badge reads "12 unread" to a screen reader; only "12" is drawn. */
export const Default: Story = {
  render: (args) => (
    <Badge>
      12
      <VisuallyHidden {...args} />
    </Badge>
  ),
};

/** Press Tab: the skip link appears at the top-left while it has focus. */
export const SkipLink: Story = {
  name: "Skip link",
  render: () => (
    <>
      <VisuallyHidden as="a" href="#story-main" focusable>
        Skip to content
      </VisuallyHidden>
      <p id="story-main" tabIndex={-1}>
        Main content starts here.
      </p>
    </>
  ),
};
