import { forwardRef } from "react";

import { useFieldControl } from "../../hooks/useFieldControl";
import { cx } from "../../utils/cx";

export interface InputProps extends Omit<React.ComponentPropsWithoutRef<"input">, "size"> {
  /** Height and type size of the field. */
  size?: "s" | "m" | "l";
  /** Draws only a bottom rule. For search bars and editorial forms. */
  line?: boolean;
  /** Extra class names on the `<input>`. */
  className?: string;
}

/** A square text field framed by a hairline; focus draws a 2px olive ring. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "m", line = false, className, ...props },
  ref,
) {
  const rest = useFieldControl(props);
  return (
    <input
      ref={ref}
      className={cx(
        "ol-input",
        size !== "m" && `ol-input--${size}`,
        line && "ol-input--line",
        className,
      )}
      {...rest}
    />
  );
});
