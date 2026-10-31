import {
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import {
  type LocaleName,
  LocaleTagContext,
  makeLabels,
  useLabels,
  useLocaleTag,
} from "../../locale";
import { prefersReducedMotion, useReducedMotion } from "../../motion";
import { cx } from "../../utils/cx";
import { Button } from "../Button";
import {
  addDays,
  addMonths,
  clampDate,
  type DateRange,
  dayOfWeekIndex,
  formatEraYear,
  formatLongDate,
  formatMonthYear,
  getWeekend,
  getWeekStart,
  intlTag,
  isBeforeDay,
  isJapanese,
  isOutOfBounds,
  isSameDay,
  isSameMonth,
  monthGrid,
  monthName,
  startOfDay,
  startOfMonth,
  toIsoDate,
  type Weekday,
  weekdayNames,
} from "./dates";

/** Imperative handle of a {@link Calendar}, for pickers that open it. */
export interface CalendarHandle {
  /** Moves focus to the focused day (the selected day or today on first open). */
  focus: () => void;
}

interface CalendarCommonProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue"
> {
  /** Earliest day that can be picked or focused. */
  min?: Date | undefined;
  /** Latest day that can be picked or focused. */
  max?: Date | undefined;
  /** Marks days that can't be picked (closed, booked): crossed out and `aria-disabled`. */
  isDateUnavailable?: ((date: Date) => boolean) | undefined;
  /**
   * Language of month and weekday names, the week start and the era line (`ja`). A built-in name
   * or any BCP 47 tag (`"es-MX"`). Built-in strings follow it too. Defaults to the nearest Root.
   */
  locale?: LocaleName | (string & {}) | undefined;
  /** First day of the week, 0 = Sunday. Defaults to the locale's (from `Intl.Locale` week info). */
  weekStartsOn?: Weekday | undefined;
  /** The day marked with the vermilion seal. Defaults to the current date. */
  today?: Date | undefined;
  /** Moves focus to the selected (or today's) day on mount, as inside a picker. */
  autoFocus?: boolean | undefined;
  /** The day that holds the tab stop; its month is the one shown. Controlled. */
  focusedDate?: Date | undefined;
  /** Initial focused day when uncontrolled. Defaults to the selected day, else today. */
  defaultFocusedDate?: Date | undefined;
  /** Called when the focused day changes (keyboard, the month buttons or the month grid). */
  onFocusedDateChange?: ((date: Date) => void) | undefined;
  /** Receives a {@link CalendarHandle} to move focus into the grid. */
  handleRef?: Ref<CalendarHandle> | undefined;
  /** Extra class names for the root element. */
  className?: string;
}

/** A Calendar that picks one day. */
export interface CalendarSingleProps extends CalendarCommonProps {
  range?: false;
  /** The selected day (controlled); `null` for none. */
  value?: Date | null | undefined;
  /** Initial selected day when uncontrolled. */
  defaultValue?: Date | null | undefined;
  /** Called with the picked day. */
  onChange?: ((value: Date) => void) | undefined;
}

/** A Calendar that picks a start and an end day. */
export interface CalendarRangeProps extends CalendarCommonProps {
  /** Picks a range: the first press sets the start, the second the end. */
  range: true;
  /** The selected range (controlled); `null` for none. */
  value?: DateRange | null | undefined;
  /** Initial range when uncontrolled. */
  defaultValue?: DateRange | null | undefined;
  /** Called on each press: `{ start, end: null }` after the first, the full range after the second. */
  onChange?: ((value: DateRange) => void) | undefined;
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

type FocusTarget = "day" | "month" | null;

const MONTHS = Array.from({ length: 12 }, (_, m) => m);

/** Months between the months of `a` and `b` (positive when `a` is later). */
const monthDiff = (a: Date, b: Date) =>
  (a.getFullYear() - b.getFullYear()) * 12 + a.getMonth() - b.getMonth();

/**
 * A ruled month grid with poster numerals, like a Japanese wall calendar. Today carries a
 * vermilion seal ring, the picked day is inked and a range is a maple band between two inked
 * ends. The month title opens a twelve-month grid. Keyboard follows the APG date grid. Other
 * props and `ref` go to the root `<div>`.
 */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(props, ref) {
  const {
    range = false,
    value: valueProp,
    defaultValue,
    onChange,
    min: minProp,
    max: maxProp,
    isDateUnavailable,
    locale,
    weekStartsOn,
    today: todayProp,
    autoFocus = false,
    focusedDate: focusedProp,
    defaultFocusedDate,
    onFocusedDateChange,
    handleRef,
    className,
    ...rest
  } = props;

  const context = useLabels();
  const rootTag = useContext(LocaleTagContext);
  const t = useMemo(() => {
    if (locale === undefined) return context;
    const own = makeLabels(locale);
    // Same built-in dictionary as the Root's: keep the Root's, which carries its label overrides.
    return rootTag !== undefined && own === makeLabels(rootTag) ? context : own;
  }, [locale, rootTag, context]);
  const lang = intlTag(useLocaleTag(locale));

  const id = useId();
  const titleId = `${id}-title`;
  const rootRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- set before any parent effect reads it
  useImperativeHandle(ref, () => rootRef.current!);
  const gridRef = useRef<HTMLTableElement>(null);
  const monthsRef = useRef<HTMLDivElement>(null);

  const [now] = useState(() => startOfDay(new Date()));
  const today = todayProp ? startOfDay(todayProp) : now;
  const min = minProp ? startOfDay(minProp) : undefined;
  const max = maxProp ? startOfDay(maxProp) : undefined;

  const ws = weekStartsOn ?? getWeekStart(lang);
  const weekend = useMemo(() => getWeekend(lang), [lang]);
  const names = useMemo(() => weekdayNames(lang, ws), [lang, ws]);

  // Selection
  const [value, setValue] = useControllable<Date | DateRange | null>(
    valueProp,
    defaultValue ?? null,
  );
  const single = range ? null : (value as Date | null);
  const rangeValue = range ? (value as DateRange | null) : null;
  const anchor = range ? (rangeValue?.start ?? null) : single;

  // Focus: the focused day decides the month shown.
  const [focusedState, setFocusedState] = useState(() =>
    clampDate(startOfDay(defaultFocusedDate ?? anchor ?? today), min, max),
  );
  const focused = focusedProp ? startOfDay(focusedProp) : focusedState;
  const view = startOfMonth(focused);
  const setFocused = (d: Date) => {
    if (isSameDay(d, focused)) return;
    if (!focusedProp) setFocusedState(d);
    onFocusedDateChange?.(d);
  };

  const [mode, setMode] = useState<"days" | "months">("days");
  const [monthIndex, setMonthIndex] = useState(view.getMonth());
  const [preview, setPreview] = useState<Date | null>(null);
  const wantFocus = useRef<FocusTarget>(autoFocus ? "day" : null);

  // Mokuhanga: a new month prints in the direction of travel; reduced motion skips it.
  const reduced = useReducedMotion();
  const viewKey = toIsoDate(view);
  const [print, setPrint] = useState({ view, dir: 0 });
  if (!isSameMonth(print.view, view)) {
    const instant = reduced || prefersReducedMotion(rootRef.current);
    setPrint({ view, dir: instant ? 0 : Math.sign(monthDiff(view, print.view)) });
  }

  // Follow a selection made from outside (a typed date) to its month.
  const anchorKey = toIsoDate(anchor);
  const lastAnchor = useRef(anchorKey);
  useEffect(() => {
    if (anchorKey === lastAnchor.current) return;
    lastAnchor.current = anchorKey;
    if (anchor && !isSameMonth(anchor, focused)) setFocused(clampDate(anchor, min, max));
  });

  const focusDay = useCallback(() => {
    const day = gridRef.current?.querySelector<HTMLElement>(`[data-date="${toIsoDate(focused)}"]`);
    if (day) {
      day.focus();
      return true;
    }
    return false;
  }, [focused]);

  useEffect(() => {
    if (wantFocus.current === "day" && focusDay()) wantFocus.current = null;
    if (wantFocus.current === "month") {
      monthsRef.current
        ?.querySelector<HTMLElement>(`[data-month="${String(monthIndex)}"]`)
        ?.focus();
      wantFocus.current = null;
    }
  });

  const [, rerender] = useState(0);
  useImperativeHandle(
    handleRef,
    () => ({
      focus: () => {
        if (focusDay()) return;
        wantFocus.current = "day";
        setMode("days");
        rerender((n) => n + 1);
      },
    }),
    [focusDay],
  );

  const unavailable = (d: Date) => isOutOfBounds(d, min, max) || Boolean(isDateUnavailable?.(d));

  const moveTo = (d: Date) => {
    const next = clampDate(d, min, max);
    if (isSameDay(next, focused)) return;
    setFocused(next);
    wantFocus.current = "day";
  };

  const choose = (d: Date) => {
    if (unavailable(d)) return;
    if (range) {
      const start = rangeValue?.start ?? null;
      const end = rangeValue?.end ?? null;
      const next: DateRange =
        !start || end || isBeforeDay(d, start) ? { start: d, end: null } : { start, end: d };
      setValue(next);
      (onChange as CalendarRangeProps["onChange"])?.(next);
      setPreview(null);
    } else {
      setValue(d);
      (onChange as CalendarSingleProps["onChange"])?.(d);
    }
    setFocused(d);
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    const offset = dayOfWeekIndex(focused, ws);
    // Left and Right follow the grid's visual order in LTR; RTL layouts are not swapped yet.
    let next: Date | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(focused, -1);
        break;
      case "ArrowRight":
        next = addDays(focused, 1);
        break;
      case "ArrowUp":
        next = addDays(focused, -7);
        break;
      case "ArrowDown":
        next = addDays(focused, 7);
        break;
      case "Home":
        next = addDays(focused, -offset);
        break;
      case "End":
        next = addDays(focused, 6 - offset);
        break;
      case "PageUp":
        next = addMonths(focused, event.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(focused, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    moveTo(next);
  };

  const onGridBlur = (event: FocusEvent<HTMLTableElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setPreview(null);
  };

  // Month buttons: one month in the day grid, one year in the month grid.
  const stepBy = mode === "days" ? 1 : 12;
  const prevDisabled =
    !!min &&
    (mode === "days" ? monthDiff(view, min) <= 0 : view.getFullYear() <= min.getFullYear());
  const nextDisabled =
    !!max &&
    (mode === "days" ? monthDiff(max, view) <= 0 : max.getFullYear() <= view.getFullYear());
  const step = (direction: -1 | 1) => {
    const next = clampDate(addMonths(focused, direction * stepBy), min, max);
    setFocused(next);
    const willDisable =
      direction < 0
        ? !!min &&
          (mode === "days" ? monthDiff(next, min) <= 0 : next.getFullYear() <= min.getFullYear())
        : !!max &&
          (mode === "days" ? monthDiff(max, next) <= 0 : max.getFullYear() <= next.getFullYear());
    // A button that turns disabled drops focus to the body: hand it to the grid instead.
    if (willDisable) {
      wantFocus.current = mode === "days" ? "day" : "month";
      if (mode === "months") setMonthIndex(next.getMonth());
    }
  };

  const toggleMode = () => {
    if (mode === "days") {
      setMonthIndex(view.getMonth());
      setMode("months");
      setPrint((p) => ({ ...p, dir: 0 }));
      wantFocus.current = "month";
    } else {
      setMode("days");
    }
  };

  const monthUnavailable = (m: number) => {
    const first = new Date(view.getFullYear(), m, 1);
    const last = new Date(view.getFullYear(), m + 1, 0);
    return (!!min && isBeforeDay(last, min)) || (!!max && isBeforeDay(max, first));
  };

  const pickMonth = (m: number) => {
    if (monthUnavailable(m)) return;
    setFocused(clampDate(addMonths(focused, m - focused.getMonth()), min, max));
    setMode("days");
    wantFocus.current = "day";
  };

  const onMonthsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    let next = monthIndex;
    switch (event.key) {
      case "ArrowLeft":
        next -= 1;
        break;
      case "ArrowRight":
        next += 1;
        break;
      case "ArrowUp":
        next -= 3;
        break;
      case "ArrowDown":
        next += 3;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 11;
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        setMode("days");
        wantFocus.current = "day";
        return;
      default:
        return;
    }
    event.preventDefault();
    next = Math.min(11, Math.max(0, next));
    if (next === monthIndex) return;
    setMonthIndex(next);
    wantFocus.current = "month";
  };

  // Range band: the real end, or a preview of it while only the start is picked.
  const rangeStart = rangeValue?.start ?? null;
  const rangeEnd =
    rangeValue?.end ??
    (rangeStart && preview && !isBeforeDay(preview, rangeStart) ? preview : null);
  const previewing = range && !rangeValue?.end && rangeEnd !== null;
  const showPreview = (d: Date) => {
    if (range && rangeStart && !rangeValue?.end) setPreview(d);
  };

  const japanese = isJapanese(lang);

  return (
    <div
      ref={rootRef}
      lang={locale === undefined ? undefined : lang}
      className={cx("ol-cal", className)}
      data-view={mode}
      {...rest}
    >
      <div className="ol-cal__head">
        {/* The grid's name, announced when the month changes. */}
        <span id={titleId} className="ol-sr" aria-live="polite">
          {formatMonthYear(view, lang)}
        </span>
        <span id={`${id}-hint`} hidden>
          {t.chooseMonth}
        </span>
        {/* Named by its visible text (label in name); what it does is its description. */}
        <button
          type="button"
          className="ol-cal__title"
          aria-describedby={`${id}-hint`}
          aria-expanded={mode === "months"}
          aria-controls={mode === "months" ? `${id}-months` : undefined}
          onClick={toggleMode}
        >
          <span className="ol-cal__month">{monthName(view, lang)}</span>{" "}
          <span className="ol-cal__year">{view.getFullYear()}</span>
          {japanese ? (
            <>
              {" "}
              <span className="ol-cal__era" lang="ja">
                {formatEraYear(view)}
              </span>
            </>
          ) : null}
        </button>
        <div className="ol-cal__nav">
          <Button
            square
            size="s"
            aria-label={mode === "days" ? t.prevMonth : t.prevYear}
            disabled={prevDisabled}
            onClick={() => {
              step(-1);
            }}
          >
            ←
          </Button>
          <Button
            square
            size="s"
            aria-label={mode === "days" ? t.nextMonth : t.nextYear}
            disabled={nextDisabled}
            onClick={() => {
              step(1);
            }}
          >
            →
          </Button>
        </div>
      </div>

      {mode === "months" ? (
        // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- focus roves on the options
        <div
          ref={monthsRef}
          id={`${id}-months`}
          className="ol-cal__months"
          role="listbox"
          aria-label={t.chooseMonth}
          onKeyDown={onMonthsKeyDown}
        >
          {MONTHS.map((m) => {
            const d = new Date(view.getFullYear(), m, 1);
            const off = monthUnavailable(m);
            // Inked like the board: the month of the selected day (a range's start).
            const chosen = isSameMonth(anchor, d);
            return (
              <button
                key={m}
                type="button"
                role="option"
                className="ol-cal__mon"
                data-month={m}
                tabIndex={m === monthIndex ? 0 : -1}
                aria-selected={chosen}
                aria-disabled={off || undefined}
                aria-current={isSameMonth(today, d) ? "date" : undefined}
                onClick={() => {
                  pickMonth(m);
                }}
                onFocus={() => {
                  setMonthIndex(m);
                }}
              >
                {/* Named by its visible text (label in name), with the year for screen readers. */}
                {monthName(d, lang, "short")} <span className="ol-sr">{view.getFullYear()}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <table
          ref={gridRef}
          className="ol-cal__grid"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- APG date grid
          role="grid"
          aria-multiselectable={range || undefined}
          aria-labelledby={titleId}
          onKeyDown={onGridKeyDown}
          onBlur={onGridBlur}
          onMouseLeave={() => {
            setPreview(null);
          }}
        >
          <thead>
            <tr>
              {names.map((n) => (
                <th
                  key={n.day}
                  scope="col"
                  abbr={n.long}
                  data-weekend={weekend.includes(n.day) || undefined}
                >
                  {n.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody key={viewKey} className="ol-cal__body" data-dir={print.dir || undefined}>
            {monthGrid(view, ws).map((week) => (
              <tr key={toIsoDate(week[0])}>
                {week.map((d) => {
                  const iso = toIsoDate(d);
                  const isWeekend = weekend.includes(d.getDay() as Weekday) || undefined;
                  const end = range && isSameDay(d, rangeEnd);
                  const start = range && isSameDay(d, rangeStart);
                  const inBand =
                    range &&
                    !!rangeStart &&
                    !!rangeEnd &&
                    isBeforeDay(rangeStart, d) &&
                    isBeforeDay(d, rangeEnd);
                  const cellAttrs = {
                    "data-in-range": inBand || undefined,
                    "data-range-start": (start && rangeEnd !== null) || undefined,
                    "data-range-end": end || undefined,
                    "data-preview": (previewing && (inBand || end)) || undefined,
                  };

                  if (!isSameMonth(d, view)) {
                    // Days of the neighbouring months are context only: shown, never focused.
                    return (
                      <td key={iso} role="gridcell" {...cellAttrs}>
                        <span
                          className="ol-cal__day"
                          data-outside=""
                          data-unavailable={unavailable(d) || undefined}
                          data-weekend={isWeekend}
                          aria-hidden="true"
                        >
                          <span className="ol-cal__num">{d.getDate()}</span>
                        </span>
                      </td>
                    );
                  }

                  const isToday = isSameDay(d, today);
                  const off = unavailable(d);
                  const selected = range
                    ? !!rangeStart &&
                      (isSameDay(d, rangeStart) ||
                        (!!rangeValue?.end &&
                          !isBeforeDay(d, rangeStart) &&
                          !isBeforeDay(rangeValue.end, d)))
                    : isSameDay(d, single);
                  const inked = range ? start || (end && !!rangeValue?.end) : selected;
                  const marks = [
                    isToday ? t.dateToday : "",
                    selected ? t.dateSelected : "",
                    off ? t.dateUnavailable : "",
                  ].filter(Boolean);

                  return (
                    <td key={iso} role="gridcell" aria-selected={selected} {...cellAttrs}>
                      <button
                        type="button"
                        className="ol-cal__day"
                        data-date={iso}
                        tabIndex={isSameDay(d, focused) ? 0 : -1}
                        aria-label={t.dayLabel(formatLongDate(d, lang), marks)}
                        aria-current={isToday ? "date" : undefined}
                        aria-disabled={off || undefined}
                        data-selected={inked || undefined}
                        data-weekend={isWeekend}
                        onClick={() => {
                          choose(d);
                        }}
                        onFocus={() => {
                          setFocused(d);
                          showPreview(d);
                        }}
                        onMouseEnter={() => {
                          showPreview(d);
                        }}
                      >
                        {isToday ? (
                          <span
                            className="ol-cal__seal ol-stamp ol-stamp--shu ol-stamp--round"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="ol-cal__num">{d.getDate()}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
});
