import type { ReactNode } from "react";

import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";
import { forwardRefAs } from "../../utils/polymorphic";

export interface LabelOwnProps {
  /** Index prefix. A number is zero-padded ("1" → "01 —"); a string is shown as is. */
  index?: number | string;
  /** Adds an olive point before the label. Decorative. */
  dot?: boolean;
  /** Softens the label to the secondary ink colour. */
  muted?: boolean;
  /** Label text. Write it in sentence case; CSS uppercases it. */
  children?: ReactNode;
  /** Extra class names on the root element. */
  className?: string;
}

export type LabelProps = LabelOwnProps &
  Omit<React.ComponentPropsWithoutRef<"span">, keyof LabelOwnProps>;

/** The mono uppercase voice of the interface: eyebrows, metadata, index numbers. */
export const Label = forwardRefAs<"span", LabelOwnProps>(function Label(
  { as: As = "span", index, dot = false, muted = false, className, children, ...rest },
  ref,
) {
  return (
    <As
      ref={ref}
      className={cx("ol-label", dot && "ol-label--dot", muted && "ol-label--muted", className)}
      {...rest}
    >
      {index != null && (
        <span className="ol-label__index">
          {typeof index === "number" ? pad(index) : index}
          <span aria-hidden="true"> —</span>
        </span>
      )}
      {index != null && " "}
      {children}
    </As>
  );
});
