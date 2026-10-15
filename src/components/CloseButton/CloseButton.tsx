import { type ButtonHTMLAttributes, forwardRef } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";

export interface CloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Accessible name, announced instead of the visible "×". Defaults to the
   * localised "Close".
   */
  label?: string;
}

/** A 32px square "×" button for modal, toast, popover and alert heads. */
export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(function CloseButton(
  { label, className, type = "button", ...rest },
  ref,
) {
  const t = useLabels();
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label ?? t.close}
      className={cx("ol-close", className)}
      {...rest}
    >
      <span aria-hidden="true">×</span>
    </button>
  );
});
