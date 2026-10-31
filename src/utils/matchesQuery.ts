const collators = new Map<string, Intl.Collator>();
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function collatorFor(lang: string): Intl.Collator {
  let collator = collators.get(lang);
  if (!collator) {
    collator = new Intl.Collator(lang || undefined, { sensitivity: "base", usage: "search" });
    collators.set(lang, collator);
  }
  return collator;
}

/** NFKC (full-width Latin and half-width kana fold), then katakana folded to hiragana. */
function fold(text: string): string[] {
  const folded = text
    .normalize("NFKC")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return Array.from(segmenter.segment(folded), ({ segment }) => segment);
}

/**
 * Whether `text` contains `query`, ignoring case, accents, character width and the
 * hiragana/katakana difference, compared by user-perceived character in the list's language.
 * An empty query matches everything. Shared by Combobox, SearchField and CommandPalette.
 */
export function matchesQuery(text: string, query: string, lang = ""): boolean {
  const needle = fold(query.trim());
  if (needle.length === 0) return true;
  const hay = fold(text);
  const collator = collatorFor(lang);
  const target = needle.join("");
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (collator.compare(hay.slice(i, i + needle.length).join(""), target) === 0) return true;
  }
  return false;
}
