import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Root } from "../Root";
import { Calendar } from "./Calendar";
import type { DateRange } from "./dates";

/** Stories pin today to Thursday 22 October 2026 so screenshots stay stable. */
const TODAY = new Date(2026, 9, 22);
const d = (month: number, date: number, year = 2026) => new Date(year, month - 1, date);

const meta = {
  title: "Forms/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  args: { today: TODAY },
  parameters: {
    docs: {
      description: {
        component: `Calendar is a ruled month grid with poster numerals, like a Japanese wall calendar. Today carries a vermilion seal ring and its numeral in shu; the chosen day is inked; a range is a maple band between two inked ends. The month title opens a twelve-month grid; in Japanese the era year (令和) sits under the month.

Keyboard follows the APG date grid: ←/→ day (swapped in RTL), ↑/↓ week, Home/End ends of the week, Page Up/Down month (Shift: year), Enter/Space pick. Days of the neighbouring months are context only. A new month prints in one pass (mokuhanga); with reduced motion it is instant.

- Do disable days that can't be booked (\`min\`, \`max\`, \`isDateUnavailable\`) rather than erroring after the pick.
- Do let the locale decide the week start; set \`weekStartsOn\` only when the product needs it.
- Don't colour weekends red: they are set in a softer ink.
- Don't use the seal ring for anything other than today.`,
      },
    },
  },
} satisfies Meta<typeof Calendar>;

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

const note = {
  margin: "var(--space-3) 0 0",
  maxWidth: "calc(var(--control-m) * 7)",
  font: "var(--text-body-s-weight) var(--text-body-s-size) / var(--text-body-s-leading) var(--text-body-s-family)",
  color: "var(--ink-2)",
} as const;

function SingleDemo() {
  const [value, setValue] = useState<Date | null>(d(10, 12));
  return <Calendar today={TODAY} value={value} onChange={setValue} />;
}

function RangeDemo({ locale }: { locale?: "en" | "es" | "ja" }) {
  const [value, setValue] = useState<DateRange | null>({ start: d(10, 26), end: d(10, 30) });
  return (
    <Calendar
      range
      today={TODAY}
      locale={locale}
      weekStartsOn={locale === "es" ? 1 : undefined}
      value={value}
      onChange={setValue}
      isDateUnavailable={(date) => date.getDay() === 0}
    />
  );
}

export const Single: Story = {
  render: () => <SingleDemo />,
};

export const Themes: Story = {
  render: () => (
    <div style={row}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <div style={row}>
            <div>
              <p style={caption}>Single</p>
              <SingleDemo />
            </div>
            <div>
              <p style={caption}>Range · Sundays closed</p>
              <RangeDemo locale="en" />
            </div>
          </div>
        </Root>
      ))}
    </div>
  ),
};

export const Range: Story = {
  name: "Range (es, Monday first, Sundays closed)",
  render: () => (
    <div>
      <p style={caption}>Rango · lunes primero · domingos cerrados</p>
      <RangeDemo locale="es" />
      <p style={note}>
        The first press sets the start, the second the end; the band previews on hover and focus.
        Closed days are crossed with a hairline and can&apos;t be picked.
      </p>
    </div>
  ),
};

export const MinMax: Story = {
  name: "Min and max",
  args: { min: d(10, 8), max: d(11, 18), defaultValue: d(10, 15) },
  render: (args) => (
    <div>
      <p style={caption}>Bookable from 8 October to 18 November</p>
      <Calendar {...args} />
      <p style={note}>
        Days outside the bounds are crossed out; the month buttons stop at the bounds and the
        keyboard can&apos;t leave them.
      </p>
    </div>
  ),
};

const holidays = new Set(["2026-10-12", "2026-11-02", "2026-11-03"]);
const iso = (date: Date) =>
  `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const UnavailableDates: Story = {
  name: "Unavailable dates",
  args: {
    isDateUnavailable: (date: Date) => date.getDay() === 1 || holidays.has(iso(date)),
  },
  render: (args) => (
    <div>
      <p style={caption}>Workshop closed on Mondays and holidays</p>
      <Calendar {...args} />
    </div>
  ),
};

export const Japanese: Story = {
  name: "Japanese (era year)",
  render: () => (
    <div style={row}>
      <Calendar today={TODAY} locale="ja" defaultValue={d(10, 24)} />
      <RangeDemo locale="ja" />
    </div>
  ),
};

export const WeekStart: Story = {
  name: "Week start",
  render: () => (
    <div style={row}>
      <div>
        <p style={caption}>en · Sunday (locale)</p>
        <Calendar today={TODAY} locale="en" />
      </div>
      <div>
        <p style={caption}>es · lunes (locale)</p>
        <Calendar today={TODAY} locale="es" />
      </div>
      <div>
        <p style={caption}>en · weekStartsOn 6 (Saturday)</p>
        <Calendar today={TODAY} locale="en" weekStartsOn={6} />
      </div>
    </div>
  ),
};

function MonthGridDemo() {
  const ref = useRef<HTMLDivElement>(null);
  // Opens the month grid the way a user does, by pressing the title.
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>(".ol-cal__title")?.click();
  }, []);
  return <Calendar ref={ref} today={TODAY} defaultValue={d(8, 14)} defaultFocusedDate={TODAY} />;
}

export const RightToLeft: Story = {
  name: "Right to left",
  parameters: {
    docs: {
      description: {
        story:
          'Under `dir="rtl"` the week runs from the right, ← moves to the next day and → to the previous one, Home and End stay on the first and last day of the week, and the month arrows point along the reading order.',
      },
    },
  },
  render: () => (
    <div dir="rtl">
      <Calendar today={TODAY} defaultValue={d(10, 12)} />
    </div>
  ),
};

export const MonthGridOpen: Story = {
  name: "Month grid open",
  render: () => (
    <div>
      <p style={caption}>August is picked; October (this month) has the marker and the focus</p>
      <MonthGridDemo />
    </div>
  ),
};

export const FocusedRangeDay: Story = {
  name: "Focus in the range band",
  render: () => (
    <Calendar
      range
      today={TODAY}
      defaultValue={{ start: d(10, 26), end: d(10, 30) }}
      defaultFocusedDate={d(10, 28)}
      // eslint-disable-next-line jsx-a11y/no-autofocus -- shows the focus ring on a filled day
      autoFocus
    />
  ),
};

export const ReducedMotion: Story = {
  name: "Reduced motion",
  render: () => (
    <div style={row}>
      <div>
        <p style={caption}>Mokuhanga print on month change</p>
        <Calendar today={TODAY} />
      </div>
      <div className={REDUCE_MOTION_CLASS}>
        <p style={caption}>Reduced motion: instant</p>
        <Calendar today={TODAY} />
      </div>
    </div>
  ),
};
