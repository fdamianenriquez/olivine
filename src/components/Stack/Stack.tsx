import type { CSSProperties } from "react";

import { cx } from "../../utils/cx";
import { forwardRefAs } from "../../utils/polymorphic";
import type { GridGap } from "../Grid";

export interface StackOwnProps {
  /** Main axis: `"v"` stacks children in a column, `"h"` lays them in a wrapping row. @default "v" */
  direction?: "v" | "h";
  /** Space between children, as a spacing step. @default 4 */
  gap?: GridGap;
  /** Cross-axis alignment (any CSS `align-items` value). Defaults to stretch for `"v"` and center for `"h"`. */
  align?: CSSProperties["alignItems"];
  /** Main-axis distribution (any CSS `justify-content` value). */
  justify?: CSSProperties["justifyContent"];
}

/**
 * Lays children out in a column (or row) with one spacing step between them.
 * Layout values travel as CSS custom properties on the root.
 */
export const Stack = forwardRefAs<"div", StackOwnProps>(function Stack(
  { as: As = "div", direction = "v", gap = 4, align, justify, className, style, ...rest },
  ref,
) {
  const extraClass = className as string | undefined;
  const extraStyle = style as CSSProperties | undefined;
  const vars = {
    "--ol-gap": `var(--space-${String(gap)})`,
    ...(align !== undefined && { "--ol-align": align }),
    ...(justify !== undefined && { "--ol-justify": justify }),
  } as CSSProperties;

  return (
    <As
      ref={ref}
      className={cx("ol-stack", direction === "h" && "ol-stack--h", extraClass)}
      style={{ ...vars, ...extraStyle }}
      {...rest}
    />
  );
});
