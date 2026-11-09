/** Han, kana and Hangul: names in these scripts are written family name first. */
const CJK = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const HANGUL = /^\p{Script=Hangul}/u;

interface GraphemeSegmenter {
  segment: (text: string) => Iterable<{ segment: string }>;
}

let segmenter: GraphemeSegmenter | null | undefined;

function getSegmenter(): GraphemeSegmenter | null {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  return segmenter;
}

/**
 * Splits text into user-perceived characters, so an astral kanji (𠮷), a letter with a combining
 * mark or a kanji with a variation selector stays whole. Falls back to code points.
 */
export function graphemes(text: string): string[] {
  const seg = getSegmenter();
  return seg ? Array.from(seg.segment(text), (s) => s.segment) : Array.from(text);
}

/** The language to tag CJK text with ("ja" for Han and kana, "ko" for Hangul), else undefined. */
export function cjkLanguage(text: string): "ja" | "ko" | undefined {
  const first = graphemes(text.trim())[0] ?? "";
  if (!CJK.test(first)) return undefined;
  return HANGUL.test(first) ? "ko" : "ja";
}
