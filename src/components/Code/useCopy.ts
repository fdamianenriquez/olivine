import { useCallback, useEffect, useRef, useState } from "react";

/** Where a copy attempt stands: nothing yet (or reset), written, or refused. */
export type CopyStatus = "idle" | "copied" | "failed";

interface CopyState {
  status: CopyStatus;
  /** Counts attempts, so a repeat of the same result can still be announced again. */
  attempt: number;
}

/**
 * Writes text to the clipboard and reports the outcome for `resetAfter` milliseconds.
 * `copy` resolves to whether the clipboard accepted the text; it never rejects, and it
 * does nothing to the document selection (the caller decides what a failure looks like).
 */
export function useCopy(resetAfter: number) {
  const [state, setState] = useState<CopyState>({ status: "idle", attempt: 0 });
  const mounted = useRef(true);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // `navigator.clipboard` is missing outside secure contexts, whatever the DOM types say.
      const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
      let ok = false;
      try {
        if (typeof clipboard?.writeText === "function") {
          await clipboard.writeText(text);
          ok = true;
        }
      } catch {
        ok = false;
      }
      if (!mounted.current) return ok;
      window.clearTimeout(timer.current);
      setState((prev) => ({ status: ok ? "copied" : "failed", attempt: prev.attempt + 1 }));
      timer.current = window.setTimeout(() => {
        setState((prev) => ({ ...prev, status: "idle" }));
      }, resetAfter);
      return ok;
    },
    [resetAfter],
  );

  return { status: state.status, attempt: state.attempt, copy };
}
