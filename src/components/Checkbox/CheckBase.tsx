import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { forwardRef, useEffect, useId, useRef } from "react";

import { useFieldControl } from "../../hooks/useFieldControl";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

export interface CheckBaseProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Native input type. Checkbox and Radio share this markup. */
  type: "checkbox" | "radio";
  /** Visible label. Clicking it toggles the input. */
  label?: ReactNode;
  /** Secondary text under the label. Announced as the input's description. */
  hint?: ReactNode;
  /** Shows the mixed state. Only meaningful for checkboxes; it never changes `checked`. */
  indeterminate?: boolean;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** Shared markup and behaviour of Checkbox and Radio. Not meant to be used directly. */
export const CheckBase = forwardRef<HTMLInputElement, CheckBaseProps>(function CheckBase(
  { type, label, hint, indeterminate = false, className, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const hintId = useId();
  const labelId = useId();
  const field = useFieldControl(props);
  const hasHint = hint != null && hint !== false && hint !== "";
  const describedBy =
    [field["aria-describedby"], hasHint ? hintId : undefined].filter(Boolean).join(" ") ||
    undefined;

  const hasLabel = label != null && label !== false && label !== "";
  const named = hasLabel || field["aria-label"] != null || field["aria-labelledby"] != null;
  useEffect(() => {
    if (!named)
      devWarn(
        type === "radio" ? "Radio" : "Checkbox",
        "give it a `label`, `aria-label` or `aria-labelledby`.",
      );
  }, [named, type]);

  // The browser clears `indeterminate` on click while the prop stays true: re-apply every render.
  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = type === "checkbox" && indeterminate;
  });

  const mergedRef = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (node) node.indeterminate = type === "checkbox" && indeterminate;
    setRef(forwardedRef, node);
  };

  return (
    <label className={cx("ol-check", type === "radio" && "ol-check--radio", className)}>
      <span className="ol-check__control">
        <input
          {...field}
          ref={mergedRef}
          onChange={(event) => {
            field.onChange?.(event);
            event.currentTarget.indeterminate = type === "checkbox" && indeterminate;
          }}
          type={type}
          aria-describedby={describedBy}
          aria-labelledby={
            field["aria-labelledby"] ??
            (hasLabel && field["aria-label"] == null ? labelId : undefined)
          }
        />
        <span className="ol-check__box" aria-hidden="true" />
      </span>
      {(hasLabel || hasHint) && (
        <span className="ol-check__text">
          {hasLabel && (
            <span id={labelId} className="ol-check__label">
              {label}
            </span>
          )}
          {hasHint && (
            <span id={hintId} className="ol-check__hint">
              {hint}
            </span>
          )}
        </span>
      )}
    </label>
  );
});
