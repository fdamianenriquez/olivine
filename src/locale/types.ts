/** Every word a component writes or announces on its own, for one language. */
export interface OlivineLabels {
  close: string;
  dismiss: string;
  loading: string;
  menu: string;
  menuClose: string;
  breadcrumb: string;
  pagination: string;
  prevPage: string;
  nextPage: string;
  page: (n: number) => string;
  carousel: string;
  slide: string;
  prevSlide: string;
  nextSlide: string;
  goToSlide: (n: number) => string;
  slideOf: (current: number, total: number) => string;
  switchOn: string;
  switchOff: string;
  fileLabel: string;
  fileBrowse: string;
  fileEmpty: string;
  now: string;
  newTab: string;
  sort: string;
  sortedAscending: string;
  sortedDescending: string;
  currentPage: string;
  play: string;
  pause: string;
  trendUp: string;
  trendDown: string;
  figure: string;
  /** Name of a chip's remove button. */
  removeChip: (label: string) => string;
  /** Announced after a chip is removed. */
  chipRemoved: (label: string) => string;
  /** Announced after a chip group's selection is cleared. */
  chipsCleared: string;
  tags: { info: string; success: string; warning: string; danger: string; neutral: string };
  /** Spoken key names and non-Apple legends for Kbd. */
  keys: KbdKeyLabels;
}

export interface KbdKeyLabels {
  /** Spoken name of ⌘. */
  command: string;
  /** Spoken name of the Windows key. */
  windows: string;
  /** Spoken name of ⌃ / Ctrl. */
  control: string;
  /** Spoken name of ⌥ (Apple). */
  option: string;
  /** Spoken name of Alt (other platforms). */
  alt: string;
  shift: string;
  enter: string;
  escape: string;
  tab: string;
  space: string;
  backspace: string;
  delete: string;
  up: string;
  down: string;
  left: string;
  right: string;
  /** Spoken name of the combined "⌘ / Ctrl" cap shown while the platform is unknown. */
  commandOrControl: string;
  /** Legends printed on non-Apple keyboards. */
  metaLegend: string;
  ctrlLegend: string;
  altLegend: string;
  shiftLegend: string;
  enterLegend: string;
  escLegend: string;
  tabLegend: string;
  spaceLegend: string;
  backspaceLegend: string;
  deleteLegend: string;
}

/** Built-in locales. */
export type LocaleName = "en" | "es" | "ja";

/** Partial overrides of a dictionary; `tags` and `keys` merge one level deep. */
export type LabelOverrides = Partial<Omit<OlivineLabels, "tags" | "keys">> & {
  tags?: Partial<OlivineLabels["tags"]>;
  keys?: Partial<OlivineLabels["keys"]>;
};
