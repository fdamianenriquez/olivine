import {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ElementType,
  forwardRef,
  type ForwardRefRenderFunction,
  type ReactNode,
} from "react";

/** Props of a component rendered as `E`: its own props `P`, `as`, and E's native props. */
export type PolymorphicProps<E extends ElementType, P = object> = P & {
  /** Element or component to render instead of the default. */
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, keyof P | "as">;

/** The ref type of element `E`. */
export type PolymorphicRef<E extends ElementType> = ComponentPropsWithRef<E>["ref"];

/** A component with an `as` prop whose native props and ref follow the rendered element. */
export interface PolymorphicComponent<D extends ElementType, P = object> {
  <E extends ElementType = D>(
    props: PolymorphicProps<E, P> & { ref?: PolymorphicRef<E> },
  ): ReactNode;
  displayName?: string;
}

/**
 * `forwardRef` for polymorphic components. Inside `render`, `as` is a plain `ElementType`
 * and the rest are loose native props; the returned component is typed per element.
 *
 * @example
 * export const Box = forwardRefAs<"div", BoxOwnProps>(function Box({ as: As = "div", ...rest }, ref) {
 *   return <As ref={ref} {...rest} />;
 * });
 */
export function forwardRefAs<D extends ElementType, P = object>(
  render: ForwardRefRenderFunction<Element, PolymorphicProps<ElementType, P>>,
): PolymorphicComponent<D, P> {
  const component = forwardRef(render as unknown as ForwardRefRenderFunction<Element, object>);
  return component as unknown as PolymorphicComponent<D, P>;
}
