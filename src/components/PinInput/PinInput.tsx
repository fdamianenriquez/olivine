import {
  type ChangeEvent,
  type CompositionEvent,
  type CSSProperties,
  type FocusEvent,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useFieldControl } from "../../hooks/useFieldControl";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { isImeKey } from "../../utils/ime";
import { cellAtX, cellSelection, groupCells, type PinCharset, sanitizeCode } from "./code";

export type { PinCharset } from "./code";

export interface PinInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "value"
  | "defaultValue"
  | "onChange"
  | "size"
  | "type"
  | "inputMode"
  | "maxLength"
  | "minLength"
  | "pattern"
  | "placeholder"
  | "dir"
  | "children"
> {
  /**
   * Number of cells: the exact length of the code.
   * @default 6
   */
  length?: number;
  /** The code (controlled). */
  value?: string;
  /** The initial code when uncontrolled. */
  defaultValue?: string;
  /** Called with the cleaned code whenever it changes. */
  onChange?: (value: string) => void;
  /**
   * Called once each time the code becomes full by user input (typing, paste, autofill, the end
   * of an IME composition). Not called for a full `defaultValue` on mount.
   */
  onComplete?: (value: string) => void;
  /**
   * The characters accepted; also sets the on-screen keyboard (`inputMode`).
   * @default "numeric"
   */
  charset?: PinCharset;
  /** Replaces the built-in cleaning, for a custom alphabet. The result is still cut to `length`. */
  sanitize?: (raw: string) => string;
  /** Hides the characters: the input becomes `type="password"` and the cells show `•`. For PINs. */
  mask?: boolean;
  /** Cells per group, with a gap between groups: `3` draws `123 456`. */
  group?: number;
  /**
   * Cell size: 32, 44 or 56px squares.
   * @default "m"
   */
  size?: "s" | "m" | "l";
  /** One decorative character shown in empty cells. */
  placeholder?: string;
  /** Class names on the root. */
  className?: string;
  /** Inline styles on the root. */
  style?: CSSProperties;
}

/**
 * A row of square cells joined by hairlines for a short fixed-length code (a one-time code,
 * a PIN). One real, transparent text input sits over the cells, so autofill, paste, undo, the
 * numeric keyboard and screen readers behave as in an ordinary field; the cells only draw its
 * value. The active cell carries an olive underline drawn like a brush stroke. The `ref` points
 * at the input.
 */
export const PinInput = forwardRef<HTMLInputElement, PinInputProps>(function PinInput(
  {
    length: lengthProp = 6,
    value: valueProp,
    defaultValue = "",
    onChange,
    onComplete,
    charset = "numeric",
    sanitize,
    mask = false,
    group,
    size = "m",
    placeholder,
    autoComplete,
    enterKeyHint = "done",
    disabled = false,
    readOnly = false,
    className,
    style,
    onFocus,
    onBlur,
    onKeyDown,
    onSelect,
    onPaste,
    onMouseUp,
    onCompositionStart,
    onCompositionEnd,
    ...props
  },
  ref,
) {
  const length = Math.max(1, Math.floor(lengthProp));
  const numeric = charset === "numeric";
  const labels = useLabels();
  const lengthId = `${useId()}-length`;

  const clean = useCallback(
    (raw: string) =>
      sanitize ? sanitize(raw).slice(0, length) : sanitizeCode(raw, charset, length),
    [sanitize, charset, length],
  );

  const [stored, setStored] = useControllable(valueProp, clean(defaultValue));
  const value = stored.slice(0, length);

  const field = useFieldControl({
    ...props,
    "aria-describedby": [props["aria-describedby"], lengthId].filter(Boolean).join(" "),
  });
  const invalid = field["aria-invalid"] === true || field["aria-invalid"] === "true";

  /** Raw text while an IME composition is in progress; the value is committed at its end. */
  const [draft, setDraft] = useState<string | null>(null);
  const composing = useRef(false);
  const [selection, setSelection] = useState<readonly [number, number]>([0, 0]);
  const [focused, setFocused] = useState(false);
  const [message, setMessage] = useState("");
  /** Where the caret goes after the cleaned value is written back. */
  const pendingCaret = useRef<number | null>(null);
  const pasted = useRef(false);
  /** Set on focus until the first key or click, to undo the browser's select-all on Tab. */
  const focusing = useRef(false);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const input = useRef<HTMLInputElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const inputRef = useCallback(
    (node: HTMLInputElement | null) => {
      input.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const select = useCallback((start: number, end: number) => {
    const node = input.current;
    if (node && (node.selectionStart !== start || node.selectionEnd !== end)) {
      node.setSelectionRange(start, end);
    }
    setSelection((prev) => (prev[0] === start && prev[1] === end ? prev : [start, end]));
  }, []);

  /** Moves the selection to cell `index`, following the active-cell rule. */
  const goTo = useCallback(
    (index: number) => {
      const filled = input.current?.value.length ?? 0;
      const [start, end] = cellSelection(index, filled, length);
      select(start, end);
      return start;
    },
    [length, select],
  );

  /** Reads the native selection; a collapsed caret snaps to the active-cell rule. */
  const syncSelection = useCallback(() => {
    const node = input.current;
    if (!node) return;
    const start = node.selectionStart ?? 0;
    const end = node.selectionEnd ?? start;
    if (readOnly || composing.current) {
      select(start, end);
    } else if (start === end) {
      goTo(start);
    } else if (focusing.current && start === 0 && end === node.value.length) {
      // Keyboard focus selects the whole code; land in the first empty cell instead.
      focusing.current = false;
      goTo(end);
    } else {
      select(start, end);
    }
  }, [goTo, readOnly, select]);

  // After a cleaned value is written back, put the caret where the user's edit left it.
  useIsomorphicLayoutEffect(() => {
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    const node = input.current;
    if (caret === null || node?.ownerDocument.activeElement !== node) return;
    goTo(caret);
  });

  const commit = (raw: string, caret: number | null, replace: boolean) => {
    const next = clean(raw);
    pendingCaret.current = caret === null ? null : clean(raw.slice(0, caret)).length;
    if (next !== value) {
      setStored(next);
      onChange?.(next);
      if (mask) setMessage(labels.pinEntered(next.length, length, numeric));
      if (next.length === length && (value.length < length || replace)) onComplete?.(next);
    }
    // React writes the controlled value back over the raw text; render so the caret follows.
    rerender();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const node = event.currentTarget;
    if (composing.current) {
      setDraft(node.value);
      return;
    }
    const native = event.nativeEvent as Partial<InputEvent>;
    // A paste, a drop or an autofill (which sends no input type) replaces the whole code.
    const replace =
      pasted.current ||
      native.inputType === undefined ||
      native.inputType === "" ||
      native.inputType === "insertReplacementText" ||
      native.inputType === "insertFromDrop";
    pasted.current = false;
    commit(node.value, node.selectionStart, replace);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    focusing.current = false;
    if (event.defaultPrevented || isImeKey(event) || readOnly) return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const node = event.currentTarget;
    const current = node.selectionStart ?? 0;
    const filled = node.value.length;
    let target: number;
    switch (event.key) {
      case "ArrowLeft":
        target = current - 1;
        break;
      case "ArrowRight":
        target = current + 1;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = filled;
        break;
      default:
        return;
    }
    event.preventDefault();
    const cell = goTo(target);
    setMessage(labels.pinPosition(cell + 1, length, numeric));
  };

  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    onMouseUp?.(event);
    const node = event.currentTarget;
    focusing.current = false;
    // A drag that selected several characters keeps its range.
    if (
      event.defaultPrevented ||
      readOnly ||
      (node.selectionEnd ?? 0) - (node.selectionStart ?? 0) > 1
    ) {
      return;
    }
    const cells = root.current?.querySelectorAll(".ol-pin__cell") ?? [];
    const rects = Array.from(cells, (cell) => cell.getBoundingClientRect());
    if (rects.length > 0) goTo(cellAtX(event.clientX, rects));
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    setFocused(true);
    // Keyboard focus lands in the first empty cell (or the last cell when full), not on a
    // select-all of the whole code.
    if (!readOnly) {
      focusing.current = true;
      goTo(event.currentTarget.value.length);
    }
  };

  const handleCompositionStart = (event: CompositionEvent<HTMLInputElement>) => {
    onCompositionStart?.(event);
    composing.current = true;
    setDraft(event.currentTarget.value);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    onCompositionEnd?.(event);
    composing.current = false;
    setDraft(null);
    const node = event.currentTarget;
    commit(node.value, node.selectionStart, false);
  };

  // Name check after mount: a `<label for>` (Field's included) names the input too.
  const ariaLabel = props["aria-label"];
  const ariaLabelledBy = props["aria-labelledby"];
  useEffect(() => {
    const named =
      Boolean(ariaLabel) || Boolean(ariaLabelledBy) || (input.current?.labels?.length ?? 0) > 0;
    if (!named) {
      devWarn(
        "PinInput",
        "the input needs a name; put it in a `Field` with a `label`, or pass `aria-label` or `aria-labelledby`.",
      );
    }
  }, [ariaLabel, ariaLabelledBy]);

  useEffect(() => {
    if (placeholder !== undefined && placeholder.length !== 1) {
      devWarn("PinInput", "`placeholder` must be a single character.");
    }
  }, [placeholder]);

  const shown = draft ?? value;
  const [selStart, selEnd] = selection;
  const ranged = selEnd - selStart > 1;
  const showActive = focused && !readOnly && !disabled && !ranged;
  const activeCell = showActive ? Math.min(selStart, length - 1) : -1;

  return (
    <div
      ref={root}
      dir="ltr"
      className={cx("ol-pin", size !== "m" && `ol-pin--${size}`, className)}
      style={style}
      data-focused={focused || undefined}
      data-complete={value.length === length || undefined}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
    >
      {groupCells(length, group).map((run) => (
        <div key={run[0]} className="ol-pin__group" aria-hidden="true">
          {run.map((index) => {
            const char = shown[index];
            const filled = char !== undefined;
            return (
              <span
                key={index}
                className="ol-pin__cell"
                data-filled={filled || undefined}
                data-active={index === activeCell || undefined}
                data-selected={
                  (focused && ranged && index >= selStart && index < selEnd) || undefined
                }
              >
                <span className="ol-pin__char">{filled ? (mask ? "•" : char) : placeholder}</span>
              </span>
            );
          })}
        </div>
      ))}
      <input
        {...field}
        ref={inputRef}
        className="ol-pin__input"
        type={mask ? "password" : "text"}
        inputMode={numeric ? "numeric" : "text"}
        autoComplete={autoComplete ?? (mask ? "off" : "one-time-code")}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
        disabled={disabled}
        readOnly={readOnly}
        value={draft ?? value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={(event) => {
          onSelect?.(event);
          syncSelection();
        }}
        onPaste={(event) => {
          onPaste?.(event);
          focusing.current = false;
          if (event.defaultPrevented || readOnly) return;
          // A pasted code replaces the whole value, from whichever cell is active.
          if (clean(event.clipboardData.getData("text")) !== "") {
            pasted.current = true;
            event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
          }
        }}
        onMouseUp={handleMouseUp}
        onFocus={handleFocus}
        onBlur={(event) => {
          onBlur?.(event);
          focusing.current = false;
          setFocused(false);
        }}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
      <span id={lengthId} hidden>
        {labels.pinLength(length, numeric)}
      </span>
      <span className="ol-sr" aria-live="polite">
        {message}
      </span>
    </div>
  );
});
