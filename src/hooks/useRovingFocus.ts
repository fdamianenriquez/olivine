import {
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";

/** Marks a roving root, so items of a nested root are left to that root. */
const ROOT_ATTR = "data-ol-roving";

export interface RovingFocusOptions {
  /** Selects the items inside the root, in DOM order (for example `[role="tab"]`). */
  itemSelector: string;
  /**
   * Arrow keys that move focus. `horizontal`: Left/Right (swapped in RTL). `vertical`: Up/Down.
   * `both`: Left/Right in DOM order, Up/Down to the nearest item in the next visual row. Keys of
   * the other axis are left to the browser, so the page still scrolls.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical" | "both";
  /** Wraps from the last item to the first and back. */
  loop?: boolean;
  /** Matches the selected item (`[aria-selected="true"]`); the tab stop falls back to it. */
  selectedSelector?: string;
  /**
   * Where the tab stop rests. `last`: the last focused item. `selected`: the stop follows focus
   * inside the root and returns to the selected item when focus leaves.
   * @default "last"
   */
  restore?: "last" | "selected";
  /** Called after an arrow, Home or End key moved focus, with the newly focused item. */
  onActiveChange?: (item: HTMLElement, key: string) => void;
}

export interface RovingFocus {
  /** Delegated key handler for the root. Returns whether it handled the key. */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
  /** Put on the root: remembers the focused item. */
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  /** Put on the root: lets `restore: "selected"` return the stop when focus leaves. */
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  /** Moves focus to an item, or to the first or last enabled one. Returns whether it moved. */
  focusItem: (target: HTMLElement | "first" | "last") => boolean;
}

const isDisabled = (el: HTMLElement) => el.matches(":disabled") || el.hasAttribute("data-disabled");

/**
 * Roving `tabindex` over items found in the DOM: the root is one tab stop and arrow keys move
 * between its items. The hook writes `tabindex` itself after every render (callers don't render
 * it), skips disabled items and re-resolves the stop when the active item disappears: remembered
 * focus, then the selected item, then the first enabled one. It never scrolls; `focus()` lets the
 * browser reveal the item. Ctrl, Alt and Meta combinations, IME composition and keys another
 * handler already took are left alone.
 */
export function useRovingFocus(
  rootRef: RefObject<HTMLElement | null>,
  {
    itemSelector,
    orientation = "horizontal",
    loop = false,
    selectedSelector,
    restore = "last",
    onActiveChange,
  }: RovingFocusOptions,
): RovingFocus {
  const last = useRef<HTMLElement | null>(null);

  const items = useCallback((): HTMLElement[] => {
    const root = rootRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(itemSelector)).filter(
      (el) => el.parentElement?.closest(`[${ROOT_ATTR}]`) === root,
    );
  }, [rootRef, itemSelector]);

  const apply = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    root.setAttribute(ROOT_ATTR, "");
    const all = items();
    const enabled = all.filter((el) => !isDisabled(el));
    const remembered = last.current && enabled.includes(last.current) ? last.current : null;
    const selected = selectedSelector
      ? enabled.find((el) => el.matches(selectedSelector))
      : undefined;
    const stop = remembered ?? selected ?? enabled[0];
    for (const el of all) el.setAttribute("tabindex", el === stop ? "0" : "-1");
  }, [rootRef, items, selectedSelector]);

  // Every render: items may have been added, removed, disabled or selected.
  useLayoutEffect(apply);

  const moveTo = (target: HTMLElement) => {
    last.current = target;
    apply();
    target.focus();
  };

  const focusItem = (target: HTMLElement | "first" | "last") => {
    const enabled = items().filter((el) => !isDisabled(el));
    const el =
      target === "first" ? enabled[0] : target === "last" ? enabled[enabled.length - 1] : target;
    if (!el || !enabled.includes(el)) return false;
    moveTo(el);
    return true;
  };

  const nextRow = (from: HTMLElement, enabled: HTMLElement[], down: boolean) => {
    const box = from.getBoundingClientRect();
    const tolerance = box.height / 2;
    const rows = enabled
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box: b }) => (down ? b.top > box.top + tolerance : b.top < box.top - tolerance));
    if (rows.length === 0) return undefined;
    const rowTop = rows.reduce(
      (best, { box: b }) => (Math.abs(b.top - box.top) < Math.abs(best - box.top) ? b.top : best),
      rows[0]?.box.top ?? 0,
    );
    const centre = box.left + box.width / 2;
    return rows
      .filter(({ box: b }) => Math.abs(b.top - rowTop) < tolerance)
      .reduce<{ el: HTMLElement; d: number } | undefined>((best, { el, box: b }) => {
        const d = Math.abs(b.left + b.width / 2 - centre);
        return !best || d < best.d ? { el, d } : best;
      }, undefined)?.el;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return false;
    if (event.nativeEvent.isComposing) return false;
    const root = rootRef.current;
    const current = (event.target as Element).closest<HTMLElement>(itemSelector);
    if (!root || !current || current.parentElement?.closest(`[${ROOT_ATTR}]`) !== root) {
      return false;
    }
    const enabled = items().filter((el) => !isDisabled(el));
    if (enabled.length === 0) return false;
    const index = enabled.indexOf(current);
    const step = (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < enabled.length) return enabled[next];
      return loop ? enabled[(next + enabled.length) % enabled.length] : undefined;
    };
    const rtl = getComputedStyle(current).direction === "rtl";
    const horizontal = orientation !== "vertical";
    const vertical = orientation !== "horizontal";

    let target: HTMLElement | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowLeft":
        if (!horizontal) return false;
        target = step((event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1));
        break;
      case "ArrowDown":
      case "ArrowUp":
        if (!vertical) return false;
        target =
          orientation === "both"
            ? nextRow(current, enabled, event.key === "ArrowDown")
            : step(event.key === "ArrowDown" ? 1 : -1);
        break;
      case "Home":
        target = enabled[0];
        break;
      case "End":
        target = enabled[enabled.length - 1];
        break;
      default:
        return false;
    }
    if (!target) return false;
    event.preventDefault();
    if (target !== current) {
      moveTo(target);
      onActiveChange?.(target, event.key);
    }
    return true;
  };

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    const item = (event.target as Element).closest<HTMLElement>(itemSelector);
    if (item && items().includes(item) && last.current !== item) {
      last.current = item;
      apply();
    }
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (restore !== "selected") return;
    const next = event.relatedTarget as Node | null;
    if (next && rootRef.current?.contains(next)) return;
    last.current = null;
    apply();
  };

  return { onKeyDown, onFocus, onBlur, focusItem };
}
