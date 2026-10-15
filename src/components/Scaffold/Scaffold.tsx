import { forwardRef, type HTMLAttributes } from "react";

import { cx } from "../../utils/cx";

export type ScaffoldProps = HTMLAttributes<HTMLSpanElement>;

/**
 * Temporary component that exercises the toolchain end to end.
 * It is removed when the first real components land.
 */
export const Scaffold = forwardRef<HTMLSpanElement, ScaffoldProps>(function Scaffold(
  { className, ...rest },
  ref,
) {
  return <span ref={ref} className={cx("ol-scaffold", className)} {...rest} />;
});
