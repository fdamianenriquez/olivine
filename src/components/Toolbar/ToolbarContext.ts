import { createContext, useContext } from "react";

/** What a Toolbar tells the controls inside it: they hand arrow keys to the toolbar. */
export interface ToolbarContextValue {
  orientation: "horizontal" | "vertical";
}

/** Provided by Toolbar. Internal: a control reads it to defer to the toolbar's roving focus. */
export const ToolbarContext = createContext<ToolbarContextValue | null>(null);

/** The enclosing toolbar, or `null` outside one. */
export function useToolbar(): ToolbarContextValue | null {
  return useContext(ToolbarContext);
}

/**
 * How a menu button behaves inside a toolbar. In a vertical toolbar Up and Down move along the
 * bar, so arrows never open the menu, and it hangs to the side (`right-start`, mirrored in RTL)
 * instead of below. Outside a toolbar, or in a horizontal one, nothing changes.
 */
export function toolbarMenu(
  toolbar: ToolbarContextValue | null,
  rtl: boolean,
): { openOnArrow: "down" | "none"; placement: "right-start" | "left-start" | null } {
  const vertical = toolbar?.orientation === "vertical";
  return {
    openOnArrow: vertical ? "none" : "down",
    placement: vertical ? (rtl ? "left-start" : "right-start") : null,
  };
}
