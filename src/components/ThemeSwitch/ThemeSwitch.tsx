import {
  forwardRef,
  type HTMLAttributes,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { SegmentedControl, type SegmentedControlOption } from "../SegmentedControl";

/** A colour theme: `washi` (light), `sumi` (dark) or `auto` (follows the system). */
export type ThemeName = "washi" | "sumi" | "auto";

const ALL_THEMES: readonly ThemeName[] = ["washi", "sumi", "auto"];
const ATTRIBUTE = "data-theme";

export interface ThemeSwitchProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children"
> {
  /** Selected theme (controlled). Feed the same value to `Root theme`. */
  value?: ThemeName;
  /**
   * Initial theme when uncontrolled, used when neither storage nor the `data-theme` of `target`
   * already holds one.
   * @default "washi"
   */
  defaultValue?: ThemeName;
  /** Called with the theme the user picked (and with a stored choice restored on mount). */
  onChange?: (theme: ThemeName) => void;
  /**
   * The themes offered, in display order (two or three).
   * @default ["washi", "sumi", "auto"]
   */
  themes?: readonly ThemeName[];
  /**
   * Element that receives `data-theme` when uncontrolled. Ignored when controlled.
   * @default document.documentElement
   */
  target?: HTMLElement | RefObject<HTMLElement | null> | null;
  /**
   * When set, the choice is read from and saved to `localStorage` under this key. Unavailable
   * storage and invalid stored values are ignored.
   */
  storageKey?: string;
  /** Accessible name of the group. Defaults to the locale's `theme` ("Theme"). */
  label?: string;
  /**
   * Control height: 32, 44 or 56px.
   * @default "s"
   */
  size?: "s" | "m" | "l";
  /** Full width with equal cells. */
  fill?: boolean;
  /** Stacks the cells in a column. */
  vertical?: boolean;
  /** Disables the whole control. */
  disabled?: boolean;
}

function isTheme(value: unknown): value is ThemeName {
  return typeof value === "string" && (ALL_THEMES as readonly string[]).includes(value);
}

function resolveTarget(target: ThemeSwitchProps["target"]): HTMLElement | null {
  if (target === undefined) {
    return typeof document === "undefined" ? null : document.documentElement;
  }
  if (target === null) return null;
  return "current" in target ? target.current : target;
}

function readStored(key: string | undefined): ThemeName | undefined {
  if (key === undefined) return undefined;
  try {
    const stored = window.localStorage.getItem(key);
    return isTheme(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

function writeStored(key: string | undefined, theme: ThemeName): void {
  if (key === undefined) return;
  try {
    window.localStorage.setItem(key, theme);
  } catch {
    // Storage is full, blocked or unavailable: the choice still applies for this page.
  }
}

/**
 * A three-way control for the colour theme: light (`washi`), dark (`sumi`) or auto, which
 * follows the system. A single-choice `SegmentedControl` named "Theme".
 *
 * Controlled (`value` / `onChange`), it only reports the choice: pass the same value to
 * `Root theme`. Uncontrolled, it reads and writes `data-theme` on `<html>` (or `target`) and
 * stays in sync with any other switch that drives the same element. `storageKey` opts in to
 * remembering the choice in `localStorage`. The theme changes instantly.
 */
export const ThemeSwitch = forwardRef<HTMLDivElement, ThemeSwitchProps>(function ThemeSwitch(
  {
    value,
    defaultValue,
    onChange,
    themes = ALL_THEMES,
    target,
    storageKey,
    label,
    size = "s",
    fill = false,
    vertical = false,
    disabled = false,
    className,
    ...rest
  },
  ref,
) {
  const labels = useLabels();
  const controlled = value !== undefined;
  const [inner, setInner] = useState<ThemeName>(defaultValue ?? "washi");
  const current = controlled ? value : inner;

  // The latest props, read by the mount and observer effects without re-running them.
  const latest = useRef({ onChange, defaultValue, value, controlled });
  latest.current = { onChange, defaultValue, value, controlled };

  // Restore the stored choice, else adopt the theme the target already carries. It runs before
  // paint; a ref to an ancestor is attached only after this component's layout effects, so that
  // case waits for the passive effect.
  const restored = useRef(false);
  const restore = useCallback(
    (late: boolean) => {
      if (restored.current) return;
      const pending = target != null && "current" in target && target.current === null;
      if (pending && !late) return;
      restored.current = true;
      const stored = readStored(storageKey);
      const { controlled: isControlled, value: own, defaultValue: initial } = latest.current;
      if (isControlled) {
        if (stored !== undefined && stored !== own) latest.current.onChange?.(stored);
        return;
      }
      const element = resolveTarget(target);
      const existing = element?.getAttribute(ATTRIBUTE);
      const next = stored ?? (isTheme(existing) ? existing : initial);
      if (next === undefined) return;
      setInner(next);
      if (element && existing !== next) element.setAttribute(ATTRIBUTE, next);
    },
    [storageKey, target],
  );
  useIsomorphicLayoutEffect(() => {
    restored.current = false;
    restore(false);
  }, [restore]);
  useEffect(() => {
    restore(true);
  }, [restore]);

  // Follow changes made to the target by another switch or by the app.
  useEffect(() => {
    if (controlled || typeof MutationObserver === "undefined") return undefined;
    const element = resolveTarget(target);
    if (!element) return undefined;
    const observer = new MutationObserver(() => {
      const theme = element.getAttribute(ATTRIBUTE);
      if (isTheme(theme)) setInner(theme);
    });
    observer.observe(element, { attributes: true, attributeFilter: [ATTRIBUTE] });
    return () => {
      observer.disconnect();
    };
  }, [controlled, target]);

  const select = useCallback(
    (next: string) => {
      if (!isTheme(next)) return;
      if (!controlled) {
        setInner(next);
        resolveTarget(target)?.setAttribute(ATTRIBUTE, next);
      }
      writeStored(storageKey, next);
      onChange?.(next);
    },
    [controlled, target, storageKey, onChange],
  );

  const offered = themes.filter((t, i) => isTheme(t) && themes.indexOf(t) === i);
  const count = offered.length;
  const invalid = themes.length !== count;
  useEffect(() => {
    if (count < 2 || count > 3 || invalid) {
      devWarn(
        "ThemeSwitch",
        '`themes` takes two or three distinct values of "washi", "sumi" and "auto".',
      );
    }
  }, [count, invalid]);

  const options: SegmentedControlOption[] = offered.map((theme) => ({
    value: theme,
    label: labels.themes[theme],
  }));

  // An `aria-labelledby` from the app replaces the built-in name.
  const name = label ?? (rest["aria-labelledby"] ? undefined : labels.theme);

  return (
    <SegmentedControl
      {...rest}
      ref={ref}
      {...(name !== undefined && { label: name })}
      options={options}
      value={offered.includes(current) ? current : null}
      onChange={select}
      size={size}
      fill={fill}
      vertical={vertical}
      disabled={disabled}
      className={cx("ol-themeswitch", className)}
      data-state={current}
    />
  );
});
