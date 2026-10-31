import type { ReactNode } from "react";

import { cx } from "../../utils/cx";
import { forwardRefAs } from "../../utils/polymorphic";

export interface VisuallyHiddenOwnProps {
  /**
   * Shows the content while it has keyboard focus, in a ruled box at the top-left of the
   * viewport. Use it with `as="a"` for a skip link: the first focusable element inside `Root`
   * (the focus ring comes from Root), pointing at `#main` whose target has `tabIndex={-1}`.
   */
  focusable?: boolean;
  /** Text announced by screen readers. Pass a locale string, never a hard-coded word. */
  children?: ReactNode;
  /** Extra class names on the root element. */
  className?: string;
}

export type VisuallyHiddenProps = VisuallyHiddenOwnProps &
  Omit<React.ComponentPropsWithoutRef<"span">, keyof VisuallyHiddenOwnProps>;

/** Text for screen readers only: the `.ol-sr` class as a component. */
export const VisuallyHidden = forwardRefAs<"span", VisuallyHiddenOwnProps>(function VisuallyHidden(
  { as: As = "span", focusable = false, className, children, ...rest },
  ref,
) {
  return (
    <As ref={ref} className={cx("ol-sr", focusable && "ol-sr--focusable", className)} {...rest}>
      {children}
    </As>
  );
});
