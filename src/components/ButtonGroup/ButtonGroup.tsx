import { type ComponentPropsWithoutRef, forwardRef, useEffect } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

export interface ButtonGroupProps extends ComponentPropsWithoutRef<"div"> {
  /** Stacks the buttons in a column instead of a row. */
  vertical?: boolean;
  /** Accessible name of the group (sets `aria-label`). A group that conveys a choice needs a name. */
  label?: string;
}

/** Joins buttons so their borders collapse into one ruled bar. Mark the selected button with `aria-pressed="true"`. */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  { vertical = false, label, className, children, ...rest },
  ref,
) {
  const named = [label, rest["aria-label"], rest["aria-labelledby"]].some(
    (v) => v !== undefined && v !== "",
  );
  useEffect(() => {
    if (!named)
      devWarn(
        "ButtonGroup",
        "a group needs a name; pass `label`, `aria-label` or `aria-labelledby`.",
      );
  }, [named]);

  return (
    <div
      role="group"
      aria-label={label}
      {...rest}
      ref={ref}
      className={cx("ol-btngroup", vertical && "ol-btngroup--v", className)}
    >
      {children}
    </div>
  );
});
