import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Field } from "../Field";
import { Root } from "../Root";
import { TimePicker, type TimeValue } from "./TimePicker";

const meta = {
  title: "Forms/TimePicker",
  component: TimePicker,
  tags: ["autodocs"],
  args: { label: "Arrival" },
  parameters: {
    docs: {
      description: {
        component: `TimePicker is a segmented time field (hour, minute and, on a 12 h clock, AM/PM) with a ◷ button that opens a popover: the time set large in the figure face over two ruled columns of hours and minutes. There is no clock dial. The popover unrolls from the field like a hanging scroll (kakejiku); with reduced motion it is instant.

Each segment is a spinbutton: ↑/↓ step and wrap, digits type and move on, Backspace clears. AM/PM toggles with ↑/↓ or A/P. In the columns ↑/↓, Home and End move, Enter picks and Escape closes and returns focus to the button. The field border turns olive when a segment has focus and the segment itself inverts to ink.

- Do set \`minHour\` and \`maxHour\` for opening hours; closed hours are dimmed and can't be typed either.
- Do keep \`minuteStep\` at 5 or more for booking slots; any minute can still be typed.
- Do give an invalid field a message: put it in a \`Field\` (\`error\`) or in \`hint\`; the red border alone is not enough.
- Do keep \`picker\` on for touch: the segments need a keyboard, the button does not.
- Don't draw a clock dial.
- Don't use it for durations; use NumberField.`,
      },
    },
  },
} satisfies Meta<typeof TimePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-8)",
  alignItems: "flex-start",
} as const;

const caption = {
  margin: "0 0 var(--space-3)",
  font: "var(--text-label-weight) var(--text-label-size) / var(--text-label-leading) var(--text-label-family)",
  color: "var(--ink)",
} as const;

const frame = { minWidth: "calc(var(--control-xl) * 4)", minHeight: "40rem" } as const;

function Demo(props: Partial<React.ComponentProps<typeof TimePicker>>) {
  const [value, setValue] = useState<TimeValue | null>({ h: 10, m: 30 });
  return <TimePicker label="Arrival" {...props} value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: () => <Demo hint="Visits between 9 AM and 4 PM." minHour={9} maxHour={16} />,
};

export const Open: Story = {
  render: () => (
    <div style={frame}>
      <Demo defaultOpen minHour={9} maxHour={16} />
    </div>
  ),
};

export const Themes: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)", ...frame }}>
          <p style={caption}>{theme === "washi" ? "Washi" : "Sumi"}</p>
          <Demo defaultOpen minHour={9} maxHour={16} />
        </Root>
      ))}
    </div>
  ),
};

export const TwentyFourHour: Story = {
  name: "24 hour",
  render: () => (
    <div style={frame}>
      <Demo hourCycle={24} minuteStep={15} defaultOpen />
    </div>
  ),
};

export const OpeningHours: Story = {
  name: "Opening hours",
  render: () => (
    <div style={frame}>
      <Demo
        defaultOpen
        minHour={9}
        maxHour={16}
        hint="Hours before 9 AM and after 4 PM are dimmed."
      />
    </div>
  ),
};

export const FieldOnly: Story = {
  name: "Field without a picker",
  render: () => <Demo picker={false} hint="Type the time or use the arrow keys." />,
};

export const Empty: Story = {
  render: () => <TimePicker label="Arrival" hint="Nothing set yet." />,
};

export const Locales: Story = {
  render: () => (
    <div style={row}>
      <div>
        <p style={caption}>en · 12 h</p>
        <Demo locale="en" />
      </div>
      <div>
        <p style={caption}>es · 24 h</p>
        <Demo locale="es" label="Llegada" />
      </div>
      <div>
        <p style={caption}>ja · 24 h</p>
        <Demo locale="ja" label="到着" />
      </div>
      <div>
        <p style={caption}>ja · 12 h</p>
        <Demo locale="ja" label="到着" hourCycle={12} />
      </div>
    </div>
  ),
};

export const InAField: Story = {
  name: "In a Field",
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: "var(--modal-width-s)" }}>
      <Field label="Doors open" hint="Local time.">
        <TimePicker />
      </Field>
      <Field label="Doors close" error="Pick a time after the doors open.">
        <TimePicker defaultValue={{ h: 8, m: 0 }} />
      </Field>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: "var(--modal-width-s)" }}>
      <TimePicker label="Disabled" disabled defaultValue={{ h: 9, m: 0 }} />
      <TimePicker label="Read-only" readOnly defaultValue={{ h: 9, m: 0 }} />
      <TimePicker label="Invalid" aria-invalid defaultValue={{ h: 9, m: 0 }} />
    </div>
  ),
};

export const ReducedMotion: Story = {
  name: "Reduced motion",
  render: () => (
    <div style={row}>
      <div style={frame}>
        <p style={caption}>The popover unrolls</p>
        <Demo />
      </div>
      <div className={REDUCE_MOTION_CLASS} style={frame}>
        <p style={caption}>Reduced motion: instant</p>
        <Demo />
      </div>
    </div>
  ),
};
