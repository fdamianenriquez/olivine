import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { pad } from "../../utils/pad";
import { forwardRefAs, type PolymorphicProps } from "../../utils/polymorphic";

export interface CardOwnProps {
  /** Position in a series. Numbers are zero-padded (`1` renders `01`). */
  index?: number | string;
  /** Short secondary label in the head, on the right of the index. */
  meta?: ReactNode;
  /** Media shown between the head and the body, such as an image or a `Ratio`. */
  media?: ReactNode;
  /** Heading of the card. With `href` it is also the link, and its text names the whole card. */
  title?: ReactNode;
  /** Short description under the title. */
  text?: ReactNode;
  /** Foot of the card, such as a badge or actions. Controls inside stay clickable on a link card. */
  footer?: ReactNode;
  /** Lifts the card with `shadow-press` on hover. Use it only when the whole card is one link. */
  interactive?: boolean;
  /** Keeps only the top rule, for lists of articles and editorial grids. */
  flat?: boolean;
  /**
   * Makes the whole card one link to this URL. The title becomes the link and is stretched over the
   * card, so no block content is wrapped in an anchor. Needs a `title`.
   */
  href?: string;
  /** Level of the title heading (1 to 6). Pick the level that fits the page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

export type CardProps<E extends React.ElementType = "article"> = PolymorphicProps<E, CardOwnProps>;

/**
 * Ink-framed box with optional head (index and meta), media, body and foot, each split by a rule.
 * Children go in the body. With `href` the title is the card's only link and covers the whole
 * card, so screen readers announce a short name and the foot can still hold its own controls.
 */
export const Card = forwardRefAs<"article", CardOwnProps>(function Card(
  {
    as: As = "article",
    index,
    meta,
    media,
    title,
    text,
    footer,
    interactive = false,
    flat = false,
    href,
    headingLevel = 3,
    className,
    children,
    ...rest
  },
  ref,
) {
  const Heading = `h${String(headingLevel)}` as "h3";
  const hasHead = index != null || Boolean(meta);
  const hasBody = Boolean(title) || Boolean(text) || Boolean(children);
  if (href && !title) {
    devWarn("Card", "`href` needs a `title`: the title is the link that names the card.");
  }
  return (
    <As
      ref={ref}
      className={cx(
        "ol-card",
        interactive && "ol-card--interactive",
        flat && "ol-card--flat",
        Boolean(href) && Boolean(title) && "ol-card--link",
        className as string | undefined,
      )}
      {...(rest as ComponentPropsWithoutRef<"article">)}
    >
      {hasHead && (
        <div className="ol-card__head">
          {index != null && (
            <span className="ol-card__index">{typeof index === "number" ? pad(index) : index}</span>
          )}
          {meta && <span className="ol-card__meta">{meta}</span>}
        </div>
      )}
      {media && <div className="ol-card__media">{media}</div>}
      {hasBody && (
        <div className="ol-card__body">
          {title && (
            <Heading className="ol-card__title">
              {href ? (
                <a className="ol-card__link" href={href}>
                  {title}
                </a>
              ) : (
                title
              )}
            </Heading>
          )}
          {text && <p className="ol-card__text">{text}</p>}
          {children}
        </div>
      )}
      {footer && <div className="ol-card__foot">{footer}</div>}
    </As>
  );
});
