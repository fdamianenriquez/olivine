import { createContext } from "react";

/**
 * True while a Toast's whole stack should hold its auto-dismiss timers: the pointer or focus is
 * somewhere in the stack, or the page is hidden. ToastStack provides it; Toast reads it.
 * Internal: not part of the public API.
 */
export const ToastPauseContext = createContext(false);
