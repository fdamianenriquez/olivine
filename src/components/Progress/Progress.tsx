import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, useId } from "react";

import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Current value, from 0 to `max`. Omit it for an indeterminate bar. */
  value?: number;
  /**
   * Value that means "complete".
   * @default 100
   */
  max?: number;
  /**
   * Visible label shown above the bar. It also names the progress bar for assistive
   * technology unless `aria-label` or `aria-labelledby` is passed.
   */
  label?: ReactNode;
  /**
   * `bar` fills with olivo, `ink` fills with ink, `segments` draws a row of block ticks.
   * @default "bar"
   */
  variant?: "bar" | "ink" | "segments";
  /**
   * Number of blocks (`segments` only).
   * @default 20
   */
  segments?: number;
  /**
   * Shows the zero-padded percentage as a figure. Never shown while indeterminate.
   * @default true
   */
  showValue?: boolean;
  /** Accessible name when there is no visible `label`. */
  "aria-label"?: string;
  /** Id of an element that names the progress bar. Takes precedence over `label`. */
  "aria-labelledby"?: string;
}

/**
 * Completion as an olivo bar, an ink bar or a row of block segments, with a zero-padded
 * percentage in Sprat.
 *
 * The track carries `role="progressbar"`. Give it a name with `label`, `aria-label` or
 * `aria-labelledby`. Without `value` the bar is indeterminate: `aria-valuenow` is omitted,
 * the fill sweeps in steps, and under reduced motion it becomes a static hatched bar.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  {
    value,
    max = 100,
    label,
    variant = "bar",
    segments = 20,
    showValue = true,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...rest
  },
  ref,
) {
  const labelId = useId();
  const total = max > 0 ? max : 100;
  const determinate = value != null && Number.isFinite(value);
  const now = determinate ? Math.max(0, Math.min(total, value)) : undefined;
  const pct = now == null ? null : (now / total) * 100;
  const count = Math.max(1, Math.floor(segments) || 1);
  const on = pct == null ? 0 : Math.round((pct / 100) * count);
  const hasLabel = label != null && label !== false && label !== "";
  const percent = pct == null ? undefined : Math.round(pct);
  const name = ariaLabelledBy ?? (ariaLabel || !hasLabel ? undefined : labelId);
  const vars = {
    "--ol-seg": count,
    ...(pct != null ? { "--ol-progress": `${String(pct)}%` } : null),
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cx(
        "ol-progress",
        variant === "ink" && "ol-progress--ink",
        variant === "segments" && "ol-progress--segments",
        pct == null && "ol-progress--indeterminate",
        className,
      )}
      data-state={pct == null ? "indeterminate" : pct >= 100 ? "complete" : "loading"}
      {...rest}
    >
      {(hasLabel || (showValue && percent != null)) && (
        <div className="ol-progress__top">
          {hasLabel && (
            <span className="ol-label" id={labelId}>
              {label}
            </span>
          )}
          {showValue && percent != null && (
            <span className="ol-progress__value" aria-hidden="true">
              {pad(percent, 3)}%
            </span>
          )}
        </div>
      )}
      <div
        className="ol-progress__track"
        role="progressbar"
        aria-label={ariaLabel}
        aria-labelledby={name}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={now}
        aria-valuetext={percent != null ? `${String(percent)}%` : undefined}
        style={vars}
      >
        {variant === "segments" ? (
          Array.from({ length: count }, (_, k) => (
            <span
              key={k}
              className={cx(
                "ol-progress__seg",
                k < on && "ol-progress__seg--on",
                k === on - 1 && "ol-progress__seg--edge",
              )}
            />
          ))
        ) : (
          <span className="ol-progress__fill" />
        )}
      </div>
    </div>
  );
});
