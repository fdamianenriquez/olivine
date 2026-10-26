import { useCallback, useState } from "react";

/** Direction the selection travelled: towards a higher index (`forward`) or a lower one. */
export type InkDirection = "forward" | "back";

/** Props for one item of a group that uses `.ol-ink-wipe`. */
export interface InkWipeItemProps {
  "data-ink"?: "enter" | "leave";
  "data-ink-dir"?: InkDirection;
}

interface Track {
  active: number;
  /** The index selected before the last change; null until the selection first changes. */
  previous: number | null;
  direction: InkDirection;
}

/**
 * The ink wipe of a single-choice group (SegmentedControl, ToggleButton groups): the newly
 * selected item is inked from the side the selection came from, and the ink leaves the previous
 * item towards the new one. Pass the selected index (-1 for none); spread the returned props on
 * each `.ol-ink-wipe` item. Nothing animates on the first render.
 */
export function useInkWipe(active: number): (index: number) => InkWipeItemProps {
  const [track, setTrack] = useState<Track>({ active, previous: null, direction: "forward" });

  // Remember where the selection came from (derived state, updated during render).
  if (track.active !== active) {
    setTrack({
      active,
      previous: track.active,
      direction: track.active < 0 || active >= track.active ? "forward" : "back",
    });
  }

  return useCallback(
    (index: number): InkWipeItemProps => {
      if (track.previous === null || index < 0) return {};
      if (index === track.active) return { "data-ink": "enter", "data-ink-dir": track.direction };
      if (index === track.previous) {
        return { "data-ink": "leave", "data-ink-dir": track.direction };
      }
      return {};
    },
    [track],
  );
}
