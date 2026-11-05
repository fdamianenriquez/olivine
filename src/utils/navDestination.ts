import type { ReactNode } from "react";

/** One destination of a navigation bar (NavigationRail, BottomNav): a mark, a word and a target. */
export interface NavDestination {
  /** Identifier passed to `onSelect` and matched against `active`. */
  key: string;
  /** Visible name of the destination. It is the accessible name; the mark is decoration. */
  label: ReactNode;
  /**
   * A kanji or a typographic glyph shown with the label. Never the only label: it is hidden from
   * assistive tech. Kanji are set in the jp face.
   */
  mark: string;
  /** Target URL. Items with an `href` render as links; items without render as buttons. */
  href?: string;
  /** A count shown as a maple badge. Read after the label ("Inbox, 3"). */
  badge?: ReactNode;
}
