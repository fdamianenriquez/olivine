import { type CSSProperties, forwardRef, type HTMLAttributes, useEffect } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

export interface RatioProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Aspect ratio as `"width/height"`, for example `"16/9"`, `"4/3"` or `"1/1"`. Both parts
   * must be positive numbers.
   * @default "16/9"
   */
  ratio?: string;
}

const RATIO_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/;

function isValidRatio(ratio: string): boolean {
  const match = RATIO_PATTERN.exec(ratio);
  return match !== null && Number(match[1]) > 0 && Number(match[2]) > 0;
}

/**
 * Holds media or embeds at a fixed aspect ratio; its child fills and covers.
 *
 * For media and embeds only. The child is cropped (`overflow: hidden` and `object-fit: cover`),
 * so do not put text, captions or controls inside. Pick a ratio close to the media's own and use
 * `object-position` for focal points. Keep essential information in `alt` or in the surrounding
 * HTML. Ratio adds no accessible name: every `iframe`, `video` or `object` needs a `title` or
 * `aria-label`.
 */
export const Ratio = forwardRef<HTMLDivElement, RatioProps>(function Ratio(
  { ratio = "16/9", className, style, children, ...rest },
  ref,
) {
  const valid = isValidRatio(ratio);

  useEffect(() => {
    if (!valid)
      devWarn(
        "Ratio",
        `invalid ratio "${ratio}"; expected "width/height", e.g. "16/9". Using 16 / 9.`,
      );
  }, [valid, ratio]);

  const value = valid ? ratio.replace(/\s*\/\s*/, " / ").trim() : "16 / 9";
  const rootStyle = { "--ol-ratio": value, ...style } as CSSProperties;

  return (
    <div ref={ref} className={cx("ol-ratio", className)} style={rootStyle} {...rest}>
      {children}
    </div>
  );
});
