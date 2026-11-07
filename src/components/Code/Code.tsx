import { forwardRef, type HTMLAttributes } from "react";

import { cx } from "../../utils/cx";

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  /**
   * Transparent box with `on-ink` text and border, for ink grounds (selected rows, tooltips).
   * Hosts can also set `--code-fill`, `--code-ink` and `--code-line`.
   * @default false
   */
  inverse?: boolean;
}

/**
 * A fragment of code inside running text: a property name, a command, a path. Set in Xanh
 * Mono on a `paper-2` box with a hairline border. It wraps with the sentence and breaks long
 * identifiers. Always left to right and exempt from browser translation. For several lines
 * use `CodeBlock`; for a keyboard key use `Kbd`.
 */
export const Code = forwardRef<HTMLElement, CodeProps>(function Code(
  { inverse = false, className, ...rest },
  ref,
) {
  return (
    <code
      translate="no"
      dir="ltr"
      {...rest}
      ref={ref}
      className={cx("ol-code", inverse && "ol-code--inverse", className)}
    />
  );
});
