import { type CSSProperties, forwardRef, type HTMLAttributes } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";

export interface PlaceholderProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * `text` draws bars one text line tall; `block` draws one box that fills its container
   * (at least the skeleton minimum height).
   * @default "text"
   */
  shape?: "text" | "block";
  /**
   * Number of text bars (`text` only). When there is more than one, the last bar is shorter.
   * @default 1
   */
  lines?: number;
  /** Width of the placeholder. A number is read as pixels; a string is any CSS length. */
  width?: number | string;
  /** Height of the placeholder. A number is read as pixels; a string is any CSS length. */
  height?: number | string;
  /**
   * Adds the stepped sweep. It is switched off under `prefers-reduced-motion`.
   * @default true
   */
  wave?: boolean;
  /**
   * Renders a visually hidden "Loading" for assistive technology, in the active locale. Pass
   * `true` for the built-in word or a string to replace it. Leave it off when the surrounding
   * region already announces the loading state.
   */
  label?: boolean | string;
}

function toLength(value: number | string | undefined): string | undefined {
  return typeof value === "number" ? `${String(value)}px` : value;
}

/**
 * Paper-2 skeleton bars and blocks shown while content loads.
 *
 * The bars are decorative and hidden from assistive technology. Announce the loading state on
 * the region being filled: set `aria-busy="true"` on the container while loading and remove it
 * when the content arrives. For a skeleton that stands alone, pass `label` so a screen reader
 * hears the word "Loading".
 */
export const Placeholder = forwardRef<HTMLSpanElement, PlaceholderProps>(function Placeholder(
  { shape = "text", lines = 1, width, height, wave = true, label, className, style, ...rest },
  ref,
) {
  const t = useLabels();
  const count = shape === "text" ? Math.max(1, Math.floor(lines) || 1) : 1;
  const vars = {
    "--ol-ph-width": toLength(width),
    "--ol-ph-height": toLength(height),
    ...style,
  } as CSSProperties;
  const text = typeof label === "string" ? label : label ? t.loading : undefined;

  return (
    <span
      ref={ref}
      className={cx("ol-ph", `ol-ph--${shape}`, wave && "ol-ph--wave", className)}
      data-shape={shape}
      data-wave={wave ? "true" : "false"}
      style={vars}
      {...rest}
    >
      {Array.from({ length: count }, (_, k) => (
        <span
          key={k}
          aria-hidden="true"
          className={cx("ol-ph__bar", k === count - 1 && count > 1 && "ol-ph__bar--last")}
        />
      ))}
      {text && <span className="ol-sr">{text}</span>}
    </span>
  );
});
