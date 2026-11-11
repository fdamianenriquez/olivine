import type { ReactNode } from "react";

import { DEFAULT_DELAY_GROUP, DelayGroupProvider } from "../../hooks/useDelayGroup";

export interface TooltipProviderProps {
  /**
   * Milliseconds the pointer rests on a trigger before the first tooltip of the group opens.
   * @default 300
   */
  openDelay?: number;
  /**
   * Milliseconds to wait before a tooltip closes after the pointer and focus have left.
   * @default 0
   */
  closeDelay?: number;
  /**
   * After a tooltip of the group closes, the next one opens at once for this many milliseconds.
   * @default 300
   */
  skipDelay?: number;
  children?: ReactNode;
}

/**
 * Sets the timing for every Tooltip below it and makes them one group: the first hover waits
 * `openDelay`; once a tooltip has been shown, the next one opens at once for `skipDelay` after
 * the last one closed; only one tooltip of the group is open at a time. Optional: without it, a
 * built-in group with the same defaults applies. Renders no element.
 */
export function TooltipProvider({
  openDelay = DEFAULT_DELAY_GROUP.openDelay,
  closeDelay = DEFAULT_DELAY_GROUP.closeDelay,
  skipDelay = DEFAULT_DELAY_GROUP.skipDelay,
  children,
}: TooltipProviderProps) {
  return (
    <DelayGroupProvider openDelay={openDelay} closeDelay={closeDelay} skipDelay={skipDelay}>
      {children}
    </DelayGroupProvider>
  );
}
