import { cjkLanguage, graphemes } from "../../utils/script";

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
