import { createContext, type ReactNode, useContext } from "react";

import type { ToastCloseReason, ToastPriority, ToastTone } from "../Toast";

/** The one follow-up of a toast, drawn as a small outline button. */
export interface ToastAction {
  /** Visible text of the button, e.g. "Undo". */
  label: string;
  /** Runs when the button is pressed. */
  onClick: () => void;
  /** A longer accessible name. It must start with the visible `label` ("Undo removing Ana"). */
  ariaLabel?: string;
  /**
   * Close the toast (`reason: "action"`) after `onClick`.
   * @default true
   */
  closeOnAction?: boolean;
}

export interface ToastOptions {
  /** Stable id. Showing an id that is already open replaces that toast in place and restarts its countdown. Generated when omitted. */
  id?: string;
  /** Heading of the toast. */
  title?: ReactNode;
  /** Meta line beside the tone dot. Defaults to the localised "Now". */
  meta?: ReactNode;
  /** Colour of the dot before the meta line. */
  tone?: ToastTone;
  /** Body text under the title. */
  description?: ReactNode;
  /**
   * Milliseconds before it dismisses itself. `0` or `null` keeps it until dismissed. Defaults to
   * the provider's `actionDuration` for a toast with an `action` or `tone: "danger"`, and to its
   * `duration` otherwise.
   */
  duration?: number | null;
  /** How it is announced. Defaults to `assertive` for `tone: "danger"`, `polite` otherwise. */
  priority?: ToastPriority;
  /** A hanko seal of one to four kanji (decorative). Success confirmations only. */
  seal?: ReactNode;
  /** The one follow-up ("Undo"). */
  action?: ToastAction;
  /**
   * Called once when the toast closes, with the reason: `"timeout"`, `"dismiss"`, `"action"`,
   * `"escape"`, `"swipe"` or `"api"` (`dismiss(id)`, `clear()`). For Undo flows, revert on
   * `"action"` and commit on the others.
   */
  onClose?: (reason: ToastCloseReason) => void;
}

/** Options for one step of `promise()`, without an id (the step reuses the loading toast). */
export type ToastStepOptions = Omit<ToastOptions, "id">;

/** Changes for `update()`. A key set to `undefined` removes that option (an action, a seal). */
export type ToastPatch = { [K in keyof ToastStepOptions]?: ToastStepOptions[K] | undefined };

/** One step of `promise()`: a title, options, or a function of the result or error. */
export type ToastPromiseStep<A> =
  string | ToastStepOptions | ((value: A) => string | ToastStepOptions);

export interface ToastPromiseSteps<T> {
  /** Shown while the promise is pending: persistent, neutral tone, meta "Loading" by default. */
  loading: string | ToastStepOptions;
  /** Replaces it when the promise resolves: success tone and meta by default. */
  success: ToastPromiseStep<T>;
  /** Replaces it when the promise rejects: danger tone and meta by default. */
  error: ToastPromiseStep<unknown>;
}

export interface ToastApi {
  /** Shows a toast, or queues it when `max` are already visible. Returns its id. */
  show: (options: ToastOptions) => string;
  /**
   * Changes an open or queued toast. Its countdown restarts and the new text is announced.
   * Does nothing when the id is gone.
   */
  update: (id: string, patch: ToastPatch) => void;
  /** Closes the toast with this id (`reason: "api"`), whether visible or queued. */
  dismiss: (id: string) => void;
  /** Closes every toast, visible and queued (`reason: "api"`). */
  clear: () => void;
  /**
   * Shows a loading toast for `promise` and updates it in place with the outcome. Returns the
   * same promise, so it can still be awaited or caught. When the loading toast was dismissed
   * before the promise settles, the outcome is not shown.
   */
  promise: <T>(
    promise: Promise<T>,
    steps: ToastPromiseSteps<T>,
    options?: ToastOptions,
  ) => Promise<T>;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Returns the toast API of the nearest `ToastProvider`. Throws when there is none. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("[olivine] useToast must be used inside a <ToastProvider>.");
  return api;
}
