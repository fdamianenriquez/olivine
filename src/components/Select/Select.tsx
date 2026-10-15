import { forwardRef } from "react";

import { useFieldControl } from "../../hooks/useFieldControl";
import { cx } from "../../utils/cx";

/** One entry of the `options` prop. */
export interface SelectOption {
  /** Value submitted and reported by `onChange`. */
  value: string;
  /** Text shown for the option. */
  label: React.ReactNode;
  /** Makes the option unselectable. */
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.ComponentPropsWithoutRef<"select">, "size"> {
  /** Height and type size of the control. */
  size?: "s" | "m";
  /** Choices to render, as plain strings or `{ value, label, disabled }`. Overrides `children`. */
  options?: readonly (string | SelectOption)[];
  /**
   * Text of a leading, unselectable option shown while nothing is chosen. When set and no
   * `value`/`defaultValue` is given, the control starts on it.
   */
  placeholder?: string;
  /** Extra class names on the `<select>` (not on the wrapper). */
  className?: string;
}

/** A native select restyled square, with its arrow in an ink-ruled cell. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = "m", options, placeholder, className, children, ...props },
  ref,
) {
  const rest = useFieldControl(props);
  const uncontrolledPlaceholder =
    placeholder !== undefined && rest.value === undefined && rest.defaultValue === undefined;
  return (
    <span className={cx("ol-selectwrap", size === "s" && "ol-selectwrap--s")}>
      <select
        ref={ref}
        className={cx("ol-select", size === "s" && "ol-select--s", className)}
        {...(uncontrolledPlaceholder ? { defaultValue: "" } : null)}
        {...rest}
      >
        {placeholder !== undefined && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((o) =>
              typeof o === "string" ? (
                <option key={o} value={o}>
                  {o}
                </option>
              ) : (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ),
            )
          : children}
      </select>
    </span>
  );
});
