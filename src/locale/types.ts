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
  /** PinInput: the code shape, read as its description: "6 digits" / "6 characters". */
  pinLength: (length: number, numeric: boolean) => string;
  /** PinInput: announced when the caret moves: "Digit 3 of 6". */
  pinPosition: (index: number, length: number, numeric: boolean) => string;
  /** PinInput with `mask`: announced after each change: "3 of 6 digits entered". */
  pinEntered: (count: number, length: number, numeric: boolean) => string;
  /** ColorSwatches: the reason shown on a disabled swatch that has no `hint`. */
  swatchUnavailable: string;
  /** NumberField stepper names: "Increase {label}" / "Decrease {label}". */
  numberIncrease: (label?: string) => string;
  numberDecrease: (label?: string) => string;
  /** Listbox: default content of an empty list. */
  noOptions: string;
  /** Listbox: announced after a bulk selection change: "4 selected". */
  optionsSelected: (n: number) => string;
  /** Range with two thumbs: spoken name of the low thumb. */
  rangeMin: (label?: string) => string;
  /** Range with two thumbs: spoken name of the high thumb. */
  rangeMax: (label?: string) => string;
  /** Combobox: status when no option matches. */
  comboboxNoResults: string;
  /** Combobox: announced when the list settles: "3 results available". */
  comboboxResults: (n: number) => string;
  /** Combobox: name of the button that opens the list. */
  comboboxShowOptions: string;
  /** Name of the clear button of a text field (Combobox, SearchField). */
  clear: string;
  /** Combobox: the row that creates a new option from the typed text. */
  comboboxCreate: (text: string) => string;
  /** Combobox (multiple): announced after a pick. */
  comboboxAdded: (label: string) => string;
  /** Combobox (multiple): name of the group of chips. */
  comboboxSelected: string;
  /** Combobox (multiple): how to reach the chips from the input. */
  comboboxChipsHint: string;
  /** SearchField: default name of the field, its Search button and its full-screen view. */
  search: string;
  /** SearchField: name of the button that closes the full-screen view. */
  searchBack: string;
  /** SearchField: announced after the query is cleared. */
  searchCleared: string;
  /** SearchField: announced when `resultCount` is 0. */
  searchNoResults: string;
  /** SearchField: announced when `resultCount` settles: "12 results". */
  searchResultCount: (n: number) => string;
  /** Default accessible name of a split button's menu trigger. */
  moreActions: string;
  /** Presence words for Avatar's status dot. */
  avatarStatus: { online: string; away: string; busy: string; offline: string };
  /** Accessible name of an avatar with a status: "{name}, {status}". */
  avatarLabel: (name: string, status: string) => string;
  /** Accessible name of an AvatarGroup's "+N" cell; joins the names with Intl.ListFormat. */
  avatarMore: (n: number, names: readonly string[]) => string;
  /** Spoken key names and non-Apple legends for Kbd. */
  keys: KbdKeyLabels;
  /** Default accessible name of a ThemeSwitch. */
  theme: string;
  /** Visible names of the themes in a ThemeSwitch (washi is light, sumi is dark). */
  themes: { washi: string; sumi: string; auto: string };
  /** Calendar navigation buttons. */
  prevMonth: string;
  nextMonth: string;
  prevYear: string;
  nextYear: string;
  /** Description of the calendar title, which opens the 12-month grid. */
  chooseMonth: string;
  /** Marks added to a calendar day's name. */
  dateToday: string;
  dateSelected: string;
  dateUnavailable: string;
  /** Accessible name of a calendar day: the long date followed by its marks. */
  dayLabel: (date: string, marks: readonly string[]) => string;
  /** DatePicker: name of the button that opens the calendar, and of its popover when the field has no label. */
  dateChoose: string;
  /** DatePicker: name of that button once a date is set: "Change date, Thursday, October 22, 2026". */
  dateChange: (date: string) => string;
  /** DatePicker: the default hint under the field: "Format: MM/DD/YYYY". */
  dateFormat: (pattern: string) => string;
  /** DatePicker: the footer button that picks today. */
  dateGoToday: string;
  /** DatePicker range: names of the start and end inputs. */
  dateRangeStart: string;
  dateRangeEnd: string;
  /** DatePicker modal: the sheet's Cancel and OK buttons. */
  dateCancel: string;
  dateConfirm: string;
  /** Names of the TimePicker segments and columns. */
  timeHour: string;
  timeMinute: string;
  timePeriod: string;
  /** Name of the TimePicker button, and of its popover when the field has no label. */
  timeChoose: string;
  /** Spoken value of a TimePicker segment that holds nothing. */
  timeEmpty: string;
  /** Label of the TimePicker confirm button. */
  timeDone: string;
  /** Default name of the NavigationRail landmark. */
  railLabel: string;
  /** Name of the NavigationRail toggle while collapsed, and while expanded. */
  railExpand: string;
  railCollapse: string;
  /** Default name of the BottomNav landmark. */
  bottomNavLabel: string;
  /** Default name of the Sidebar landmark and of its modal drawer. */
  sidebarLabel: string;
  /** Hidden text after a folded Sidebar section or parent that holds the current page. */
  sidebarWithin: string;
  /** Default name of the Menubar. */
  menubar: string;
  /** Shown in an empty TreeView. */
  treeEmpty: string;
  /** Status after a TreeView branch loaded its children. */
  treeLoaded: (label: string, n: number) => string;
  /** Status when a TreeView branch failed to load. */
  treeLoadFailed: (label: string) => string;
  /** The words of the Stepper count line and of each step's spoken name. */
  stepper: { step: string; of: string; completed: string; error: string };
  /** Words of the CommandPalette: dialog name, placeholder, list name, empty state, footer hints. */
  commandPalette: {
    name: string;
    placeholder: string;
    results: string;
    empty: (query: string) => string;
    move: string;
    open: string;
    close: string;
  };
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

/** Partial overrides of a dictionary; `tags`, `keys` and `avatarStatus` merge one level deep. */
export type LabelOverrides = Partial<
  Omit<OlivineLabels, "tags" | "keys" | "avatarStatus" | "themes">
> & {
  tags?: Partial<OlivineLabels["tags"]>;
  avatarStatus?: Partial<OlivineLabels["avatarStatus"]>;
  keys?: Partial<OlivineLabels["keys"]>;
  themes?: Partial<OlivineLabels["themes"]>;
};
