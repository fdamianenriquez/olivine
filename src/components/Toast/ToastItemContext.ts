import { createContext, type RefCallback } from "react";

import type { PresenceState } from "../../motion";

/**
 * What ToastProvider tells each toast it renders. Internal: not part of the public API.
 */
export interface ToastItemContextValue {
  /** Presence of the toast: `closing` while its exit plays. */
  state: PresenceState;
  /** Callback ref for the toast root, whose exit motion marks the end of the presence. */
  setElement: RefCallback<HTMLDivElement>;
  /** Bumped when the toast is shown again or updated: restarts its countdown and timer bar. */
  version: number;
}

export const ToastItemContext = createContext<ToastItemContextValue | null>(null);
