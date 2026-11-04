import {
  type ChangeEvent,
  type CompositionEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useDismiss } from "../../hooks/useDismiss";
import { useField, useFieldControl } from "../../hooks/useFieldControl";
import { useImeGuard } from "../../hooks/useImeGuard";
import { useMenuPosition } from "../../hooks/useMenuPosition";
import { useOverlay } from "../../hooks/useOverlay";
import type { LocaleName } from "../../locale";
import { LocaleTagContext, makeLabels, useLabels, useLocaleTag } from "../../locale";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Button } from "../Button";
import { Calendar, type CalendarHandle } from "../Calendar";
import {
  datePattern,
  type DateRange,
  formatDateInput,
  formatLongDate,
  formatShortDate,
  intlTag,
  isBeforeDay,
  isOutOfBounds,
  isSameDay,
  parseDateInput,
  startOfDay,
  toIsoDate,
  type Weekday,
} from "../Calendar/dates";
import { Portal } from "../Portal";

/** How the calendar opens: a popover under the field, or a sheet that waits for OK. */
export type DatePickerMode = "docked" | "modal";

interface DatePickerCommonProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children" | "id" | "placeholder"
> {
  /** Sentence-case label of the field. Inside a `Field`, leave it out: the Field draws its own. */
  label?: ReactNode;
  /**
   * Helper text under the field. Defaults to the typed format of the locale ("Format:
   * MM/DD/YYYY"). Inside a `Field` the Field's hint is used and none is drawn here.
   */
  hint?: ReactNode;
  /**
   * Error message. It replaces the hint, in beni with a ×, and marks the field `aria-invalid`.
   * Inside a `Field`, give the error to the Field.
   */
  error?: ReactNode;
  /**
   * `docked` unrolls a popover under the field and picks at once; `modal` opens a sheet (a
   * bottom sheet on phones) with the chosen date set large and Cancel / OK: nothing changes
   * until OK.
   * @default "docked"
   */
  mode?: DatePickerMode | undefined;
  /** Earliest date that can be typed or picked. */
  min?: Date | undefined;
  /** Latest date that can be typed or picked. */
  max?: Date | undefined;
  /** Marks dates that can't be picked or typed (closed, booked). */
  isDateUnavailable?: ((date: Date) => boolean) | undefined;
  /**
   * Language of the typed format, the calendar and the built-in words. A built-in name or any
   * BCP 47 tag (`"es-MX"`). Defaults to the nearest Root.
   */
  locale?: LocaleName | (string & {}) | undefined;
  /** First day of the week, 0 = Sunday. Defaults to the locale's. */
  weekStartsOn?: Weekday | undefined;
  /** The day marked with the vermilion seal and picked by "Today". Defaults to the current date. */
  today?: Date | undefined;
  /** Id of the input (of the start input with `range`). */
  id?: string | undefined;
  disabled?: boolean | undefined;
  /** Shows the date without letting it change: the calendar button is disabled too. */
  readOnly?: boolean | undefined;
  /** Sets `aria-required` and shows an olive asterisk next to the label. */
  required?: boolean | undefined;
  /** Whether the calendar is open (controlled). */
  open?: boolean | undefined;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean | undefined;
  /** Called when the calendar opens or closes. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Extra class names for the root element. */
  className?: string | undefined;
}

/** A DatePicker for one date. */
export interface DatePickerSingleProps extends DatePickerCommonProps {
  range?: false | undefined;
  /** The date (controlled); `null` for none. */
  value?: Date | null | undefined;
  /** Initial date when uncontrolled. */
  defaultValue?: Date | null | undefined;
  /** Called with the date typed or picked, or `null` when the field is emptied or cleared. */
  onChange?: ((value: Date | null) => void) | undefined;
  /** Renders a hidden input with the ISO date (`YYYY-MM-DD`) for native forms. */
  name?: string | undefined;
}

/** A DatePicker for a start and an end date: two inputs joined by → and one range calendar. */
export interface DatePickerRangeProps extends DatePickerCommonProps {
  range: true;
  /** The range (controlled); `null` for none. */
  value?: DateRange | null | undefined;
  /** Initial range when uncontrolled. */
  defaultValue?: DateRange | null | undefined;
  /**
   * Called when either end changes. In the calendar the first press gives `{ start, end: null }`
   * and the second the full range; typing an end before the start is ignored.
   */
  onChange?: ((value: DateRange) => void) | undefined;
  /** Accessible name of the start input. Defaults to "Start". */
  startLabel?: string | undefined;
  /** Accessible name of the end input. Defaults to "End". */
  endLabel?: string | undefined;
  /** Hidden input names for native forms; each carries an ISO date. */
  startName?: string | undefined;
  endName?: string | undefined;
}

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

type Texts = readonly [string, string];

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

const isTabbable = (el: HTMLElement) =>
  el.tabIndex >= 0 && !el.hidden && !el.closest("[inert], [hidden]");

/** Same calendar day, or both empty. */
const sameOrBothNull = (a: Date | null, b: Date | null) => (a && b ? isSameDay(a, b) : a === b);

/**
 * A date field you can type into, in the locale's format (ISO `YYYY-MM-DD` is always accepted),
 * with a ▦ button that opens a {@link Calendar}. Docked, the calendar unrolls under the field
 * and picks at once, with Today and Clear; as a modal it is a sheet with Cancel and OK. With
 * `range`, two inputs joined by → share one range calendar. Text that doesn't parse stays as
 * typed and leaves the value alone. `ref` points to the input (the start input with `range`).
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(props, ref) {
    const {
      range = false,
      value: valueProp,
      defaultValue,
      onChange,
      label,
      hint,
      error,
      mode = "docked",
      min: minProp,
      max: maxProp,
      isDateUnavailable,
      locale,
      weekStartsOn,
      today: todayProp,
      id: idProp,
      disabled = false,
      readOnly = false,
      required = false,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
      name,
      startLabel,
      endLabel,
      startName,
      endName,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      lang: langProp,
      ...rest
    } = props as DatePickerCommonProps & {
      range?: boolean;
      value?: Date | DateRange | null | undefined;
      defaultValue?: Date | DateRange | null | undefined;
      onChange?: ((value: never) => void) | undefined;
      name?: string | undefined;
      startLabel?: string | undefined;
      endLabel?: string | undefined;
      startName?: string | undefined;
      endName?: string | undefined;
    };

    // ---- language and words ----
    const context = useLabels();
    const rootTag = useContext(LocaleTagContext);
    const t = useMemo(() => {
      if (locale === undefined) return context;
      const own = makeLabels(locale);
      // Same built-in dictionary as the Root's: keep the Root's, which carries its overrides.
      return rootTag !== undefined && own === makeLabels(rootTag) ? context : own;
    }, [locale, rootTag, context]);
    const lang = intlTag(useLocaleTag(locale));

    // ---- ids and field ----
    const uid = useId();
    const labelId = `${uid}-label`;
    const hintId = `${uid}-hint`;
    const popupId = `${uid}-popup`;
    const field = useField();
    const hasLabel = label !== undefined && label !== null && label !== false && label !== "";
    const fieldProps = useFieldControl({
      id: idProp,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": error ? true : undefined,
      required: required || undefined,
    });
    const inputId = fieldProps.id ?? `${uid}-input`;
    const invalid = fieldProps["aria-invalid"] === true;
    // Inside a Field the Field draws the label, hint and error.
    const own = field === null;
    const nameId = hasLabel && own ? labelId : field?.labelId;

    // ---- value ----
    const [value, setValue] = useControllable<Date | DateRange | null>(
      valueProp,
      defaultValue ?? null,
      onChange as ((next: Date | DateRange | null) => void) | undefined,
    );
    const single = range ? null : (value as Date | null);
    const span = range ? (value as DateRange | null) : null;
    const parts: readonly [Date | null, Date | null] = range
      ? [span?.start ?? null, span?.end ?? null]
      : [single, null];

    const min = minProp ? startOfDay(minProp) : undefined;
    const max = maxProp ? startOfDay(maxProp) : undefined;
    const unavailable = (d: Date) => isOutOfBounds(d, min, max) || Boolean(isDateUnavailable?.(d));
    const [now] = useState(() => startOfDay(new Date()));
    const today = todayProp ? startOfDay(todayProp) : now;

    // ---- the typed text ----
    const format = (d: Date | null) => formatDateInput(d, lang);
    const parse = (text: string) => parseDateInput(text.normalize("NFKC"), lang);
    const [texts, setTexts] = useState<Texts>(() => [format(parts[0]), format(parts[1])]);
    const valueKey = `${lang}|${toIsoDate(parts[0])}|${toIsoDate(parts[1])}`;
    const [seenKey, setSeenKey] = useState(valueKey);
    if (seenKey !== valueKey) {
      // The value changed (picked, cleared, set from outside): the text follows unless it
      // already says the same date in the way the person typed it.
      setSeenKey(valueKey);
      setTexts((prev) => [
        sameOrBothNull(parse(prev[0]), parts[0]) ? prev[0] : format(parts[0]),
        sameOrBothNull(parse(prev[1]), parts[1]) ? prev[1] : format(parts[1]),
      ]);
    }

    const ime = useImeGuard();

    /** Commits what was typed, when it is a real, allowed date. Anything else changes nothing. */
    const commitText = (which: 0 | 1, raw: string) => {
      const empty = raw.trim() === "";
      const d = empty ? null : parse(raw);
      if (!empty && (!d || unavailable(d))) return;
      if (!range) {
        if (!sameOrBothNull(d, single)) setValue(d);
        return;
      }
      const current: DateRange = span ?? { start: null, end: null };
      if (sameOrBothNull(d, which === 0 ? current.start : current.end)) return;
      if (which === 0) {
        // A new start after the old end drops the end.
        const end = d && current.end && isBeforeDay(current.end, d) ? null : current.end;
        setValue({ start: d, end });
      } else {
        if (d && current.start && isBeforeDay(d, current.start)) return;
        setValue({ start: current.start, end: d });
      }
    };

    const onInput = (which: 0 | 1) => (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setTexts((prev) => (which === 0 ? [raw, prev[1]] : [prev[0], raw]));
      // While an IME composes, the text follows but nothing is parsed.
      if (ime.isComposing(event.nativeEvent as unknown as globalThis.KeyboardEvent)) return;
      commitText(which, raw);
    };
    const onCompositionEnd = (which: 0 | 1) => (event: CompositionEvent<HTMLInputElement>) => {
      ime.onCompositionEnd();
      commitText(which, event.currentTarget.value);
    };
    /** A date that parsed is written back in the locale's format. */
    const onInputBlur = (which: 0 | 1) => () => {
      const d = parse(texts[which]);
      if (d && sameOrBothNull(d, parts[which]) && texts[which] !== format(d)) {
        setTexts((prev) => (which === 0 ? [format(d), prev[1]] : [prev[0], format(d)]));
      }
    };

    // ---- open state and the draft of a modal ----
    const active = !disabled && !readOnly;
    const [openState, setOpenState] = useControllable<boolean>(openProp, defaultOpen);
    const shown = openState && active;
    const setOpen = (next: boolean) => {
      if (next === openState) return;
      setOpenState(next);
      onOpenChange?.(next);
    };
    const [draft, setDraft] = useState<Date | DateRange | null>(value);
    const [wasShown, setWasShown] = useState(shown);
    if (wasShown !== shown) {
      setWasShown(shown);
      if (shown) setDraft(value);
    }

    const boxRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const calendarRef = useRef<CalendarHandle>(null);
    const setInput = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const docked = mode === "docked";
    const presence = usePresence<HTMLDivElement>(shown);
    const position = useMenuPosition<HTMLDivElement, HTMLDivElement>({
      open: presence.mounted && docked,
      placement: "bottom-start",
    });
    const { setElement } = presence;
    const { setFloating, setAnchor } = position;
    const [popupNode, setPopupNode] = useState<HTMLDivElement | null>(null);

    // A modal makes the page inert while it is open: focus goes back to the button once it isn't.
    const refocus = useRef(false);
    const closePicker = (returnFocus: boolean) => {
      setOpen(false);
      if (!returnFocus) return;
      refocus.current = true;
      if (docked) buttonRef.current?.focus();
    };
    useEffect(() => {
      if (shown) {
        refocus.current = false;
      } else if (refocus.current) {
        refocus.current = false;
        buttonRef.current?.focus();
      }
    }, [shown]);

    // Escape that belongs to an IME composition must not close the popup. Recorded in the capture
    // phase, before the dismiss handler reads it.
    const imeKey = useRef(false);
    useEffect(() => {
      if (!(shown && docked)) return;
      const record = (event: globalThis.KeyboardEvent) => {
        imeKey.current = ime.isComposing(event);
      };
      document.addEventListener("keydown", record, true);
      return () => {
        document.removeEventListener("keydown", record, true);
      };
    }, [shown, docked, ime]);

    // Docked: an outside press or Escape closes it; Escape returns focus to the button.
    useDismiss(
      shown && docked,
      (reason) => {
        if (reason === "escape" && imeKey.current) return;
        const inside = popupRef.current?.contains(document.activeElement) === true;
        closePicker(reason === "escape" && inside);
      },
      [boxRef, popupRef],
    );

    // Modal: focus is trapped; Escape cancels.
    const overlayRef = useOverlay({
      open: shown && !docked,
      onClose: () => {
        closePicker(true);
      },
      restoreFocus: false,
    });

    const setPopup = useCallback(
      (node: HTMLDivElement | null) => {
        popupRef.current = node;
        setElement(node);
        setFloating(node);
        setPopupNode(node);
      },
      [setElement, setFloating],
    );
    const setPanel = useCallback(
      (node: HTMLDivElement | null) => {
        popupRef.current = node;
        setElement(node);
        overlayRef(node);
        setPopupNode(node);
      },
      [setElement, overlayRef],
    );
    const setBox = useCallback(
      (node: HTMLDivElement | null) => {
        boxRef.current = node;
        setAnchor(node);
      },
      [setAnchor],
    );

    // On open, focus goes to the selected (or today's) day. After useOverlay's own effect.
    useEffect(() => {
      if (popupNode) calendarRef.current?.focus();
    }, [popupNode]);

    // Focus leaving the field and the popup (Tab past the button) closes the docked popup.
    const dockedOpen = shown && docked;
    useEffect(() => {
      if (!dockedOpen) return;
      const onFocusIn = (event: FocusEvent) => {
        const next = event.target as Node | null;
        if (!next || boxRef.current?.contains(next) || popupRef.current?.contains(next)) return;
        closePicker(false);
      };
      document.addEventListener("focusin", onFocusIn);
      return () => {
        document.removeEventListener("focusin", onFocusIn);
      };
      // closePicker only reads refs and the latest setOpen
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dockedOpen]);

    const onPopupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented || event.key !== "Tab") return;
      const panel = event.currentTarget;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(TABBABLE)).filter(isTabbable);
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (!event.shiftKey && (current === last || !last)) {
        // Focus goes back to the button so the browser tabs on from there.
        closePicker(true);
      } else if (event.shiftKey && (current === first || !first)) {
        event.preventDefault();
        buttonRef.current?.focus();
      }
    };

    // ---- picking ----
    const pick = (next: Date | DateRange) => {
      if (!docked) {
        setDraft(next);
        return;
      }
      setValue(next);
      const done = range ? Boolean((next as DateRange).end) : true;
      if (done) closePicker(true);
    };
    const chooseToday = () => {
      if (docked) pick(range ? { start: today, end: null } : today);
    };
    const clear = () => {
      setValue(range ? { start: null, end: null } : null);
      closePicker(true);
    };
    const confirm = () => {
      setValue(draft);
      closePicker(true);
    };

    const complete = range ? Boolean(span?.start && span.end) : Boolean(single);
    const draftSpan = range ? (draft as DateRange | null) : null;
    const draftDate = range ? null : (draft as Date | null);
    const draftComplete = range ? Boolean(draftSpan?.start && draftSpan.end) : Boolean(draftDate);
    const buttonName = complete
      ? t.dateChange(
          range && span?.start && span.end
            ? `${formatLongDate(span.start, lang)} – ${formatLongDate(span.end, lang)}`
            : formatLongDate(single ?? today, lang),
        )
      : t.dateChoose;

    const pattern = datePattern(lang);
    const placeholder = pattern;
    const hintText = hint ?? t.dateFormat(pattern);
    const hasError = own && error !== undefined && error !== null && error !== false;
    const describedBy =
      [fieldProps["aria-describedby"], own ? hintId : undefined].filter(Boolean).join(" ") ||
      undefined;

    const named =
      hasLabel ||
      field?.labelId !== undefined ||
      ariaLabel !== undefined ||
      ariaLabelledBy !== undefined;
    useEffect(() => {
      if (!named) {
        devWarn("DatePicker", "give the field a name with `label`, `aria-label` or a `Field`.");
      }
    }, [named]);

    const inputProps = (which: 0 | 1) => ({
      className: "ol-datefield__input",
      value: texts[which],
      placeholder,
      autoComplete: "off",
      disabled,
      readOnly,
      "aria-required": fieldProps.required ? true : undefined,
      "aria-invalid": invalid || undefined,
      "aria-describedby": describedBy,
      onChange: onInput(which),
      onBlur: onInputBlur(which),
      onCompositionStart: ime.onCompositionStart,
      onCompositionEnd: onCompositionEnd(which),
    });

    const calendar = (
      <Calendar
        {...(range
          ? {
              range: true as const,
              value: docked ? span : draftSpan,
              onChange: pick,
            }
          : {
              value: docked ? single : draftDate,
              onChange: pick,
            })}
        handleRef={calendarRef}
        locale={locale}
        weekStartsOn={weekStartsOn}
        today={todayProp}
        min={min}
        max={max}
        isDateUnavailable={isDateUnavailable}
      />
    );

    // The dialog is named like the field: the label, the Field's label, aria-labelledby or aria-label.
    const dialogName = ariaLabelledBy
      ? ({ "aria-labelledby": ariaLabelledBy } as const)
      : nameId
        ? ({ "aria-labelledby": nameId } as const)
        : ({ "aria-label": ariaLabel ?? t.dateChoose } as const);
    const onToggle = (event: MouseEvent<HTMLButtonElement>) => {
      if (event.defaultPrevented) return;
      setOpen(!openState);
    };
    const hiddenValue = (date: Date | null) => (date ? toIsoDate(date) : "");

    return (
      <div
        {...rest}
        lang={locale === undefined ? langProp : lang}
        className={cx("ol-datefield", invalid && "ol-datefield--invalid", className)}
        data-state={shown ? "open" : "closed"}
        data-range={range || undefined}
      >
        {own && hasLabel ? (
          range ? (
            <span id={labelId} className="ol-datefield__label">
              {label}
              {required ? (
                <span className="ol-datefield__req" aria-hidden="true">
                  {" *"}
                </span>
              ) : null}
            </span>
          ) : (
            <label id={labelId} className="ol-datefield__label" htmlFor={inputId}>
              {label}
              {required ? (
                <span className="ol-datefield__req" aria-hidden="true">
                  {" *"}
                </span>
              ) : null}
            </label>
          )
        ) : null}

        {/* The box is a group only when it holds two inputs; the focus ring is on the box. */}
        <div
          ref={setBox}
          className="ol-datefield__box"
          role={range ? "group" : undefined}
          aria-labelledby={range ? (ariaLabelledBy ?? nameId) : undefined}
          aria-label={range && !nameId && !ariaLabelledBy ? ariaLabel : undefined}
        >
          <input
            {...inputProps(0)}
            ref={setInput}
            id={inputId}
            type="text"
            aria-label={range ? (startLabel ?? t.dateRangeStart) : ariaLabel}
            aria-labelledby={
              range ? undefined : (ariaLabelledBy ?? (ariaLabel ? undefined : nameId))
            }
          />
          {range ? (
            <>
              <span className="ol-datefield__to" aria-hidden="true">
                →
              </span>
              <input {...inputProps(1)} type="text" aria-label={endLabel ?? t.dateRangeEnd} />
            </>
          ) : null}
          <button
            ref={buttonRef}
            type="button"
            className="ol-datefield__btn"
            aria-label={buttonName}
            aria-haspopup="dialog"
            aria-expanded={shown}
            aria-controls={presence.mounted ? popupId : undefined}
            disabled={disabled || readOnly}
            onClick={onToggle}
          >
            <span aria-hidden="true">▦</span>
          </button>
        </div>

        {own ? (
          <span
            id={hintId}
            className="ol-datefield__hint"
            data-state={hasError ? "invalid" : undefined}
            aria-live="polite"
          >
            {hasError ? error : hintText}
          </span>
        ) : null}

        {!range && name ? <input type="hidden" name={name} value={hiddenValue(single)} /> : null}
        {range && startName ? (
          <input type="hidden" name={startName} value={hiddenValue(parts[0])} />
        ) : null}
        {range && endName ? (
          <input type="hidden" name={endName} value={hiddenValue(parts[1])} />
        ) : null}

        {presence.mounted && docked ? (
          <Portal anchor={boxRef} keepActive>
            {/* The dialog relays Tab here to hand focus back to the button. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div
              {...position.props}
              ref={setPopup}
              id={popupId}
              role="dialog"
              aria-modal="false"
              {...dialogName}
              data-state={presence.state}
              className="ol-floating ol-datepop ol-kakejiku"
              onKeyDown={onPopupKeyDown}
            >
              {calendar}
              <div className="ol-datepop__foot">
                <Button size="s" disabled={unavailable(today)} onClick={chooseToday}>
                  {t.dateGoToday}
                </Button>
                <Button size="s" onClick={clear}>
                  {t.clear}
                </Button>
              </div>
            </div>
          </Portal>
        ) : null}

        {presence.mounted && !docked ? (
          <Portal anchor={boxRef}>
            {/* The scrim is a pointer-only convenience; Escape and Cancel are the keyboard paths. */}
            <div
              className="ol-datemodal"
              data-state={presence.state}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) closePicker(true);
              }}
            >
              <div
                ref={setPanel}
                id={popupId}
                role="dialog"
                aria-modal="true"
                {...dialogName}
                tabIndex={-1}
                data-state={presence.state}
                className="ol-datemodal__panel ol-kakejiku"
              >
                <div className="ol-datemodal__head">
                  <span className="ol-datemodal__label">
                    {hasLabel ? label : (ariaLabel ?? t.dateChoose)}
                  </span>
                  <span className="ol-datemodal__value" aria-live="polite">
                    {/* Placeholders are drawn, not announced. */}
                    {range ? (
                      draftSpan?.start ? (
                        <>
                          {formatShortDate(draftSpan.start, lang)}
                          {draftSpan.end ? (
                            ` – ${formatShortDate(draftSpan.end, lang)}`
                          ) : (
                            <span aria-hidden="true"> – …</span>
                          )}
                        </>
                      ) : (
                        <span aria-hidden="true">—</span>
                      )
                    ) : draftDate ? (
                      formatShortDate(draftDate, lang)
                    ) : (
                      <span aria-hidden="true">—</span>
                    )}
                  </span>
                </div>
                {calendar}
                <div className="ol-datemodal__foot">
                  <Button
                    size="s"
                    onClick={() => {
                      closePicker(true);
                    }}
                  >
                    {t.dateCancel}
                  </Button>
                  <Button size="s" variant="accent" disabled={!draftComplete} onClick={confirm}>
                    {t.dateConfirm}
                  </Button>
                </div>
              </div>
            </div>
          </Portal>
        ) : null}
      </div>
    );
  },
);
