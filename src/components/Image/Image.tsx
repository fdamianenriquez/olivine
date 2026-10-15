import { forwardRef, type ImgHTMLAttributes, useEffect } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Text alternative. Required: describe meaningful images, and pass `alt=""` for purely
   * decorative ones so assistive technology skips them.
   */
  alt: string;
  /**
   * Adds an ink frame with a paper mat around the image.
   * @default false
   */
  framed?: boolean;
  /**
   * Shows the image in grayscale until it is hovered, or until a linking parent has focus.
   * Never rely on colour alone to convey information.
   * @default false
   */
  mono?: boolean;
}

/**
 * A responsive `<img>`: it never exceeds its container and keeps its aspect ratio.
 *
 * Grayscale (`mono`) is decoration only: the information in the image must be available in
 * `alt` or the surrounding text, not in its colour. Inside a link, the colour returns on hover
 * and on keyboard focus of the link.
 */
export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { framed = false, mono = false, className, alt, ...rest },
  ref,
) {
  // Runtime guard for untyped callers; the type already requires `alt`.
  const missingAlt = (alt as string | undefined) === undefined;

  useEffect(() => {
    if (missingAlt)
      devWarn("Image", 'missing "alt". Describe the image, or pass alt="" if it is decorative.');
  }, [missingAlt]);

  return (
    <img
      ref={ref}
      alt={alt}
      className={cx("ol-img", framed && "ol-img--framed", mono && "ol-img--mono", className)}
      {...rest}
    />
  );
});
