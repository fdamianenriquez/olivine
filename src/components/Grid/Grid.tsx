import type { CSSProperties } from "react";

import { cx } from "../../utils/cx";
import { forwardRefAs } from "../../utils/polymorphic";

/** Spacing steps accepted by `gap`; each maps to `var(--space-N)`. */
export type GridGap = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24 | 32;

export interface GridOwnProps {
  /** Number of columns in the grid. @default 12 */
  cols?: number;
  /** Gutter between cells, as a spacing step. Ignored when `ruled`. @default 6 */
  gap?: GridGap;
  /** Replaces gutters with hairline rules shared between cells. Children are padded by `Col`. @default false */
  ruled?: boolean;
}

/**
 * A column grid for laying out `Col` cells. Layout values travel as CSS custom
 * properties on the root.
 */
export const Grid = forwardRefAs<"div", GridOwnProps>(function Grid(
  { as: As = "div", cols = 12, gap, ruled = false, className, style, ...rest },
  ref,
) {
  const extraClass = className as string | undefined;
  const extraStyle = style as CSSProperties | undefined;
  const vars = {
    "--ol-cols": cols,
    ...(gap !== undefined && { "--ol-gap": `var(--space-${String(gap)})` }),
  } as CSSProperties;

  return (
    <As
      ref={ref}
      className={cx("ol-grid", ruled && "ol-grid--ruled", extraClass)}
      style={{ ...vars, ...extraStyle }}
      {...rest}
    />
  );
});
