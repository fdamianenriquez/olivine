import { createContext } from "react";

import type { SwipeDirection } from "../../hooks/useSwipeDismiss";

/**
 * What a ToastStack tells the toasts inside it. Internal: not part of the public API.
 */
export interface ToastStackContextValue {
  /** Default swipe direction for toasts in the stack (toward its edge), or `false`. */
  swipe: SwipeDirection | false;
  /** The stack's hotkey while it is on, for the hidden hint in toasts with an action. */
  hotkey: string | null;
  /**
   * Moves focus out of a toast that is closing while it holds focus: to the next toast's first
   * control, else to the element focused before the hotkey.
   */
  returnFocus: (from: HTMLElement | null) => void;
}

export const ToastStackContext = createContext<ToastStackContextValue>({
  swipe: false,
  hotkey: null,
  returnFocus: () => undefined,
});
