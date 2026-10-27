import { Children, forwardRef, isValidElement, type ReactNode, useEffect } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

export type BadgeTone =
  "neutral" | "solid" | "accent" | "olivo" | "info" | "success" | "warning" | "danger";

export interface BadgeProps extends React.ComponentPropsWithoutRef<"span"> {
  /**
   * Colour role. `neutral` is a hairline outline, `solid` an ink fill, `accent` a maple fill
   * with ink text, `olivo` the brand fill. `info`, `success`, `warning` and `danger` are status
   * tones and must always contain a word.
   * @default "neutral"
   */
  tone?: BadgeTone;
  /** Adds a small status dot before the content. Decorative; the text carries the meaning. */
  dot?: boolean;
  /**
   * Square numeric badge. A bare number reads as just "12" to assistive tech, so put context
   * words around it, either visible (for example "Inbox" next to it) or
   * in visually hidden text inside the badge: `<Badge count>12<span className="ol-sr"> unread</span></Badge>`.
   * `aria-label` is not announced on a plain span.
   */
  count?: boolean;
  /** Badge content. Status tones need at least one word. */
  children?: ReactNode;
}

const STATUS_TONES: readonly BadgeTone[] = ["info", "success", "warning", "danger"];

function hasWord(node: ReactNode): boolean {
  if (typeof node === "string") return /\p{L}/u.test(node);
  if (Array.isArray(node)) return Children.toArray(node).some(hasWord);
  if (isValidElement<{ children?: ReactNode }>(node)) return hasWord(node.props.children);
  return false;
}

/** A 22px tag in the label style for status and counts. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = "neutral", dot = false, count = false, className, children, ...rest },
  ref,
) {
  const isStatus = STATUS_TONES.includes(tone);
  const missingWord = isStatus && !hasWord(children);

  useEffect(() => {
    if (missingWord) {
      devWarn(
        "Badge",
        `the "${tone}" tone needs a word inside; colour must not carry meaning alone.`,
      );
    }
  }, [missingWord, tone]);

  return (
    <span
      ref={ref}
      className={cx(
        "ol-badge",
        tone !== "neutral" && `ol-badge--${tone}`,
        dot && "ol-badge--dot",
        count && "ol-badge--count",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
});
