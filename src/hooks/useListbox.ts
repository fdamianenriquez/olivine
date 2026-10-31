import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import { isImeKey } from "../utils/ime";
import { reveal, visibleText } from "../utils/listItems";
import { useControllable } from "./useControllable";
import { useIsomorphicLayoutEffect } from "./useFloating";
import { useRovingFocus } from "./useRovingFocus";
import { useTypeahead } from "./useTypeahead";

const OPTION = '[role="option"]';
/** Marks a listbox root, so options of a nested list are left to that list. */
const ROOT_ATTR = "data-ol-listbox";

/** Where a highlight came from: keyboard and filter moves scroll the list, the pointer does not. */
export type HighlightSource = "keyboard" | "pointer" | "filter";

export interface ListboxOptions {
  /**
   * `dom`: options take real focus (roving tabindex), for a list on the page. `virtual`: focus
   * stays on a controller such as a text input, which points `aria-activedescendant` at the
   * active option (Combobox, CommandPalette).
   * @default "dom"
   */
  focus?: "dom" | "virtual";
  /** Several options can be selected; `selected` keeps the order they were chosen in. */
  multiple?: boolean;
  /** Selected values (controlled). */
  selected?: readonly string[] | undefined;
  /** Selected values at first render (uncontrolled). */
  defaultSelected?: readonly string[];
  /** Called with the new selection when it changes. */
  onSelectedChange?: ((selected: string[]) => void) | undefined;
  /** Called on every deliberate pick, even one that leaves the selection unchanged. */
  onAction?: ((value: string, event: SyntheticEvent) => void) | undefined;
  /** Single selection: picking the selected option again clears it. */
  deselectable?: boolean;
  /** Single selection: arrow keys select the option they move to. */
  selectionFollowsFocus?: boolean;
  /** Disables every option. */
  disabled?: boolean;
  /** Arrow keys wrap at the ends. @default false for `dom`, true for `virtual` */
  loop?: boolean;
  /** Typing jumps to an option by its text (`dom` only). @default true */
  typeahead?: boolean;
  /** Mouse and pen movement highlight the option under the pointer. @default focus === "virtual" */
  highlightOnHover?: boolean;
  /**
   * `virtual` only: what is active when nothing is, or when the active option disappears.
   * @default "none"
   */
  autoHighlight?: "selected" | "first" | "none";
  /** Called after a bulk change (range, select all, clear) with the number now selected. */
  onBulkChange?: ((count: number) => void) | undefined;
}

export interface OptionState {
  disabled?: boolean | undefined;
  /** Plain text of the option, when its label is not plain text (typeahead reads it). */
  textValue?: string | undefined;
}

/** Selection helpers, pure so they can be tested without a DOM. */
export function toggleValue(selected: readonly string[], value: string): string[] {
  return selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
}

/**
 * Adds the options between `from` and `to` (inclusive, in list order, enabled only) to the
 * selection, keeping what is already selected and its order.
 */
export function addRange(
  selected: readonly string[],
  order: readonly string[],
  enabled: ReadonlySet<string>,
  from: string | null,
  to: string,
): string[] {
  const end = order.indexOf(to);
  const start = from === null ? end : order.indexOf(from);
  if (end === -1) return [...selected];
  const [lo, hi] = start === -1 ? [end, end] : [Math.min(start, end), Math.max(start, end)];
  const added = order.slice(lo, hi + 1).filter((v) => enabled.has(v) && !selected.includes(v));
  return [...selected, ...added];
}

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const isDisabled = (el: Element) => el.hasAttribute("data-disabled");
const valueOf = (el: Element) => el.getAttribute("data-value") ?? "";

/**
 * Behaviour of a listbox (APG listbox) as prop getters with no markup: selection (single or
 * multiple, APG recommended keys), the active option in two focus models, typeahead and
 * scrolling the list (never the page). Options are found in the DOM (`[role="option"]` with
 * `data-value`), so groups and headings in between are transparent. Shared by Listbox,
 * Combobox and the TimePicker columns. Escape, Left/Right and Tab are never handled.
 */
export function useListbox({
  focus = "dom",
  multiple = false,
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  onAction,
  deselectable = false,
  selectionFollowsFocus = false,
  disabled = false,
  loop = focus === "virtual",
  typeahead: typeaheadOn = true,
  highlightOnHover = focus === "virtual",
  autoHighlight = "none",
  onBulkChange,
}: ListboxOptions = {}) {
  const virtual = focus === "virtual";
  const listRef = useRef<HTMLElement | null>(null);
  const baseId = useId();
  const [selected, setSelected] = useControllable<readonly string[]>(
    selectedProp,
    defaultSelected,
    onSelectedChange as ((next: readonly string[]) => void) | undefined,
  );
  const [active, setActiveState] = useState<string | null>(null);
  const [focusVisible, setFocusVisible] = useState(false);
  const anchor = useRef<string | null>(null);
  const shiftMove = useRef(false);
  const typeahead = useTypeahead();

  const optionId = useCallback(
    (value: string) => `${baseId}-o-${encodeURIComponent(value).replace(/%/g, "_")}`,
    [baseId],
  );

  const options = useCallback((): HTMLElement[] => {
    const root = listRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(OPTION)).filter(
      (el) => el.parentElement?.closest(`[${ROOT_ATTR}]`) === root,
    );
  }, []);
  const enabledOptions = () => (disabled ? [] : options().filter((el) => !isDisabled(el)));
  const find = (value: string) => options().find((el) => valueOf(el) === value);

  const commit = (next: string[], bulk = false) => {
    if (!same(next, selected)) setSelected(next);
    if (bulk) onBulkChange?.(next.length);
  };

  /** Picks an option: replace or toggle, or a range from the last pick with `range`. */
  const choose = (value: string, event: SyntheticEvent, range = false) => {
    const el = find(value);
    if (disabled || !el || isDisabled(el)) return;
    if (multiple && range) {
      const all = options();
      const enabled = new Set(all.filter((o) => !isDisabled(o)).map(valueOf));
      commit(addRange(selected, all.map(valueOf), enabled, anchor.current, value), true);
    } else if (multiple) {
      commit(toggleValue(selected, value));
    } else if (selected[0] === value) {
      if (deselectable) commit([]);
    } else {
      commit([value]);
    }
    anchor.current = value;
    onAction?.(value, event);
  };

  const setActive = useCallback(
    (value: string | null, source: HighlightSource = "keyboard") => {
      setActiveState(value);
      setFocusVisible(value !== null && source === "keyboard");
      if (value === null || source === "pointer") return;
      const root = listRef.current;
      const el = root?.querySelector<HTMLElement>(`#${CSS.escape(optionId(value))}`);
      if (root && el) reveal(root, el);
    },
    [optionId],
  );

  // dom: roving tabindex over the options; Up/Down are kept from the page at the ends.
  const roving = useRovingFocus(listRef, {
    itemSelector: OPTION,
    orientation: "vertical",
    loop,
    selectedSelector: '[aria-selected="true"]',
    preventScroll: true,
    consumeEnds: true,
    onActiveChange: (item, key) => {
      const root = listRef.current;
      if (root) reveal(root, item);
      const value = valueOf(item);
      if (multiple && shiftMove.current && key.startsWith("Arrow")) {
        commit(toggleValue(selected, value));
        anchor.current = value;
      } else if (!multiple && selectionFollowsFocus) {
        commit([value]);
        anchor.current = value;
      }
    },
  });

  // virtual: keep the active option valid as the options change (filtering).
  useIsomorphicLayoutEffect(() => {
    if (!virtual) return;
    const enabled = enabledOptions().map(valueOf);
    if (active !== null && enabled.includes(active)) return;
    const next =
      autoHighlight === "first"
        ? (enabled[0] ?? null)
        : autoHighlight === "selected"
          ? (enabled.find((v) => selected.includes(v)) ?? null)
          : null;

    if (next !== active) setActive(next, "filter");
  });

  /** Moves the active option by `delta` (virtual), or to the first or last. */
  const move = (to: number | "first" | "last") => {
    const enabled = enabledOptions().map(valueOf);
    if (enabled.length === 0) return;
    const index = active === null ? -1 : enabled.indexOf(active);
    let next: number;
    if (to === "first") next = 0;
    else if (to === "last") next = enabled.length - 1;
    else if (index === -1) next = to > 0 ? 0 : enabled.length - 1;
    else {
      next = index + to;
      if (next < 0 || next >= enabled.length) {
        next = loop ? (next + enabled.length) % enabled.length : index;
      }
    }
    setActive(enabled[next] ?? null, "keyboard");
  };

  /** Picks the active option. Returns whether there was one to pick. */
  const selectActive = (event: SyntheticEvent): boolean => {
    if (active === null) return false;
    choose(active, event);
    return true;
  };

  /** Moves focus (dom) or the highlight (virtual) to an option. */
  const focusOption = (target: "first" | "last" | "selected" | (string & {})) => {
    const enabled = enabledOptions();
    const el =
      target === "first"
        ? enabled[0]
        : target === "last"
          ? enabled[enabled.length - 1]
          : target === "selected"
            ? (enabled.find((o) => selected.includes(valueOf(o))) ?? enabled[0])
            : enabled.find((o) => valueOf(o) === target);
    if (!el) return false;
    if (virtual) {
      setActive(valueOf(el), "keyboard");
      return true;
    }
    const root = listRef.current;
    if (root) reveal(root, el, "center");
    return roving.focusItem(el);
  };

  const pageSize = () => {
    const root = listRef.current;
    const row = options()[0]?.getBoundingClientRect().height ?? 0;
    return root && row > 0 ? Math.max(1, Math.floor(root.clientHeight / row)) : 10;
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (virtual || event.defaultPrevented || isImeKey(event) || disabled) return;
    const current = (event.target as Element).closest<HTMLElement>(OPTION);
    if (!current) return;
    const value = valueOf(current);
    const mod = event.ctrlKey || event.metaKey;
    const enabled = enabledOptions();

    if (multiple && mod && !event.shiftKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      const all = enabled.map(valueOf);
      commit(
        all.every((v) => selected.includes(v))
          ? []
          : [...selected, ...all.filter((v) => !selected.includes(v))],
        true,
      );
      return;
    }
    if (multiple && mod && event.shiftKey && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      const edge = event.key === "Home" ? enabled[0] : enabled[enabled.length - 1];
      if (!edge) return;
      anchor.current = value;
      const all = options();
      commit(
        addRange(selected, all.map(valueOf), new Set(enabled.map(valueOf)), value, valueOf(edge)),
        true,
      );
      roving.focusItem(edge);
      return;
    }
    if (event.key === "PageDown" || event.key === "PageUp") {
      event.preventDefault();
      const index = enabled.indexOf(current);
      const step = pageSize() * (event.key === "PageDown" ? 1 : -1);
      const el = enabled[Math.min(enabled.length - 1, Math.max(0, index + step))];
      if (el && el !== current) {
        roving.focusItem(el);
        const root = listRef.current;
        if (root) reveal(root, el);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(value, event);
      return;
    }
    shiftMove.current = event.shiftKey;
    if (roving.onKeyDown(event)) return;
    if (typeaheadOn) {
      const hit = typeahead.onKeyDown(event, enabled, current, visibleText);
      if (hit !== undefined) {
        if (hit) {
          roving.focusItem(hit);
          const root = listRef.current;
          if (root) reveal(root, hit);
        }
        return;
      }
    }
    if (event.key === " ") {
      event.preventDefault();
      choose(value, event, multiple && event.shiftKey);
    }
  };

  const getListboxProps = <P extends Record<string, unknown>>(user: P = {} as P) => ({
    ...user,
    ref: (node: HTMLElement | null) => {
      listRef.current = node;
    },
    role: "listbox",
    [ROOT_ATTR]: "",
    "aria-multiselectable": multiple || undefined,
    "aria-disabled": disabled || undefined,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      (user.onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(event);
      onListKeyDown(event);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      (user.onFocus as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(event);
      if (virtual) return;
      roving.onFocus(event);
      const option = (event.target as Element).closest(OPTION);
      if (option) setActive(valueOf(option), "pointer");
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      (user.onBlur as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(event);
      if (virtual) return;
      roving.onBlur(event);
      const next = event.relatedTarget as Node | null;
      if (!next || !listRef.current?.contains(next)) setActive(null, "pointer");
    },
  });

  const getOptionProps = <P extends Record<string, unknown>>(
    value: string,
    { disabled: optionDisabled = false, textValue }: OptionState = {},
    user: P = {} as P,
  ) => {
    const off = disabled || optionDisabled;
    return {
      ...user,
      id: optionId(value),
      role: "option",
      "aria-selected": selected.includes(value),
      "aria-disabled": off || undefined,
      "data-value": value,
      "data-disabled": off ? "" : undefined,
      "data-text-value": textValue,
      "data-highlighted": active === value ? "" : undefined,
      "data-focus-visible": virtual && focusVisible && active === value ? "" : undefined,
      onClick: (event: MouseEvent<HTMLElement>) => {
        (user.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
        if (event.defaultPrevented || off) return;
        choose(value, event, multiple && event.shiftKey);
      },
      onMouseDown: (event: MouseEvent<HTMLElement>) => {
        (user.onMouseDown as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
        // The controller keeps focus; Shift+click must not select text.
        if (virtual || event.shiftKey) event.preventDefault();
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        (user.onPointerMove as ((e: PointerEvent<HTMLElement>) => void) | undefined)?.(event);
        if (!highlightOnHover || off || event.pointerType === "touch" || active === value) return;
        setActive(value, "pointer");
      },
    };
  };

  /** Props for the element that keeps focus in `virtual` mode (a text input). */
  const getControllerProps = <P extends Record<string, unknown>>(user: P = {} as P) => ({
    ...user,
    "aria-activedescendant": virtual && active !== null ? optionId(active) : undefined,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      (user.onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(event);
      if (!virtual || event.defaultPrevented || isImeKey(event) || disabled) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        move(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter" && selectActive(event)) {
        event.preventDefault();
      }
    },
  });

  return {
    listRef,
    selected,
    active,
    optionId,
    isSelected: (value: string) => selected.includes(value),
    getListboxProps,
    getOptionProps,
    getControllerProps,
    setActive,
    move,
    selectActive,
    focusOption,
    select: choose,
  };
}

export type Listbox = ReturnType<typeof useListbox>;
