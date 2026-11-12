/**
 * Whether an element is laid out right-to-left, by the same rule the stylesheets use
 * (`:dir(rtl)`), so key handling, swipe edges and arrow glyphs never disagree. Read at event time.
 * Where `:dir()` is unsupported, the computed `direction` and then the nearest `dir` attribute
 * stand in (a `dir` subtree or `Root` wins over `<html>`; `Portal` copies the attribute).
 */
export function isRtl(from: Element | EventTarget | null): boolean {
  const element = from instanceof Element ? from : document.documentElement;
  try {
    return element.matches(":dir(rtl)");
  } catch {
    if (getComputedStyle(element).direction === "rtl") return true;
    return element.closest("[dir]")?.getAttribute("dir") === "rtl";
  }
}
