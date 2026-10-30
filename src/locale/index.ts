import { createContext, useContext } from "react";

import { en } from "./en";
import { es } from "./es";
import { ja } from "./ja";
import type { LabelOverrides, LocaleName, OlivineLabels } from "./types";

export type { LabelOverrides, LocaleName, OlivineLabels } from "./types";

/** The built-in dictionaries, to copy or extend. */
export const locales: Readonly<Record<LocaleName, OlivineLabels>> = { en, es, ja };

function isLocaleName(value: string): value is LocaleName {
  return Object.hasOwn(locales, value);
}

/**
 * Resolves a locale to a dictionary and applies overrides. Accepts a built-in name, a regional
 * tag (`"es-MX"` → `es`) or a full dictionary; unknown names fall back to English.
 */
export function makeLabels(
  locale: LocaleName | (string & {}) | OlivineLabels = "en",
  labels?: LabelOverrides,
): OlivineLabels {
  let base: OlivineLabels;
  if (typeof locale === "object") {
    base = locale;
  } else {
    const name = isLocaleName(locale) ? locale : locale.split("-")[0];
    base = name !== undefined && isLocaleName(name) ? locales[name] : en;
  }
  if (!labels) return base;
  return {
    ...base,
    ...labels,
    tags: { ...base.tags, ...labels.tags },
    keys: { ...base.keys, ...labels.keys },
  };
}

export const LocaleContext = createContext<OlivineLabels>(en);

/** The current dictionary: the nearest `Root`'s, or English outside one. */
export function useLabels(): OlivineLabels {
  return useContext(LocaleContext);
}
