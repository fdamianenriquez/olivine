import { forwardRef } from "react";

import type { CheckBaseProps } from "../Checkbox/CheckBase";
import { CheckBase } from "../Checkbox/CheckBase";

export interface RadioProps extends Omit<CheckBaseProps, "type" | "indeterminate"> {
  /** Visible label. Clicking it selects the radio. */
  label?: React.ReactNode;
  /** Secondary text under the label, announced as the radio's description. */
  hint?: React.ReactNode;
  /** Radios sharing a `name` form one group: selecting one clears the others. */
  name?: string;
}

/** A round option that marks one point in a group. Group radios in a fieldset or CheckGroup. */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(props, ref) {
  return <CheckBase ref={ref} {...props} type="radio" />;
});
