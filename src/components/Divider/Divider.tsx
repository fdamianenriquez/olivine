import { forwardRef, type HTMLAttributes } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Label } from "../Label";

export interface DividerProps extends HTMLAttributes<HTMLElement> {
  /**
   * Line weight. `heavy` is 3px (one per view); `soft` uses the softer line colour and
   * belongs inside framed areas only.
   * @default "hair"
   */
  weight?: "hair" | "heavy" | "soft";
  /** Draws a vertical line that stretches to the height of a flex row. @default false */
  vertical?: boolean;
  /** Section marker shown before the line. Ignored when `vertical`. */
  label?: React.ReactNode;
  /** Index shown before the label ("02 —"). A number is zero-padded. Needs `label`. */
  index?: number | string;
}

/**
 * A hairline rule. Without `label` it is an `<hr>` (a separator); with `label` it is a mono
 * section marker followed by a line.
 */
export const Divider = forwardRef<HTMLElement, DividerProps>(function Divider(
  { weight = "hair", vertical = false, label, index, className, ...rest },
  ref,
) {
  const modifiers = [
    weight === "heavy" && "ol-divider--heavy",
    weight === "soft" && "ol-divider--soft",
  ];
  const hasLabel = label != null && label !== false && label !== "";

  if (hasLabel && vertical) {
    devWarn("Divider", "`label` is ignored on a vertical divider.");
  }
  if (index != null && !hasLabel) {
    devWarn("Divider", "`index` is ignored without a `label`.");
  }

  if (hasLabel && !vertical) {
    // A `separator` role would make its children presentational and could drop the label
    // from the accessibility tree. The marker is a plain element that keeps its text; the
    // line is a decorative pseudo-element.
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={cx("ol-divider", "ol-divider--labelled", ...modifiers, className)}
        {...rest}
      >
        <Label {...(index != null && { index })}>{label}</Label>
      </div>
    );
  }

  return (
    <hr
      ref={ref as React.Ref<HTMLHRElement>}
      className={cx("ol-divider", ...modifiers, vertical && "ol-divider--v", className)}
      aria-orientation={vertical ? "vertical" : undefined}
      {...rest}
    />
  );
});
