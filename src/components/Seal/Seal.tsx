import { type ComponentPropsWithoutRef, forwardRef, useCallback, useEffect, useMemo } from "react";

import { useLocaleTag } from "../../locale";
import { useEntrance } from "../../motion";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { cjkLanguage, graphemes } from "../../utils/script";

export type SealVariant = "shubun" | "hakubun";
export type SealInk = "ink" | "shu" | "olivo";
export type SealShape = "default" | "vertical" | "square" | "round";

export interface SealProps extends Omit<
  ComponentPropsWithoutRef<"span">,
  "children" | "role" | "aria-label" | "aria-hidden"
> {
  /**
   * The seal text: one to three words in Latin script (shown in capitals by the class), or one to
   * four kanji or kana. A string, so the seal can check its script and length; nested elements
   * are not supported.
   */
  children: string;
  /**
   * `shubun`: ink characters in a frame. `hakubun`: a solid ink block with the characters knocked
   * out in paper.
   * @default "shubun"
   */
  variant?: SealVariant;
  /**
   * Seal colour. `shu` (seal vermilion) is decorative: never a status colour and never for
   * running text.
   * @default "ink"
   */
  ink?: SealInk;
  /**
   * `vertical`: one column (kanji, one to four). `square`: 2 × 2, read in columns right to left
   * (three or four kanji). `round`: a round seal for one or two characters.
   * @default "default"
   */
  shape?: SealShape;
  /**
   * Rotated -4°, as stamped by hand.
   * @default false
   */
  tilt?: boolean;
  /**
   * Plays the hanko motion once. `true`: when the seal first appears. `"view"`: when it first
   * scrolls into view. Switching `false` to `true` on a mounted seal plays it on demand. Use it on
   * one or two seals per view, never in a list. Under reduced motion the end state shows at once.
   * @default false
   */
  press?: boolean | "view";
  /**
   * The accessible name. Needed for kanji and kana (a development warning without it). Makes the
   * seal an image named by `label`: the characters are not announced. Give the meaning, for
   * example "Inspected" for 検品.
   */
  label?: string;
  /**
   * Hides the seal from assistive technology. Only when the same information is next to it as
   * real text. Wins over `label`.
   * @default false
   */
  decorative?: boolean;
  /**
   * The language of the seal text. Defaults to `"ja"` for kanji and kana. For Latin text it is
   * inherited, except under a Japanese Root, where the seal sets `"en"` so the Latin face is kept
   * instead of the kanji face. Hangul is tagged `"ko"` and is not supported (a development
   * warning). The accessible `label` takes this language too.
   */
  lang?: string;
}

const LATIN = /\p{Script=Latin}/u;
const KANJI_OR_KANA = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/**
 * A tenkoku seal for a short title or mark: the `.ol-stamp` class as a component. It stays real
 * text (selectable, read by screen readers); with `label` it is an image with a text alternative,
 * which kanji needs. A seal is not interactive and not a status: wrap it in a Button or Link to
 * act, and keep the status word next to it. Rough edges come from the filter that `Root` renders.
 */
export const Seal = forwardRef<HTMLSpanElement, SealProps>(function Seal(
  {
    children,
    variant = "shubun",
    ink = "ink",
    shape = "default",
    tilt = false,
    press = false,
    label,
    decorative = false,
    lang: langProp,
    className,
    ...rest
  },
  ref,
) {
  const localeTag = useLocaleTag();
  const { setElement } = useEntrance<HTMLSpanElement>();
  const view = press === "view";

  // The hold until the seal is in view is only wanted for press="view": the element is handed to
  // the entrance hook then, and withdrawn otherwise. A new callback makes React re-attach the ref.
  const setRef = useCallback(
    (node: HTMLSpanElement | null) => {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLSpanElement | null }).current = node;
      setElement(view ? node : null);
    },
    [ref, setElement, view],
  );

  const text = children;
  const info = useMemo(() => {
    const trimmed = text.trim();
    const characters = graphemes(trimmed.replaceAll(/\s+/g, "")).length;
    return {
      cjk: cjkLanguage(trimmed),
      kanji: KANJI_OR_KANA.test(trimmed),
      mixed: KANJI_OR_KANA.test(trimmed) && LATIN.test(trimmed),
      characters,
      words: trimmed === "" ? 0 : trimmed.split(/\s+/).length,
    };
  }, [text]);

  const named = label !== undefined && label !== "";
  const needsLabel = info.kanji && !named && !decorative;

  useEffect(() => {
    if (needsLabel)
      devWarn(
        "Seal",
        "a seal with kanji needs `label`, or `decorative` when the text is beside it.",
      );
    if (named && decorative)
      devWarn("Seal", "`label` and `decorative` together: `decorative` wins.");
    if (info.cjk === "ko") devWarn("Seal", "Hangul seals are not supported: only kanji and Latin.");
    if (shape === "square" && (info.characters < 3 || info.characters > 4))
      devWarn("Seal", 'shape "square" holds three or four kanji.');
    if (shape === "vertical" && info.characters > 4)
      devWarn("Seal", 'shape "vertical" holds four characters at most.');
    if (shape === "round" && info.characters > 2)
      devWarn("Seal", 'shape "round" holds one or two characters.');
    if (info.mixed) devWarn("Seal", "mixed scripts: keep Latin and kanji in separate seals.");
    if (!info.kanji && info.words > 3) devWarn("Seal", "a seal holds three words at most.");
  }, [needsLabel, named, decorative, info, shape]);

  // The class keys the kanji face off :lang(ja), which Latin text inside a Japanese tree would
  // also match by inheritance: give it an explicit non-Japanese language there.
  const lang =
    langProp ?? info.cjk ?? (localeTag.toLowerCase().split("-")[0] === "ja" ? "en" : undefined);

  const asImage = named && !decorative;

  return (
    <span
      {...rest}
      role={asImage ? "img" : undefined}
      aria-label={asImage ? label : undefined}
      aria-hidden={decorative ? true : undefined}
      ref={setRef}
      lang={lang}
      className={cx(
        "ol-stamp",
        variant === "hakubun" && "ol-stamp--negative",
        ink !== "ink" && `ol-stamp--${ink}`,
        shape !== "default" && `ol-stamp--${shape}`,
        tilt && "ol-stamp--tilt",
        press !== false && "ol-stamp--press",
        className,
      )}
    >
      {children}
    </span>
  );
});
