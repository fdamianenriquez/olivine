import { forwardRef, Fragment, type HTMLAttributes, type ReactNode, useEffect } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

/** One mono-ruby unit: the base text and its reading. An empty reading leaves the base bare. */
export type RubyPair = readonly [base: string, reading: string];

export type RubySize = "body" | "kanji" | "display";

export type RubyReveal = "always" | "hover";

export interface RubyProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * Group ruby: the word the `reading` sits over. Use it when one reading belongs to the whole
   * word and cannot be split between its characters (jukujikun such as 今日 きょう).
   */
  base?: string;
  /** Group ruby: the kana reading for `base`. */
  reading?: string;
  /**
   * Mono ruby: `[base, reading]` per character, so each kanji keeps its own reading and a line
   * may break between them. The default choice for compounds. Wins over `base` and `reading`.
   */
  pairs?: readonly RubyPair[];
  /**
   * Latin reading stacked under the base in the label voice (never smaller than 11px), for
   * learners and for names a foreign reader must say aloud. Ignored when `vertical`.
   */
  romaji?: string;
  /**
   * `always` shows every reading. `hover` is learner mode: readings appear on hover or keyboard
   * focus, the word is focusable and marked with a dotted hairline. Readings stay in the DOM
   * either way, for screen readers and copy.
   * @default "always"
   */
  reveal?: RubyReveal;
  /**
   * Base text size: `body` 18px, `kanji` 24px, `display` 64px. Readings are half of it.
   * @default "body"
   */
  size?: RubySize;
  /** Tategaki: the text runs top to bottom and the readings sit on the right. */
  vertical?: boolean;
}

function renderUnit(base: string, reading: string | undefined, key: number): ReactNode {
  // A unit without a reading (okurigana, punctuation) stays plain text next to its siblings.
  if (!reading) return <Fragment key={key}>{base}</Fragment>;
  return (
    <ruby key={key} className="ol-ruby__unit">
      {base}
      <rp>(</rp>
      <rt>{reading}</rt>
      <rp>)</rp>
    </ruby>
  );
}

/**
 * Furigana over Japanese text, with an optional Latin reading under it. Built on the native
 * `<ruby>` element with `<rp>` fallbacks, so browsers without ruby support show `base(reading)`.
 */
export const Ruby = forwardRef<HTMLSpanElement, RubyProps>(function Ruby(
  {
    base,
    reading,
    pairs,
    romaji,
    reveal = "always",
    size = "body",
    vertical = false,
    className,
    ...rest
  },
  ref,
) {
  const empty = !pairs && base === undefined;
  useEffect(() => {
    if (empty) devWarn("Ruby", "pass `base` and `reading`, or `pairs`.");
  }, [empty]);

  const units = pairs
    ? pairs.map(([b, r], i) => renderUnit(b, r, i))
    : renderUnit(base ?? "", reading, 0);

  // The Latin reading is a flex stack under the base: a nested <ruby> with
  // `ruby-position: under` is drawn above the base by Chromium.
  const body =
    romaji && !vertical ? (
      <span className="ol-ruby__stack">
        <span className="ol-ruby__row">{units}</span>
        <span className="ol-ruby__romaji" lang="ja-Latn">
          <span className="ol-sr">(</span>
          {romaji}
          <span className="ol-sr">)</span>
        </span>
      </span>
    ) : (
      units
    );

  const learner = reveal === "hover";
  // Learner mode: the word takes focus so a keyboard reader can reveal its readings. The text
  // itself is read as plain content, so it needs no role.
  const focusProps = learner ? { tabIndex: 0 } : undefined;

  return (
    <span
      ref={ref}
      lang="ja"
      {...focusProps}
      {...rest}
      className={cx(
        "ol-ruby",
        `ol-ruby--${size}`,
        learner && "ol-ruby--reveal",
        vertical && "ol-ruby--vertical",
        className,
      )}
    >
      {body}
    </span>
  );
});
