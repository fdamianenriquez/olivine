import { useCallback, useSyncExternalStore } from "react";

const listFor = (query: string) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query)
    : null;

/**
 * Whether a media query matches, kept in sync with the viewport. On the server and in the first
 * client render it is `false`, so the server markup hydrates; the real value follows right after.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = listFor(query);
      list?.addEventListener("change", notify);
      return () => list?.removeEventListener("change", notify);
    },
    [query],
  );
  const snapshot = useCallback(() => listFor(query)?.matches ?? false, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
