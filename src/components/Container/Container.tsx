import { cx } from "../../utils/cx";
import { forwardRefAs } from "../../utils/polymorphic";

export interface ContainerOwnProps {
  /** Removes the max width so the container spans the full width. @default false */
  fluid?: boolean;
}

/**
 * Centres content at the `container-max` width with `space-6` side gutters.
 */
export const Container = forwardRefAs<"div", ContainerOwnProps>(function Container(
  { as: As = "div", fluid = false, className, ...rest },
  ref,
) {
  const extraClass = className as string | undefined;
  return (
    <As
      ref={ref}
      className={cx("ol-container", fluid && "ol-container--fluid", extraClass)}
      {...rest}
    />
  );
});
