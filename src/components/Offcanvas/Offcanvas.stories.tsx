import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

import { Button } from "../Button";
import { Checkbox } from "../Checkbox";
import { Input } from "../Input";
import { Root } from "../Root";
import { Offcanvas, type OffcanvasProps } from "./Offcanvas";

const meta = {
  title: "Overlays/Offcanvas",
  component: Offcanvas,
  tags: ["autodocs"],
  args: { open: false },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'Offcanvas is a panel that slides in from an edge for navigation, filters or a cart. On `placement="bottom"` it is a **bottom sheet**: it can have a drag handle, snap points and swipe-to-dismiss. It is modal by default (scrim, inert page, focus trap, scroll lock); with `modal={false}` it is a standard sheet that sits beside the page. It renders in a portal, closes on Escape, and unrolls on open and rolls back up on close (kakejiku, with a rod on the moving edge for `start` and `end`).\n\n' +
          "- `end` is the default; `start` and `end` follow the writing direction.\n" +
          '- `snapPoints` are stops of the sheet\'s visible height: a share of the available height (0 to 1), `px` or `rem`, or `"content"`. The tallest sets the box; lower points move it down.\n' +
          "- The handle is a button: click, Enter or Space cycle the points, ArrowUp / ArrowDown step, Home / End jump. Drag it with any pointer; the head and body drag with touch and pen.\n" +
          "- A non-modal sheet does not move focus when it opens: the app moves focus into it from the trigger (a ref on the sheet and `focus()`), so a keyboard user who opened it lands inside. Escape then closes it and focus goes back.\n" +
          "- A touch or pen swipe toward the edge dismisses (`closeOnSwipe`); the close button and Escape always remain.\n" +
          "- Travel between points is a translate that stops dead; reduced motion makes it instant, and a drag still follows the finger.\n" +
          "- Safe-area insets pad the panel and `100dvh` sets the available height (add `viewport-fit=cover` to the page).\n" +
          "- A bottom sheet stands on the software keyboard: it follows the visual viewport, its height cap shrinks to fit, and the field being typed in stays in view.\n" +
          "- At the tallest point an overflowing body scrolls; a pull down that starts at the top of its content drags the sheet down instead, to a lower point or out.\n" +
          "- A modal sheet's scrim fades as it is dragged below its lowest point, and comes back if the sheet is released and stays.\n\n" +
          '**Do** — use `bottom` for short, thumb-reachable content on small screens. Give a sheet with snap points a title. Put the primary action inside the sheet at the lowest point that shows it. Use `"content"` as the lowest point for a summary. Pad the page under a non-modal sheet.\n\n' +
          "**Don't** — put a blocking decision in a sheet (use `AlertDialog`). Use a sheet for desktop navigation (use `Sidebar`). Hide the only way to a function behind a drag. Set `closeButton={false}` without another way out. Nest forms with software-keyboard fields in a lower snap point.",
      },
    },
  },
} satisfies Meta<typeof Offcanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

const FILTERS = ["Identity", "Interiors", "Print", "Packaging", "Signage", "Type", "Web", "Motion"];

function Demo({
  startOpen = false,
  label = "Open panel",
  ...props
}: Partial<OffcanvasProps> & { startOpen?: boolean; label?: string }) {
  const [open, setOpen] = useState(startOpen);
  const close = () => {
    setOpen(false);
  };
  return (
    <div>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Offcanvas title="Filters" {...props} open={open} onClose={close}>
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {FILTERS.map((name, i) => (
            <Checkbox key={name} label={name} defaultChecked={i === 0} />
          ))}
          <Button variant="solid" block arrow onClick={close}>
            Apply
          </Button>
        </div>
      </Offcanvas>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const Start: Story = { render: () => <Demo placement="start" /> };

export const Bottom: Story = { render: () => <Demo placement="bottom" /> };

/** Three stops: the content's own height, half the screen, and the full available height. */
export const BottomSheetSnapPoints: Story = {
  name: "Bottom sheet with snap points",
  render: () => <Demo placement="bottom" snapPoints={["content", 0.5, 1]} startOpen />,
};

function SearchDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Search
      </Button>
      <Offcanvas
        title="Search filters"
        placement="bottom"
        snapPoints={[0.5, 1]}
        defaultSnap={1}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      >
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          <Input aria-label="Filter by name" placeholder="Search" />
          {[1, 2, 3].flatMap((round) =>
            FILTERS.map((name) => (
              <Checkbox key={`${name}-${String(round)}`} label={`${name} ${String(round)}`} />
            )),
          )}
        </div>
      </Offcanvas>
    </div>
  );
}

/**
 * A field and a long list at the tallest point. On a phone, the sheet rises above the software
 * keyboard while the field has focus; the list scrolls, and a pull down from its top drags the
 * sheet to half height or out, with the scrim fading as it leaves.
 */
export const BottomSheetSearch: Story = {
  name: "Bottom sheet with a field and a long list",
  render: () => <SearchDemo />,
};

function NonModalDemo() {
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  // The sheet does not take focus itself; move it in once the sheet has mounted.
  useEffect(() => {
    if (open) sheet.current?.focus();
  }, [open]);
  return (
    <div>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Show results
      </Button>
      <Offcanvas
        ref={sheet}
        title="Results"
        placement="bottom"
        modal={false}
        snapPoints={["10rem", 0.6]}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      >
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {FILTERS.map((name) => (
            <Checkbox key={name} label={name} />
          ))}
        </div>
      </Offcanvas>
    </div>
  );
}

/**
 * A standard sheet: no scrim, the page stays live, and the sheet does not move focus. The trigger
 * moves focus into it with a ref and `focus()`, so a keyboard user lands inside.
 */
export const NonModal: Story = {
  name: "Non-modal",
  render: () => <NonModalDemo />,
};

export const RightToLeft: Story = {
  name: "Right to left",
  render: () => (
    <div dir="rtl" style={{ display: "flex", gap: "var(--space-3)" }}>
      <Demo placement="start" label="Start" />
      <Demo placement="end" label="End" />
      <Demo placement="bottom" snapPoints={[0.4, 1]} label="Bottom" />
    </div>
  ),
};

export const Placements: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-3)" }}>
      {(["start", "end", "bottom"] as const).map((placement) => (
        <Demo
          key={placement}
          placement={placement}
          title={`Placement ${placement}`}
          label={placement}
        />
      ))}
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Demo label={theme} />
          <Demo placement="bottom" snapPoints={[0.4, 1]} label={`${theme} sheet`} />
        </Root>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-4)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <Demo placement="bottom" snapPoints={[0.4, 1]} label={locale} />
        </Root>
      ))}
    </div>
  ),
};
