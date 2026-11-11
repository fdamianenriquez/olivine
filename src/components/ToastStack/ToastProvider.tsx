import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useLabels } from "../../locale";
import { usePresence } from "../../motion";
import { Button } from "../Button";
import { Portal } from "../Portal";
import { Toast, type ToastCloseReason } from "../Toast";
import { ToastItemContext, type ToastItemContextValue } from "../Toast/ToastItemContext";
import { ToastStackContext } from "../Toast/ToastStackContext";
import {
  type ToastApi,
  ToastContext,
  type ToastOptions,
  type ToastPatch,
  type ToastPromiseStep,
  type ToastPromiseSteps,
  type ToastStepOptions,
} from "./ToastContext";
import { ToastStack, type ToastStackPosition } from "./ToastStack";

export interface ToastProviderProps {
  /**
   * Corner the stack is pinned to.
   * @default "tr"
   */
  position?: Exclude<ToastStackPosition, "static">;
  /**
   * Most toasts visible at once; the rest queue (first in, first out) and appear as earlier ones
   * close. A leaving toast keeps its place until its exit has played.
   * @default 3
   */
  max?: number;
  /**
   * Default milliseconds before a toast dismisses itself. `0` or `null` makes toasts persistent.
   * @default 5000
   */
  duration?: number | null;
  /**
   * Default milliseconds for a toast with an `action` and for `tone: "danger"`. `0` or `null`
   * makes them persistent.
   * @default 10000
   */
  actionDuration?: number | null;
  /**
   * Touch and pen swipe toward the stack's edge to dismiss. `false` turns it off.
   * @default true
   */
  swipe?: boolean;
  /**
   * Key that moves focus into the stack and back. `false` turns it off.
   * @default "F6"
   */
  hotkey?: string | false;
  /** Name of the stack's landmark. Defaults to the localised "Notifications". */
  label?: string;
  /** The app. */
  children?: ReactNode;
}

interface Entry {
  id: string;
  options: ToastOptions;
  /** False while its exit plays; it is removed once the exit has finished. */
  open: boolean;
  /** Bumped when shown again or updated: restarts the countdown. */
  version: number;
}

/** Merges a patch into options; a key set to `undefined` removes that option. */
function applyPatch(options: ToastOptions, patch: ToastPatch): ToastOptions {
  const merged: Record<string, unknown> = { ...options, ...patch };
  return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined));
}

function stepOptions<A>(step: ToastPromiseStep<A>, value: A): ToastStepOptions {
  const resolved = typeof step === "function" ? step(value) : step;
  return typeof resolved === "string" ? { title: resolved } : resolved;
}

interface ItemProps {
  entry: Entry;
  duration: number | null;
  swipe: boolean;
  onClose: (id: string, reason: ToastCloseReason) => void;
  onExited: (id: string) => void;
}

function ToastItem({ entry, duration, swipe, onClose, onExited }: ItemProps) {
  const { id, options, open, version } = entry;
  const stack = useContext(ToastStackContext);
  const node = useRef<HTMLDivElement | null>(null);
  const { mounted, state, setElement } = usePresence<HTMLDivElement>(open, {
    onExited: () => {
      onExited(id);
    },
    // A focused toast hands focus to the next toast, else back to where the hotkey came from.
    returnFocus: () => {
      stack.returnFocus(node.current);
    },
  });
  /** Whether focus was inside the element that was just detached (before its removal). */
  const focusInside = useRef(false);
  const setRoot = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) focusInside.current = Boolean(node.current?.contains(document.activeElement));
      node.current = el;
      setElement(el);
    },
    [setElement],
  );
  const item = useMemo<ToastItemContextValue>(
    () => ({ state, setElement: setRoot, version }),
    [state, setRoot, version],
  );
  const { title, meta, tone, description, priority, seal, action } = options;
  const level = priority ?? (tone === "danger" ? "assertive" : "polite");

  // A new priority remounts the toast (see the key below) so an alert is inserted fresh and
  // announced; focus that was inside the old element moves into the new one.
  const lastLevel = useRef(level);
  useIsomorphicLayoutEffect(() => {
    if (lastLevel.current === level) return;
    lastLevel.current = level;
    const el = node.current;
    if (!focusInside.current || !el || el.contains(document.activeElement)) return;
    el.querySelector<HTMLElement>("button:not([disabled]), a[href]")?.focus();
  }, [level]);

  if (!mounted) return null;

  return (
    <ToastItemContext.Provider value={item}>
      <Toast
        key={level}
        title={title}
        meta={meta}
        seal={seal}
        {...(tone ? { tone } : null)}
        {...(priority ? { priority } : null)}
        {...(duration && duration > 0 ? { duration } : null)}
        {...(swipe ? null : { swipe: false as const })}
        action={
          action ? (
            <Button
              size="s"
              variant="outline"
              {...(action.ariaLabel ? { "aria-label": action.ariaLabel } : null)}
              onClick={() => {
                action.onClick();
                if (action.closeOnAction !== false) onClose(id, "action");
              }}
            >
              {action.label}
            </Button>
          ) : undefined
        }
        onClose={(reason) => {
          onClose(id, reason);
        }}
      >
        {description}
      </Toast>
    </ToastItemContext.Provider>
  );
}

/**
 * Provides `useToast()` and renders the stack in a portal that stays reachable while a modal
 * is open (by pointer and by the hotkey). The newest toast sits at the edge nearest the corner.
 * Closing toasts play their exit before they leave; queued toasts wait for the slot.
 */
export function ToastProvider({
  position = "tr",
  max = 3,
  duration = 5000,
  actionDuration = 10000,
  swipe = true,
  hotkey = "F6",
  label,
  children,
}: ToastProviderProps) {
  const t = useLabels();
  const [entries, setEntries] = useState<Entry[]>([]);
  const anchor = useRef<HTMLSpanElement>(null);
  const counter = useRef(0);
  /** onClose of every toast that has not closed yet: present means open or queued. */
  const closers = useRef(new Map<string, ToastOptions["onClose"]>());
  const limit = Math.max(1, Math.floor(max));
  const latest = useRef({ limit, t });
  useEffect(() => {
    latest.current = { limit, t };
  });

  const close = useCallback((id: string, reason: ToastCloseReason) => {
    if (!closers.current.has(id)) return;
    const cb = closers.current.get(id);
    closers.current.delete(id);
    setEntries((list) => {
      const index = list.findIndex((e) => e.id === id);
      if (index < 0) return list;
      // Visible toasts play their exit; queued ones leave at once.
      if (index < latest.current.limit) {
        return list.map((e) => (e.id === id ? { ...e, open: false } : e));
      }
      return list.filter((e) => e.id !== id);
    });
    cb?.(reason);
  }, []);

  const onExited = useCallback((id: string) => {
    setEntries((list) => list.filter((e) => e.id !== id || e.open));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    counter.current += 1;
    const id = options.id ?? `ol-toast-${String(counter.current)}`;
    closers.current.set(id, options.onClose);
    setEntries((list) => {
      const current = list.find((e) => e.id === id);
      if (!current) return [...list, { id, options, open: true, version: 0 }];
      return list.map((e) =>
        e.id === id ? { id, options, open: true, version: current.version + 1 } : e,
      );
    });
    return id;
  }, []);

  const update = useCallback((id: string, patch: ToastPatch) => {
    if (!closers.current.has(id)) return;
    if ("onClose" in patch) closers.current.set(id, patch.onClose);
    setEntries((list) =>
      list.map((e) =>
        e.id === id && e.open
          ? { ...e, options: applyPatch(e.options, patch), version: e.version + 1 }
          : e,
      ),
    );
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      close(id, "api");
    },
    [close],
  );

  const clear = useCallback(() => {
    const pending = [...closers.current.values()];
    closers.current.clear();
    setEntries((list) =>
      list
        .filter((_, index) => index < latest.current.limit)
        .map((e) => (e.open ? { ...e, open: false } : e)),
    );
    pending.forEach((cb) => cb?.("api"));
  }, []);

  const promise = useCallback(
    <T,>(work: Promise<T>, steps: ToastPromiseSteps<T>, options: ToastOptions = {}) => {
      const { duration: outcomeDuration, ...base } = options;
      const loading = typeof steps.loading === "string" ? { title: steps.loading } : steps.loading;
      const id = show({
        tone: "neutral",
        meta: latest.current.t.loading,
        ...base,
        duration: null,
        ...loading,
      });
      const settle = (defaults: ToastStepOptions, step: ToastStepOptions) => {
        // Dismissed while pending: the outcome is not shown.
        if (!closers.current.has(id)) return;
        show({
          ...base,
          ...defaults,
          ...(outcomeDuration === undefined ? null : { duration: outcomeDuration }),
          ...step,
          id,
        });
      };
      work.then(
        (value) => {
          settle(
            { tone: "success", meta: latest.current.t.tags.success },
            stepOptions(steps.success, value),
          );
        },
        (error: unknown) => {
          settle(
            { tone: "danger", meta: latest.current.t.tags.danger },
            stepOptions(steps.error, error),
          );
        },
      );
      return work;
    },
    [show],
  );

  const api = useMemo<ToastApi>(
    () => ({ show, update, dismiss, clear, promise }),
    [show, update, dismiss, clear, promise],
  );

  const visible = entries.slice(0, limit);
  // Bottom stacks grow upward (newest last); top stacks put the newest first.
  const ordered = position === "tr" || position === "tc" ? [...visible].reverse() : visible;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Marks where the provider was rendered so the portal keeps that theme and language. */}
      <span ref={anchor} hidden />
      <Portal keepActive anchor={anchor}>
        <ToastStack position={position} hotkey={hotkey} {...(label ? { label } : null)}>
          {ordered.map((entry) => {
            const { action, tone, duration: own } = entry.options;
            const fallback = action || tone === "danger" ? actionDuration : duration;
            return (
              <ToastItem
                key={entry.id}
                entry={entry}
                duration={own === undefined ? fallback : own}
                swipe={swipe}
                onClose={close}
                onExited={onExited}
              />
            );
          })}
        </ToastStack>
      </Portal>
    </ToastContext.Provider>
  );
}
