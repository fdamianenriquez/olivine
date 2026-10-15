import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

import { FieldContext, type FieldContextValue, useField } from "../../hooks/useFieldControl";
import { cx } from "../../utils/cx";

export interface FieldProps extends Omit<React.ComponentPropsWithoutRef<"div">, "children"> {
  /** Mono uppercase label, bound to the control with `<label for>`. Leave it out when the control draws its own label (Checkbox, Radio, Switch). */
  label?: ReactNode;
  /** Helper text under the control. Referenced by `aria-describedby`. */
  hint?: ReactNode;
  /** Error message. Marks the control `aria-invalid` and shows beni text prefixed with ×. Write it as an instruction. A message present at first render is not announced: on submit, move focus to the first invalid control. */
  error?: ReactNode;
  /** Success message, shown in matsu with ✓ when there is no `error`. */
  valid?: ReactNode;
  /** Marks the control `required` and shows an olive asterisk next to the label. */
  required?: boolean;
  /** A short note aligned to the right of the label row (a unit, a counter). */
  aside?: ReactNode;
  /**
   * Exactly one control. Olivine controls wire themselves; a plain DOM element is cloned
   * with the field's attributes; anything else should use `Field.Control`.
   */
  children?: ReactNode;
}

/** The attributes `Field.Control` hands to its render prop. */
export interface FieldControlRenderProps {
  /** Id for the control; undefined when another control in the field already owns it. */
  id: string | undefined;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  required: true | undefined;
}

export interface FieldControlProps {
  /** Receives the attributes to spread on the control. */
  children: (props: FieldControlRenderProps) => ReactNode;
}

/**
 * Renders a control whose component can't read the field itself (a third-party input, a
 * custom widget with several parts). It claims the field's id like any Olivine control.
 */
function FieldControl({ children }: FieldControlProps) {
  const field = useField();
  const owner = useId();
  if (!field) {
    return (
      <>
        {children({
          id: undefined,
          "aria-describedby": undefined,
          "aria-invalid": undefined,
          required: undefined,
        })}
      </>
    );
  }
  return (
    <>
      {children({
        id: field.claim(owner) ? field.id : undefined,
        "aria-describedby": field.describedBy,
        "aria-invalid": field.invalid || undefined,
        required: field.required || undefined,
      })}
    </>
  );
}

/** Intrinsic elements a `<label for>` can target; other DOM wrappers are left alone. */
const LABELABLE = new Set(["input", "select", "textarea", "button", "meter", "output", "progress"]);

const hasContent = (node: ReactNode) =>
  node !== undefined && node !== null && node !== false && node !== "";

/** Wraps one control with its label, hint and validation message, and wires the ARIA between them. */
const FieldRoot = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, hint, error, valid, required = false, aside, className, children, ...rest },
  ref,
) {
  const id = useId();
  const [claims] = useState(() => ({ owner: null as string | null }));
  const hasHint = hasContent(hint);
  const hasError = hasContent(error);
  const hasValid = !hasError && hasContent(valid);
  const hintId = hasHint ? `${id}-hint` : undefined;
  const msgId = `${id}-msg`;
  const describedBy =
    [hintId, hasError || hasValid ? msgId : undefined].filter(Boolean).join(" ") || undefined;

  const context = useMemo<FieldContextValue>(
    () => ({
      id,
      describedBy,
      invalid: hasError,
      required,
      claim: (owner) => {
        claims.owner ??= owner;
        return claims.owner === owner;
      },
    }),
    [id, describedBy, hasError, required, claims],
  );

  // Only intrinsic labelable controls are cloned (not wrapper elements, whose Olivine children wire themselves). Olivine controls (and Field.Control) read the
  // context themselves, so cloning them would apply the attributes twice; a custom
  // component may not forward props at all, so it is left to Field.Control.
  let control = children;
  let controlId = id;
  if (
    isValidElement(children) &&
    typeof children.type === "string" &&
    LABELABLE.has(children.type)
  ) {
    const child = children as ReactElement<Record<string, unknown>>;
    const own = child.props;
    controlId = (own.id as string | undefined) ?? id;
    control = cloneElement(child, {
      id: controlId,
      required: (own.required as boolean | undefined) ?? (required || undefined),
      "aria-invalid": own["aria-invalid"] ?? (hasError || undefined),
      "aria-describedby":
        [describedBy, own["aria-describedby"] as string | undefined].filter(Boolean).join(" ") ||
        undefined,
    });
  }

  const hasLabel = hasContent(label);
  return (
    <FieldContext.Provider value={context}>
      <div
        ref={ref}
        className={cx("ol-field", className)}
        data-state={hasError ? "invalid" : hasValid ? "valid" : undefined}
        {...rest}
      >
        {(hasLabel || hasContent(aside)) && (
          <div className="ol-field__top">
            {hasLabel && (
              <label className="ol-field__label" htmlFor={controlId}>
                {label}
                {required && (
                  <span className="ol-field__req" aria-hidden="true">
                    {" *"}
                  </span>
                )}
              </label>
            )}
            {hasContent(aside) && <span className="ol-field__aside">{aside}</span>}
          </div>
        )}
        {control}
        {hasHint && (
          <span id={hintId} className="ol-field__hint">
            {hint}
          </span>
        )}
        {/* Always mounted so assistive tech registers the region before a message appears. */}
        <div id={msgId} className="ol-field__msg" aria-live="polite" aria-atomic="true">
          {hasError ? (
            <span className="ol-field__error">{error}</span>
          ) : hasValid ? (
            <span className="ol-field__valid">{valid}</span>
          ) : null}
        </div>
      </div>
    </FieldContext.Provider>
  );
});

export const Field = Object.assign(FieldRoot, { Control: FieldControl });
