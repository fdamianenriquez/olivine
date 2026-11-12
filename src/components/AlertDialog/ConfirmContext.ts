import { createContext, type ReactNode, useContext } from "react";

import type { AlertDialogCloseReason, AlertDialogOwnProps } from "./AlertDialog";

/** How a confirm ended: the three answers of the dialog, or `"abort"` (signal or provider unmount). */
export type ConfirmCloseReason = AlertDialogCloseReason | "abort";

export interface ConfirmOptions extends Pick<
  AlertDialogOwnProps,
  "tone" | "confirmLabel" | "cancelLabel" | "initialFocus" | "size"
> {
  /** The question the dialog asks ("Delete 3 files?"). It names the dialog. */
  title: ReactNode;
  /** The message under the title: a sentence or two of plain text. It describes the dialog. */
  description?: ReactNode;
  /**
   * Runs on confirm. A returned promise makes the dialog pending; the confirm resolves `true`
   * once it resolves, and a rejection keeps the dialog open and reports the error. The signal
   * aborts when the confirm is aborted or the provider unmounts; pass it on to `fetch`.
   * Never await another `confirm` in here: it queues behind this one, which waits for it, so
   * neither can ever open. Answer this one, then ask the next.
   */
  onConfirm?: (signal: AbortSignal) => unknown;
  /**
   * Ends the confirm without a decision when it aborts, whether queued, open or pending: the
   * dialog closes (or never shows) and the promise rejects with `signal.reason`. Already
   * aborted, nothing is shown. Give long work a deadline with `AbortSignal.timeout(ms)`.
   */
  signal?: AbortSignal;
  /**
   * Where focus goes when the dialog has closed: an element, or a function returning one.
   * Defaults to the element that was focused when `confirm` was called, if it is still in the
   * page and focus has nowhere else to be. Pass it when that default is unreliable: a menu item
   * that unmounts as the menu closes, or a click that does not focus its button (Safari), which
   * leaves nothing focused to return to.
   */
  returnFocus?: HTMLElement | null | (() => HTMLElement | null);
  /**
   * Calling `confirm` again with the id of an open or queued confirm shows no second dialog and
   * returns the same promise.
   */
  id?: string;
  /** Called once with how the confirm ended, before its promise settles. */
  onClose?: (reason: ConfirmCloseReason) => void;
}

/**
 * Opens an AlertDialog and resolves `true` when the user confirms (and the work in `onConfirm`
 * succeeded), `false` on Cancel or Escape. Rejects with `signal.reason` when `signal` aborts,
 * and with an `AbortError` when the provider unmounts first.
 */
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Returns `confirm(options)` of the nearest `ConfirmProvider`; its identity is stable. Call it
 * from event handlers and effects, never during render. Throws outside a provider.
 *
 * ```tsx
 * const confirm = useConfirm();
 * if (await confirm({ title: "Delete 3 files?", tone: "danger", confirmLabel: "Delete" })) remove();
 * ```
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("[olivine] useConfirm must be used inside a <ConfirmProvider>.");
  return confirm;
}
