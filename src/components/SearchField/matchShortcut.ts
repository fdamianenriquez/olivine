import { type KbdPlatform, parseShortcut, type Shortcut } from "../Kbd";

const MODIFIERS = new Set(["mod", "meta", "ctrl", "alt", "shift"]);

/** `event.key` of each named key that is not a modifier. */
const KEYS: Readonly<Record<string, string>> = {
  enter: "Enter",
  esc: "Escape",
  tab: "Tab",
  space: " ",
  backspace: "Backspace",
  delete: "Delete",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

/** True when the shortcut has no Ctrl, Command or Alt: a bare character such as `/`. */
export function isBareShortcut(shortcut: Shortcut): boolean {
  return !parseShortcut(shortcut).some((part) => part !== "shift" && MODIFIERS.has(part));
}

/** The physical key of a letter or digit, so Alt or Option chords still match on macOS. */
function codeOf(key: string): string | undefined {
  if (/^[A-Z]$/.test(key)) return `Key${key}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return undefined;
}

/**
 * Whether a keydown is the shortcut. `mod` is Command on Apple keyboards and Ctrl elsewhere;
 * with an unknown platform either one counts. Shift is ignored for a symbol key the shortcut
 * does not name it for (`?` needs Shift on many layouts).
 */
export function matchShortcut(
  event: KeyboardEvent,
  shortcut: Shortcut,
  platform: KbdPlatform,
): boolean {
  const parts = parseShortcut(shortcut);
  const keys = parts.filter((part) => !MODIFIERS.has(part));
  const [key] = keys;
  if (key === undefined || keys.length !== 1) return false;

  const has = (part: string) => parts.includes(part);
  const mod = has("mod");
  const chord = (meta: boolean, ctrl: boolean) =>
    event.metaKey === meta && event.ctrlKey === ctrl && event.altKey === has("alt");
  const withMeta = chord(true, has("ctrl"));
  const withCtrl = chord(has("meta"), true);
  const modifiersMatch = !mod
    ? chord(has("meta"), has("ctrl"))
    : platform === "apple"
      ? withMeta
      : platform === "other"
        ? withCtrl
        : withMeta || withCtrl;
  if (!modifiersMatch) return false;

  const named = KEYS[key];
  const symbol = named === undefined && !/^[A-Z0-9]$/.test(key) && Array.from(key).length === 1;
  if (!symbol && event.shiftKey !== has("shift")) return false;
  if (symbol && has("shift") && !event.shiftKey) return false;

  if (named !== undefined) return event.key === named;
  if (event.key.toLowerCase() === key.toLowerCase()) return true;
  const code = codeOf(key);
  return code !== undefined && event.code === code;
}
