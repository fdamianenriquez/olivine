import type { ReactNode } from "react";

import { matchesQuery } from "../../utils/matchesQuery";
import type { ListboxItemData, ListboxOptionData } from "../Listbox";

/** One choice of a Combobox. */
export interface ComboboxOption {
  /** Unique, stable value. */
  value: string;
  /** What the row and a chip show. May be a node; then give `textValue`. */
  label: ReactNode;
  /**
   * Plain text of the option: what the filter matches (besides a plain `label`) and what the
   * input shows when the label is not plain text. Add a kana or romaji reading for kanji labels.
   */
  textValue?: string | undefined;
  /** Shown but cannot be picked; arrows skip it. */
  disabled?: boolean | undefined;
}

/** A named run of options. Groups left empty by the filter are hidden. */
export interface ComboboxGroup {
  /** Heading of the group. */
  group: ReactNode;
  options: readonly (string | ComboboxOption)[];
}

/** One entry of `options`: a plain string (value and label), an option or a group. */
export type ComboboxItem = string | ComboboxOption | ComboboxGroup;

/** Matches one option against the query. `query` is never empty. */
export type ComboboxFilter = (option: ComboboxOption, query: string) => boolean;

/** Reserved value of the "Create …" row. */
export const CREATE_VALUE = "\u0000ol-combobox-create";

const toOption = (item: string | ComboboxOption): ComboboxOption =>
  typeof item === "string" ? { value: item, label: item } : item;

const isGroup = (item: ComboboxItem): item is ComboboxGroup =>
  typeof item === "object" && "group" in item;

/** Normalised items: options and groups of options. */
export type NormalItem = ComboboxOption | { group: ReactNode; options: ComboboxOption[] };

export function normalize(items: readonly ComboboxItem[]): NormalItem[] {
  return items.map((item) =>
    isGroup(item) ? { group: item.group, options: item.options.map(toOption) } : toOption(item),
  );
}

/** Every option, groups flattened, in list order. */
export function flatten(items: readonly NormalItem[]): ComboboxOption[] {
  return items.flatMap((item) => ("group" in item ? item.options : [item]));
}

/** The text an option is shown and matched by: a plain label, else `textValue`, else the value. */
export function textOf(option: ComboboxOption): string {
  const { label } = option;
  if (typeof label === "string" || typeof label === "number") return String(label);
  return option.textValue ?? option.value;
}

/** The built-in filter: the label and the `textValue` reading, folded (see `matchesQuery`). */
export function defaultFilter(option: ComboboxOption, query: string, lang = ""): boolean {
  if (matchesQuery(textOf(option), query, lang)) return true;
  return option.textValue !== undefined && matchesQuery(option.textValue, query, lang);
}

/** Whether two texts are the same once folded (case, accents, width, kana). */
export function sameText(a: string, b: string, lang = ""): boolean {
  if (a.trim() === "" || b.trim() === "") return a.trim() === b.trim();
  return matchesQuery(a, b, lang) && matchesQuery(b, a, lang);
}

/** Keeps the options `keep` accepts; groups with none left are dropped. */
export function filterItems(
  items: readonly NormalItem[],
  keep: (option: ComboboxOption) => boolean,
): NormalItem[] {
  const out: NormalItem[] = [];
  for (const item of items) {
    if ("group" in item) {
      const options = item.options.filter(keep);
      if (options.length > 0) out.push({ group: item.group, options });
    } else if (keep(item)) {
      out.push(item);
    }
  }
  return out;
}

const toData = (option: ComboboxOption): ListboxOptionData => ({
  value: option.value,
  label: option.label,
  textValue: option.textValue,
  disabled: option.disabled,
});

/** Converts to the Listbox renderer's data. */
export function toListboxItems(items: readonly NormalItem[]): ListboxItemData[] {
  return items.map((item) =>
    "group" in item ? { label: item.group, options: item.options.map(toData) } : toData(item),
  );
}
