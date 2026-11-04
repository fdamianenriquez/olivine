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

/** One user-perceived character, folded: NFKC, then katakana to hiragana. */
function foldChar(char: string): string {
  return char
    .normalize("NFKC")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function chars(text: string): string[] {
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

/** A ranked fuzzy match. */
export interface RankedMatch {
  /** Higher is better. Comparable only between matches of the same query. */
  score: number;
  /** Indices (in user-perceived characters of the original text) of the matched characters. */
  indices: number[];
}

const WORD_START = 8;
const TEXT_START = 4;
const RUN = 6;
const GAP = 1;
const MAX_GAP = 4;

const isBoundary = (char: string) => !/[\p{L}\p{N}]/u.test(char);

/**
 * Subsequence match of `query` in `text`: every typed character appears in order, not
 * necessarily side by side. Ignores case, accents, character width and the hiragana/katakana
 * difference, in the list's language. Ranked: the start of the text and of words first,
 * contiguous runs next, long gaps last. Whitespace in the query is ignored. An empty query
 * matches with score 0 and no indices; `null` means no match.
 */
export function rankMatch(text: string, query: string, lang = ""): RankedMatch | null {
  const needle = chars(query).filter((char) => char.trim() !== "");
  if (needle.length === 0) return { score: 0, indices: [] };
  const hay = chars(text);
  if (needle.length > hay.length) return null;
  const collator = collatorFor(lang);
  const folded = hay.map(foldChar);
  const target = needle.map(foldChar);
  const same = (i: number, j: number) => collator.compare(folded[i] ?? "", target[j] ?? "") === 0;
  const base = (i: number) =>
    1 + (i === 0 ? WORD_START + TEXT_START : isBoundary(hay[i - 1] ?? "") ? WORD_START : 0);

  // best[j][i]: best score with needle[j] matched at hay[i]; from[j][i]: the previous match.
  const best: number[][] = [];
  const from: number[][] = [];
  for (let j = 0; j < target.length; j++) {
    const row = new Array<number>(hay.length).fill(-Infinity);
    const back = new Array<number>(hay.length).fill(-1);
    for (let i = j; i < hay.length; i++) {
      if (!same(i, j)) continue;
      if (j === 0) {
        row[i] = base(i);
        continue;
      }
      const prev = best[j - 1] ?? [];
      for (let k = j - 1; k < i; k++) {
        const before = prev[k] ?? -Infinity;
        if (before === -Infinity) continue;
        const link = k === i - 1 ? RUN : -GAP * Math.min(i - k - 1, MAX_GAP);
        const score = before + base(i) + link;
        if (score > (row[i] ?? -Infinity)) {
          row[i] = score;
          back[i] = k;
        }
      }
    }
    best.push(row);
    from.push(back);
  }

  const last = best[target.length - 1] ?? [];
  let end = -1;
  let top = -Infinity;
  last.forEach((score, i) => {
    if (score > top) {
      top = score;
      end = i;
    }
  });
  if (end < 0) return null;
  const indices: number[] = [];
  for (let j = target.length - 1, i = end; j >= 0; j--) {
    indices.unshift(i);
    i = from[j]?.[i] ?? -1;
  }
  // A shorter text is the closer match when the letters are the same.
  return { score: top - hay.length / 1000, indices };
}
