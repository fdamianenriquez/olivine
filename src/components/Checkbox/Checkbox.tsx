import { forwardRef } from "react";

import type { CheckBaseProps } from "./CheckBase";
import { CheckBase } from "./CheckBase";

export interface CheckboxProps extends Omit<CheckBaseProps, "type"> {
  /** Visible label. Clicking it toggles the checkbox. */
  label?: React.ReactNode;
  /** Secondary text under the label, announced as the checkbox's description. */
  hint?: React.ReactNode;
  /** Shows the mixed state (a bar instead of the block). It does not change `checked`. */
  indeterminate?: boolean;
}

/** A 20px square: checked fills a 10px ink block, indeterminate draws a bar. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(props, ref) {
  return <CheckBase ref={ref} {...props} type="checkbox" />;
});
