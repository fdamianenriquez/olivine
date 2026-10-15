import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { forwardRefAs, type PolymorphicProps } from "../../utils/polymorphic";

export interface LinkOwnProps {
  /**
   * The underline is hidden at rest and draws in on hover and focus. Use it only outside
   * running text (nav rows, footers, link lists): inline links keep the default underline,
   * because colour alone must not mark a link. Standalone plain links need a target of at
   * least 24px, so give them padding or `display: block`. On sunken fills (`paper-2`) the
   * olivo hover is 4.2:1, so keep such links large or bold. @default false
   */
  plain?: boolean;
  /**
   * Marks a link that leaves the site: adds a "↗" glyph, opens in a new tab and announces
   * that to assistive tech. A `rel` you pass is merged with `noreferrer`; a `target` you pass
   * overrides `_blank`. `target` and `rel` are only added when rendering an `a` or a component
   * (such as a router link), never on other native elements. @default false
   */
  external?: boolean;
}

export type LinkProps<E extends React.ElementType = "a"> = PolymorphicProps<E, LinkOwnProps>;

function mergeRel(rel: string | undefined): string {
  const tokens = new Set(["noreferrer", ...(rel ? rel.split(/\s+/).filter(Boolean) : [])]);
  return [...tokens].join(" ");
}

/**
 * Inline text navigation. Renders an `<a>`; pass `as` to render a router link
 * while keeping the styles and the `external` behaviour.
 */
export const Link = forwardRefAs<"a", LinkOwnProps>(function Link(
  { as: As = "a", plain = false, external = false, className, children, ...rest },
  ref,
) {
  const labels = useLabels();
  const takesLinkAttrs = As === "a" || typeof As !== "string";
  const externalProps =
    external && takesLinkAttrs
      ? { target: "_blank", ...rest, rel: mergeRel(rest.rel as string | undefined) }
      : rest;
  return (
    <As
      ref={ref}
      className={cx("ol-link", plain && "ol-link--plain", className as string | undefined)}
      {...externalProps}
    >
      {children}
      {external && (
        <>
          <span className="ol-link__arrow" aria-hidden="true">
            ↗
          </span>
          <span className="ol-sr"> ({labels.newTab})</span>
        </>
      )}
    </As>
  );
});
