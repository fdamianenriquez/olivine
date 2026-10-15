import { type ElementType, type ReactNode, useEffect } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { forwardRefAs } from "../../utils/polymorphic";

export type TextVariant =
  | "display-xl"
  | "display-l"
  | "display-m"
  | "h1"
  | "h2"
  | "h3"
  | "figure-xl"
  | "figure-l"
  | "figure-m"
  | "body-l"
  | "body"
  | "body-s"
  | "mono"
  | "kanji";

export interface TextOwnProps {
  /**
   * Type style; maps 1:1 to the type styles in the design tokens. The `figure-*`
   * styles are for digits and symbols only.
   * @default "body"
   *
   * `display-xl`, `display-l` and `h1` all render an `<h1>` by default. Use `as` to set the
   * heading level that keeps the page outline correct (one `<h1>` per page).
   */
  variant?: TextVariant;
  /**
   * Colour tone: `muted` (secondary ink) or `accent` (olivo). Default is primary ink.
   * `accent` reaches only 4.2:1 on `paper-2` in washi, so use it there for large or bold text only.
   */
  tone?: "muted" | "accent";
  /**
   * Sets the text in a vertical writing mode (upright, right to left); overrides the kanji
   * tracking. Put `lang="ja"` on the element and give its container a block size.
   */
  vertical?: boolean;
  /** Content. */
  children?: ReactNode;
  /** Extra class names for the root element. */
  className?: string;
}

const TAG: Record<TextVariant, ElementType> = {
  "display-xl": "h1",
  "display-l": "h1",
  "display-m": "h2",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  "body-l": "p",
  body: "p",
  "body-s": "p",
  mono: "code",
  kanji: "span",
  "figure-xl": "span",
  "figure-l": "span",
  "figure-m": "span",
};

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

/** Typography: renders one of the type styles. Figure variants are for numbers only. */
export const Text = forwardRefAs<"p", TextOwnProps>(function Text(
  { variant = "body", tone, vertical, as, className, children, ...rest },
  ref,
) {
  const As: ElementType = as ?? TAG[variant];
  const isFigure = variant.startsWith("figure-");
  const hasLetters = isFigure && /\p{L}/u.test(textOf(children));

  useEffect(() => {
    if (hasLetters) {
      devWarn("Text", `"${variant}" is for digits and symbols only; use a word style for letters.`);
    }
  }, [hasLetters, variant]);

  return (
    <As
      ref={ref}
      className={cx(
        "ol-text",
        `ol-text--${variant}`,
        tone && `ol-text--${tone}`,
        vertical && "ol-text--vertical",
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
});
