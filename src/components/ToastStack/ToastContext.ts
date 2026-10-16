import { createContext, type ReactNode, useContext } from "react";

import type { ToastTone } from "../Toast";

export interface ToastOptions {
  /** Stable id. Showing an id that is already open replaces that toast in place. Generated when omitted. */
  id?: string;
  /** Heading of the toast. */
  title?: ReactNode;
  /** Mono meta line. Defaults to the localised "Now". */
  meta?: ReactNode;
  /** Colour of the dot before the meta line. */
  tone?: ToastTone;
  /** Body text under the title. */
  description?: ReactNode;
  /** Milliseconds before it dismisses itself. `0` or `null` keeps it until dismissed. Defaults to the provider's `duration`. */
  duration?: number | null;
  /** Called once the toast is dismissed, by the user, by the timer, or through the API. */
  onClose?: () => void;
}

export interface ToastApi {
  /** Shows a toast, or queues it when `max` are already visible. Returns its id. */
  show: (options: ToastOptions) => string;
  /** Closes the toast with this id, whether visible or queued. */
  dismiss: (id: string) => void;
  /** Closes every toast, visible and queued. */
  clear: () => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Returns the toast API of the nearest `ToastProvider`. Throws when there is none. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("[olivine] useToast must be used inside a <ToastProvider>.");
  return api;
}
