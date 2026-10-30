import { createContext, type KeyboardEvent, type MouseEvent, useContext } from "react";

/** The event that asked for a removal: a click on the × cell or Delete/Backspace on the chip. */
export type ChipRemoveEvent = MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>;

/** Selection modes a group of chips can have. */
export type ChipSelectionMode = "none" | "single" | "multiple";

/**
 * What a group of chips shares with each chip. Internal: provided by `ChipGroup`, read by `Chip`
 * through `useChipGroup()`. A chip outside a group gets `null` and works on its own props.
 */
export interface ChipGroupContextValue {
  /** `none`: chips are actions; otherwise every chip is a toggle and reserves the `✓` slot. */
  mode: ChipSelectionMode;
  /** Values of the selected chips; the group is the source of truth. */
  selectedValues: readonly string[];
  /** Called when a chip with this value is pressed (modes `single` and `multiple`). */
  toggle: (value: string) => void;
  /** True when the group has `onRemove`: every chip shows its × cell unless `removable={false}`. */
  canRemove: boolean;
  /** Called by a chip's × cell or Delete/Backspace; the group calls `onRemove` and moves focus. */
  requestRemove: (value: string, label: string | undefined, event: ChipRemoveEvent) => void;
  /** Disables every chip. */
  disabled: boolean;
}

export const ChipGroupContext = createContext<ChipGroupContextValue | null>(null);

/** The enclosing group's context, or `null` for a standalone chip. */
export function useChipGroup(): ChipGroupContextValue | null {
  return useContext(ChipGroupContext);
}

/**
 * Data attribute on each chip's roving item: the main control, or the × button of a remove-only
 * chip. A group finds its items with `[data-ol-chip-item]`.
 */
export const CHIP_ITEM_ATTR = "data-ol-chip-item";
