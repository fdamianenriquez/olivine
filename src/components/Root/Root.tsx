import { createContext, type ElementType, useContext, useMemo } from "react";

import {
  type LabelOverrides,
  LocaleContext,
  type LocaleName,
  locales,
  makeLabels,
  type OlivineLabels,
} from "../../locale";
import { cx } from "../../utils/cx";
import { forwardRefAs, type PolymorphicProps } from "../../utils/polymorphic";
import { KbdPlatformContext, type KbdPlatformSetting } from "../Kbd/useKbdPlatform";

/** Own props of {@link Root}. */
export interface RootOwnProps {
  /**
   * Sets `data-theme`: `washi` (cream), `sumi` (ebony) or `auto` (follows the system's
   * `prefers-color-scheme`). Omit to inherit from an ancestor or `<html>`.
   */
  theme?: "washi" | "sumi" | "auto";
  /**
   * Built-in language (`"en"`, `"es"`, `"ja"`, or a regional tag such as `"es-MX"`) or a full
   * dictionary. Omit it to inherit the parent Root's dictionary (English outside any Root).
   */
  locale?: LocaleName | (string & {}) | OlivineLabels;
  /**
   * Partial overrides applied on top of the chosen dictionary (or the parent Root's when
   * `locale` is omitted). Pass a stable object (memoised or module-level): a new object on
   * every render re-creates the context value.
   */
  labels?: LabelOverrides;
  /**
   * Keyboard the shortcuts in Kbd are drawn for: `apple` (⌘ ⌥), `other` (Ctrl Alt) or `auto`
   * (detected in the browser). Set it when the server knows the platform, so server-rendered
   * shortcuts don't change after hydration. Omit it to inherit.
   */
  platform?: KbdPlatformSetting;
}

export type RootProps<E extends ElementType = "div"> = PolymorphicProps<E, RootOwnProps>;

/** True inside a Root: only the outermost one renders the shared SVG definitions. */
const InsideRoot = createContext(false);

/**
 * Rough edges of `.ol-stamp` seals (`filter: url("#ol-stamp-edge")`), rendered once and never
 * injected at runtime.
 */
function StampFilter() {
  return (
    <svg className="ol-root__defs" width="0" height="0" aria-hidden="true" focusable="false">
      <filter id="ol-stamp-edge" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={11} result="n" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="n"
          scale={3.4}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

function isBuiltIn(locale: string): boolean {
  return Object.hasOwn(locales, locale) || Object.hasOwn(locales, locale.split("-")[0] ?? "");
}

const RootBase = forwardRefAs<"div", RootOwnProps>(function Root(
  { as: As = "div", theme, locale, labels, platform, className, children, ...rest },
  ref,
) {
  const parent = useContext(LocaleContext);
  const nested = useContext(InsideRoot);
  const dictionary = useMemo(() => {
    if (locale === undefined) return labels ? makeLabels(parent, labels) : parent;
    return makeLabels(locale, labels);
  }, [parent, locale, labels]);
  const lang = typeof locale === "string" && isBuiltIn(locale) ? locale : undefined;
  const content = (
    <LocaleContext.Provider value={dictionary}>
      <InsideRoot.Provider value>
        <As
          ref={ref}
          className={cx("ol", className as string | undefined)}
          data-theme={theme}
          lang={lang}
          {...rest}
        >
          {nested ? null : <StampFilter />}
          {children}
        </As>
      </InsideRoot.Provider>
    </LocaleContext.Provider>
  );
  return platform === undefined ? (
    content
  ) : (
    <KbdPlatformContext.Provider value={platform}>{content}</KbdPlatformContext.Provider>
  );
});

/**
 * Sets the Olivine ground, fonts and focus ring, and the language of every built-in label.
 * Wrap the app in exactly one; nest another with `theme` only for an inverted island.
 *
 * Do put `theme` on `<html data-theme>` for whole-app theming. Props passed to a component
 * always win over the locale.
 */
export const Root = Object.assign(RootBase, { locales });
