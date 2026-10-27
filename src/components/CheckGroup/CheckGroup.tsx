import { forwardRef } from "react";

import { FieldContext, useFieldControl } from "../../hooks/useFieldControl";
import { cx } from "../../utils/cx";

export interface CheckGroupProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  /** Group label, rendered as the fieldset legend in the label voice. It names the group. */
  legend?: React.ReactNode;
  /** Lays the options out in a row instead of a column. Default false. */
  inline?: boolean;
}

/**
 * A fieldset for checkboxes or radios with a legend.
 *
 * Inside a `Field`, name the group with `legend`, not the Field `label` (a label cannot target
 * a fieldset). The Field still supplies its hint and error to the group's description; the
 * options inside do not read the Field themselves.
 */
export const CheckGroup = forwardRef<HTMLFieldSetElement, CheckGroupProps>(function CheckGroup(
  { legend, inline = false, className, children, ...rest },
  ref,
) {
  // Only the description is taken from a surrounding Field: the group has no single
  // control to label (no id), and `required`/`aria-invalid` are not valid on a group role.
  const { "aria-describedby": describedBy } = useFieldControl({
    "aria-describedby": rest["aria-describedby"],
  });
  return (
    <fieldset
      {...rest}
      ref={ref}
      aria-describedby={describedBy}
      className={cx("ol-checkgroup", inline && "ol-checkgroup--inline", className)}
    >
      {legend ? <legend className="ol-checkgroup__legend">{legend}</legend> : null}
      <FieldContext.Provider value={null}>{children}</FieldContext.Provider>
    </fieldset>
  );
});
