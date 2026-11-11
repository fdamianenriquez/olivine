/** Movement in px before a press becomes a drag (or is given up to scrolling). */
export const SLOP = 8;
/** A release later than this after the last move counts as a stop, not a flick. */
export const FLICK_WINDOW = 100;
/** Release speed in px/ms that counts as a flick. */
export const FLICK_VELOCITY = 0.5;
/** Share of the size that a drag must pass to dismiss. */
export const DISMISS_THRESHOLD = 0.4;

/** Presses on controls never start a swipe. */
export const CONTROLS =
  "button, a[href], input, select, textarea, label, summary, [contenteditable]:not([contenteditable='false']), [role='button'], [role='link'], [data-swipe-ignore]";
