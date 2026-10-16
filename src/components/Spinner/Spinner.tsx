import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { Label } from "../Label";

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, "role" | "children"> {
  /** Size of the mark. */
  size?: "m" | "l";
  /** `square` turns an outlined square in four steps; `dots` blinks three blocks in turn. */
  variant?: "square" | "dots";
  /** Text announced to screen readers. Defaults to the locale's "Loading". */
  label?: string;
  /** Shows the label as visible text next to the mark. */
  showLabel?: boolean;
}

/** A square that turns in four steps with an olive corner, or three blinking blocks. */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { size = "m", variant = "square", label, showLabel = false, className, ...rest },
  ref,
) {
  const t = useLabels();
  const text = label === undefined || label === "" ? t.loading : label;

  return (
    <span
      {...rest}
      ref={ref}
      role="status"
      className={cx(
        "ol-spinner",
        size === "l" && "ol-spinner--l",
        variant === "dots" && "ol-spinner--dots",
        className,
      )}
    >
      {variant === "square" ? (
        <span className="ol-spinner__mark" aria-hidden="true" />
      ) : (
        <span className="ol-spinner__dots" aria-hidden="true">
          <i>■</i>
          <i>■</i>
          <i>■</i>
        </span>
      )}
      {showLabel ? <Label muted>{text}</Label> : <span className="ol-sr">{text}</span>}
    </span>
  );
});
