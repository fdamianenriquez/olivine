import { type KeyboardEvent, useCallback, useEffect, useRef } from "react";

export interface TypeaheadOptions {
  /**
   * Pause in ms after which the typed text starts over.
   * @default 500
   */
  timeout?: number;
}

export interface Typeahead {
  /**
   * Handles a printable key: adds it to the typed text and returns the item to focus (`null`
   * when nothing matches). Returns `undefined` when the key is not for typeahead (modifiers,
   * IME composition, a Space that starts the text), so the caller can handle it.
   */
  onKeyDown: (
    event: KeyboardEvent,
    items: readonly HTMLElement[],
    current: HTMLElement | null,
    textOf: (item: HTMLElement) => string,
  ) => HTMLElement | null | undefined;
  /** Forgets the typed text (call it when the list closes). */
  reset: () => void;
}

const collators = new Map<string, Intl.Collator>();

/** A base-sensitivity collator: "a" finds "Árbol", case and accents are ignored. */
function collatorFor(lang: string): Intl.Collator {
  let collator = collators.get(lang);
  if (!collator) {
    collator = new Intl.Collator(lang || undefined, { sensitivity: "base", usage: "search" });
    collators.set(lang, collator);
  }
  return collator;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** User-perceived characters, so a kana with a dakuten or an emoji counts as one. */
function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

function startsWith(collator: Intl.Collator, text: string, prefix: string): boolean {
  const head = graphemes(text.normalize("NFC")).slice(0, graphemes(prefix).length).join("");
  return collator.compare(head, prefix) === 0;
}

/**
 * Typeahead over a list of items found in the DOM: typing moves to the next item whose text
 * starts with what was typed. A repeated single character cycles through the matches; a longer
 * prefix keeps the current item while it still matches. Comparison follows the language of the
 * list (`lang`), ignoring case and accents. Shared by menus and listboxes.
 */
export function useTypeahead({ timeout = 500 }: TypeaheadOptions = {}): Typeahead {
  const typed = useRef("");
  const timer = useRef<number | undefined>(undefined);

  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    typed.current = "";
  }, []);

  useEffect(() => reset, [reset]);

  const onKeyDown: Typeahead["onKeyDown"] = (event, items, current, textOf) => {
    const { key } = event;
    if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
    if (event.nativeEvent.isComposing || key === "Process" || graphemes(key).length !== 1) {
      return undefined;
    }
    if (key === " " && typed.current === "") return undefined;
    event.preventDefault();
    window.clearTimeout(timer.current);
    typed.current += key.normalize("NFC");
    timer.current = window.setTimeout(() => {
      typed.current = "";
    }, timeout);

    const text = typed.current;
    const chars = graphemes(text);
    const cycle = chars.every((c) => c === chars[0]);
    const needle = cycle ? (chars[0] ?? "") : text;
    const lang =
      (current ?? items[0])?.closest("[lang]")?.getAttribute("lang") ??
      document.documentElement.lang;
    const collator = collatorFor(lang);
    const index = current ? items.indexOf(current) : -1;
    // Cycling starts after the current item; a longer prefix may stay on it.
    const ordered = cycle
      ? [...items.slice(index + 1), ...items.slice(0, index + 1)]
      : [...items.slice(Math.max(index, 0)), ...items.slice(0, Math.max(index, 0))];
    return ordered.find((item) => startsWith(collator, textOf(item).trim(), needle)) ?? null;
  };

  return { onKeyDown, reset };
}
