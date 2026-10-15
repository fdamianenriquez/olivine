import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { LocaleContext, locales, makeLabels, useLabels } from ".";

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
