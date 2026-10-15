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
  tags: { info: string; success: string; warning: string; danger: string; neutral: string };
}

/** Built-in locales. */
export type LocaleName = "en" | "es" | "ja";

/** Partial overrides of a dictionary; `tags` merges one level deep. */
export type LabelOverrides = Partial<Omit<OlivineLabels, "tags">> & {
  tags?: Partial<OlivineLabels["tags"]>;
};
