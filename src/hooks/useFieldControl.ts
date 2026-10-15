import { createContext, useContext, useId } from "react";

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
  if (!field) return props;
  const ownsId = props.id === undefined && field.claim(owner);
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
