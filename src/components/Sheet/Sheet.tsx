import { type ReactNode, useId } from "react";

import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";
import { forwardRefAs } from "../../utils/polymorphic";

/** Elements that are already sectioning landmarks or regions when labelled. */
const LANDMARK_TAGS = new Set(["section", "article", "aside", "nav", "main", "form"]);

export interface SheetOwnProps {
  /**
   * Title on the left of the bar. It also names the sheet, which makes it a labelled region for
   * assistive tech. The bar only renders with a `title` or `meta`.
   */
  title?: ReactNode;
  /** Index before the title, in olive. Shown only when the bar renders (needs `title` or `meta`). A number is zero-padded ("1" → "01"); a string is shown as is. */
  index?: number | string;
  /** Content on the right of the bar. */
  meta?: ReactNode;
  /** Adds "+" marks on two corners. Use on one or two sheets per page. */
  crosshair?: boolean;
  /** Removes the body padding, for media, textures or tables. */
  flush?: boolean;
  /** Sheet content. */
  children?: ReactNode;
  /** Extra class names on the root element. */
  className?: string;
}

export type SheetProps = SheetOwnProps &
  Omit<React.ComponentPropsWithoutRef<"section">, keyof SheetOwnProps>;

/** The archive panel: a ruled frame with a mono bar (index, title, meta) over its content. */
export const Sheet = forwardRefAs<"section", SheetOwnProps>(function Sheet(
  {
    as: As = "section",
    title,
    index,
    meta,
    crosshair = false,
    flush = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const titleId = useId();
  const hasTitle = title != null && title !== false && title !== "";
  const hasMeta = meta != null && meta !== false && meta !== "";
  const hasIndex = index != null;
  const userNamed = rest["aria-label"] != null || rest["aria-labelledby"] != null;
  const labelledBy = hasTitle && !userNamed;
  const needsRole = labelledBy && typeof As === "string" && !LANDMARK_TAGS.has(As);

  return (
    <As
      ref={ref}
      className={cx("ol-sheet", crosshair && "ol-crosshair", flush && "ol-sheet--flush", className)}
      role={needsRole ? "region" : undefined}
      aria-labelledby={labelledBy ? titleId : undefined}
      {...rest}
    >
      {(hasTitle || hasMeta) && (
        <div className="ol-sheet__bar ol-label">
          <span id={hasTitle ? titleId : undefined}>
            {hasIndex && <b>{typeof index === "number" ? pad(index) : index}</b>}
            {hasIndex && hasTitle && (
              <>
                {" "}
                <span aria-hidden="true">—</span>{" "}
              </>
            )}
            {title}
          </span>
          {hasMeta && <span>{meta}</span>}
        </div>
      )}
      <div className="ol-sheet__body">{children}</div>
    </As>
  );
});
