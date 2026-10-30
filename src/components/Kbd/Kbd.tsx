import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { formatShortcut, type FormattedKey, type KbdKeyLabels, type Shortcut } from "./shortcut";
import { type KbdPlatformSetting, useResolvedKbdPlatform } from "./useKbdPlatform";

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /**
   * The key or chord: `"mod+k"`, `["mod", "shift", "p"]`, or glyphs such as `"⇧⌘P"`. Named
   * keys: `mod meta ctrl alt shift enter esc tab space backspace delete up down left right`;
   * anything else is a literal legend (`K`, `F5`). `mod` is ⌘ on Apple and Ctrl elsewhere.
   * Omit it to draw one literal cap from `children`.
   */
  keys?: Shortcut;
  /**
   * Keyboard to draw for. `auto` detects it in the browser.
   * @default the nearest `Root platform`, else `"auto"`
   */
  platform?: KbdPlatformSetting;
  /**
   * Transparent cap with `on-ink` text and border, for ink grounds (selected rows, tooltips).
   * @default false
   */
  inverse?: boolean;
  /** Replaces what assistive tech reads for the whole shortcut. The caps stay visible. */
  label?: string;
  /** The literal legend of a single cap, used when `keys` is omitted. */
  children?: ReactNode;
}

export type KbdGroupProps = HTMLAttributes<HTMLElement>;

/** Words of the current locale; dictionaries built before `keys` existed have none. */
function useKeyLabels(): KbdKeyLabels | undefined {
  return useLabels().keys;
}

/** Symbol legends (⌘ ⌥ ⇧ ← →): one system symbol face, so every arrow and modifier matches. */
const SYMBOL = /^[^\p{L}\p{N}]+$/u;

function Legend({ part, silent }: { part: FormattedKey; silent: boolean }) {
  const glyph = SYMBOL.test(part.text) && part.text.trim() !== "" ? "ol-kbd__glyph" : undefined;
  if (silent) {
    return (
      <span aria-hidden="true" className={glyph}>
        {part.text}
      </span>
    );
  }
  if (part.name === undefined)
    return glyph ? <span className={glyph}>{part.text}</span> : part.text;
  return (
    <>
      <span aria-hidden="true" className={glyph}>
        {part.text}
      </span>
      <span className="ol-sr">{part.name}</span>
    </>
  );
}

/**
 * Several caps read as one combination: `<kbd class="ol-kbd-group">` around one `Kbd` per key,
 * 4px apart, always left to right. `Kbd keys` builds it for you; use this for hand-built
 * combinations.
 */
export const KbdGroup = forwardRef<HTMLElement, KbdGroupProps>(function KbdGroup(
  { className, ...rest },
  ref,
) {
  return <kbd ref={ref} className={cx("ol-kbd-group", className)} {...rest} />;
});

/**
 * A key or shortcut drawn as a keycap. Glyphs and abbreviations carry their spoken name in
 * visually hidden text from the locale, so "⌘" is read as "Command".
 */
export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd(
  { keys, platform, inverse = false, label, className, children, ...rest },
  ref,
) {
  const resolved = useResolvedKbdPlatform(platform);
  const labels = useKeyLabels();
  const capClass = cx("ol-kbd", inverse && "ol-kbd--inverse");
  const parts = keys === undefined ? [] : formatShortcut(keys, { platform: resolved, labels });
  const silent = label !== undefined;
  const spoken = silent ? <span className="ol-sr">{label}</span> : null;

  if (parts.length === 0) {
    return (
      <kbd ref={ref} className={cx(capClass, className)} {...rest}>
        {silent ? <span aria-hidden="true">{children}</span> : children}
        {spoken}
      </kbd>
    );
  }

  if (parts.length === 1) {
    const [part] = parts as [FormattedKey];
    return (
      <kbd ref={ref} className={cx(capClass, className)} {...rest}>
        <Legend part={part} silent={silent} />
        {spoken}
      </kbd>
    );
  }

  return (
    <kbd ref={ref} className={cx("ol-kbd-group", className)} {...rest}>
      {parts.map((part, index) => (
        // Keys can repeat (⇧ ⇧), so the position is the identity.
        <kbd key={index} className={capClass}>
          <Legend part={part} silent={silent} />
        </kbd>
      ))}
      {spoken}
    </kbd>
  );
});
