import { type ReactElement, type Ref, version } from "react";

/**
 * Reads the ref of an element received as a child or as a prop. React 19 moved `ref` into the
 * props and logs an error when `element.ref` is read, while React 18 only keeps it on the element.
 */
export function getElementRef<T>(element: ReactElement): Ref<T> | undefined {
  if (Number.parseInt(version, 10) >= 19) return (element.props as { ref?: Ref<T> }).ref;
  return (element as unknown as { ref?: Ref<T> }).ref;
}
