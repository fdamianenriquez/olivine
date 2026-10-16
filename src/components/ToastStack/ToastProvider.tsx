import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { Portal } from "../../utils/Portal";
import { Toast } from "../Toast";
import { type ToastApi, ToastContext, type ToastOptions } from "./ToastContext";
import { ToastStack, type ToastStackPosition } from "./ToastStack";

export interface ToastProviderProps {
  /** Corner the stack is pinned to. */
  position?: Exclude<ToastStackPosition, "static">;
  /** Most toasts visible at once; the rest queue and appear as earlier ones close. */
  max?: number;
  /** Default milliseconds before a toast dismisses itself. `0` or `null` makes toasts persistent. */
  duration?: number | null;
  /** The app. */
  children?: ReactNode;
}

interface Entry extends ToastOptions {
  id: string;
}

/**
 * Provides `useToast()` and renders the stack in a portal that stays reachable while a modal
 * is open. The newest toast sits at the edge nearest the corner.
 */
export function ToastProvider({
  position = "br",
  max = 3,
  duration = 5000,
  children,
}: ToastProviderProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const anchor = useRef<HTMLSpanElement>(null);
  const counter = useRef(0);
  const closers = useRef(new Map<string, (() => void) | undefined>());

  const dismiss = useCallback((id: string) => {
    setEntries((list) => {
      if (!list.some((e) => e.id === id)) return list;
      return list.filter((e) => e.id !== id);
    });
    const cb = closers.current.get(id);
    if (closers.current.has(id)) {
      closers.current.delete(id);
      cb?.();
    }
  }, []);

  const show = useCallback((options: ToastOptions) => {
    counter.current += 1;
    const id = options.id ?? `ol-toast-${String(counter.current)}`;
    closers.current.set(id, options.onClose);
    setEntries((list) => {
      const entry = { ...options, id };
      return list.some((e) => e.id === id)
        ? list.map((e) => (e.id === id ? entry : e))
        : [...list, entry];
    });
    return id;
  }, []);

  const clear = useCallback(() => {
    const pending = [...closers.current.values()];
    closers.current.clear();
    setEntries([]);
    pending.forEach((cb) => cb?.());
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, dismiss, clear }), [show, dismiss, clear]);

  const limit = Math.max(1, Math.floor(max));
  const visible = entries.slice(0, limit);
  // Bottom stacks grow upward (newest last); top stacks put the newest first.
  const ordered = position === "tr" || position === "tc" ? [...visible].reverse() : visible;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Marks where the provider was rendered so the portal keeps that theme and language. */}
      <span ref={anchor} hidden />
      <Portal keepActive anchor={anchor}>
        <ToastStack position={position}>
          {ordered.map(({ id, title, meta, tone, description, duration: own }) => {
            const ms = own === undefined ? duration : own;
            return (
              <Toast
                key={id}
                title={title}
                meta={meta}
                {...(tone ? { tone } : null)}
                {...(ms && ms > 0 ? { duration: ms } : null)}
                onClose={() => {
                  dismiss(id);
                }}
              >
                {description}
              </Toast>
            );
          })}
        </ToastStack>
      </Portal>
    </ToastContext.Provider>
  );
}
