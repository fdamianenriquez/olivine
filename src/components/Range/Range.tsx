import { forwardRef, type ReactNode } from "react";

import { useControllable } from "../../hooks/useControllable";
import { useFieldControl } from "../../hooks/useFieldControl";
import { cx } from "../../utils/cx";

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
  /** Shows the mono scale with the minimum, current and maximum values. */
  scale?: boolean;
  /** Formats the numbers on the scale. A string or number result also becomes `aria-valuetext`. */
  format?: (value: number) => ReactNode;
  /** Extra class names on the wrapper. */
  className?: string;
}

const identity = (value: number): ReactNode => value;

/** A hairline track with a block thumb and a mono scale showing min, current and max. */
export const Range = forwardRef<HTMLInputElement, RangeProps>(function Range(
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
