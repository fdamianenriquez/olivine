import { useCallback, useEffect, useRef } from "react";

/** Wait before a held stepper starts repeating, in ms. */
export const REPEAT_DELAY = 400;
/** Interval between repeats while a stepper is held, in ms. */
export const REPEAT_INTERVAL = 60;

/**
 * Press-and-hold: `start` runs `action` once, then again after `REPEAT_DELAY` and every
 * `REPEAT_INTERVAL` until `stop`, a window `pointerup`/`pointercancel`, or `action` returning
 * false (a limit was reached). Timers are cleared on unmount.
 */
export function usePressRepeat(): {
  start: (action: () => boolean) => void;
  stop: () => void;
} {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const release = useRef<(() => void) | undefined>(undefined);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    release.current?.();
    release.current = undefined;
  }, []);

  const start = useCallback(
    (action: () => boolean) => {
      stop();
      if (!action()) return;
      const tick = (wait: number) => {
        timer.current = setTimeout(() => {
          if (action()) tick(REPEAT_INTERVAL);
          else stop();
        }, wait);
      };
      tick(REPEAT_DELAY);
      // The pointer may leave the button or the button may disable itself at a limit, so
      // listen for the release on the window.
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
      release.current = () => {
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { start, stop };
}
