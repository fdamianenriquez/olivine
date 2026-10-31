import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { LocaleContext, locales, LocaleTagContext, makeLabels, useLabels, useLocaleTag } from ".";

describe("makeLabels", () => {
  it("defaults to English", () => {
    expect(makeLabels()).toBe(locales.en);
  });

  it("resolves built-in and regional locale names", () => {
    expect(makeLabels("ja")).toBe(locales.ja);
    expect(makeLabels("es-MX")).toBe(locales.es);
  });

  it("falls back to English for unknown locales", () => {
    expect(makeLabels("fr")).toBe(locales.en);
  });

  it("accepts a full dictionary", () => {
    const custom = { ...locales.en, close: "Shut" };
    expect(makeLabels(custom).close).toBe("Shut");
  });

  it("applies overrides and merges tags one level deep", () => {
    const labels = makeLabels("es", { close: "Salir", tags: { warning: "Ojo" } });
    expect(labels.close).toBe("Salir");
    expect(labels.tags.warning).toBe("Ojo");
    expect(labels.tags.danger).toBe("Error");
    expect(labels.dismiss).toBe("Descartar");
  });

  it("formats numbers in each language's word order", () => {
    expect(locales.en.slideOf(2, 5)).toBe("2 of 5");
    expect(locales.es.page(3)).toBe("Página 3");
    expect(locales.ja.slideOf(2, 5)).toBe("5枚中2枚目");
  });

  it("formats pages and slides in every language", () => {
    expect([locales.en.page(2), locales.en.goToSlide(3)]).toEqual(["Page 2", "Go to slide 3"]);
    expect([locales.es.goToSlide(3), locales.es.slideOf(1, 4)]).toEqual([
      "Ir a la diapositiva 3",
      "1 de 4",
    ]);
    expect([locales.ja.page(2), locales.ja.goToSlide(3)]).toEqual(["2ページ", "スライド3へ"]);
  });

  it("every dictionary has the same keys", () => {
    const keys = Object.keys(locales.en).sort();
    expect(Object.keys(locales.es).sort()).toEqual(keys);
    expect(Object.keys(locales.ja).sort()).toEqual(keys);
    expect(Object.keys(locales.ja.tags).sort()).toEqual(Object.keys(locales.en.tags).sort());
  });
});

describe("useLabels", () => {
  it("returns English outside a provider", () => {
    expect(renderHook(() => useLabels()).result.current).toBe(locales.en);
  });

  it("returns the provided dictionary", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocaleContext.Provider value={locales.ja}>{children}</LocaleContext.Provider>
    );
    expect(renderHook(() => useLabels(), { wrapper }).result.current.close).toBe("閉じる");
  });
});

describe("useLocaleTag", () => {
  it("prefers the component's own tag, then the Root's, then en", () => {
    expect(renderHook(() => useLocaleTag()).result.current).toBe("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocaleTagContext.Provider value="es-MX">{children}</LocaleTagContext.Provider>
    );
    expect(renderHook(() => useLocaleTag(), { wrapper }).result.current).toBe("es-MX");
    expect(renderHook(() => useLocaleTag("ja"), { wrapper }).result.current).toBe("ja");
  });
});
