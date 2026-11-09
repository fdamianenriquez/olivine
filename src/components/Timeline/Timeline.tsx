import {
  type ComponentPropsWithoutRef,
  createElement,
  type CSSProperties,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLabels, useLocaleTag } from "../../locale";
import { useEntrance } from "../../motion";
import { cx } from "../../utils/cx";
import { formatter } from "../../utils/date";
import { devWarn } from "../../utils/dev";

export type TimelineStatus = "info" | "success" | "warning" | "danger" | "neutral";

export interface TimelineItem {
  /** The React key. Falls back to the index. */
  id?: string;
  /** The entry's name. */
  title: ReactNode;
  /** One or two lines under the title. */
  description?: ReactNode;
  /** Short label after the title, such as an author or a count. */
  meta?: ReactNode;
  /**
   * A `Date` is formatted for the Root locale with `dateFormat` and written in `<time>`. Any other
   * node is shown as given (for example "Week 3").
   */
  date?: Date | ReactNode;
  /**
   * The machine-readable value of `<time datetime>` when `date` is not a `Date`: a valid HTML date
   * or date-time string. Without it a text `date` is plain text, not `<time>`.
   */
  dateTime?: string;
  /**
   * Marks the entry with a glyph on its marker and a hidden word from the locale. Independent of
   * progress: a done step can carry a warning.
   */
  status?: TimelineStatus;
  /**
   * Replaces the marker's content (one glyph or a few characters). Decorative and hidden from
   * assistive technology: never the only label.
   */
  marker?: ReactNode;
  /** Makes the title a link. */
  href?: string;
  /** Free content under the description: a Figure, a Badge, a row of links. */
  content?: ReactNode;
}

/** The words a timeline announces. Defaults come from the locale. */
export interface TimelineLabels {
  /** Read after the title of an entry before `current`. */
  completed: string;
  /** Read after the title of an entry after `current`. */
  upcoming: string;
  /** Read after the title of an entry with a `status`. Defaults to the locale's status words. */
  tags: Partial<Record<TimelineStatus, string>>;
}

export interface TimelineProps extends Omit<ComponentPropsWithoutRef<"ol">, "children"> {
  /** The entries, in the order they are shown. The component never sorts. */
  items: readonly TimelineItem[];
  /**
   * Turns progress on, 0-based. Entries before it are done, the entry is the current one
   * (`aria-current="step"`) and later ones are upcoming. Leave it out for a history.
   */
  current?: number;
  /**
   * Puts a zero-padded figure (01, 02…) in each marker. Use it only when the order is real. An
   * entry with a `marker` or a `status` shows that instead.
   * @default false
   */
  numbered?: boolean;
  /**
   * How a `Date` is written. Add `timeStyle` to show the time.
   * @default { dateStyle: "medium" }
   */
  dateFormat?: Intl.DateTimeFormatOptions;
  /** Renders each title as a heading of this level. Without it a title is plain text. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * Plays the draw-and-print entrance once, when the list scrolls into view. Entries added later
   * appear in place. Under reduced motion the finished state shows at once.
   * @default true
   */
  draw?: boolean;
  /** Overrides for the built-in words. */
  labels?: Partial<TimelineLabels>;
}

const DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

/** The marker glyph of each status (drawn in the mono face). Neutral has none. */
const GLYPHS: Readonly<Record<TimelineStatus, string | null>> = {
  info: "i",
  success: "✓",
  warning: "!",
  danger: "×",
  neutral: null,
};

/** The highest index the entrance staggers on, as `.ol-stagger`: a long list still ends fast. */
const STAGGER_CAP = 11;

type ItemState = "done" | "current" | "upcoming";

/** True when the format writes a time, so `datetime` needs the time too. */
function hasTime(options: Intl.DateTimeFormatOptions): boolean {
  return (
    options.timeStyle !== undefined ||
    options.hour !== undefined ||
    options.minute !== undefined ||
    options.second !== undefined ||
    options.dayPeriod !== undefined ||
    options.fractionalSecondDigits !== undefined
  );
}

/** The `datetime` value of a `Date`: a calendar date in the format's time zone, or an instant. */
function machineDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  if (hasTime(options)) return date.toISOString();
  // en-CA writes YYYY-MM-DD; the zone is the one the visible text uses.
  return formatter("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: options.timeZone,
  }).format(date);
}

function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

/**
 * An ordered list of events or process steps on a hairline spine: a marker on the line, an
 * optional date, a title, a description and any extra content. It is read-only: use `Stepper`
 * for a flow the user moves through, `ListGroup` for a plain ruled list and `Accordion` for
 * entries that open and close. The spine is drawn once like a brush stroke when the list scrolls
 * into view, then the entries print onto it.
 */
export const Timeline = forwardRef<HTMLOListElement, TimelineProps>(function Timeline(
  {
    items,
    current,
    numbered = false,
    dateFormat = DEFAULT_DATE_FORMAT,
    headingLevel,
    draw = true,
    labels,
    className,
    style,
    ...rest
  },
  ref,
) {
  const words = useLabels();
  const localeTag = useLocaleTag();
  const t = { ...words.timeline, ...labels };
  const tags = { ...words.tags, ...labels?.tags };
  const { setElement } = useEntrance<HTMLOListElement>();
  // Set once every animation of the entrance has finished: later changes never replay it.
  const [settled, setSettled] = useState(false);
  const listRef = useRef<HTMLOListElement | null>(null);

  // The hold until the list is in view is wanted only with `draw`; a new callback makes React
  // re-attach the ref when `draw` changes.
  const setRef = useCallback(
    (node: HTMLOListElement | null) => {
      listRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLOListElement | null }).current = node;
      setElement(draw ? node : null);
    },
    [ref, setElement, draw],
  );

  const empty = items.length === 0;
  useEffect(() => {
    const list = listRef.current;
    if (!draw || settled || !list || typeof list.getAnimations !== "function") return;
    // A looping animation (a Spinner in `content`) never finishes: it is not part of the entrance.
    const onEnd = () => {
      const entrance = list
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
      if (entrance.every((a) => a.playState === "finished")) setSettled(true);
    };
    list.addEventListener("animationend", onEnd);
    return () => {
      list.removeEventListener("animationend", onEnd);
    };
  }, [draw, settled, empty]);

  if (empty) return null;

  const total = items.length;
  const position =
    current === undefined || !Number.isFinite(current)
      ? undefined
      : Math.min(Math.max(0, Math.floor(current)), total - 1);

  const listStyle = {
    ...style,
    "--ol-last": Math.min(total - 1, STAGGER_CAP),
  } as CSSProperties;

  return (
    // WebKit drops the list semantics of an `ol` with `list-style: none`, so the role is explicit.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ol
      role="list"
      {...rest}
      ref={setRef}
      style={listStyle}
      className={cx("ol-timeline", draw && !settled && "ol-timeline--draw", className)}
    >
      {items.map((item, index) => {
        const state: ItemState | undefined =
          position === undefined
            ? undefined
            : index < position
              ? "done"
              : index === position
                ? "current"
                : "upcoming";
        const glyph = item.status ? GLYPHS[item.status] : null;
        const kind = item.marker != null ? "custom" : glyph ? "glyph" : numbered ? "number" : "dot";
        const spoken = [
          state === "done" ? t.completed : state === "upcoming" ? t.upcoming : null,
          item.status ? tags[item.status] : null,
        ].filter((word): word is string => Boolean(word));

        let date: ReactNode = null;
        if (isDate(item.date)) {
          if (Number.isNaN(item.date.getTime())) {
            devWarn("Timeline", "an item has an invalid `date` and it is not shown.");
          } else {
            date = (
              <time className="ol-timeline__date" dateTime={machineDate(item.date, dateFormat)}>
                {formatter(localeTag, dateFormat).format(item.date)}
              </time>
            );
          }
        } else if (item.date != null && typeof item.date !== "boolean" && item.date !== "") {
          date =
            item.dateTime !== undefined ? (
              <time className="ol-timeline__date" dateTime={item.dateTime}>
                {item.date}
              </time>
            ) : (
              <span className="ol-timeline__date">{item.date}</span>
            );
        }

        const titleContent =
          item.href !== undefined ? (
            <a className="ol-timeline__link" href={item.href}>
              {item.title}
            </a>
          ) : (
            item.title
          );
        const title = headingLevel
          ? createElement(
              `h${String(headingLevel)}`,
              { className: "ol-timeline__title" },
              titleContent,
            )
          : createElement("span", { className: "ol-timeline__title" }, titleContent);

        return (
          <li
            key={item.id ?? index}
            className="ol-timeline__item"
            data-state={state}
            data-status={item.status}
            aria-current={state === "current" ? "step" : undefined}
            style={{ "--ol-i": Math.min(index, STAGGER_CAP) } as CSSProperties}
          >
            <span className="ol-timeline__marker" data-kind={kind} aria-hidden="true">
              {kind === "custom" ? item.marker : kind === "glyph" ? glyph : null}
            </span>
            <div className="ol-timeline__body">
              {date}
              <div className="ol-timeline__head">
                {title}
                {spoken.length > 0 && <span className="ol-sr">, {spoken.join(", ")}</span>}
                {item.meta != null && <span className="ol-timeline__meta">{item.meta}</span>}
              </div>
              {item.description != null && <p className="ol-timeline__desc">{item.description}</p>}
              {item.content != null && <div className="ol-timeline__content">{item.content}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
});
