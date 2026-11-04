import { useContext, useMemo } from "react";

import { LocaleTagContext, makeLabels, type OlivineLabels, useLabels } from "../../locale";

/** The words TimePicker writes or announces on its own. */
export type TimeLabels = Pick<
  OlivineLabels,
  "timeHour" | "timeMinute" | "timePeriod" | "timeChoose" | "timeEmpty" | "timeDone"
>;

/** The time words of the current locale, or of the `locale` prop when it names another one. */
export function useTimeLabels(locale?: string): TimeLabels {
  const context = useLabels();
  const rootTag = useContext(LocaleTagContext);
  return useMemo(() => {
    if (locale === undefined) return context;
    const own = makeLabels(locale);
    // Same built-in dictionary as the Root's: keep the Root's, which carries its overrides.
    return rootTag !== undefined && own === makeLabels(rootTag) ? context : own;
  }, [context, locale, rootTag]);
}
