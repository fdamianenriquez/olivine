import { useCallback, useMemo, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import type { TourCloseReason, TourStepReason } from "./Tour";

export interface UseTourOptions {
  /**
   * Initial open state.
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * Step the tour starts on: the initial step, and where `start()` goes without an argument.
   * @default 0
   */
  defaultStep?: number;
  /** Called when the reader opens or ends the tour, with the reason it ended. */
  onOpenChange?: (open: boolean, reason: TourCloseReason) => void;
  /** Called when the reader moves to another step, with the reason. */
  onStepChange?: (index: number, reason: TourStepReason) => void;
}

/** The props `useTour` wires onto a `Tour`. */
export interface UseTourProps {
  open: boolean;
  step: number;
  onOpenChange: (open: boolean, reason: TourCloseReason) => void;
  onStepChange: (index: number, reason: TourStepReason) => void;
}

export interface UseTourResult {
  /** Whether the tour is shown. */
  open: boolean;
  /** Index of the current step, 0-based. */
  step: number;
  /** Opens the tour on `step` (default: `defaultStep`). */
  start: (step?: number) => void;
  /** Ends the tour. */
  close: () => void;
  /** Moves to `step`; the tour clamps it to its steps. Does not open a closed tour. */
  goTo: (step: number) => void;
  /** Spread onto the tour: `<Tour {...tour.props} steps={steps} />`. */
  props: UseTourProps;
}

function toIndex(step: number): number {
  return Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0;
}

/**
 * Holds a tour's open state and current step, so a "Take the tour" control can start it and the
 * app can read where the reader is. Spread `props` onto `Tour`. The callbacks report what the
 * reader did, with its reason; `start`, `close` and `goTo` are the app's own moves and do not
 * call them. Every function it returns keeps its identity across renders.
 *
 * Remembering that a reader has seen the tour is the app's job: store it in
 * `onOpenChange(false, reason)` and decide from it whether to offer the tour again.
 */
export function useTour(options: UseTourOptions = {}): UseTourResult {
  const { defaultOpen = false, defaultStep = 0 } = options;
  const [open, setOpen] = useState(defaultOpen);
  const [step, setStep] = useState(() => toIndex(defaultStep));

  // The latest options, read by the stable callbacks below.
  const latest = useRef(options);
  useIsomorphicLayoutEffect(() => {
    latest.current = options;
  });

  const start = useCallback((at?: number) => {
    setStep(toIndex(at ?? latest.current.defaultStep ?? 0));
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const goTo = useCallback((at: number) => {
    setStep(toIndex(at));
  }, []);

  const onOpenChange = useCallback((next: boolean, reason: TourCloseReason) => {
    setOpen(next);
    latest.current.onOpenChange?.(next, reason);
  }, []);
  const onStepChange = useCallback((index: number, reason: TourStepReason) => {
    setStep(index);
    latest.current.onStepChange?.(index, reason);
  }, []);

  const props = useMemo(
    () => ({ open, step, onOpenChange, onStepChange }),
    [open, step, onOpenChange, onStepChange],
  );

  return { open, step, start, close, goTo, props };
}
