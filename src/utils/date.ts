// Shared Intl helpers: the tag mapping and a cached DateTimeFormat. Components that format dates
// (Calendar, Timeline) import from here instead of from one another.

/** Intl tags of the built-in locales: `es` follows CLDR's default (Monday first). */
const BUILT_IN_TAGS: Readonly<Record<string, string>> = { en: "en-US", es: "es", ja: "ja-JP" };

/** Resolves a built-in name (`"en"`, `"es"`, `"ja"`) or any BCP 47 tag to an `Intl` tag. */
export function intlTag(locale: string): string {
  return BUILT_IN_TAGS[locale] ?? locale;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlTag(locale), options);
    formatters.set(key, f);
  }
  return f;
}
