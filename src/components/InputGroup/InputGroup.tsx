import { forwardRef } from "react";

import { cx } from "../../utils/cx";

export interface InputGroupProps extends React.ComponentPropsWithoutRef<"div"> {
  /**
   * Controls to join: `Input`, `Select`, `Button` and `InputGroup.Text`. Inside a `Field`,
   * the first control takes the field's id; every control gets its description and validity.
   */
  children?: React.ReactNode;
}

export interface InputGroupTextProps extends React.ComponentPropsWithoutRef<"span"> {
  /** The affix: a currency sign, a unit, a domain suffix. */
  children?: React.ReactNode;
}

/**
 * A mono affix on paper-2 for an `InputGroup`. It is visual context only: put its meaning in
 * the Field label or hint, or give it an `id` and list that id in the input's `aria-describedby`.
 */
const InputGroupText = forwardRef<HTMLSpanElement, InputGroupTextProps>(function InputGroupText(
  { className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={cx("ol-inputgroup__text", className)} {...rest}>
      {children}
    </span>
  );
});

const InputGroupRoot = forwardRef<HTMLDivElement, InputGroupProps>(function InputGroup(
  { className, children, ...rest },
  ref,
) {
  // A bare wrapper carries no semantics; a named one is announced as a group.
  const named = [rest["aria-label"], rest["aria-labelledby"]].some(
    (v) => v !== undefined && v !== "",
  );
  return (
    <div
      ref={ref}
      role={named ? "group" : undefined}
      className={cx("ol-inputgroup", className)}
      {...rest}
    >
      {children}
    </div>
  );
});

/** Joins inputs, buttons and `InputGroup.Text` affixes into one ruled bar with shared borders. */
export const InputGroup = Object.assign(InputGroupRoot, { Text: InputGroupText });

export { InputGroupText };
