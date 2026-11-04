import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import type { DateRange } from "../Calendar";
import { Field } from "../Field";
import { Root } from "../Root";
import { DatePicker } from "./DatePicker";

/** Stories pin today to Thursday 22 October 2026 so screenshots stay stable. */
const TODAY = new Date(2026, 9, 22);
const d = (month: number, date: number, year = 2026) => new Date(year, month - 1, date);

const meta = {
  title: "Forms/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  args: { today: TODAY },
  parameters: {
    docs: {
      description: {
        component: `DatePicker is a date field you can type into, in the locale's format (en \`MM/DD/YYYY\`, es \`DD/MM/YYYY\`, ja \`YYYY/MM/DD\`; ISO \`YYYY-MM-DD\` is always accepted), with a ▦ button that opens a \`Calendar\`.

**Docked** (the default) unrolls a popover under the field and picks at once; Today and Clear sit in its footer. **Modal** opens a sheet (a bottom sheet on phones) with the chosen date set large; nothing changes until OK. With **range**, two inputs joined by → share one range calendar.

Keyboard: the button opens the calendar and focus lands on the selected day (or today). Escape and an outside press close it; Escape and picking return focus to the button. Text that doesn't parse stays as typed and leaves the value alone. The field's own border turns olivo at 2px while the input has focus; the button draws its own inset ring.

- Do give every picker a visible \`label\`, and word an \`error\` as an instruction ("Pick a weekday").
- Do use \`min\`, \`max\` and \`isDateUnavailable\` so impossible dates can't be typed or picked.
- Do use \`mode="modal"\` where a popover would not fit (a phone, a dense form) and a confirmation step helps.
- Don't use it for a date of birth far in the past: the field with the keyboard is faster than a calendar.
- Don't use a range picker for two unrelated dates: use two pickers.`,
      },
    },
  },
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const column: CSSProperties = { width: "calc(var(--space-32) * 3)", maxWidth: "100%" };
const roomForPopup: CSSProperties = {
  minHeight: "calc(var(--control-xl) * 6)",
  padding: "var(--space-6)",
};

function Controlled({
  defaultValue = null,
  ...props
}: { defaultValue?: Date | null } & Omit<
  React.ComponentProps<typeof DatePicker>,
  "range" | "value" | "defaultValue" | "onChange"
>) {
  const [value, setValue] = useState<Date | null>(defaultValue);
  return <DatePicker today={TODAY} {...props} value={value} onChange={setValue} />;
}

function RangeControlled({
  defaultValue = null,
  ...props
}: { defaultValue?: DateRange | null } & Omit<
  React.ComponentProps<typeof DatePicker>,
  "range" | "value" | "defaultValue" | "onChange"
>) {
  const [value, setValue] = useState<DateRange | null>(defaultValue);
  return <DatePicker range today={TODAY} {...props} value={value} onChange={setValue} />;
}

export const Docked: Story = {
  name: "Docked (opens on click)",
  render: () => (
    <div style={{ ...column, ...roomForPopup }}>
      <Controlled label="Workshop visit" defaultValue={d(10, 23)} />
    </div>
  ),
};

export const DockedOpen: Story = {
  name: "Docked, open",
  render: () => (
    <div style={{ ...column, ...roomForPopup }}>
      <Controlled label="Workshop visit" defaultValue={d(10, 23)} defaultOpen />
    </div>
  ),
};

export const ModalOpen: Story = {
  name: "Modal, open (Cancel / OK)",
  render: () => (
    <div style={{ ...column, ...roomForPopup }}>
      <Controlled label="Delivery date" mode="modal" defaultValue={d(10, 23)} defaultOpen />
    </div>
  ),
};

export const ModalJapanese: Story = {
  name: "Modal, Japanese",
  render: () => (
    <div style={{ ...column, ...roomForPopup }}>
      <Root locale="ja">
        <Controlled label="納品日" mode="modal" defaultValue={d(10, 23)} defaultOpen />
      </Root>
    </div>
  ),
};

export const RangeSpanish: Story = {
  name: "Range (es)",
  render: () => (
    <div style={{ ...column, ...roomForPopup }}>
      <Root locale="es">
        <RangeControlled
          label="Ventana de recogida"
          defaultValue={{ start: d(10, 26), end: d(10, 30) }}
          defaultOpen
          weekStartsOn={1}
        />
      </Root>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ ...column, display: "grid", gap: "var(--space-6)", padding: "var(--space-6)" }}>
      <Controlled label="Workshop visit" />
      <Root locale="ja">
        <Controlled label="納品日" />
      </Root>
      <Root locale="es">
        <RangeControlled label="Ventana de recogida" />
      </Root>
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div style={{ ...column, padding: "var(--space-6)" }}>
      <Controlled label="Workshop visit" defaultValue={d(10, 25)} error="Pick a weekday" />
    </div>
  ),
};

export const UnavailableDates: Story = {
  name: "Unavailable dates",
  render: () => (
    <div style={{ ...column, ...roomForPopup }}>
      <Controlled
        label="Workshop visit"
        hint="Closed on Sundays; bookable until 18 November"
        min={d(10, 8)}
        max={d(11, 18)}
        isDateUnavailable={(date) => date.getDay() === 0}
        defaultOpen
      />
    </div>
  ),
};

export const InsideField: Story = {
  name: "Inside a Field",
  render: () => (
    <div style={{ ...column, padding: "var(--space-6)" }}>
      <Field label="Workshop visit" hint="Format: MM/DD/YYYY, or pick from the calendar" required>
        <DatePicker today={TODAY} defaultValue={d(10, 23)} />
      </Field>
    </div>
  ),
};

export const DisabledAndReadOnly: Story = {
  name: "Disabled and read only",
  render: () => (
    <div style={{ ...column, display: "grid", gap: "var(--space-6)", padding: "var(--space-6)" }}>
      <DatePicker label="Disabled" today={TODAY} disabled defaultValue={d(10, 23)} />
      <DatePicker label="Read only" today={TODAY} readOnly defaultValue={d(10, 23)} />
    </div>
  ),
};

export const ReducedMotion: Story = {
  name: "Reduced motion",
  render: () => (
    <div className={REDUCE_MOTION_CLASS} style={{ ...column, ...roomForPopup }}>
      <Controlled label="Workshop visit" defaultValue={d(10, 23)} defaultOpen />
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <div
            style={{
              display: "grid",
              gap: "var(--space-6)",
              gridTemplateColumns: "repeat(auto-fit, minmax(calc(var(--space-32) * 2), 1fr))",
            }}
          >
            <Controlled label="Workshop visit" defaultValue={d(10, 23)} />
            <Controlled label="Workshop visit" error="Pick a weekday" defaultValue={d(10, 25)} />
            <RangeControlled
              label="Pickup window"
              defaultValue={{ start: d(10, 26), end: d(10, 30) }}
            />
          </div>
        </Root>
      ))}
    </div>
  ),
};
