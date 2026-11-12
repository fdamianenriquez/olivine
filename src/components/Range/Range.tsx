import {
  forwardRef,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useField, useFieldControl } from "../../hooks/useFieldControl";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useLabels, useLocaleTag } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { isRtl } from "../../utils/isRtl";
import {
  clampPair,
  gapFor,
  limits,
  moveThumb,
  pickThumb,
  type RangeGrid,
  type RangeValue,
  ratioOf,
  topOfGrid,
  valueFromPointer,
} from "./thumbs";

export type { RangeValue } from "./thumbs";

export interface RangeProps extends Omit<
  React.ComponentPropsWithoutRef<"input">,
  "type" | "value" | "defaultValue"
> {
  /** Lowest value. */
  min?: number;
  /** Highest value. */
  max?: number;
  /** Granularity of the value. */
  step?: number;
  /** Controlled value. */
  value?: number;
  /** Initial value when uncontrolled. Defaults to `min`. */
  defaultValue?: number;
  /** Shows the scale with the minimum, current and maximum values. */
  scale?: boolean;
  /** Formats the numbers on the scale. A string or number result also becomes `aria-valuetext`. */
  format?: (value: number) => ReactNode;
  /** Extra class names on the wrapper. */
  className?: string;
}

/** Props of a two-thumb Range shared by every way of turning the mode on. */
export interface RangeDualBaseProps extends Omit<
  React.ComponentPropsWithoutRef<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "name" | "min" | "max" | "step" | "children"
> {
  /** Lowest value. */
  min?: number;
  /** Highest value. */
  max?: number;
  /** Granularity of both values. */
  step?: number;
  /** Called on every change: drag, key, track press. */
  onValueChange?: (value: RangeValue) => void;
  /** Called when a gesture ends: pointer up, each key step, track press. Use it to fetch or save. */
  onValueCommit?: (value: RangeValue) => void;
  /** Least gap between the thumbs, in value units; rounded up to a multiple of `step`. Default 0. */
  minDistance?: number;
  /** Page Up / Page Down size. Defaults to `step * 10`. */
  largeStep?: number;
  /** One name for both values (low first) or a name per thumb. */
  name?: string | [string, string];
  /** Spoken name of the low thumb; replaces the locale's "Minimum" wording. */
  minLabel?: string;
  /** Spoken name of the high thumb; replaces the locale's "Maximum" wording. */
  maxLabel?: string;
  /** Shows the scale with the bounds and the selected values. */
  scale?: boolean;
  /** Formats the numbers on the scale. A string or number result also becomes `aria-valuetext`. */
  format?: (value: number) => ReactNode;
  /** `Intl.NumberFormat` options, used when `format` is absent; also become `aria-valuetext`. */
  formatOptions?: Intl.NumberFormatOptions;
  /** BCP 47 tag for `formatOptions`. Defaults to the nearest `Root` locale. */
  locale?: string;
  /** Extra class names on the wrapper. */
  className?: string;
  /** Not available with two thumbs: use `onValueChange` or `onValueCommit`. */
  onChange?: never;
}

/**
 * A two-thumb Range. Turned on by a `[low, high]` `value` or `defaultValue`, or by `range`
 * (then `defaultValue` is `[min, max]`).
 */
export type RangeDualProps = RangeDualBaseProps &
  (
    | {
        /** Controlled `[low, high]`. Unsorted, out-of-range or too-close pairs are corrected. */
        value: RangeValue;
        defaultValue?: RangeValue | undefined;
        range?: boolean | undefined;
      }
    | {
        value?: undefined;
        /** Initial `[low, high]` when uncontrolled. */
        defaultValue: RangeValue;
        range?: boolean | undefined;
      }
    | {
        value?: undefined;
        defaultValue?: undefined;
        /** Two thumbs without a value: they start at `[min, max]`. */
        range: true;
      }
  );

/** Range with one thumb (a number) or two (a `[low, high]` pair, or `range`). */
export interface RangeComponent {
  // Two signatures, not a union, so TypeScript picks the mode from the value and tools that read
  // a component's props (Storybook) see the single-thumb ones.
  (props: RangeDualProps & RefAttributes<HTMLInputElement>): ReactElement | null;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (props: RangeProps & RefAttributes<HTMLInputElement>): ReactElement | null;
  displayName?: string | undefined;
}

const identity = (value: number): ReactNode => value;

const SingleRange = forwardRef<HTMLInputElement, RangeProps>(function SingleRange(
  {
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    onChange,
    scale = true,
    format,
    className,
    ...props
  },
  ref,
) {
  const rest = useFieldControl(props);
  const [current, setCurrent] = useControllable<number>(value, defaultValue ?? min);
  const show = format ?? identity;
  const text = format?.(current);
  const valueText = typeof text === "string" || typeof text === "number" ? String(text) : undefined;

  return (
    <div className={cx("ol-range", className)}>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        aria-valuetext={valueText}
        onChange={(event) => {
          setCurrent(Number(event.target.value));
          onChange?.(event);
        }}
        {...rest}
      />
      {scale && (
        <div className="ol-range__scale" aria-hidden="true">
          <span>{show(min)}</span>
          <span className="ol-range__current">{show(current)}</span>
          <span>{show(max)}</span>
        </div>
      )}
    </div>
  );
});

type Thumb = 0 | 1;
const THUMBS: readonly Thumb[] = [0, 1];

/** Sets an input's value past React's tracker, so React reports the event that follows. */
function setNativeValue(input: HTMLInputElement, value: string): void {
  Reflect.set(HTMLInputElement.prototype, "value", value, input);
}

/** A copy of `source` without `keys`. */
function omit<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Omit<T, K> {
  const drop = new Set<PropertyKey>(keys);
  return Object.fromEntries(Object.entries(source).filter(([key]) => !drop.has(key))) as Omit<T, K>;
}

/** The text an element is read with: its content, minus anything hidden from assistive tech. */
function spokenText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (
    node instanceof Element &&
    (node.getAttribute("aria-hidden") === "true" || node.hasAttribute("hidden"))
  )
    return "";
  return Array.from(node.childNodes, spokenText).join("");
}

/** The joined text of the elements an `aria-labelledby` list names, or undefined if none exist. */
function labelText(ids: string): string | undefined {
  const parts = ids
    .split(/\s+/)
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null)
    .map((el) => spokenText(el).replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/** `formatRange` where the runtime has it (ES2023 Intl). */
type RangeFormatter = Intl.NumberFormat & { formatRange?: (start: number, end: number) => string };

const same = (a: RangeValue, b: RangeValue) => a[0] === b[0] && a[1] === b[1];

/** Intl options whose output holds words, which the figure face can't set. */
function wordyFormat(options: Intl.NumberFormatOptions | undefined): boolean {
  if (!options) return false;
  return (
    options.style === "unit" ||
    options.currencyDisplay === "name" ||
    options.currencyDisplay === "code"
  );
}

interface Drag {
  pointer: number;
  thumb: Thumb | null;
  /** The shared value both thumbs sat on when the press began undecided. */
  origin: number;
  rect: { left: number; width: number };
  block: number;
  rtl: boolean;
  start: RangeValue;
  last: RangeValue;
}

const DualRange = forwardRef<HTMLInputElement, RangeDualProps>(function DualRange(
  {
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    onValueChange,
    onValueCommit,
    minDistance = 0,
    largeStep,
    name,
    minLabel,
    maxLabel,
    scale = true,
    format,
    formatOptions,
    locale,
    className,
    id,
    disabled,
    onKeyDown,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...given
  },
  ref,
) {
  const props = omit(given, ["range", "onChange"]);
  const labels = useLabels();
  const tag = useLocaleTag(locale);
  const field = useField();
  // The first call takes the field's id (its label focuses the low thumb); the second gets the
  // description, validity and required state only.
  const lowProps = useFieldControl(props);
  const highProps = useFieldControl(props);
  const wordId = useId();

  const grid = useMemo<RangeGrid>(
    () => ({ min, max, step, gap: gapFor(minDistance, step) }),
    [min, max, step, minDistance],
  );
  const controlled = value === undefined ? undefined : clampPair(value, grid);
  const [stored, setPair] = useControllable<RangeValue>(
    controlled,
    clampPair(defaultValue ?? [min, max], grid),
    onValueChange,
  );
  const current = clampPair(stored, grid);
  const [low, high] = current;

  const pairRef = useRef<RangeValue>(current);
  useIsomorphicLayoutEffect(() => {
    pairRef.current = current;
  });
  const inputs = useRef<[HTMLInputElement | null, HTMLInputElement | null]>([null, null]);
  const emitting = useRef(false);
  const drag = useRef<Drag | null>(null);
  const [active, setActive] = useState<Thumb>(1);
  const [dragging, setDragging] = useState<Thumb | null>(null);
  const [focused, setFocused] = useState<Thumb | null>(null);

  const formatter = useMemo(
    () => (formatOptions ? new Intl.NumberFormat(tag, formatOptions) : undefined),
    [tag, formatOptions],
  );
  const show = format ?? (formatter ? (v: number): ReactNode => formatter.format(v) : identity);
  // Without a custom `format`, the locale joins the pair (an en dash in en, a wave dash in ja).
  const joiner = useMemo<RangeFormatter>(
    () =>
      formatter ?? new Intl.NumberFormat(tag, { useGrouping: false, maximumFractionDigits: 20 }),
    [formatter, tag],
  );
  const selected: ReactNode =
    !format && low !== high && typeof joiner.formatRange === "function" ? (
      joiner.formatRange(low, high)
    ) : low === high ? (
      show(low)
    ) : (
      <>
        {show(low)}
        {" – "}
        {show(high)}
      </>
    );
  const valueText = (v: number): string | undefined => {
    if (format) {
      const text = format(v);
      return typeof text === "string" || typeof text === "number" ? String(text) : undefined;
    }
    return formatter?.format(v);
  };

  const groupIds = ariaLabelledBy ?? field?.labelId;
  // Read the group's label text after render so each thumb gets the locale's full wording
  // ("Price, minimum", "価格の最小値"). Until then (server HTML) the thumbs point at the label.
  const [groupText, setGroupText] = useState<string | undefined>(undefined);
  useIsomorphicLayoutEffect(() => {
    const text = groupIds ? labelText(groupIds) : undefined;
    setGroupText((prev) => (prev === text ? prev : text));
  });
  const named = Boolean(ariaLabel) || Boolean(groupIds);
  const valueKey = value ? `${String(value[0])}:${String(value[1])}` : "";
  const fixedKey = controlled ? `${String(controlled[0])}:${String(controlled[1])}` : "";
  const wordy = wordyFormat(formatOptions);
  useEffect(() => {
    if (!named)
      devWarn("Range", "a two-thumb Range needs a name: use Field, aria-label or aria-labelledby.");
  }, [named]);
  useEffect(() => {
    if (valueKey && valueKey !== fixedKey)
      devWarn(
        "Range",
        `value [${valueKey}] was corrected to [${fixedKey}] (bounds, order, step or minDistance).`,
      );
  }, [valueKey, fixedKey]);
  useEffect(() => {
    if (wordy)
      devWarn(
        "Range",
        "formatOptions must write digits and symbols only; put units in .ol-range__unit or the label.",
      );
  }, [wordy]);

  // The thumb that can move is drawn on top when both share a value.
  const top: Thumb =
    low === high ? (high >= topOfGrid(grid) ? 0 : low <= min ? 1 : active) : active;

  /** Applies a new pair; returns false when nothing changed. */
  const update = (next: RangeValue, from: RangeValue): boolean => {
    if (same(next, from)) return false;
    setPair(next);
    return true;
  };

  /** Fires a bubbling `input` event on a thumb so form-level listeners see the change. */
  const emitInput = (thumb: Thumb, v: number) => {
    const input = inputs.current[thumb];
    if (!input) return;
    emitting.current = true;
    try {
      setNativeValue(input, String(v));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } finally {
      emitting.current = false;
    }
  };

  const nameProps = (thumb: Thumb) => {
    const own = thumb === 0 ? minLabel : maxLabel;
    const word = thumb === 0 ? labels.rangeMin : labels.rangeMax;
    if (own) return { "aria-label": own };
    if (ariaLabel) return { "aria-label": word(ariaLabel) };
    if (groupText) return { "aria-label": word(groupText) };
    if (groupIds) return { "aria-labelledby": `${groupIds} ${wordId}-${String(thumb)}` };
    return { "aria-label": word() };
  };
  const wordsNeeded = !ariaLabel && !groupText && Boolean(groupIds) && (!minLabel || !maxLabel);

  const onThumbKey = (thumb: Thumb) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const pair = pairRef.current;
    const at = pair[thumb];
    const big = largeStep ?? step * 10;
    const forward = isRtl(event.currentTarget) ? -step : step;
    const [lowest, highest] = limits(thumb, pair, grid);
    let target: number;
    switch (event.key) {
      case "ArrowRight":
        target = at + forward;
        break;
      case "ArrowLeft":
        target = at - forward;
        break;
      case "ArrowUp":
        target = at + step;
        break;
      case "ArrowDown":
        target = at - step;
        break;
      case "PageUp":
        target = at + big;
        break;
      case "PageDown":
        target = at - big;
        break;
      case "Home":
        target = lowest;
        break;
      case "End":
        target = highest;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActive(thumb);
    const next = moveThumb(thumb, target, pair, grid);
    if (update(next, pair)) {
      emitInput(thumb, next[thumb]);
      onValueCommit?.(next);
    }
  };

  const onThumbChange = (thumb: Thumb) => (event: React.ChangeEvent<HTMLInputElement>) => {
    // Our own bubbling event for form listeners: the pair is already updated.
    if (emitting.current) return;
    const pair = pairRef.current;
    const next = moveThumb(thumb, Number(event.target.value), pair, grid);
    if (update(next, pair)) onValueCommit?.(next);
  };

  const moveTo = (state: Drag, thumb: Thumb, v: number) => {
    const next = moveThumb(thumb, v, state.last, grid);
    if (update(next, state.last)) {
      state.last = next;
      emitInput(thumb, next[thumb]);
    }
  };

  const grab = (state: Drag, thumb: Thumb) => {
    state.thumb = thumb;
    setActive(thumb);
    setDragging(thumb);
    inputs.current[thumb]?.focus({ preventScroll: true });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    const track = event.currentTarget;
    const box = track.getBoundingClientRect();
    const block = track.querySelector(".ol-range__block")?.getBoundingClientRect().width ?? 0;
    const rtl = isRtl(track);
    const v = valueFromPointer(event.clientX, box, block, rtl, grid);
    const pair = pairRef.current;
    const pressed = (event.target as Element).closest("[data-thumb]")?.getAttribute("data-thumb");
    // A press on a block takes that thumb, unless both share a value: then the side of the press,
    // or else the first drag direction, decides.
    const thumb: Thumb | null =
      pressed && pair[0] !== pair[1] ? (Number(pressed) as Thumb) : pickThumb(v, pair, grid);
    event.preventDefault();
    track.setPointerCapture(event.pointerId);
    const state: Drag = {
      pointer: event.pointerId,
      thumb: null,
      origin: pair[0],
      rect: { left: box.left, width: box.width },
      block,
      rtl,
      start: pair,
      last: pair,
    };
    drag.current = state;
    if (thumb === null) {
      inputs.current[top]?.focus({ preventScroll: true });
      return;
    }
    grab(state, thumb);
    if (!pressed) moveTo(state, thumb, v);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (state?.pointer !== event.pointerId) return;
    const v = valueFromPointer(event.clientX, state.rect, state.block, state.rtl, grid);
    if (state.thumb === null) {
      if (v === state.origin) return;
      grab(state, v > state.origin ? 1 : 0);
    }
    if (state.thumb !== null) moveTo(state, state.thumb, v);
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (state?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!same(state.last, state.start)) onValueCommit?.(state.last);
  };

  const position = {
    "--ol-range-lo": String(ratioOf(low, grid)),
    "--ol-range-hi": String(ratioOf(high, grid)),
  } as React.CSSProperties;

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={groupIds}
      className={cx("ol-range", "ol-range--dual", className)}
      data-disabled={disabled ? "" : undefined}
      style={position}
    >
      {/* Pointer input only; each thumb is a native slider for keyboard and assistive tech. */}
      <div
        className="ol-range__track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <span className="ol-range__fill" aria-hidden="true" />
        {THUMBS.map((thumb) => {
          const [lowest, highest] = limits(thumb, current, grid);
          const own = thumb === 0 ? lowProps : highProps;
          return (
            <span
              key={thumb}
              className={cx(
                "ol-range__thumb",
                thumb === 0 ? "ol-range__thumb--min" : "ol-range__thumb--max",
              )}
              data-thumb={thumb}
              data-active={top === thumb ? "" : undefined}
              data-dragging={dragging === thumb ? "" : undefined}
              data-focused={focused === thumb ? "" : undefined}
              style={
                { "--ol-range-at": String(ratioOf(current[thumb], grid)) } as React.CSSProperties
              }
            >
              <input
                {...own}
                {...nameProps(thumb)}
                ref={(node) => {
                  inputs.current[thumb] = node;
                  if (thumb !== 0) return;
                  if (typeof ref === "function") ref(node);
                  else if (ref) ref.current = node;
                }}
                className="ol-range__input ol-sr"
                type="range"
                min={lowest}
                max={highest}
                step={step}
                value={current[thumb]}
                name={typeof name === "string" ? name : name?.[thumb]}
                disabled={disabled}
                aria-valuetext={valueText(current[thumb])}
                onKeyDown={onThumbKey(thumb)}
                onChange={onThumbChange(thumb)}
                onFocus={(event) => {
                  own.onFocus?.(event);
                  setFocused(thumb);
                }}
                onBlur={(event) => {
                  own.onBlur?.(event);
                  setFocused((prev) => (prev === thumb ? null : prev));
                }}
              />
              <span className="ol-range__block" aria-hidden="true" />
            </span>
          );
        })}
      </div>
      {wordsNeeded && (
        <>
          <span id={`${wordId}-0`} hidden>
            {labels.rangeMin()}
          </span>
          <span id={`${wordId}-1`} hidden>
            {labels.rangeMax()}
          </span>
        </>
      )}
      {scale && (
        <div className="ol-range__scale" aria-hidden="true">
          <span>{show(min)}</span>
          <span className="ol-range__current">{selected}</span>
          <span>{show(max)}</span>
        </div>
      )}
    </div>
  );
});

function isDual(props: RangeProps | RangeDualProps): props is RangeDualProps {
  return (
    Array.isArray(props.value) ||
    Array.isArray(props.defaultValue) ||
    (props as { range?: boolean }).range === true
  );
}

/**
 * A hairline track with a block thumb and a scale showing min, current and max. Given a
 * `[low, high]` pair (or `range`) it has two thumbs that never cross, with an ink segment
 * between them.
 */
export const Range = forwardRef<HTMLInputElement, RangeProps | RangeDualProps>(
  function Range(props, ref) {
    if (isDual(props)) return <DualRange {...props} ref={ref} />;
    return (
      <SingleRange {...omit(props as RangeProps & { range?: boolean }, ["range"])} ref={ref} />
    );
  },
) as RangeComponent;
