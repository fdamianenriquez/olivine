import {
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { Text, type TextVariant } from "../Text";

export type EmptyStateVariant = "no-data" | "no-results" | "error";
export type EmptyStateSize = "s" | "m" | "l";
export type EmptyStateAlign = "start" | "center";
export type EmptyStateAnnounce = "polite" | "assertive";
export type EmptyStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * Chooses the default title and description from the locale. All three look the same: the
   * variant changes copy only, never colour.
   * @default "no-data"
   */
  variant?: EmptyStateVariant;
  /** The heading. Defaults to the variant's locale title. Always rendered as a heading. */
  title?: ReactNode;
  /**
   * One or two sentences in muted body text. `undefined` uses the variant's default (none for
   * `no-data`); `null` shows none.
   */
  description?: ReactNode;
  /**
   * A decorative mark above the title: a glyph, a kanji in `Text variant="kanji"`, a `Seal`, or
   * an image or SVG up to 120px high. It is hidden from assistive technology, so never put the
   * only label in it.
   */
  media?: ReactNode;
  /** One `Button` or link. Keep to one; a second route is a link inside the description. */
  action?: ReactNode;
  /**
   * The heading element. It does not change the look; set it from the page outline.
   * @default 2
   */
  headingLevel?: EmptyStateHeadingLevel;
  /**
   * `s` for cards, table bodies, popups and side panels; `m` for a region; `l` for a full page
   * or main panel.
   * @default "m"
   */
  size?: EmptyStateSize;
  /** @default "start" */
  align?: EmptyStateAlign;
  /** Draws one hairline box around it. */
  framed?: boolean;
  /**
   * Adds a visually hidden live region with the title and description. Use `polite` when the
   * empty state appears after a search, filter or deletion, and `assertive` only for a failure
   * the reader must hear now. Leave it off when the page simply loads this way.
   */
  announce?: EmptyStateAnnounce | undefined;
  /** Replaces the announced text when the title or description is not plain text. */
  announcement?: string;
}

const HEADING = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

const TITLE_STYLE: Record<EmptyStateSize, TextVariant> = { s: "h3", m: "h2", l: "h1" };
const TEXT_STYLE: Record<EmptyStateSize, TextVariant> = {
  s: "body-s",
  m: "body",
  l: "body-l",
};

/** The plain text of a node: strings and numbers, through arrays, fragments and elements. */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function isShown(node: ReactNode): boolean {
  return node !== null && node !== undefined && node !== false && node !== "";
}

/**
 * The message that replaces a region with nothing to show: a title that says what is missing, an
 * optional line of explanation, an optional decorative mark and at most one action.
 *
 * It is silent by default and never moves focus: move focus yourself in the handler that removes
 * it. Render it instead of the list, table or panel, not under an empty header.
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    variant = "no-data",
    title,
    description,
    media,
    action,
    headingLevel = 2,
    size = "m",
    align = "start",
    framed = false,
    announce,
    announcement,
    className,
    ...rest
  },
  ref,
) {
  const t = useLabels();

  const defaults: Record<EmptyStateVariant, { title: string; text?: string }> = {
    "no-data": { title: t.emptyNoDataTitle },
    "no-results": { title: t.emptyNoResultsTitle, text: t.emptyNoResultsText },
    error: { title: t.emptyErrorTitle, text: t.emptyErrorText },
  };
  const shownTitle = title ?? defaults[variant].title;
  const shownText = description === undefined ? defaults[variant].text : description;
  const hasText = isShown(shownText);

  // The live region is mounted empty and filled after mount: screen readers often miss a region
  // that is added already filled. The visible body is never a live region itself.
  const message = announce
    ? (announcement ??
      [textOf(shownTitle), hasText ? textOf(shownText) : ""].filter(Boolean).join(" "))
    : "";
  const [live, setLive] = useState("");
  useEffect(() => {
    setLive(message);
  }, [message]);

  return (
    <div
      ref={ref}
      className={cx(
        "ol-empty-state",
        size !== "m" && `ol-empty-state--${size}`,
        align === "center" && "ol-empty-state--center",
        framed && "ol-empty-state--framed",
        className,
      )}
      data-variant={variant}
      {...rest}
    >
      {isShown(media) && (
        <div className="ol-empty-state__media" aria-hidden="true">
          {media}
        </div>
      )}
      <div className="ol-empty-state__body">
        <Text
          as={HEADING[headingLevel]}
          variant={TITLE_STYLE[size]}
          className="ol-empty-state__title"
        >
          {shownTitle}
        </Text>
        {hasText && (
          <Text as="div" variant={TEXT_STYLE[size]} tone="muted" className="ol-empty-state__text">
            {shownText}
          </Text>
        )}
      </div>
      {isShown(action) && <div className="ol-empty-state__action">{action}</div>}
      {announce && (
        <span
          className="ol-empty-state__live ol-sr"
          role={announce === "assertive" ? "alert" : "status"}
          aria-atomic="true"
        >
          {live}
        </span>
      )}
    </div>
  );
});
