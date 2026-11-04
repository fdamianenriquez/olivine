import {
  type ChangeEvent,
  type CompositionEvent,
  type CSSProperties,
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useField } from "../../hooks/useFieldControl";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useLabels, useLocaleTag } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { isImeKey } from "../../utils/ime";
import { Button } from "../Button";
import { Input } from "../Input";
import { InputGroup } from "../InputGroup";
import {
  clamp,
  decimalsOf,
  isAllowedInput,
  keepAllowed,
  type NumberSymbols,
  parseNumber,
  readSymbols,
  snapToStep,
  stepValue,
} from "./number";
import { usePressRepeat } from "./usePressRepeat";

type InputPassThrough = Omit<
  React.ComponentPropsWithoutRef<"input">,
  | "value"
  | "defaultValue"
  | "size"
  | "type"
  | "min"
  | "max"
  | "step"
  | "className"
  | "style"
  | "children"
>;

export interface NumberFieldProps extends InputPassThrough {
  /** Controlled value; `null` is empty. */
  value?: number | null;
  /**
   * Uncontrolled start value.
   * @default null
   */
  defaultValue?: number | null;
  /** Fires when a change is committed (blur, Enter, stepper, arrow keys, wheel), not on every keystroke. */
  onValueChange?: (value: number | null) => void;
  /** Lowest value; typed values are clamped to it on commit. Home goes to it. */
  min?: number;
  /** Highest value; typed values are clamped to it on commit. End goes to it. */
  max?: number;
  /**
   * Stepper and arrow size. Commit snaps to multiples of `step` counted from `min` (or 0).
   * @default 1
   */
  step?: number;
  /**
   * Page Up / Page Down size.
   * @default step * 10
   */
  largeStep?: number;
  /**
   * Display and parsing format. `style` may be `decimal`, `percent` (the value is a fraction:
   * 0.25 shows 25 %) or `currency` with `currencyDisplay: "symbol"`.
   * @default { maximumFractionDigits: max(3, decimals of step) }
   */
  format?: Intl.NumberFormatOptions;
  /** BCP 47 tag for formatting and parsing (`"es-MX"`, `"ja-JP"`). Defaults to the nearest `Root` locale. */
  locale?: string;
  /**
   * Height 32 / 44 / 56px; digits 16 / 18 / 22px.
   * @default "m"
   */
  size?: "s" | "m" | "l";
  /**
   * Shows the − and + buttons. Without them, arrow keys still step.
   * @default true
   */
  steppers?: boolean;
  /** A word or abbreviation after the field (`kg`, `weeks`). A string is added to the spoken value. */
  unit?: ReactNode;
  /**
   * Lets the mouse wheel change the value while the field is focused.
   * @default false
   */
  allowWheel?: boolean;
  /** Accessible name of the + button; overrides the locale. */
  incrementLabel?: string;
  /** Accessible name of the − button; overrides the locale. */
  decrementLabel?: string;
  /** Extra class names on the root bar. */
  className?: string;
  /** Inline style on the root bar. */
  style?: CSSProperties;
}

const FORMAT_STYLES = new Set(["decimal", "percent", "currency", undefined]);

function makeFormatter(
  locale: string,
  format: Intl.NumberFormatOptions | undefined,
  step: number,
): Intl.NumberFormat {
  let options: Intl.NumberFormatOptions = format ?? {
    maximumFractionDigits: Math.max(3, decimalsOf(step)),
  };
  if (!FORMAT_STYLES.has(options.style)) {
    devWarn(
      "NumberField",
      `format style "${String(options.style)}" is not supported; use \`unit\`.`,
    );
    options = { ...options, style: "decimal", unit: undefined };
  }
  if (options.currencyDisplay === "code" || options.currencyDisplay === "name") {
    devWarn("NumberField", "currency codes and names are words; put them in `unit`.");
    options = { ...options, currencyDisplay: "symbol" };
  }
  if (options.notation !== undefined && options.notation !== "standard") {
    devWarn("NumberField", `notation "${options.notation}" is not supported.`);
    options = { ...options, notation: "standard" };
  }
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    devWarn("NumberField", `"${locale}" with this format is not valid; using "en".`);
    return new Intl.NumberFormat("en", { maximumFractionDigits: Math.max(3, decimalsOf(step)) });
  }
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * A numeric input framed as one ruled bar with − and + steppers, digits in the figure face.
 * Formats and parses for the locale; arrow keys, Page Up/Down and the steppers move by `step`;
 * typed text is parsed, clamped and snapped on blur or Enter.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    min,
    max,
    step = 1,
    largeStep,
    format,
    locale,
    size = "m",
    steppers = true,
    unit,
    allowWheel = false,
    incrementLabel,
    decrementLabel,
    className,
    style,
    name,
    disabled = false,
    readOnly = false,
    inputMode,
    onChange,
    onBlur,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
    ...rest
  },
  ref,
) {
  const labels = useLabels();
  const tag = useLocaleTag(locale);
  const field = useField();
  const autoId = useId();
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange);

  const formatKey = JSON.stringify(format ?? null);
  // `formatKey` stands for `format`, so an inline object does not rebuild the formatter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formatter = useMemo(() => makeFormatter(tag, format, step), [tag, formatKey, step]);
  const symbols: NumberSymbols = useMemo(() => readSymbols(formatter), [formatter]);
  // ja-JP writes the full-width ￥, which the figure face lacks; its half-width form reads the same.
  const show = useCallback(
    (n: number | null) => (n === null ? "" : formatter.format(n).replace(/\uFFE5/g, "¥")),
    [formatter],
  );

  const grid = useMemo(() => ({ step, min, max }), [step, min, max]);
  const big = largeStep ?? step * 10;
  const negative = min === undefined || min < 0;
  const inert = disabled || readOnly;

  const [text, setText] = useState(() => show(value));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dirty = useRef(false);
  const composing = useRef(false);
  const latest = useRef(value);
  latest.current = value;

  // While nobody is typing, the text follows the value and the format (controlled updates,
  // a locale change, a commit the parent refused).
  useIsomorphicLayoutEffect(() => {
    if (!dirty.current) setText(show(value));
  });

  const [readId, setReadId] = useState<string | undefined>(undefined);
  const [labelText, setLabelText] = useState<string | undefined>(undefined);
  const labelId = field?.labelId;
  useIsomorphicLayoutEffect(() => {
    const input = inputRef.current;
    const id = input?.id;
    setReadId(id === "" ? undefined : id);
    // Inside a Field the steppers name the field too ("Increase Seats"); the required
    // asterisk is aria-hidden and left out.
    const label = labelId ? input?.ownerDocument.getElementById(labelId) : null;
    if (!label) {
      setLabelText(undefined);
      return;
    }
    const copy = label.cloneNode(true) as HTMLElement;
    for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
    const text = copy.textContent.trim();
    setLabelText(text === "" ? undefined : text);
  });
  const passId = rest.id ?? (field ? undefined : autoId);
  const controlsId = passId ?? readId;

  const commitValue = useCallback(
    (next: number | null) => {
      dirty.current = false;
      setText(show(next));
      if (next !== latest.current) {
        latest.current = next;
        setValue(next);
      }
    },
    [setValue, show],
  );

  /** Parses, clamps and snaps the typed text; text that is not a number restores the value. */
  const commitText = useCallback(() => {
    if (!dirty.current) return;
    const parsed = parseNumber(inputRef.current?.value ?? "", symbols);
    if (parsed !== null && Number.isNaN(parsed)) {
      commitValue(latest.current);
      return;
    }
    commitValue(parsed === null ? null : snapToStep(parsed, grid));
  }, [commitValue, grid, symbols]);

  /** Moves by `count` steps of `size`; returns false when the value could not move. */
  const stepBy = useCallback(
    (count: number, size: number): boolean => {
      // Read-only and disabled fields never step: browsers still send pointer events to a
      // disabled button, so the steppers cannot rely on `disabled` alone.
      if (inert) return false;
      let base = latest.current;
      if (dirty.current) {
        const parsed = parseNumber(inputRef.current?.value ?? "", symbols);
        if (parsed === null || !Number.isNaN(parsed)) base = parsed;
      }
      const next =
        base === null
          ? clamp(count > 0 ? (min ?? step) : (max ?? -step), grid)
          : stepValue(base, count, size, grid);
      const moved = next !== base;
      commitValue(next);
      return moved && next !== (count > 0 ? max : min);
    },
    [commitValue, grid, inert, max, min, step, symbols],
  );

  const press = usePressRepeat();

  // A tap with a touch screen reader leaves focus on the stepper, where the spinbutton's
  // value change is not announced, so the new value is repeated in a live region.
  const [announcement, setAnnouncement] = useState("");
  const announce = useCallback(() => {
    const input = inputRef.current;
    if (!input || input.ownerDocument.activeElement === input) return;
    const next = latest.current;
    if (next === null) return;
    setAnnouncement(typeof unit === "string" ? `${show(next)} ${unit}` : show(next));
  }, [show, unit]);

  /** Steps from a stepper or the wheel, announcing the value when focus is elsewhere. */
  const stepAndAnnounce = useCallback(
    (count: number, size: number): boolean => {
      const moved = stepBy(count, size);
      announce();
      return moved;
    },
    [announce, stepBy],
  );

  // Set by a pointer press so the click that follows it does not step a second time.
  const pointerPress = useRef(false);

  // React's wheel listener is passive, so it cannot keep the page from scrolling.
  useEffect(() => {
    const input = inputRef.current;
    if (!input || !allowWheel || inert) return;
    const onWheel = (event: WheelEvent) => {
      if (input.ownerDocument.activeElement !== input || event.deltaY === 0) return;
      event.preventDefault();
      stepAndAnnounce(event.deltaY < 0 ? 1 : -1, step);
    };
    input.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      input.removeEventListener("wheel", onWheel);
    };
  }, [allowWheel, inert, step, stepAndAnnounce]);

  // Typed characters are filtered before they land; composition and paste pass untouched and
  // are read on commit.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const onBeforeInput = (event: InputEvent) => {
      if (event.isComposing || composing.current || event.inputType !== "insertText") return;
      if (event.data && !isAllowedInput(event.data, symbols, negative)) event.preventDefault();
    };
    input.addEventListener("beforeinput", onBeforeInput);
    return () => {
      input.removeEventListener("beforeinput", onBeforeInput);
    };
  }, [negative, symbols]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    dirty.current = true;
    setText(event.target.value);
    onChange?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || isImeKey(event) || composing.current) return;
    if (event.key === "Enter") {
      commitText();
      return;
    }
    if (inert) return;
    const moves: Record<string, () => void> = {
      ArrowUp: () => stepBy(1, step),
      ArrowDown: () => stepBy(-1, step),
      PageUp: () => stepBy(1, big),
      PageDown: () => stepBy(-1, big),
    };
    if (min !== undefined)
      moves.Home = () => {
        commitValue(min);
      };
    if (max !== undefined)
      moves.End = () => {
        commitValue(max);
      };
    const move = moves[event.key];
    if (!move || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    move();
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    press.stop();
    commitText();
    onBlur?.(event);
  };

  const handleCompositionStart = (event: CompositionEvent<HTMLInputElement>) => {
    composing.current = true;
    onCompositionStart?.(event);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    composing.current = false;
    const input = event.currentTarget;
    const kept = keepAllowed(input.value, symbols, negative);
    if (kept !== input.value) {
      dirty.current = true;
      setText(kept);
    }
    onCompositionEnd?.(event);
  };

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const atMax = value !== null && max !== undefined && value >= max;
  const atMin = value !== null && min !== undefined && value <= min;
  const fieldName = typeof rest["aria-label"] === "string" ? rest["aria-label"] : labelText;

  const stepperProps = (count: 1 | -1, limited: boolean) => ({
    square: true as const,
    size,
    tabIndex: -1,
    disabled: inert || limited,
    "aria-controls": controlsId,
    className: cx("ol-numberfield__step", `ol-numberfield__step--${count > 0 ? "inc" : "dec"}`),
    onMouseDown: (event: MouseEvent) => {
      // Keeps focus in the input.
      event.preventDefault();
    },
    onPointerDown: (event: PointerEvent) => {
      if (event.button !== 0 || inert) return;
      event.preventDefault();
      // A tap keeps the on-screen keyboard closed; a mouse or pen press moves focus to the field.
      if (event.pointerType !== "touch") inputRef.current?.focus({ preventScroll: true });
      pointerPress.current = true;
      // The click, if any, follows the release in the same task; a press released elsewhere
      // (or on a stepper that disabled itself at a limit) has no click, so the flag is
      // cleared once the release has been handled.
      const release = () => {
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
        setTimeout(() => {
          pointerPress.current = false;
        }, 0);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
      press.start(() => stepAndAnnounce(count, step));
    },
    onPointerLeave: press.stop,
    onClick: () => {
      // Already handled by the pointer press; keyboard and screen-reader activation has none.
      if (pointerPress.current) {
        pointerPress.current = false;
        return;
      }
      inputRef.current?.focus({ preventScroll: true });
      stepBy(count, step);
    },
  });

  const valueText =
    value === null ? undefined : typeof unit === "string" ? `${show(value)} ${unit}` : show(value);
  const fractions = formatter.resolvedOptions().maximumFractionDigits ?? 0;
  const keypad = inputMode ?? (fractions === 0 && !negative ? "numeric" : "decimal");

  return (
    <InputGroup
      className={cx("ol-numberfield", size !== "m" && `ol-numberfield--${size}`, className)}
      style={style}
      data-disabled={disabled || undefined}
      data-steppers={steppers ? undefined : "false"}
    >
      {steppers ? (
        <Button
          {...stepperProps(-1, atMin)}
          aria-label={decrementLabel ?? labels.numberDecrease(fieldName)}
        >
          −
        </Button>
      ) : null}
      <Input
        autoComplete="off"
        spellCheck={false}
        {...rest}
        ref={setRefs}
        id={passId}
        type="text"
        role="spinbutton"
        size={size}
        inputMode={keypad}
        className="ol-numberfield__input"
        value={text}
        disabled={disabled}
        readOnly={readOnly}
        aria-readonly={readOnly || undefined}
        aria-valuenow={value ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
      {steppers ? (
        <Button
          {...stepperProps(1, atMax)}
          aria-label={incrementLabel ?? labels.numberIncrease(fieldName)}
        >
          +
        </Button>
      ) : null}
      {unit !== undefined && unit !== null && unit !== false && unit !== "" ? (
        <InputGroup.Text className="ol-numberfield__unit">{unit}</InputGroup.Text>
      ) : null}
      {name !== undefined ? (
        <input type="hidden" name={name} form={rest.form} value={value ?? ""} disabled={disabled} />
      ) : null}
      <span className="ol-sr" aria-live="polite">
        {announcement}
      </span>
    </InputGroup>
  );
});
