import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useDismiss } from "../../hooks/useDismiss";
import { useField } from "../../hooks/useFieldControl";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useMenuPosition } from "../../hooks/useMenuPosition";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import { type LocaleName, useLocaleTag } from "../../locale";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { isImeKey } from "../../utils/ime";
import { pad } from "../../utils/pad";
import { Button } from "../Button";
import { Portal } from "../Portal";
import { useTimeLabels } from "./labels";
import {
  clampInt,
  type DayPeriod,
  dayPeriodNames,
  defaultHourCycle,
  formatHour,
  from12,
  type HourCycle,
  hoursOf,
  nearest,
  periodOf,
  stepThrough,
  type TimeValue,
  to12,
  toTimeString,
} from "./time";

export type { HourCycle, TimeValue } from "./time";

export interface TimePickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children" | "title"
> {
  /** Sentence-case label above the field. It names the group and the dialog. */
  label?: ReactNode;
  /** Helper text under the field. Referenced by `aria-describedby`. */
  hint?: ReactNode;
  /** The time in 24 h, `{ h, m }`, or `null` when empty (controlled). */
  value?: TimeValue | null | undefined;
  /** Initial time when uncontrolled. */
  defaultValue?: TimeValue | null | undefined;
  /** Called with the new time, or `null` when the field is cleared. */
  onChange?: ((value: TimeValue | null) => void) | undefined;
  /**
   * Distance between the minutes listed in the picker, and the step of Page Up / Page Down on
   * the minute segment. Any minute can still be typed.
   * @default 5
   */
  minuteStep?: number | undefined;
  /** 12 shows AM/PM, 24 does not. Defaults to the locale: English 12, Spanish and Japanese 24. */
  hourCycle?: HourCycle | undefined;
  /**
   * Shows the ◷ button that opens the hour and minute columns. `false` leaves the segmented
   * field alone (a time field).
   * @default true
   */
  picker?: boolean | undefined;
  /**
   * First hour (0–23) that can be picked or typed.
   * @default 0
   */
  minHour?: number | undefined;
  /**
   * Last hour (0–23) that can be picked or typed.
   * @default 23
   */
  maxHour?: number | undefined;
  /**
   * Language of the AM/PM words and the built-in strings, and of the default hour cycle. A
   * built-in name or any BCP 47 tag. Defaults to the nearest Root.
   */
  locale?: LocaleName | (string & {}) | undefined;
  /** Disables the field and its button. */
  disabled?: boolean | undefined;
  /** The time can be read and focused but not changed, and the picker can't be opened. */
  readOnly?: boolean | undefined;
  /** Marks the field required for assistive technology. */
  required?: boolean | undefined;
  /** Name of a hidden input that submits the time as `HH:MM` (nothing while empty). */
  name?: string | undefined;
  /** Whether the picker is open (controlled). */
  open?: boolean | undefined;
  /** Initial state of the picker when uncontrolled. */
  defaultOpen?: boolean | undefined;
  /** Called when the picker opens or closes. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Extra class names for the root element. */
  className?: string;
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const EMPTY_SEGMENT = "––";

/** Digits of a pressed key, with full-width forms folded in (`１` → `1`); otherwise `null`. */
function digitOf(key: string): number | null {
  const folded = key.normalize("NFKC");
  return /^[0-9]$/.test(folded) ? Number(folded) : null;
}

const isModified = (event: KeyboardEvent) => event.ctrlKey || event.altKey || event.metaKey;

/** Moves focus to the segment after `from` in its field. */
function focusNextSegment(from: HTMLElement) {
  const segments = Array.from(
    from.closest(".ol-timepicker__segs")?.querySelectorAll<HTMLElement>('[role="spinbutton"]') ??
      [],
  );
  segments[segments.indexOf(from) + 1]?.focus();
}

interface SegmentShellProps {
  label: string;
  text: string | null;
  now: number | undefined;
  min: number;
  max: number;
  valueText: string;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  invalid: boolean;
  period?: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => void;
  onBlur?: () => void;
}

/** One editable part of the time: a spinbutton drawn as plain text. */
function SegmentShell({
  label,
  text,
  now,
  min,
  max,
  valueText,
  disabled,
  readOnly,
  required,
  invalid,
  period = false,
  onKeyDown,
  onBlur,
}: SegmentShellProps) {
  return (
    <span
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      className={cx("ol-timepicker__seg", period && "ol-timepicker__seg--period")}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={now}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      data-empty={text === null || undefined}
      onKeyDown={(event) => {
        if (disabled || isModified(event) || isImeKey(event)) return;
        onKeyDown(event);
      }}
      onBlur={onBlur}
    >
      {text ?? EMPTY_SEGMENT}
    </span>
  );
}

interface NumberSegmentProps extends Omit<SegmentShellProps, "onKeyDown" | "onBlur" | "period"> {
  /** Moves the value one step (or one page) in a direction, wrapping. */
  onStep: (direction: 1 | -1, page: boolean) => void;
  /** Jumps to the first or last allowed value. */
  onJump: (end: "first" | "last") => void;
  /** Offers a typed number; returns whether it was taken. */
  onDigits: (n: number) => boolean;
  onClear: () => void;
}

/** A segment that steps with the arrow keys and takes typed digits. */
function NumberSegment({ onStep, onJump, onDigits, onClear, ...shell }: NumberSegmentProps) {
  const typed = useRef("");
  const { min, max, readOnly } = shell;

  const type = (digit: number, element: HTMLElement) => {
    const fits = (buffer: string) => {
      const n = Number(buffer);
      return n >= min && n <= max;
    };
    let buffer = typed.current + String(digit);
    if (buffer.length > 2 || (!fits(buffer) && typed.current !== "")) buffer = String(digit);
    const n = Number(buffer);
    if (fits(buffer) && onDigits(n)) {
      if (buffer.length === 2 || n * 10 > max) {
        typed.current = "";
        focusNextSegment(element);
      } else {
        typed.current = buffer;
      }
    } else {
      // A lone digit that can still grow into an allowed number (the 0 of 05) waits for the next.
      typed.current = buffer.length === 1 && n * 10 <= max ? buffer : "";
    }
  };

  return (
    <SegmentShell
      {...shell}
      onBlur={() => {
        typed.current = "";
      }}
      onKeyDown={(event) => {
        const digit = digitOf(event.key);
        if (digit !== null) {
          event.preventDefault();
          if (!readOnly) type(digit, event.currentTarget);
          return;
        }
        typed.current = "";
        switch (event.key) {
          case "ArrowUp":
          case "ArrowDown":
          case "PageUp":
          case "PageDown": {
            event.preventDefault();
            if (readOnly) return;
            const up = event.key === "ArrowUp" || event.key === "PageUp";
            onStep(up ? 1 : -1, event.key.startsWith("Page"));
            break;
          }
          case "Home":
          case "End":
            event.preventDefault();
            if (!readOnly) onJump(event.key === "Home" ? "first" : "last");
            break;
          case "Backspace":
          case "Delete":
            event.preventDefault();
            if (!readOnly) onClear();
            break;
          default:
        }
      }}
    />
  );
}

interface ColumnOption {
  value: number;
  text: string;
  /** The AM/PM word set small beside the hour. */
  small?: string | undefined;
  name?: string | undefined;
  selected: boolean;
  disabled: boolean;
}

interface ColumnProps {
  label: string;
  options: readonly ColumnOption[];
  onPick: (value: number) => void;
  /** Takes focus on mount (the hour column). */
  focusOnMount?: boolean;
}

/** One column of the picker: a listbox of ruled cells; focus roves, Enter or a press picks. */
function Column({ label, options, onPick, focusOnMount = false }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const roving = useRovingFocus(ref, {
    itemSelector: '[role="option"]',
    orientation: "vertical",
    selectedSelector: '[aria-selected="true"]',
    restore: "selected",
    consumeEnds: true,
  });

  // The picked cell opens in the middle of the column (never scrolling the page).
  useIsomorphicLayoutEffect(() => {
    const column = ref.current;
    const picked = column?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (column && picked) {
      column.scrollTop = picked.offsetTop - (column.clientHeight - picked.offsetHeight) / 2;
    }
  }, []);

  useEffect(() => {
    if (!focusOnMount) return;
    const column = ref.current;
    const target =
      column?.querySelector<HTMLElement>('[aria-selected="true"]:not([data-disabled])') ??
      column?.querySelector<HTMLElement>('[role="option"]:not([data-disabled])');
    target?.focus({ preventScroll: true });
  }, [focusOnMount]);

  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- focus roves on the options
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      className="ol-timepicker__col"
      onKeyDown={(event) => {
        roving.onKeyDown(event);
      }}
      onFocus={roving.onFocus}
      onBlur={roving.onBlur}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="option"
          className="ol-timepicker__opt"
          tabIndex={-1}
          aria-selected={option.selected}
          aria-disabled={option.disabled || undefined}
          aria-label={option.name}
          data-disabled={option.disabled ? "" : undefined}
          onMouseDown={(event) => {
            // A closed hour is not a place for focus to land.
            if (option.disabled) event.preventDefault();
          }}
          onClick={() => {
            if (!option.disabled) onPick(option.value);
          }}
        >
          <span className="ol-timepicker__cell">
            {option.text}
            {option.small !== undefined && <small>{option.small}</small>}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * A segmented time field (hour, minute and, on a 12 h clock, AM/PM) with a ◷ button that opens a
 * popover: the time set large in the figure face over two ruled columns of hours and minutes.
 * There is no clock dial. Each segment is a spinbutton: ↑/↓ step and wrap, digits type (and move
 * on), Backspace clears; AM/PM toggles with ↑/↓ or A/P. In the picker, ↑/↓, Home and End move
 * through a column, Enter picks and Escape closes. The `ref` points to the root `<div>`.
 */
export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(function TimePicker(
  {
    label,
    hint,
    value: valueProp,
    defaultValue = null,
    onChange,
    minuteStep: minuteStepProp = 5,
    hourCycle,
    picker = true,
    minHour,
    maxHour,
    locale,
    disabled = false,
    readOnly = false,
    required,
    name,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref,
) {
  const t = useTimeLabels(locale);
  const tag = useLocaleTag(locale);
  const field = useField();
  const id = useId();
  const labelId = label === undefined || label === null ? undefined : `${id}-label`;
  const hintId = hint === undefined || hint === null ? undefined : `${id}-hint`;
  const popId = `${id}-pop`;
  const groupLabelledBy = ariaLabelledBy ?? labelId ?? field?.labelId;
  const describedBy =
    [field?.describedBy, hintId, ariaDescribedBy].filter(Boolean).join(" ") || undefined;
  const invalid =
    ariaInvalid === undefined
      ? field?.invalid === true
      : ariaInvalid === true || ariaInvalid === "true";
  const isRequired = required ?? field?.required ?? false;

  const [value, setValue] = useControllable<TimeValue | null>(valueProp, defaultValue, onChange);
  const [openState, setOpen] = useControllable<boolean>(openProp, defaultOpen, onOpenChange);
  const open = picker && !disabled && !readOnly && openState;

  const cycle: HourCycle = hourCycle ?? defaultHourCycle(tag);
  const periods = useMemo(() => dayPeriodNames(tag), [tag]);
  const minuteStep = clampInt(minuteStepProp, 1, 60, 5);
  const lo = clampInt(minHour, 0, 23, 0);
  const hi = clampInt(maxHour, 0, 23, 23);
  const available = (hour: number) => hour >= lo && hour <= hi;

  const h = value?.h ?? null;
  const m = value?.m ?? null;
  // An empty 12 h field shows AM, or PM when no morning hour is allowed.
  const period: DayPeriod =
    h === null ? (hoursOf("AM").some(available) ? "AM" : "PM") : periodOf(h);
  const hourCycleOf = (p: DayPeriod) => (cycle === 12 ? hoursOf(p) : ALL_HOURS);
  const firstHour = nearest(ALL_HOURS, lo, available) ?? lo;

  const emit = (next: TimeValue | null) => {
    setValue(next);
  };
  const commit = (patch: Partial<TimeValue>) => {
    emit({ h: h ?? firstHour, m: m ?? 0, ...patch });
  };

  const stepHour = (direction: 1 | -1) => {
    const next = stepThrough(hourCycleOf(period), h, direction, available);
    if (next !== null) commit({ h: next });
  };
  const jumpHour = (end: "first" | "last") => {
    const next = stepThrough(hourCycleOf(period), null, end === "first" ? 1 : -1, available);
    if (next !== null) commit({ h: next });
  };
  const typeHour = (n: number) => {
    const hour = cycle === 12 ? from12(n, period) : n;
    if (!available(hour)) return false;
    commit({ h: hour });
    return true;
  };
  const setPeriod = (next: DayPeriod) => {
    const target = h === null ? lo : from12(to12(h), next);
    const hour = nearest(hoursOf(next), target, available);
    if (hour !== null) commit({ h: hour });
  };

  const stepMinute = (direction: 1 | -1, page: boolean) => {
    if (m === null) {
      commit({ m: direction === 1 ? 0 : 59 });
      return;
    }
    commit({ m: (((m + direction * (page ? minuteStep : 1)) % 60) + 60) % 60 });
  };

  // ---- popup ----
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const presence = usePresence<HTMLDivElement>(open);
  const position = useMenuPosition<HTMLDivElement, HTMLDivElement>({
    open: presence.mounted,
    placement: "bottom-start",
  });
  const { setElement } = presence;
  const { setAnchor, setFloating } = position;
  const setPopup = useCallback(
    (node: HTMLDivElement | null) => {
      popupRef.current = node;
      setElement(node);
      setFloating(node);
    },
    [setElement, setFloating],
  );
  const setBox = useCallback(
    (node: HTMLDivElement | null) => {
      boxRef.current = node;
      setAnchor(node);
    },
    [setAnchor],
  );

  const close = useCallback(
    (returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) buttonRef.current?.focus();
    },
    [setOpen],
  );
  useDismiss(
    open,
    useCallback(
      (reason) => {
        close(reason === "escape");
      },
      [close],
    ),
    [boxRef, popupRef],
  );

  const onPopupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.key !== "Tab") return;
    const popup = event.currentTarget;
    const stops = Array.from(
      popup.querySelectorAll<HTMLElement>('[role="option"][tabindex="0"], .ol-btn'),
    );
    const active = document.activeElement;
    if (!event.shiftKey && active === stops[stops.length - 1]) {
      // Focus goes back to the button so the browser tabs on from there.
      close(true);
    } else if (event.shiftKey && (active === stops[0] || active === popup)) {
      event.preventDefault();
      buttonRef.current?.focus();
    }
  };

  const hourOptions = ALL_HOURS.map<ColumnOption>((hour) => ({
    value: hour,
    text: formatHour(hour, cycle),
    small: cycle === 12 ? periods[periodOf(hour)] : undefined,
    name: cycle === 12 ? `${formatHour(hour, cycle)} ${periods[periodOf(hour)]}` : undefined,
    selected: hour === h,
    disabled: !available(hour),
  }));
  const minuteOptions = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep,
  ).map<ColumnOption>((minute) => ({
    value: minute,
    text: pad(minute),
    selected: minute === m,
    disabled: false,
  }));

  useEffect(() => {
    if (!ariaLabel && !groupLabelledBy) {
      devWarn("TimePicker", "give the field a `label` or an `aria-label` so the group has a name.");
    }
  }, [ariaLabel, groupLabelledBy]);

  const hourNow = h === null ? undefined : cycle === 12 ? to12(h) : h;
  const hourText = h === null ? null : formatHour(h, cycle);
  const minuteText = m === null ? null : pad(m);

  return (
    <div
      {...rest}
      ref={ref}
      lang={locale === undefined ? rest.lang : tag}
      className={cx("ol-timepicker", className)}
      data-state={open ? "open" : "closed"}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-invalid={invalid || undefined}
    >
      {labelId !== undefined && (
        <span id={labelId} className="ol-timepicker__label">
          {label}
        </span>
      )}
      <div
        ref={setBox}
        role="group"
        className="ol-timepicker__box"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : groupLabelledBy}
        aria-describedby={describedBy}
      >
        <span className="ol-timepicker__segs" dir="ltr">
          <NumberSegment
            label={t.timeHour}
            text={hourText}
            now={hourNow}
            min={cycle === 12 ? 1 : 0}
            max={cycle === 12 ? 12 : 23}
            valueText={hourText ?? t.timeEmpty}
            disabled={disabled}
            readOnly={readOnly}
            required={isRequired}
            invalid={invalid}
            onStep={(direction) => {
              stepHour(direction);
            }}
            onJump={jumpHour}
            onDigits={typeHour}
            onClear={() => {
              emit(null);
            }}
          />
          <span className="ol-timepicker__colon" aria-hidden="true">
            :
          </span>
          <NumberSegment
            label={t.timeMinute}
            text={minuteText}
            now={m ?? undefined}
            min={0}
            max={59}
            valueText={minuteText ?? t.timeEmpty}
            disabled={disabled}
            readOnly={readOnly}
            required={isRequired}
            invalid={invalid}
            onStep={stepMinute}
            onJump={(end) => {
              commit({ m: end === "first" ? 0 : 59 });
            }}
            onDigits={(n) => {
              commit({ m: n });
              return true;
            }}
            onClear={() => {
              emit(null);
            }}
          />
          {cycle === 12 && (
            <SegmentShell
              period
              label={t.timePeriod}
              text={periods[period]}
              now={period === "PM" ? 1 : 0}
              min={0}
              max={1}
              valueText={periods[period]}
              disabled={disabled}
              readOnly={readOnly}
              required={false}
              invalid={invalid}
              onKeyDown={(event) => {
                const key = event.key.toLowerCase();
                if (key === "arrowup" || key === "arrowdown") {
                  event.preventDefault();
                  if (!readOnly) setPeriod(period === "AM" ? "PM" : "AM");
                } else if (key === "a" || key === "p") {
                  event.preventDefault();
                  if (!readOnly) setPeriod(key === "a" ? "AM" : "PM");
                } else if (key === "backspace" || key === "delete") {
                  event.preventDefault();
                  if (!readOnly) emit(null);
                }
              }}
            />
          )}
        </span>
        {picker && (
          <button
            ref={buttonRef}
            type="button"
            className="ol-timepicker__btn"
            aria-label={t.timeChoose}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? popId : undefined}
            disabled={disabled || readOnly}
            onClick={() => {
              setOpen(!open);
            }}
          >
            <span className="ol-timepicker__glyph" aria-hidden="true">
              ◷
            </span>
          </button>
        )}
      </div>
      {hintId !== undefined && (
        <span id={hintId} className="ol-timepicker__hint">
          {hint}
        </span>
      )}
      {name !== undefined && !disabled && (
        <input type="hidden" name={name} value={value ? toTimeString(value) : ""} />
      )}
      {presence.mounted && (
        <Portal anchor={boxRef} keepActive>
          {/* The dialog handles Tab here to hand focus back to the button. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            {...position.props}
            ref={setPopup}
            id={popId}
            role="dialog"
            tabIndex={-1}
            aria-label={labelId === undefined && !field?.labelId ? t.timeChoose : undefined}
            aria-labelledby={labelId ?? field?.labelId}
            className="ol-floating ol-timepicker__pop ol-kakejiku"
            data-state={presence.state}
            onKeyDown={onPopupKeyDown}
          >
            <div className="ol-timepicker__head" aria-hidden="true">
              <span className="ol-timepicker__value">
                {h === null ? "––:––" : `${formatHour(h, cycle)}:${pad(m ?? 0)}`}
              </span>
              {cycle === 12 && <span className="ol-timepicker__period">{periods[period]}</span>}
            </div>
            <div className="ol-timepicker__cols">
              <Column
                focusOnMount
                label={t.timeHour}
                options={hourOptions}
                onPick={(hour) => {
                  commit({ h: hour });
                }}
              />
              <Column
                label={t.timeMinute}
                options={minuteOptions}
                onPick={(minute) => {
                  commit({ m: minute });
                }}
              />
            </div>
            <div className="ol-timepicker__foot">
              <Button
                size="s"
                variant="accent"
                onClick={() => {
                  close(true);
                }}
              >
                {t.timeDone}
              </Button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
});
