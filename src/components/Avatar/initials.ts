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

function upper(text: string, lang: string | undefined): string {
  if (lang) {
    try {
      return text.toLocaleUpperCase(lang);
    } catch {
      // An invalid language tag: fall through to the locale-free mapping.
    }
  }
  return text.toUpperCase();
}

export interface Initials {
  /** The initials to draw. */
  text: string;
  /** Set when the initials are Han, kana or Hangul: the language to tag them with. */
  cjk?: "ja" | "ko";
}

/**
 * Initials from a name, taken by grapheme and never through `text-transform`.
 * Latin and other cased scripts: the first letter of the first and last word (one word gives one
 * letter), upper-cased with `lang` when given (Turkish `i` → `İ`), else without a locale so the
 * server and the browser agree. Han, kana and Hangul: the first character of the first word only
 * ("田中 太郎" → "田").
 */
export function deriveInitials(name: string, lang?: string): Initials {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const firstWord = words[0];
  if (firstWord === undefined) return { text: "" };
  const first = graphemes(firstWord)[0] ?? "";
  const cjk = cjkLanguage(first);
  if (cjk) return { text: first, cjk };
  const lastWord = words.length > 1 ? words[words.length - 1] : undefined;
  const last = lastWord === undefined ? "" : (graphemes(lastWord)[0] ?? "");
  return { text: upper(first + last, lang) };
}
