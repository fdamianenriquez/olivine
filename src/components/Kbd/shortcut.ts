/**
 * Shortcut model shared by Kbd and every component that shows or announces a key combination
 * (Dropdown items, CommandPalette items, Tooltip hints).
 */

import type { KbdKeyLabels } from "../../locale/types";

/**
 * A key or a chord. A string joins keys with `+` (`"mod+shift+p"`, `"mod++"` for the plus key);
 * an array lists one key per entry (`["mod", "k"]`). Glyph strings such as `"⇧⌘P"` or
 * `["⌘", "K"]` are read too.
 */
export type Shortcut = string | readonly string[];

/** Platform whose keyboard the shortcut is drawn for. `unknown`: not detected (yet). */
export type KbdPlatform = "apple" | "other" | "unknown";

/** Named keys. Anything else is a literal legend (`K`, `7`, `F5`). */
export type KeyToken =
  | "mod"
  | "meta"
  | "ctrl"
  | "alt"
  | "shift"
  | "enter"
  | "esc"
  | "tab"
  | "space"
  | "backspace"
  | "delete"
  | "up"
  | "down"
  | "left"
  | "right";

export type { KbdKeyLabels } from "../../locale/types";

/** One cap, ready to render. */
export interface FormattedKey {
  /** The named key, or `null` for a literal legend. */
  token: KeyToken | null;
  /** Visible legend. */
  text: string;
  /** Spoken name, only when it differs from `text` (glyphs and abbreviations). */
  name?: string;
}

const ALIASES: Readonly<Record<string, KeyToken>> = {
  mod: "mod",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  win: "meta",
  windows: "meta",
  super: "meta",
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  opt: "alt",
  option: "alt",
  shift: "shift",
  enter: "enter",
  return: "enter",
  esc: "esc",
  escape: "esc",
  tab: "tab",
  space: "space",
  spacebar: "space",
  backspace: "backspace",
  delete: "delete",
  del: "delete",
  up: "up",
  arrowup: "up",
  down: "down",
  arrowdown: "down",
  left: "left",
  arrowleft: "left",
  right: "right",
  arrowright: "right",
};

/**
 * Glyphs written literally map back to their key. A literal ⌘ means the primary modifier
 * (`mod`): shortcut data written with Apple symbols shows Ctrl on other platforms.
 */
const GLYPHS: Readonly<Record<string, KeyToken>> = {
  "⌘": "mod",
  "⌥": "alt",
  "⇧": "shift",
  "⌃": "ctrl",
  "↵": "enter",
  "⏎": "enter",
  "↩": "enter",
  "⎋": "esc",
  "⇥": "tab",
  "␣": "space",
  "⌫": "backspace",
  "⌦": "delete",
  "↑": "up",
  "↓": "down",
  "←": "left",
  "→": "right",
};

const MODIFIER_GLYPHS = new Set(["⌘", "⌥", "⇧", "⌃"]);

function tokenOf(key: string): KeyToken | null {
  return ALIASES[key.toLowerCase()] ?? GLYPHS[key] ?? null;
}

/** Splits `"mod+k"` on `+`, keeping a `+` that is itself the key (`"mod++"`, `"+"`). */
function splitChord(value: string): string[] {
  return value.split(/(?<!^|\+)\+/).filter((part) => part !== "");
}

/** Peels leading modifier glyphs off a glued legacy string: `"⇧⌘P"` → `⇧`, `⌘`, `P`. */
function splitGlued(part: string): string[] {
  const out: string[] = [];
  let rest = part;
  while (rest.length > 1 && tokenOf(rest) === null) {
    const first = Array.from(rest)[0] ?? "";
    if (!MODIFIER_GLYPHS.has(first)) break;
    out.push(first);
    rest = rest.slice(first.length);
  }
  out.push(rest);
  return out;
}

/**
 * Normalises a shortcut to one entry per key: a {@link KeyToken} name, or the literal legend.
 * Single letters are uppercased (`k` → `K`).
 */
export function parseShortcut(shortcut: Shortcut): string[] {
  const parts =
    typeof shortcut === "string"
      ? splitChord(shortcut.trim()).flatMap(splitGlued)
      : shortcut.filter((part) => part !== "");
  return parts.map((part) => {
    const token = tokenOf(part);
    if (token) return token;
    const upper = part.toUpperCase();
    return Array.from(part).length === 1 && Array.from(upper).length === 1 ? upper : part;
  });
}

/** Apple glyphs: the same in every language. */
const APPLE: Readonly<Record<Exclude<KeyToken, "mod" | "space">, string>> = {
  meta: "⌘",
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
  enter: "↵",
  esc: "esc",
  tab: "⇥",
  backspace: "⌫",
  delete: "⌦",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

/** Spoken name of each key per platform family. */
function nameOf(token: KeyToken, apple: boolean, l: KbdKeyLabels): string {
  switch (token) {
    case "mod":
      return l.commandOrControl;
    case "meta":
      return apple ? l.command : l.windows;
    case "ctrl":
      return l.control;
    case "alt":
      return apple ? l.option : l.alt;
    case "esc":
      return l.escape;
    default:
      return l[token];
  }
}

/** Where each key's non-Apple legend lives in {@link KbdKeyLabels}; arrows keep their glyph. */
const LEGENDS: Readonly<Partial<Record<KeyToken, keyof KbdKeyLabels>>> = {
  meta: "metaLegend",
  ctrl: "ctrlLegend",
  alt: "altLegend",
  shift: "shiftLegend",
  enter: "enterLegend",
  esc: "escLegend",
  tab: "tabLegend",
  space: "spaceLegend",
  backspace: "backspaceLegend",
  delete: "deleteLegend",
};

function formatToken(token: KeyToken, platform: KbdPlatform, labels?: KbdKeyLabels): FormattedKey {
  if (token === "mod") {
    if (platform === "apple") return { ...formatToken("meta", platform, labels), token };
    if (platform === "other") return { ...formatToken("ctrl", platform, labels), token };
    const text = `${APPLE.meta} / ${labels ? labels.ctrlLegend : APPLE.ctrl}`;
    return labels ? { token, text, name: labels.commandOrControl } : { token, text };
  }
  const apple = platform === "apple";
  let text: string;
  if (token === "space") text = labels ? labels.spaceLegend : "␣";
  else if (apple || !labels) text = APPLE[token];
  else {
    const legend = LEGENDS[token];
    text = legend ? labels[legend] : APPLE[token];
  }
  if (!labels) return { token, text };
  const name = nameOf(token, apple, labels);
  return name === text ? { token, text } : { token, text, name };
}

/** Options of {@link formatShortcut}. */
export interface FormatShortcutOptions {
  /** Keyboard to draw for. Default `unknown` (`mod` shows ⌘ / Ctrl). */
  platform?: KbdPlatform;
  /**
   * Key words of the current language (`useLabels().keys`). Without them legends fall back to
   * the Apple glyphs and no spoken names are given.
   */
  labels?: KbdKeyLabels | undefined;
}

/** Resolves a shortcut to one {@link FormattedKey} per cap, for the platform and language. */
export function formatShortcut(
  shortcut: Shortcut,
  { platform = "unknown", labels }: FormatShortcutOptions = {},
): FormattedKey[] {
  return parseShortcut(shortcut).map((part) => {
    const token = tokenOf(part);
    return token ? formatToken(token, platform, labels) : { token: null, text: part };
  });
}

const ARIA: Readonly<Record<Exclude<KeyToken, "mod">, string>> = {
  meta: "Meta",
  ctrl: "Control",
  alt: "Alt",
  shift: "Shift",
  enter: "Enter",
  esc: "Escape",
  tab: "Tab",
  space: "Space",
  backspace: "Backspace",
  delete: "Delete",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

/**
 * The `aria-keyshortcuts` value of a shortcut. Set it on the element that performs the action,
 * and only while the shortcut is bound and the element enabled. With an `unknown` platform,
 * `mod` gives both alternatives: `"Meta+K Control+K"`.
 */
export function toAriaKeyShortcuts(shortcut: Shortcut, platform: KbdPlatform = "unknown"): string {
  const parts = parseShortcut(shortcut);
  const join = (mod: string) =>
    parts
      .map((part) => {
        if (part === "mod") return mod;
        const token = tokenOf(part);
        if (token && token !== "mod") return ARIA[token];
        return part === "+" ? "Plus" : part.replace(/\s+/g, "");
      })
      .join("+");
  if (!parts.includes("mod")) return join("");
  if (platform === "apple") return join("Meta");
  if (platform === "other") return join("Control");
  return `${join("Meta")} ${join("Control")}`;
}
