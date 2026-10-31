import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the media query as it changes", () => {
    let matches = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (media: string) => ({
      media,
      get matches() {
        return matches;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }));
    const { result } = renderHook(() => useMediaQuery("(max-width: 719px)"));
    expect(result.current).toBe(false);
    act(() => {
      matches = true;
      for (const fn of listeners) fn();
    });
    expect(result.current).toBe(true);
  });
});
