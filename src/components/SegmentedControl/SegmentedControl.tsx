import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import { useInkWipe } from "../../motion";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Button } from "../Button";

export interface SegmentedControlOption {
  /** Value reported by `onChange` and submitted with `name`. Unique within the control. */
  value: string;
  /** Visible text of the cell, one to three words. Omit only for an icon-only cell. */
  label?: string;
  /** Decorative leading icon, hidden from assistive tech. */
  icon?: ReactNode;
  /** Makes this cell unavailable; keyboard navigation skips it. */
  disabled?: boolean;
  /** Accessible name of the cell. Required when the cell has no `label`. */
  "aria-label"?: string;
}

interface SegmentedControlBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children"
> {
  /** Two to five options, in display order. */
  options: SegmentedControlOption[];
  /**
   * Control height: 32, 44 or 56px.
   * @default "m"
   */
  size?: "s" | "m" | "l";
  /** Full width with equal cells. */
  fill?: boolean;
  /** Stacks the cells in a column. */
  vertical?: boolean;
  /** Disables the whole control. */
  disabled?: boolean;
  /** Shows a leading "✓" in selected cells. */
  check?: boolean;
  /** Renders one hidden input per selected value, so the choice is submitted with a form. */
  name?: string;
  /** Accessible name of the group (sets `aria-label`). Required, or `aria-label` / `aria-labelledby`. */
  label?: string;
}

export interface SegmentedControlSingleProps extends SegmentedControlBaseProps {
  /**
   * One option (radio semantics) or several (toggle-button semantics).
   * @default false
   */
  multiple?: false;
  /** Selected value (controlled). `null` selects nothing. */
  value?: string | null;
  /** Initially selected value when uncontrolled. */
  defaultValue?: string | null;
  /** Called with the newly selected value. Not called when the selected cell is pressed again. */
  onChange?: (value: string) => void;
  disallowEmpty?: never;
}

export interface SegmentedControlMultipleProps extends SegmentedControlBaseProps {
  /** One option (radio semantics) or several (toggle-button semantics). */
  multiple: true;
  /** Selected values (controlled). */
  value?: string[];
  /** Initially selected values when uncontrolled. */
  defaultValue?: string[];
  /** Called with the new list of selected values, in option order. */
  onChange?: (value: string[]) => void;
  /** The last selected cell cannot be turned off. */
  disallowEmpty?: boolean;
}

export type SegmentedControlProps = SegmentedControlSingleProps | SegmentedControlMultipleProps;

const toList = (v: string | string[] | null | undefined): string[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

const RADIO = '[role="radio"]';
const NONE = "[data-ol-seg-none]";

/**
 * A ruled bar of two to five joined cells for choosing a value in place: one option
 * (`radiogroup`, arrow keys move and select, focus wraps) or several with `multiple`
 * (`aria-pressed` buttons, each its own tab stop). The selected cell fills with ink by a wipe
 * that travels from the previous selection; it is instant under reduced motion.
 */
export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(props, ref) {
    const {
      options,
      multiple = false,
      value,
      defaultValue,
      onChange,
      disallowEmpty = false,
      size = "m",
      fill = false,
      vertical = false,
      disabled = false,
      check = false,
      name,
      label,
      className,
      onKeyDown,
      onFocus,
      onBlur,
      ...rest
    } = props;

    const [selected, setSelected] = useControllable<string[]>(
      value === undefined ? undefined : toList(value),
      toList(defaultValue),
    );

    const commit = (next: string[]) => {
      setSelected(next);
      if (multiple) (onChange as ((v: string[]) => void) | undefined)?.(next);
      else if (next[0] !== undefined) (onChange as ((v: string) => void) | undefined)?.(next[0]);
    };

    const select = (optionValue: string) => {
      if (multiple) {
        const on = selected.includes(optionValue);
        if (on && disallowEmpty && selected.length === 1) return;
        const next = options
          .map((o) => o.value)
          .filter((v) => (v === optionValue ? !on : selected.includes(v)));
        commit(next);
      } else if (selected[0] !== optionValue || selected.length !== 1) {
        commit([optionValue]);
      }
    };

    const root = useRef<HTMLDivElement>(null);
    const roving = useRovingFocus(root, {
      itemSelector: multiple ? NONE : RADIO,
      orientation: vertical ? "vertical" : "horizontal",
      loop: true,
      selectedSelector: '[aria-checked="true"]',
      restore: "selected",
      onActiveChange: (cell) => {
        if (cell.dataset.value !== undefined) select(cell.dataset.value);
      },
    });

    // One ink travels across the cells of a single-choice row. A column or a multiple
    // selection inks each cell on its own (the shared per-cell wipe).
    const travelling = !multiple && !vertical;
    const active = travelling ? options.findIndex((o) => o.value === selected[0]) : -1;
    const ink = useInkWipe<HTMLDivElement>(active);
    const rootRef = useCallback(
      (node: HTMLDivElement | null) => {
        root.current = node;
        ink(travelling ? node : null);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref, ink, travelling],
    );

    // The arrows of the other axis: all four arrows move and select in single mode.
    const crossAxis = (event: KeyboardEvent<HTMLDivElement>) => {
      if (multiple || event.defaultPrevented) return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return;
      const keys = vertical ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
      if (!keys.includes(event.key)) return;
      const current = (event.target as Element).closest<HTMLElement>(RADIO);
      const cells = Array.from(
        root.current?.querySelectorAll<HTMLElement>(`${RADIO}:not(:disabled)`) ?? [],
      );
      if (!current) return;
      const index = cells.indexOf(current);
      if (index < 0) return;
      let forward = event.key === "ArrowDown" || event.key === "ArrowRight";
      if (vertical && getComputedStyle(current).direction === "rtl") {
        forward = !forward;
      }
      const target = cells[(index + (forward ? 1 : -1) + cells.length) % cells.length];
      event.preventDefault();
      if (target && target !== current && roving.focusItem(target)) {
        if (target.dataset.value !== undefined) select(target.dataset.value);
      }
    };

    const named = [label, rest["aria-label"], rest["aria-labelledby"]].some(
      (v) => v !== undefined && v !== "",
    );
    const values = options.map((o) => o.value);
    const duplicate = values.find((v, i) => values.indexOf(v) !== i);
    const unnamedIcon = options.find((o) => !o.label && !o["aria-label"]);
    const count = options.length;
    useEffect(() => {
      if (!named) {
        devWarn(
          "SegmentedControl",
          "the group needs a name; pass `label`, `aria-label` or `aria-labelledby`.",
        );
      }
      if (count < 2 || count > 5) {
        devWarn(
          "SegmentedControl",
          `use two to five options (got ${String(count)}); use Select for more.`,
        );
      }
      if (duplicate !== undefined) {
        devWarn("SegmentedControl", `option values must be unique ("${duplicate}" repeats).`);
      }
      if (unnamedIcon) {
        devWarn(
          "SegmentedControl",
          `the icon-only option "${unnamedIcon.value}" needs an \`aria-label\`.`,
        );
      }
      if (disallowEmpty && !multiple) {
        devWarn("SegmentedControl", "`disallowEmpty` applies only with `multiple`.");
      }
    }, [named, count, duplicate, unnamedIcon, disallowEmpty, multiple]);

    return (
      // The cells are the focus stops; the group only delegates their arrow keys (roving).
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- role is radiogroup or group
      <div
        role={multiple ? "group" : "radiogroup"}
        aria-label={label}
        aria-disabled={disabled || undefined}
        {...rest}
        ref={rootRef}
        className={cx(
          "ol-btngroup",
          "ol-seg",
          vertical && "ol-btngroup--v ol-seg--v",
          fill && "ol-seg--fill",
          className,
        )}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!multiple && !roving.onKeyDown(event)) crossAxis(event);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          roving.onFocus(event);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          roving.onBlur(event);
        }}
      >
        {options.map((option) => {
          const on = selected.includes(option.value);
          const content = (
            <>
              {check && (
                <span className="ol-seg__check" aria-hidden="true">
                  ✓
                </span>
              )}
              {option.icon != null && (
                <span className="ol-seg__icon" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              {option.label && <span className="ol-seg__label">{option.label}</span>}
            </>
          );
          return (
            <Button
              // A new mode remounts the cells, so no stale roving tabindex is left behind.
              key={`${multiple ? "m" : "s"}:${option.value}`}
              size={size}
              disabled={disabled || option.disabled === true}
              aria-label={option["aria-label"]}
              data-value={option.value}
              className={cx("ol-seg__cell", "ol-ink-wipe")}
              {...(multiple ? { "aria-pressed": on } : { role: "radio", "aria-checked": on })}
              onClick={() => {
                select(option.value);
              }}
            >
              {content}
              {/* The inked copy is clipped with the fill, so the label never loses contrast. */}
              <span className="ol-ink-wipe__ink" aria-hidden="true">
                {content}
              </span>
            </Button>
          );
        })}
        {name !== undefined &&
          selected
            .filter((v) => values.includes(v))
            .map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      </div>
    );
  },
);
