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
    avatarStatus: { ...base.avatarStatus, ...labels.avatarStatus },
    themes: { ...base.themes, ...labels.themes },
    meter: { ...base.meter, ...labels.meter },
    banner: { ...base.banner, ...labels.banner },
    alertDialog: { ...base.alertDialog, ...labels.alertDialog },
    offcanvas: { ...base.offcanvas, ...labels.offcanvas },
  };
}

export const LocaleContext = createContext<OlivineLabels>(en);

/** The BCP 47 tag of the nearest `Root` that names its locale with a string. */
export const LocaleTagContext = createContext<string | undefined>(undefined);

/**
 * The language tag numbers and dates are formatted with: `own` when given (a component's
 * `locale` prop), else the nearest `Root`'s string `locale` (a regional tag such as `"es-MX"`
 * is kept, so es-ES and es-MX format differently), else `"en"`.
 */
export function useLocaleTag(own?: string): string {
  const tag = useContext(LocaleTagContext);
  return own ?? tag ?? "en";
}

/** The current dictionary: the nearest `Root`'s, or English outside one. */
export function useLabels(): OlivineLabels {
  return useContext(LocaleContext);
}
