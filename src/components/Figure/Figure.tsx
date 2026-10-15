import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";

export interface FigureProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Figure number. A number is zero-padded (`1` → "Fig. 01"); a string is shown as is. */
  index?: number | string;
  /** Caption text. It names the figure for assistive technology. */
  caption?: ReactNode;
  /** Attribution, right-aligned on the caption line. */
  credit?: ReactNode;
  /** The media: an image, a `Ratio`, a chart, an embed. */
  children?: ReactNode;
}

/**
 * Pairs media with a mono caption line: "FIG. 01 — caption …… credit".
 *
 * Renders a `<figure>` with a `<figcaption>`, which names the figure. Without `caption`, `credit`
 * or `index` no `<figcaption>` is rendered. The "Fig." word comes from the locale. Figure does not
 * describe its media: give images and embeds their own `alt` or `title`.
 */
export const Figure = forwardRef<HTMLElement, FigureProps>(function Figure(
  { index, caption, credit, className, children, ...rest },
  ref,
) {
  const labels = useLabels();
  const captionId = useId();
  const hasCaption = caption != null && caption !== false && caption !== "";
  const hasCredit = credit != null && credit !== false && credit !== "";
  const hasIndex = index != null && index !== "";
  const showCaption = hasCaption || hasCredit || hasIndex;

  return (
    <figure
      ref={ref}
      className={cx("ol-figure", className)}
      aria-labelledby={showCaption ? captionId : undefined}
      {...rest}
    >
      {children}
      {showCaption && (
        <figcaption id={captionId} className="ol-figure__caption">
          <span className="ol-figure__text">
            {hasIndex && (
              <>
                {labels.figure} {typeof index === "number" ? pad(index) : index}
                {hasCaption && <span aria-hidden="true"> —</span>}
                {hasCaption && " "}
              </>
            )}
            {caption}
          </span>
          {hasCredit && (
            <>
              {" "}
              <span className="ol-figure__leader" aria-hidden="true" />
              <span className="ol-figure__credit">{credit}</span>
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
});
