import { forwardRef, type HTMLAttributes, type ReactNode, useEffect } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

/** Size of the figure: `m` is 40px, `l` is 64px, `xl` is fluid up to 120px. */
export type StatSize = "m" | "l" | "xl";

/** Direction of the change shown in `delta`. */
export type StatTrend = "up" | "down";

/**
 * Common unit symbols. Any other symbol is accepted too; words are not (they get a
 * development warning).
 */
export type StatUnit = "%" | "‰" | "¥" | "$" | "€" | "£" | "×" | "°" | (string & {});

export interface StatProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * The figure: digits and number punctuation only (`"064"`, `"1,284"`, `"¥48,000"`).
   * Pass a string to keep zero padding. Letters trigger a development warning.
   */
  value: number | string;
  /**
   * A symbol set small after the value: `%`, `¥`, `$`, `×`. Words go in `label`, because the
   * figure face is for numbers. Letters trigger a development warning.
   */
  unit?: StatUnit;
  /** Mono caption above the figure. */
  label?: ReactNode;
  /** Change line below the figure, e.g. "12% vs. last month". */
  delta?: ReactNode;
  /**
   * Direction of the change. Adds an arrow (↑ / ↓) and a spoken word from the locale, so the
   * direction never relies on the glyph alone.
   */
  trend?: StatTrend;
  /**
   * Size of the figure.
   * @default "l"
   */
  size?: StatSize;
  /** Sets the figure in olive. Use once per view. */
  accent?: boolean;
  /** Extra class names for the root element. */
  className?: string;
}

const hasLetters = (s: string) => /\p{L}/u.test(s);

/** One number in the figure face with a mono label and an optional change line. */
export const Stat = forwardRef<HTMLDivElement, StatProps>(function Stat(
  { value, unit, label, delta, trend, size = "l", accent = false, className, ...rest },
  ref,
) {
  const t = useLabels();
  const valueLetters = hasLetters(String(value));
  const unitLetters = unit != null && hasLetters(unit);

  useEffect(() => {
    if (valueLetters) {
      devWarn("Stat", "`value` is for digits only; put words in `label`.");
    }
  }, [valueLetters]);
  useEffect(() => {
    if (unitLetters) {
      devWarn("Stat", "`unit` must be a symbol (%, ¥, $, ×); put words in `label`.");
    }
  }, [unitLetters]);

  return (
    <div
      ref={ref}
      className={cx("ol-stat", `ol-stat--${size}`, accent && "ol-stat--accent", className)}
      {...rest}
    >
      {label != null && label !== false && (
        <span className="ol-label ol-label--muted">{label}</span>
      )}
      <span className="ol-stat__fig">
        {value}
        {unit ? <span className="ol-stat__unit">{unit}</span> : null}
      </span>
      {delta != null && delta !== false && (
        <span className={cx("ol-label ol-stat__delta", trend && `ol-stat__delta--${trend}`)}>
          {trend ? (
            <>
              <span aria-hidden="true" className="ol-stat__arrow">
                {trend === "up" ? "↑" : "↓"}
              </span>
              <span className="ol-sr">{trend === "up" ? t.trendUp : t.trendDown}</span>{" "}
            </>
          ) : null}
          {delta}
        </span>
      )}
    </div>
  );
});
