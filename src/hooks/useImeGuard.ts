import { type KeyboardEvent, useCallback, useEffect, useRef } from "react";

import { isImeKey } from "../utils/ime";

/**
 * Tracks IME composition on a text input so keys that belong to it never select, submit or
 * remove. Covers what `isImeKey` cannot see on the event: Safari fires the committing Enter in
 * the same task as `compositionend`, with `isComposing` false. Spread the two handlers on the
 * input (composing your own) and test keys with `isComposing(event)`.
 */
export function useImeGuard() {
  const composing = useRef(false);
  const justComposed = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const onCompositionStart = useCallback(() => {
    composing.current = true;
  }, []);

  const onCompositionEnd = useCallback(() => {
    composing.current = false;
    justComposed.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      justComposed.current = false;
    }, 0);
  }, []);

  const isComposing = useCallback(
    (event: KeyboardEvent | globalThis.KeyboardEvent) =>
      composing.current || justComposed.current || isImeKey(event),
    [],
  );

  return { onCompositionStart, onCompositionEnd, isComposing };
}
