import { createContext, useContext } from "react";

import type { Listbox as ListboxController } from "../../hooks/useListbox";
import { devWarn } from "../../utils/dev";

/** What `ListboxOption` and `ListboxGroup` read from the list around them. */
export interface ListboxContextValue {
  /** The behaviour of the list (`useListbox` result). */
  controller: ListboxController;
  /** Reserve the ✓ slot at the end of each option. */
  checkmark: boolean;
}

export const ListboxContext = createContext<ListboxContextValue | null>(null);

/** The surrounding list. Options outside a `Listbox` (or a `controller`) render nothing. */
export function useListboxContext(component: string): ListboxContextValue | null {
  const context = useContext(ListboxContext);
  if (!context) devWarn(component, "must be rendered inside a `Listbox`.");
  return context;
}
