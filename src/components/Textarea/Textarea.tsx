import { forwardRef } from "react";

import { useFieldControl } from "../../hooks/useFieldControl";
import { cx } from "../../utils/cx";

export interface TextareaProps extends React.ComponentPropsWithoutRef<"textarea"> {
  /** Visible number of text lines. */
  rows?: number;
  /** Extra class names on the `<textarea>`. */
  className?: string;
}

/** A multi-line text field with the same frame as Input; it resizes vertically only. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { rows = 4, className, ...props },
  ref,
) {
  const rest = useFieldControl(props);
  return <textarea ref={ref} rows={rows} className={cx("ol-textarea", className)} {...rest} />;
});
