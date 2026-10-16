// Shirakaba Gakki: a fictional catalogue. Prices are in JPY, before consumption tax.
// Brand, models, people and prices are invented for this demo.
import birch from "./images/birch-forest.webp";
import frets from "./images/fret-levelling.webp";
import hero from "./images/hero-alps.webp";
import shed from "./images/winter-timber.webp";
import hands from "./images/workshop-hands.webp";

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

export interface ImageSlot {
  file: string;
  /** CSS aspect-ratio, e.g. "21/9". */
  ratio: string;
  /** Imported image URL. Leave empty to show a labelled placeholder. */
  src: string;
  /** CSS object-position for the crop. */
  pos?: string;
  alt: string;
}

/** Photography slots. Each image is bundled by Vite from ./images. */
export const IMAGES = {
  hero: {
    file: "hero-alps.webp",
    ratio: "21/9",
    src: hero,
    pos: "8% 55%",
    alt: "Snow on the Northern Alps at dawn, seen across the Matsumoto basin",
  },
  hands: {
    file: "workshop-hands.webp",
    ratio: "4/5",
    src: hands,
    alt: "A luthier's hands carving the edge of a guitar body",
  },
  shed: {
    file: "winter-timber.webp",
    ratio: "21/9",
    src: shed,
    pos: "60% 50%",
    alt: "Guitar timber stickered to dry in a wooden shed, snow outside",
  },
  frets: {
    file: "fret-levelling.webp",
    ratio: "3/2",
    src: frets,
    alt: "Close-up of frets being levelled on a maple neck",
  },
  birch: {
    file: "birch-forest.webp",
    ratio: "21/9",
    src: birch,
    pos: "30% 50%",
    alt: "White birch trees in morning mist",
  },
} satisfies Record<string, ImageSlot>;
