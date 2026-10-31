import {
  type ChangeEvent,
  type FieldsetHTMLAttributes,
  forwardRef,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { FieldContext, useField, useFieldControl } from "../../hooks/useFieldControl";
import { useLabels } from "../../locale";
import { prefersReducedMotion } from "../../motion";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Tooltip } from "../Tooltip";

/** One swatch of a `ColorSwatches` group. */
export interface ColorSwatchOption {
  /** Stable id of the option; the group's value. Two options may share a colour, never a value. */
  value: string;
  /** The colour's name ("Natural", "Ebony"): always readable text, never a hex code. */
  label: string;
  /**
   * Any CSS colour, alpha allowed (`#2b1a12`, `oklch(…)`, `rgb(… / 0.6)`). It is product data,
   * not a token. Leave it out to draw the "none" tile.
   */
  color?: string;
  /** An opaque colour under a translucent `color`, such as a wood under a tinted finish. */
  base?: string;
  /** Secondary text: a price or a reason ("Sold out"). Announced as the swatch's description. */
  hint?: ReactNode;
  /** Makes the swatch unavailable: skipped by the keyboard and crossed with an ×. */
  disabled?: boolean;
}

export type ColorSwatchesLayout = "grid" | "stack";
export type ColorSwatchesSize = "s" | "m" | "l";

export interface ColorSwatchesProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "onChange" | "defaultValue" | "children" | "name"
> {
  /** The swatches, in display order. */
  options: ColorSwatchOption[];
  /** The selected option's `value` (controlled). `null` selects nothing. */
  value?: string | null;
  /** The initially selected option's `value` when uncontrolled. */
  defaultValue?: string | null;
  /** Called with the newly selected value. Not called when the selected swatch is pressed again. */
  onChange?: (value: string) => void;
  /** The group's name, shown as the legend. Or name it with `aria-label` / `aria-labelledby`. */
  legend?: ReactNode;
  /** Form field name. The choice is submitted with a form only when it is given. */
  name?: string;
  /**
   * `grid` wraps the swatches in rows with the name under each tile; `stack` lists them in ruled
   * rows with the name and hint beside the tile.
   * @default "grid"
   */
  layout?: ColorSwatchesLayout;
  /**
   * Tile size: 32, 44 or 56 px.
   * @default "m"
   */
  size?: ColorSwatchesSize;
  /**
   * `visible` writes each name next to its tile. `tooltip` shows tiles only, names each in a
   * tooltip and echoes the selected name (and hint) under the group. Avoid `tooltip` for
   * touch-only audiences: it hides the names that are not selected.
   * @default "visible"
   */
  labels?: "visible" | "tooltip";
  /**
   * Requires a choice before the form submits. Only enforced with a `name`: without one the
   * radios are kept out of the form, so the browser does not check them.
   */
  required?: boolean;
}

const UNSAFE_COLOR = /[;{}]|url\(/i;

/** False only when the browser can check the value and rejects it as a colour. */
function isValidColor(color: string): boolean {
  if (UNSAFE_COLOR.test(color)) return false;
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;
  return CSS.supports("color", color);
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

const hasContent = (node: ReactNode) => node != null && node !== false && node !== "";

/**
 * A single-choice picker over named colour swatches (finishes, woods, hardware). A native radio
 * group in a fieldset: Tab enters on the selected swatch, arrows move and select, disabled
 * swatches are skipped. The selected cell fills with ink by a wipe; nothing is ever drawn on the
 * colour itself, so any colour works in both themes and in forced colours.
 *
 * Colours are content: pass them as `color` (and `base`); they reach the stylesheet only through
 * the `--ol-swatch` and `--ol-swatch-base` custom properties on each tile.
 */
export const ColorSwatches = forwardRef<HTMLFieldSetElement, ColorSwatchesProps>(
  function ColorSwatches(
    {
      options,
      value: valueProp,
      defaultValue = null,
      onChange,
      legend,
      name,
      layout = "grid",
      size = "m",
      labels = "visible",
      required,
      disabled = false,
      form,
      className,
      ...rest
    },
    forwardedRef,
  ) {
    const t = useLabels();
    const uid = useId();
    const field = useField();
    const rootRef = useRef<HTMLFieldSetElement | null>(null);

    // Only the description comes from a surrounding Field (as in CheckGroup): a group has no
    // single control for its label to target, so a Field label names the group by id instead.
    const { "aria-describedby": describedBy } = useFieldControl({
      "aria-describedby": rest["aria-describedby"],
    });
    const hasLegend = hasContent(legend);
    const labelledBy =
      rest["aria-labelledby"] ??
      (!hasLegend && rest["aria-label"] == null ? field?.labelId : undefined);
    const isRequired = required ?? (field?.required ? true : undefined);

    const [current, setCurrent] = useControllable<string | null>(
      valueProp,
      defaultValue,
      onChange
        ? (next) => {
            if (next !== null) onChange(next);
          }
        : undefined,
    );

    // Without a `name` the radios still need one to group; pointing them at a form id that does
    // not exist keeps them out of any enclosing form's submission.
    const groupName = name ?? `ol-swatches-${uid}`;
    const inputForm = name !== undefined ? form : `${uid}-detached`;
    const tooltip = labels === "tooltip";

    // Hanko: the ✓ drops in only after a user's selection, never on mount or a programmatic change.
    const [stamped, setStamped] = useState<string | null>(null);
    const pending = useRef<string | null>(null);
    const [pressCount, bump] = useReducer((n: number) => n + 1, 0);
    const previous = useRef(current);
    useLayoutEffect(() => {
      if (current !== previous.current && current !== null && current === pending.current) {
        setStamped(prefersReducedMotion(rootRef.current) ? null : current);
      } else if (current !== stamped) {
        setStamped(null);
      }
      previous.current = current;
      pending.current = null;
      // `stamped` is read, not tracked: the effect reacts to the selection and to presses only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, pressCount]);

    useEffect(() => {
      const root = rootRef.current;
      if (stamped === null || !root) return undefined;
      const onEnd = (event: Event) => {
        if (
          event.target instanceof Element &&
          event.target.classList.contains("ol-swatches__check")
        ) {
          setStamped(null);
        }
      };
      root.addEventListener("animationend", onEnd);
      return () => {
        root.removeEventListener("animationend", onEnd);
      };
    }, [stamped]);

    // Development checks.
    const named = hasLegend || rest["aria-label"] != null || labelledBy != null;
    const seen = new Set<string>();
    const duplicate = options.find((o) => (seen.has(o.value) ? true : (seen.add(o.value), false)));
    const unlabelled = options.find((o) => typeof o.label !== "string" || o.label.trim() === "");
    const badColors = options
      .flatMap((o) => [o.color, o.base])
      .filter((c): c is string => c !== undefined && !isValidColor(c))
      .join(", ");
    const missingHandler = valueProp !== undefined && onChange === undefined;
    const requiredWithoutName = Boolean(isRequired) && name === undefined;
    useEffect(() => {
      if (!named) {
        devWarn(
          "ColorSwatches",
          "the group needs a name; pass `legend`, `aria-label` or `aria-labelledby`.",
        );
      }
      if (duplicate) {
        devWarn("ColorSwatches", `option values must be unique ("${duplicate.value}" repeats).`);
      }
      if (unlabelled) {
        devWarn(
          "ColorSwatches",
          `the option "${unlabelled.value}" needs a \`label\`: the colour's name.`,
        );
      }
      if (badColors) {
        devWarn("ColorSwatches", `not valid CSS colours: ${badColors}. The tile shows paper.`);
      }
      if (missingHandler) {
        devWarn(
          "ColorSwatches",
          "`value` without `onChange` makes the group read-only; use `defaultValue` instead.",
        );
      }
      if (requiredWithoutName) {
        devWarn(
          "ColorSwatches",
          "`required` needs a `name`: without one the choice is not part of the form and is not checked.",
        );
      }
    }, [named, duplicate, unlabelled, badColors, missingHandler, requiredWithoutName]);

    const selected = options.find((o) => o.value === current);

    return (
      <fieldset
        {...rest}
        ref={(node) => {
          rootRef.current = node;
          setRef(forwardedRef, node);
        }}
        form={form}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
        className={cx(
          "ol-swatches",
          `ol-swatches--${layout}`,
          `ol-swatches--${size}`,
          tooltip && "ol-swatches--tooltip",
          className,
        )}
      >
        {hasLegend ? <legend className="ol-swatches__legend">{legend}</legend> : null}
        <FieldContext.Provider value={null}>
          <div className="ol-swatches__list">
            {options.map((option, index) => {
              const on = option.value === current;
              const off = disabled || Boolean(option.disabled);
              const nameId = `${uid}-n${String(index)}`;
              const hintId = `${uid}-h${String(index)}`;
              const hint = hasContent(option.hint)
                ? option.hint
                : option.disabled
                  ? t.swatchUnavailable
                  : undefined;
              const color = option.color;
              const hasColor = color !== undefined;
              const tileStyle: Record<string, string> = {};
              if (hasColor && isValidColor(color)) {
                tileStyle["--ol-swatch"] = color;
              }
              if (option.base !== undefined && isValidColor(option.base)) {
                tileStyle["--ol-swatch-base"] = option.base;
              }

              const input = (
                <input
                  className="ol-swatches__input"
                  type="radio"
                  name={groupName}
                  form={inputForm}
                  value={option.value}
                  checked={on}
                  disabled={off}
                  required={isRequired}
                  aria-label={tooltip ? option.label : undefined}
                  aria-labelledby={tooltip ? undefined : nameId}
                  aria-describedby={hint !== undefined ? hintId : undefined}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    if (!event.currentTarget.checked) return;
                    pending.current = option.value;
                    // Render in the same batch as the owner's update, so a rejected press still
                    // clears the pending stamp.
                    bump();
                    setCurrent(option.value);
                  }}
                />
              );

              const cell = (
                <label
                  key={option.value}
                  className={cx(
                    "ol-swatches__item",
                    "ol-ink-wipe",
                    off && "ol-swatches__item--disabled",
                    on && stamped === option.value && "ol-swatches__item--stamp",
                  )}
                  data-state={on ? "on" : "off"}
                >
                  {tooltip && !off ? (
                    <Tooltip content={option.label} openDelay={0}>
                      {input}
                    </Tooltip>
                  ) : (
                    input
                  )}
                  <span
                    className={cx("ol-swatches__tile", !hasColor && "ol-swatches__tile--none")}
                    style={tileStyle}
                    aria-hidden="true"
                  />
                  {tooltip ? (
                    hint !== undefined ? (
                      <span id={hintId} className="ol-swatches__hint ol-swatches__hint--hidden">
                        {hint}
                      </span>
                    ) : null
                  ) : (
                    <span className="ol-swatches__text">
                      <span className="ol-swatches__label">
                        <span className="ol-swatches__check" aria-hidden="true">
                          ✓
                        </span>
                        <span id={nameId} className="ol-swatches__name">
                          {option.label}
                        </span>
                      </span>
                      {hint !== undefined ? (
                        <span id={hintId} className="ol-swatches__hint">
                          {hint}
                        </span>
                      ) : null}
                    </span>
                  )}
                </label>
              );

              // A disabled radio takes no focus and no pointer events, so in tooltip mode the cell
              // itself carries the tooltip: the name and the reason on hover or long press.
              if (tooltip && off) {
                return (
                  <Tooltip
                    key={option.value}
                    content={
                      hint !== undefined ? (
                        <>
                          {option.label} — {hint}
                        </>
                      ) : (
                        option.label
                      )
                    }
                    openDelay={0}
                  >
                    {cell}
                  </Tooltip>
                );
              }
              return cell;
            })}
          </div>
          {tooltip ? (
            <p className="ol-swatches__current" aria-hidden="true">
              {selected ? (
                <>
                  <span className="ol-swatches__name">{selected.label}</span>
                  {hasContent(selected.hint) ? (
                    <span className="ol-swatches__hint">{selected.hint}</span>
                  ) : null}
                </>
              ) : null}
            </p>
          ) : null}
        </FieldContext.Provider>
      </fieldset>
    );
  },
);
