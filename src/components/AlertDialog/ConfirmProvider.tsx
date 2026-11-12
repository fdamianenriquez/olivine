import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { AlertDialog, type AlertDialogCloseReason } from "./AlertDialog";
import {
  type ConfirmCloseReason,
  ConfirmContext,
  type ConfirmFn,
  type ConfirmOptions,
} from "./ConfirmContext";

export interface ConfirmProviderProps {
  /** The app. Place the provider once near the root, inside `Root` so the dialog follows its language. */
  children?: ReactNode;
}

type Outcome = { value: boolean } | { error: unknown };

/** One call of `confirm`, from the call until its promise has settled. */
interface Request {
  options: ConfirmOptions;
  promise: Promise<boolean>;
  /** What had focus when `confirm` was called: where focus goes back by default. */
  opener: Element | null;
  /** Hands `onConfirm` a signal that aborts with the confirm or the provider. */
  controller: AbortController;
  /** The dialog has rendered open, so it closes with its exit before the next one opens. */
  shown: boolean;
  /** Decided: the outcome is fixed and `onClose` has run. */
  settled: boolean;
  outcome: Outcome | null;
  resolve: (value: boolean) => void;
  reject: (error: unknown) => void;
  /** Removes the listener on the caller's signal. */
  detach: () => void;
}

/** The dialog on screen: immutable, so it can live in state. */
interface Shown {
  key: number;
  options: ConfirmOptions;
  signal: AbortSignal;
  open: boolean;
}

/** Surfaces an error without throwing from the caller's stack. */
function report(error: unknown): void {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(error);
  } else {
    setTimeout(() => {
      throw error;
    });
  }
}

function unmountError(): DOMException {
  return new DOMException("The ConfirmProvider unmounted before the confirm ended.", "AbortError");
}

function isUsable(el: unknown): el is HTMLElement {
  return el instanceof HTMLElement && el.isConnected && el.closest("[inert]") === null;
}

interface ConfirmDialogProps {
  entry: Shown;
  onAnswer: (key: number, reason: AlertDialogCloseReason) => void;
  onShown: (key: number) => void;
  onClosed: (key: number) => void;
  onExited: (key: number) => void;
}

function ConfirmDialog({ entry, onAnswer, onShown, onClosed, onExited }: ConfirmDialogProps) {
  const { key, options, signal, open } = entry;
  const { title, description, tone, confirmLabel, cancelLabel, initialFocus, size, onConfirm } =
    options;

  // A layout effect of the parent runs after the dialog's own (focus already restored by the
  // overlay), and before any code awaiting the confirm continues.
  useIsomorphicLayoutEffect(() => {
    if (open) onShown(key);
    else onClosed(key);
  }, [open, key, onShown, onClosed]);

  return (
    <AlertDialog
      open={open}
      title={title}
      {...(tone ? { tone } : null)}
      {...(confirmLabel === undefined ? null : { confirmLabel })}
      {...(cancelLabel === undefined ? null : { cancelLabel })}
      {...(initialFocus ? { initialFocus } : null)}
      {...(size ? { size } : null)}
      {...(onConfirm ? { onConfirm: () => onConfirm(signal) } : null)}
      onClose={(reason) => {
        onAnswer(key, reason);
      }}
      onExited={() => {
        onExited(key);
      }}
    >
      {description}
    </AlertDialog>
  );
}

/**
 * Provides `useConfirm()` and renders its AlertDialog where it sits, so the dialog keeps that
 * theme, language and direction. Confirms queue first in, first out: one dialog at a time, the
 * next opens once the previous has rolled up. Unmounting it rejects every open and queued
 * confirm with an `AbortError`.
 */
export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [shown, setShown] = useState<Shown | null>(null);
  /** Every confirm whose promise has not settled yet, by key. */
  const requests = useRef(new Map<number, Request>());
  /** Keys waiting for the dialog, oldest first. */
  const queue = useRef<number[]>([]);
  /** Key of the confirm that owns the dialog (open or still rolling up). */
  const current = useRef<number | null>(null);
  const counter = useRef(0);
  const alive = useRef(true);

  /** Settles the promise with its outcome. */
  const finish = useCallback((key: number) => {
    const request = requests.current.get(key);
    if (!request?.outcome) return;
    requests.current.delete(key);
    const { outcome } = request;
    if ("value" in outcome) request.resolve(outcome.value);
    else request.reject(outcome.error);
  }, []);

  /** Gives the dialog to the next queued confirm, or removes it. */
  const advance = useCallback(() => {
    const key = queue.current.shift();
    const next = key === undefined ? undefined : requests.current.get(key);
    if (key === undefined || !next) {
      current.current = null;
      setShown(null);
      return;
    }
    current.current = key;
    setShown({ key, options: next.options, signal: next.controller.signal, open: true });
  }, []);

  /**
   * Decides a confirm once: closes its dialog (or drops it from the queue), calls `onClose`, then
   * settles the promise. An open dialog settles after it has closed and focus is restored.
   */
  const settle = useCallback(
    (key: number, reason: ConfirmCloseReason, outcome: Outcome) => {
      const request = requests.current.get(key);
      if (!request || request.settled) return;
      request.settled = true;
      request.outcome = outcome;
      request.detach();
      if ("error" in outcome) request.controller.abort(outcome.error);
      let afterClose = false;
      if (current.current === key) {
        if (request.shown) {
          setShown({
            key,
            options: request.options,
            signal: request.controller.signal,
            open: false,
          });
          afterClose = true;
        } else {
          // Ended before its dialog ever rendered: there is no exit to wait for.
          advance();
        }
      } else {
        queue.current = queue.current.filter((k) => k !== key);
      }
      try {
        request.options.onClose?.(reason);
      } catch (error) {
        report(error);
      }
      if (!afterClose) finish(key);
    },
    [advance, finish],
  );

  const onAnswer = useCallback(
    (key: number, reason: AlertDialogCloseReason) => {
      settle(key, reason, { value: reason === "confirm" });
    },
    [settle],
  );

  const onShown = useCallback((key: number) => {
    const request = requests.current.get(key);
    if (request) request.shown = true;
  }, []);

  const onClosed = useCallback(
    (key: number) => {
      const request = requests.current.get(key);
      if (!request) return;
      const { returnFocus } = request.options;
      const target = typeof returnFocus === "function" ? returnFocus() : returnFocus;
      if (isUsable(target)) {
        target.focus({ preventScroll: true });
      } else {
        const active = document.activeElement;
        const lost = active === null || active === document.body || active.closest("[inert]");
        if (lost && isUsable(request.opener)) request.opener.focus({ preventScroll: true });
      }
      finish(key);
    },
    [finish],
  );

  const onExited = useCallback(
    (key: number) => {
      if (current.current === key) advance();
    },
    [advance],
  );

  const confirm = useCallback<ConfirmFn>(
    (options) => {
      const { id, signal } = options;
      if (signal?.aborted || !alive.current) {
        const reason: unknown = signal?.aborted ? signal.reason : unmountError();
        try {
          options.onClose?.("abort");
        } catch (error) {
          report(error);
        }
        // The platform convention: an aborted call rejects with whatever the signal carries.
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        return Promise.reject(reason);
      }
      if (id !== undefined) {
        for (const request of requests.current.values()) {
          if (request.options.id === id && !request.settled) return request.promise;
        }
      }

      counter.current += 1;
      const key = counter.current;
      let resolve: (value: boolean) => void = () => undefined;
      let reject: (error: unknown) => void = () => undefined;
      const promise = new Promise<boolean>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      const onAbort = () => {
        settle(key, "abort", { error: signal?.reason });
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      requests.current.set(key, {
        options,
        promise,
        opener: typeof document === "undefined" ? null : document.activeElement,
        controller: new AbortController(),
        shown: false,
        settled: false,
        outcome: null,
        resolve,
        reject,
        detach: () => {
          signal?.removeEventListener("abort", onAbort);
        },
      });
      queue.current.push(key);
      if (current.current === null) advance();
      return promise;
    },
    [advance, settle],
  );

  // Armed in a layout effect: StrictMode's simulated remount runs every layout setup before any
  // passive one, so a child calling confirm from its own mount effect finds the provider alive.
  useIsomorphicLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const map = requests.current;
    return () => {
      alive.current = false;
      queue.current = [];
      current.current = null;
      const keys = [...map.keys()];
      for (const key of keys) {
        const request = map.get(key);
        if (!request || request.settled) continue;
        const error = unmountError();
        request.settled = true;
        request.outcome = { error };
        request.detach();
        request.controller.abort(error);
        try {
          request.options.onClose?.("abort");
        } catch (caught) {
          report(caught);
        }
      }
      // Decided confirms waiting for their dialog to close settle now too.
      keys.forEach(finish);
      setShown(null);
    };
  }, [finish]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {shown && (
        <ConfirmDialog
          key={shown.key}
          entry={shown}
          onAnswer={onAnswer}
          onShown={onShown}
          onClosed={onClosed}
          onExited={onExited}
        />
      )}
    </ConfirmContext.Provider>
  );
}
