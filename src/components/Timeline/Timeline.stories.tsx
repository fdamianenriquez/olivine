import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "../Badge";
import { Figure } from "../Figure";
import { Placeholder } from "../Placeholder";
import { Root } from "../Root";
import { Timeline, type TimelineItem } from "./Timeline";

/** The Shirakaba demo's "From deposit to your door" process. */
const process: TimelineItem[] = [
  {
    title: "Reservation",
    description: "You pay 30 % and we hold your place in the workshop queue.",
  },
  {
    title: "Choosing the boards",
    description: "We send photos of two or three boards so you can pick the grain.",
  },
  {
    title: "Building",
    description: "Cutting, carving, finish and setup, with photos after each stage.",
  },
  {
    title: "Test and ship",
    description: "You pay the balance, we play it for an hour and it leaves Matsumoto insured.",
  },
];

/** An order history, newest first. */
const history: TimelineItem[] = [
  {
    id: "shipped",
    title: "Shipped",
    description: "Insured, with tracking, from Matsumoto.",
    date: new Date(2026, 10, 28),
    meta: "Hana",
  },
  {
    id: "tested",
    title: "Test and setup",
    description: "An hour of amplified playing. Action and intonation set.",
    date: new Date(2026, 10, 20),
  },
  {
    id: "finish",
    title: "Nitro lacquer",
    description: "Thin coats, sanded between each, then three weeks of curing.",
    date: new Date(2026, 9, 29),
  },
  {
    id: "boards",
    title: "Choosing the boards",
    description: "You picked the second board: tight grain, 38 mm.",
    date: new Date(2026, 9, 3),
  },
  {
    id: "deposit",
    title: "Reservation",
    description: "Deposit received. Your place is held.",
    date: new Date(2026, 8, 22),
  },
];

const meta = {
  title: "Content/Timeline",
  component: Timeline,
  tags: ["autodocs"],
  args: { items: process, "aria-label": "From deposit to your door" },
  argTypes: {
    headingLevel: { control: "inline-radio", options: [undefined, 2, 3, 4, 5, 6] },
  },
  parameters: {
    docs: {
      description: {
        component: `Timeline is an ordered list of events or process steps on a hairline spine: a marker on the line, an optional date, a title, a description and any extra content. Use it for a history (orders, releases, a project) or for a process the reader only follows. It is read-only: use Stepper for a flow the user moves through, ListGroup for a plain ruled list and Accordion for entries that open and close.

The line is drawn once like a brush stroke (shodō) when the list scrolls into view, then the entries print onto it and the current marker lands last. Under reduced motion the finished state shows at once.

**Props** — \`items\` (\`{ id, title, description, meta, date, dateTime, status, marker, href, content }[]\`), \`current\`, \`numbered\`, \`dateFormat\`, \`headingLevel\`, \`draw\`, \`labels\`.

- Do pass \`Date\` objects, so dates follow the page language, and keep the entries in the order they are read.
- Do set \`current\` for a process and leave it out for a history.
- Do write a status as a word in the entry as well when it matters; the marker glyph and the hidden word are the minimum.
- Do name the list with \`aria-label\` when nothing around it introduces it.
- Don't use \`numbered\` for a history with no real sequence.
- Don't colour a marker to mean a status without the glyph and word, and don't zigzag or mix orientations.
- Don't replay the entrance on every update: new items appear in place.`,
      },
    },
  },
} satisfies Meta<typeof Timeline>;

export default meta;

type Story = StoryObj<typeof meta>;

const caption = {
  margin: "0 0 var(--space-2)",
  font: "var(--text-label-s-size)/1.3 var(--font-label)",
  color: "var(--ink-2)",
} as const;

/** A process: numbered, with progress. Done steps are ink, the current one olive, the rest hollow. */
export const Process: Story = { args: { current: 2, numbered: true } };

/** Dates come from `Date` values and follow the page language. No `current`: nothing is done or upcoming. */
export const History: Story = {
  args: { items: history, "aria-label": "Order history" },
};

/** Each status is a glyph on the marker and a hidden word. Never colour alone. */
export const Statuses: Story = {
  args: {
    "aria-label": "Statuses",
    items: [
      { title: "Info", description: "A note for the reader.", status: "info" },
      { title: "Success", description: "It went through.", status: "success" },
      { title: "Warning", description: "Shipped, 3 days late.", status: "warning" },
      { title: "Danger", description: "The payment failed.", status: "danger" },
      { title: "Neutral", description: "A memo with no glyph.", status: "neutral" },
    ],
  },
};

/** A done step can carry a warning: progress and status are independent. */
export const StatusWithProgress: Story = {
  args: {
    current: 2,
    "aria-label": "Order",
    items: [
      { title: "Ordered", date: new Date(2026, 10, 1) },
      {
        title: "Shipped",
        date: new Date(2026, 10, 9),
        status: "warning",
        description: "3 days late.",
      },
      { title: "In transit", date: new Date(2026, 10, 12) },
      { title: "Delivered" },
    ],
  },
};

/** A `marker` replaces the content of the marker: one glyph or a few characters. It is decorative. */
export const CustomMarker: Story = {
  args: {
    "aria-label": "Releases",
    items: [
      {
        title: "1.0",
        description: "First stable release.",
        marker: "◆",
        date: new Date(2026, 5, 1),
      },
      { title: "1.1", description: "Dark theme.", marker: "◇", date: new Date(2026, 7, 14) },
      { title: "2.0", description: "A new look.", marker: "★", date: new Date(2026, 10, 6) },
    ],
  },
};

/** Free content goes under the description: a Figure, a Badge, a row of links. */
export const WithContent: Story = {
  args: {
    "aria-label": "Workshop log",
    items: [
      {
        title: "Neck carved",
        date: new Date(2026, 10, 4),
        description: "Maple, satin finish.",
        content: (
          <Figure index={1} caption="The neck before the finish">
            <Placeholder shape="block" wave={false} height={120} />
          </Figure>
        ),
      },
      {
        title: "Pickups chosen",
        date: new Date(2026, 10, 2),
        href: "#pickups",
        content: (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Badge>P90</Badge>
            <Badge>Aged hardware</Badge>
          </div>
        ),
      },
      { title: "Order placed", date: new Date(2026, 10, 1), meta: "Ana" },
    ],
  },
};

/** `headingLevel` makes each title a real heading, for a long history that is part of the outline. */
export const Headings: Story = {
  args: { items: history, headingLevel: 3 },
};

/** Text dates need `dateTime` to be a `<time>`. */
export const TextDates: Story = {
  args: {
    current: 1,
    "aria-label": "Plan",
    items: [
      { title: "Kick-off", date: "Week 1", dateTime: "2026-W45" },
      { title: "Prototype", date: "Week 3", dateTime: "2026-W47" },
      { title: "Launch", date: "Week 6" },
    ],
  },
};

/** Past the eleventh entry the stagger stops growing, so a long list still finishes in about a second. */
export const LongList: Story = {
  args: {
    "aria-label": "Changelog",
    items: Array.from({ length: 30 }, (_, i) => ({
      title: `Release 2.${String(29 - i)}`,
      description: i % 3 === 0 ? "Fixes and small improvements." : undefined,
      date: new Date(2026, 10, 6 - i),
    })),
  },
};

/** `draw={false}` shows the finished state at once. */
export const NoDraw: Story = { args: { draw: false, current: 2, numbered: true } };

/** `dateFormat` adds the time; `labels` replaces the built-in words. */
export const DateFormatAndLabels: Story = {
  args: {
    current: 1,
    dateFormat: { dateStyle: "medium", timeStyle: "short" },
    labels: { completed: "finished", upcoming: "later" },
    "aria-label": "Deploys",
    items: [
      { title: "Build", date: new Date(2026, 10, 6, 9, 30) },
      { title: "Tests", date: new Date(2026, 10, 6, 9, 41) },
      { title: "Release", date: new Date(2026, 10, 6, 10, 5) },
    ],
  },
};

/** Dates and the hidden words follow the Root locale. */
export const Locales: Story = {
  args: { items: history.slice(0, 3), current: 1, numbered: true },
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-8)" }}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <p style={caption}>{locale}</p>
          <Timeline {...args} draw={false} aria-label={locale} />
        </Root>
      ))}
    </div>
  ),
};

/** The spine and the markers sit on the inline start side. */
export const Rtl: Story = {
  args: { current: 2, numbered: true },
  render: (args) => (
    <div dir="rtl">
      <Timeline {...args} draw={false} />
    </div>
  ),
};
