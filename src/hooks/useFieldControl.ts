import { createContext, useContext, useId } from "react";

import { useIsomorphicLayoutEffect } from "./useFloating";

/** What a `Field` tells the control it labels. */
export interface FieldContextValue {
  /** Id for the labelled control (the label's `htmlFor`). */
  id: string;
  /** Ids of the hint and message, for `aria-describedby`. */
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
  /**
   * Lets one control take the field's id. The first control to call it owns the id; others
   * (e.g. a second input inside an InputGroup) still get the description and validity.
   * The claim lasts for the Field's lifetime: if the owning control is rendered conditionally,
   * give the intended control an explicit `id` instead.
   */
  claim: (owner: string) => boolean;
  /**
   * Tells the Field which id the control that owns the field really has, so the label's
   * `htmlFor` follows an explicit `id`. Pass `undefined` to go back to the field's own id.
   * Optional so a hand-built context still works; the label then keeps the field's id.
   */
  setControlId?: (id: string | undefined) => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** Props a control receives from its Field. Explicit props always win. */
export interface FieldControlProps {
  id?: string | undefined;
  required?: boolean | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling" | undefined;
}

/**
 * Merges the surrounding Field's id, description and validity into a control's props.
 * Outside a Field it returns the props unchanged.
 */
export function useFieldControl<P extends FieldControlProps>(props: P): P {
  const field = useContext(FieldContext);
  const owner = useId();
  // The first control in the field is the one its label points at, whether it brings its own
  // id or takes the field's.
  const isOwner = field ? field.claim(owner) : false;
  const explicitId = props.id;
  const setControlId = field?.setControlId;
  useIsomorphicLayoutEffect(() => {
    if (!isOwner || explicitId === undefined || !setControlId) return;
    setControlId(explicitId);
    return () => {
      setControlId(undefined);
    };
  }, [isOwner, explicitId, setControlId]);
  if (!field) return props;
  const ownsId = props.id === undefined && isOwner;
  const describedBy =
    [field.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return {
    ...props,
    id: props.id ?? (ownsId ? field.id : undefined),
    required: props.required ?? (field.required || undefined),
    "aria-describedby": describedBy,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
  };
}

/** The surrounding Field, or null outside one. */
export function useField(): FieldContextValue | null {
  return useContext(FieldContext);
}
