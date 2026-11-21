// Shirakaba Gakki: a fictional catalogue. Prices are in JPY, before consumption tax.
// Brand, models, people and prices are invented for this demo.
export type ModelId = "norikura" | "utsukushi" | "kaichi";

export interface Model {
  id: ModelId;
  name: string;
  kanji: string;
  base: number;
  weeks: number;
  blurb: string;
}

export interface Option {
  id: string;
  name: string;
  price: number;
  /** Extra weeks of lead time this option adds. */
  weeks?: number;
}

export interface BodyWood extends Option {
  base: string;
  grain: number;
  note: string;
}

export interface Finish extends Option {
  color: string;
  alpha: number;
  kind: string;
}

export interface NeckWood extends Option {
  color: string;
}

export interface Board extends Option {
  /** `null` means the fretboard follows the neck wood. */
  color: string | null;
}

export type PickupKind = "s" | "h" | "p";

export interface Pickups extends Option {
  layout: (PickupKind | null)[];
  note: string;
}

export interface Guard {
  id: string;
  name: string;
  /** `null` means no pickguard. */
  color: string | null;
  pattern?: boolean;
}

export interface Hardware extends Option {
  color: string;
}

export interface GuitarConfig {
  model: ModelId;
  wood: string;
  finish: string;
  sheen: string;
  neck: string;
  board: string;
  profile: string;
  radius: number;
  frets: number;
  pickups: string;
  guard: string;
  hardware: string;
  case: boolean;
  engraving: string;
  setup: string;
}

export const MODELS: readonly Model[] = [
  {
    id: "norikura",
    name: "Norikura",
    kanji: "乗鞍",
    base: 420000,
    weeks: 12,
    blurb: "Double-cut offset. Light, balanced on the strap, comfortable sitting or standing.",
  },
  {
    id: "utsukushi",
    name: "Utsukushi",
    kanji: "美ヶ原",
    base: 460000,
    weeks: 13,
    blurb: "Single cut and a broad waist. More mass, more sustain, a rounder attack.",
  },
  {
    id: "kaichi",
    name: "Kaichi",
    kanji: "開智",
    base: 490000,
    weeks: 14,
    blurb: "A chambered slab with a resonance slot. The most modern shape we build.",
  },
];

export const BODY_WOODS: readonly BodyWood[] = [
  {
    id: "alder",
    name: "Alder",
    base: "#c9a77c",
    grain: 0.35,
    price: 0,
    note: "Present mids, medium weight.",
  },
  {
    id: "ash",
    name: "Ash",
    base: "#dcc59a",
    grain: 0.7,
    price: 20000,
    note: "Bold grain, bright highs.",
  },
  {
    id: "mahogany",
    name: "Mahogany",
    base: "#7d3f27",
    grain: 0.45,
    price: 45000,
    note: "Warm lows, a little heavier.",
  },
  {
    id: "kiri",
    name: "Kiri (paulownia)",
    base: "#e4d2ad",
    grain: 0.3,
    price: 30000,
    note: "Very light Japanese wood with an open, airy voice.",
  },
];

export const FINISHES: readonly Finish[] = [
  { id: "olive", name: "Olive", color: "#6a6a45", alpha: 0.94, price: 0, kind: "Solid" },
  {
    id: "natural",
    name: "Natural maple",
    color: "#d08a24",
    alpha: 0.32,
    price: 15000,
    kind: "Transparent",
  },
  { id: "cream", name: "Cream", color: "#efe6d0", alpha: 0.95, price: 0, kind: "Solid" },
  { id: "sumi", name: "Sumi", color: "#1c1912", alpha: 0.96, price: 0, kind: "Solid" },
  { id: "ai", name: "Indigo", color: "#2c4a8c", alpha: 0.9, price: 10000, kind: "Solid" },
  {
    id: "kakishibu",
    name: "Kakishibu",
    color: "#8a4b2a",
    alpha: 0.58,
    price: 25000,
    kind: "Persimmon stain, by hand",
    weeks: 2,
  },
];

export const SHEENS: readonly Option[] = [
  { id: "gloss", name: "Gloss nitro", price: 0 },
  { id: "satin", name: "Satin nitro", price: 0 },
];

export const NECK_WOODS: readonly NeckWood[] = [
  { id: "maple", name: "Maple", color: "#e4c48c", price: 0 },
  { id: "roasted", name: "Roasted maple", color: "#b9773f", price: 28000, weeks: 1 },
  { id: "mahogany", name: "Mahogany", color: "#7d3f27", price: 18000 },
];

export const BOARDS: readonly Board[] = [
  { id: "same", name: "Same as the neck", color: null, price: 0 },
  { id: "pauferro", name: "Pau ferro", color: "#5a3a26", price: 8000 },
  { id: "ebony", name: "Ebony", color: "#1e1a17", price: 18000 },
];

export const PROFILES = [
  { value: "c", label: "Medium C · 21 mm" },
  { value: "d", label: "Chunky D · 23 mm" },
  { value: "v", label: "Soft V · 22 mm" },
] as const;

export const PICKUPS: readonly Pickups[] = [
  {
    id: "sss",
    name: "S · S · S",
    layout: ["s", "s", "s"],
    price: 0,
    note: "Three single coils, clear and articulate.",
  },
  {
    id: "hss",
    name: "H · S · S",
    layout: ["s", "s", "h"],
    price: 12000,
    note: "A bridge humbucker for more gain.",
  },
  {
    id: "hh",
    name: "H · H",
    layout: ["h", null, "h"],
    price: 16000,
    note: "Two humbuckers, thick and quiet.",
  },
  {
    id: "p90",
    name: "P-90 · P-90",
    layout: ["p", null, "p"],
    price: 10000,
    note: "Wide coils with biting mids.",
  },
];

export const GUARDS: readonly Guard[] = [
  { id: "mint", name: "Mint", color: "#dfe8d8" },
  { id: "tort", name: "Tortoise", color: "#5a2a14", pattern: true },
  { id: "black", name: "Black", color: "#1f1d19" },
  { id: "cream", name: "Cream", color: "#efe6d0" },
  { id: "none", name: "No pickguard", color: null },
];

export const HARDWARE: readonly Hardware[] = [
  { id: "chrome", name: "Chrome", color: "#c9ccd0", price: 0 },
  { id: "aged", name: "Aged nickel", color: "#a89f86", price: 14000 },
  { id: "black", name: "Black", color: "#2b2a28", price: 8000 },
];

export const EXTRAS = { case: 38000, engraving: 6000 } as const;

export const DEFAULT_CONFIG: GuitarConfig = {
  model: "norikura",
  wood: "alder",
  finish: "olive",
  sheen: "gloss",
  neck: "maple",
  board: "same",
  profile: "c",
  radius: 10,
  frets: 22,
  pickups: "sss",
  guard: "mint",
  hardware: "chrome",
  case: true,
  engraving: "",
  setup: "e",
};

/** Finds an entry by id and falls back to the first one, so a stale id never breaks the page. */
export function byId<T extends { id: string }>(list: readonly T[], id: string): T {
  const found = list.find((item) => item.id === id) ?? list[0];
  if (!found) throw new Error("byId needs a non-empty list");
  return found;
}

export interface Quote {
  /** Label and amount for each priced line, in order. */
  lines: [label: string, amount: number][];
  subtotal: number;
  tax: number;
  total: number;
  deposit: number;
  /** Weeks to build: the model's lead time plus the extra weeks of the chosen options. */
  weeks: number;
}

export const TAX_RATE = 0.1;
export const DEPOSIT_RATE = 0.3;

/** Prices a configuration. Pure: the same config always gives the same quote. */
export function quote(cfg: GuitarConfig): Quote {
  const model = byId(MODELS, cfg.model);
  const wood = byId(BODY_WOODS, cfg.wood);
  const finish = byId(FINISHES, cfg.finish);
  const neck = byId(NECK_WOODS, cfg.neck);
  const board = byId(BOARDS, cfg.board);
  const pickups = byId(PICKUPS, cfg.pickups);
  const hardware = byId(HARDWARE, cfg.hardware);
  const lines: Quote["lines"] = [
    [`Model · ${model.name}`, model.base],
    [`Body · ${wood.name}`, wood.price],
    [`Finish · ${finish.name}`, finish.price],
    [`Neck · ${neck.name}`, neck.price],
    [`Fretboard · ${board.name}`, board.price],
    [`Pickups · ${pickups.name}`, pickups.price],
    [`Hardware · ${hardware.name}`, hardware.price],
  ];
  if (cfg.case) lines.push(["Hard case", EXTRAS.case]);
  if (cfg.engraving.trim()) lines.push(["Heel engraving", EXTRAS.engraving]);
  const subtotal = lines.reduce((sum, [, amount]) => sum + amount, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  return {
    lines,
    subtotal,
    tax,
    total,
    deposit: Math.round(total * DEPOSIT_RATE),
    weeks: model.weeks + (finish.weeks ?? 0) + (neck.weeks ?? 0),
  };
}

export const yen = (amount: number): string => `¥${amount.toLocaleString("en-US")}`;

/** One section of the page that has a fret on the rail. */
export interface RailSection {
  id: string;
  label: string;
  /** The fret the section sits on, 1–12. */
  fret: number;
}

/** The seven stops of the fret rail. Frets 3, 5, 7 and 9 carry single dots; fret 12 the double dot. */
export const RAIL: readonly RailSection[] = [
  { id: "top", label: "Shirakaba", fret: 1 },
  { id: "workshop", label: "Workshop", fret: 3 },
  { id: "models", label: "Models", fret: 5 },
  { id: "build", label: "Build", fret: 7 },
  { id: "process", label: "Weeks", fret: 9 },
  { id: "faq", label: "Questions", fret: 10 },
  { id: "order", label: "Order", fret: 12 },
];

export const LEDGER = [
  { label: "Luthiers", value: "11", unit: "" },
  { label: "Guitars a year", value: "180", unit: "" },
  { label: "Workshop humidity", value: "45", unit: "%" },
  { label: "Weeks from deposit", value: "12", unit: "" },
] as const;

export const WORKSHOP_STEPS = [
  {
    title: "Seasoning · 6 to 18 months",
    content:
      "Boards rest in the north store at 40–50 % humidity. We weigh them every month; they go to the saw only once they stop losing water.",
  },
  {
    title: "Cutting and carving",
    content:
      "Outlines are cut from templates and the contours carved by hand. The neck fits the pocket with no shims.",
  },
  {
    title: "Nitro lacquer",
    content:
      "Thin coats, sanded between each, then three weeks of curing. Kakishibu is rubbed on by hand in four passes.",
  },
  {
    title: "Setup and test",
    content: "Fret dress, action, intonation and an hour of amplified playing before it ships.",
  },
] as const;

/** Progress of the four benches in the "Bench 03" panel, in percent. */
export const BENCH = [
  { label: "Seasoning", value: 100 },
  { label: "Cutting", value: 100 },
  { label: "Finish", value: 45 },
  { label: "Setup", value: 0 },
] as const;

/** A model as it hangs on the wall and stands in the hero column: a fixed example build. */
export const SHOWCASE: Readonly<Record<ModelId, GuitarConfig>> = {
  norikura: { ...DEFAULT_CONFIG, model: "norikura" },
  utsukushi: {
    ...DEFAULT_CONFIG,
    model: "utsukushi",
    wood: "ash",
    finish: "kakishibu",
    board: "pauferro",
    pickups: "p90",
    guard: "tort",
    hardware: "aged",
  },
  kaichi: {
    ...DEFAULT_CONFIG,
    model: "kaichi",
    finish: "cream",
    neck: "roasted",
    board: "ebony",
    pickups: "hh",
    guard: "none",
    hardware: "black",
  },
};

export interface Detail {
  /** Photograph key, see `images.ts`. */
  key: string;
  no: string;
  where: string;
  title: string;
  body: string;
  alt: string;
}

export const DETAILS: readonly Detail[] = [
  {
    key: "det-head",
    no: "01",
    where: "All three models",
    title: "Headstock, 3 + 3",
    body: "Hard maple, a bone nut cut by hand, and the posts set wide so every string runs clear to its tuner.",
    alt: "Macro of a maple 3+3 headstock with the kanji Shirakaba and six chrome tuners",
  },
  {
    key: "det-bridge",
    no: "02",
    where: "Norikura",
    title: "Vibrato, six saddles",
    body: "Each string passes through its own saddle; the arm screws in at the treble corner and rests below the strings.",
    alt: "Macro of a chrome vibrato bridge with six saddles on a mint pickguard",
  },
  {
    key: "det-hardtail",
    no: "03",
    where: "Utsukushi",
    title: "Hardtail, three barrels",
    body: "An aged-nickel plate with three barrel saddles, on ash rubbed with persimmon tannin in four passes.",
    alt: "Macro of an aged-nickel bridge plate with three barrel saddles on stained ash",
  },
  {
    key: "det-slot",
    no: "04",
    where: "Kaichi",
    title: "One sound slot",
    body: "The chambered body opens through a single slot that follows the lower bout, inside cream binding.",
    alt: "Macro of a curved sound slot cut into a cream lacquered body with binding",
  },
];

/** A stage of the twelve-week build. `from`–`to` are the weeks it covers. */
export interface Stage {
  from: number;
  to: number;
  title: string;
  body: string;
  /** Photograph key of the time-lapse frame, see `images.ts`. */
  key: string;
  alt: string;
}

/** Eight stages over twelve weeks; each has one frame from the same camera above the same bench. */
export const STAGES: readonly Stage[] = [
  {
    from: 1,
    to: 1,
    title: "Reservation",
    body: "You pay 30 % and we hold your place in the workshop queue.",
    key: "w01",
    alt: "The bench from above: a sealed envelope and a pen beside a steel rule",
  },
  {
    from: 2,
    to: 2,
    title: "Choosing the boards",
    body: "We send photos of two or three boards so you can pick the grain.",
    key: "w02",
    alt: "The same bench with three blocks of timber, from pale to red-brown, side by side",
  },
  {
    from: 3,
    to: 4,
    title: "Cutting and carving",
    body: "Outlines from templates, contours by hand, the neck fitted with no shims.",
    key: "w03",
    alt: "The same bench with a roughed-out body, a paper template, a spokeshave and a drift of shavings",
  },
  {
    from: 5,
    to: 5,
    title: "Fretwork",
    body: "Frets pressed, levelled with a long beam and crowned one by one.",
    key: "w05",
    alt: "The same bench with a fretted maple neck, a steel levelling beam and a strip of masking tape",
  },
  {
    from: 6,
    to: 8,
    title: "Nitro lacquer",
    body: "Thin coats sanded between each, then three weeks hanging in the drying room.",
    key: "w06",
    alt: "The same bench with an olive-lacquered body resting on a felt pad, and a polishing cloth",
  },
  {
    from: 9,
    to: 10,
    title: "Assembly and setup",
    body: "Electronics, nut, action and intonation. Photos after each stage.",
    key: "w09",
    alt: "The same bench with the guitar assembled, a capo, an Allen key and a stack of setup cards",
  },
  {
    from: 11,
    to: 11,
    title: "An hour of playing",
    body: "Someone who did not build it plays it, amplified, for an hour.",
    key: "w11",
    alt: "The same bench with the finished olive guitar, a coiled cable and a cup of green tea",
  },
  {
    from: 12,
    to: 12,
    title: "Test and ship",
    body: "You pay the balance; it leaves Matsumoto insured, in a wooden crate.",
    key: "w12",
    alt: "The same bench with a wooden crate holding a guitar wrapped in cloth, tied with string",
  },
];

export const FAQ = [
  {
    title: "Do you ship outside Japan?",
    content:
      "On a real site, yes — insured, in a wooden crate. Import duties are paid by the recipient.",
  },
  {
    title: "Can I visit the workshop?",
    content: "On Saturdays by appointment. Matsumoto is about three hours from Tokyo by train.",
  },
  {
    title: "What if I change my mind?",
    content:
      "You can change options until the finish starts. The deposit is refundable before cutting.",
  },
  {
    title: "Is this shop real?",
    content:
      "No. Shirakaba Gakki is fictional — the page shows what the Olivine library looks like on a complete site.",
  },
] as const;

/** Alt text of the atmosphere photographs. */
export const ALT = {
  hands: "A maple workbench by a north window, a body blank and a roll of chisels",
  shed: "Guitar boards standing on end to dry in a dim timber store, snow light at the window",
  birch: "White birch trunks in fresh snow and fog",
} as const;

/** Photograph key of the studio shot of a model. */
export const standKey = (id: ModelId): string => `stand-${id}`;

/** Which pickup photograph (`sw-pu-…`) stands for each pickup layout. */
export const SWATCH_PICKUP: Readonly<Record<string, string>> = {
  sss: "single",
  hss: "humbucker",
  hh: "humbucker",
  p90: "p90",
};
