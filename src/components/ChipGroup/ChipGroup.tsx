import {
  Children,
  type FocusEvent,
  forwardRef,
  Fragment,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { FieldContext, useField } from "../../hooks/useFieldControl";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import {
  CHIP_ITEM_ATTR,
  ChipGroupContext,
  type ChipGroupContextValue,
  type ChipRemoveEvent,
  type ChipSelectionMode,
} from "../Chip/ChipGroupContext";

/** Imperative handle for parents such as a multi-select field. */
export interface ChipGroupActions {
  /**
   * Moves focus to the first (`"first"`) or last (`"last"`) enabled chip, or to the chip with
   * this `value`.
   * Returns whether focus moved.
   */
  focus: (target: string) => boolean;
}

export interface ChipGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children"
> {
  /** `Chip`s, each with a unique, stable `value`. Any nesting (maps, fragments) works. */
  children?: ReactNode;
  /** Accessible name of the group (sets `aria-label`). Required, or `aria-label` / `aria-labelledby`. */
  label?: string;
  /**
   * `none`: chips are actions or values; `single`: pressing a chip releases the others;
   * `multiple`: each press toggles one chip.
   * @default "none"
   */
  selectionMode?: ChipSelectionMode;
  /** Values of the selected chips (controlled). In `single` mode at most one entry. */
  value?: string[];
  /** Initially selected values when uncontrolled. */
  defaultValue?: string[];
  /** Called with the new selection, in the chips' order. */
  onChange?: (values: string[]) => void;
  /**
   * Keeps at least one chip selected: the last selected chip cannot be released and Escape
   * does not clear.
   * @default false
   */
  disallowEmptySelection?: boolean;
  /**
   * Called when a chip asks to be removed (its × cell, or Delete/Backspace on it). Its presence
   * gives every chip a × cell (a chip opts out with `removable={false}`). The group never removes
   * anything: update your list; the group then moves focus to the neighbour and announces it.
   * The group checks for the removal when it re-renders, so keep the chip list in the component
   * that renders `ChipGroup` (or above it), not in state inside a child of the group.
   */
  onRemove?: (value: string, event: ChipRemoveEvent) => void;
  /** Disables every chip. */
  disabled?: boolean;
  /** Renders one hidden input per selected value for native forms. Ignored in mode `none`. */
  name?: string;
  /** Shown when the group has no chips; the root is then a plain `group`. */
  empty?: ReactNode;
  /**
   * Announces removals and Escape-clear in a polite status. Set `false` when a parent makes its
   * own announcements.
   * @default true
   */
  announce?: boolean;
  /** Receives `{ focus(target) }`. */
  actionRef?: Ref<ChipGroupActions>;
}

/** True when `children` renders nothing (null, false, empty arrays or fragments). */
function isEmpty(children: ReactNode): boolean {
  return Children.toArray(children).every(
    (child) =>
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment &&
      isEmpty(child.props.children),
  );
}

interface PendingRemoval {
  /** Root of the chip that asked to be removed. */
  chip: HTMLElement;
  /** Chip roots at the moment of the request, in DOM order. */
  chips: HTMLElement[];
  index: number;
  hadFocus: boolean;
  label: string;
}

const ITEM = `[${CHIP_ITEM_ATTR}]`;
const NBSP = "\u00a0";
const VALUE_ATTR = "data-ol-chip-value";

/**
 * A wrapping set of `Chip`s with one shared selection, one Tab stop and arrow-key navigation:
 * a labelled `toolbar` of toggle buttons. Arrows, Home and End move focus (Up and Down by visual
 * row), Space or Enter toggles, Delete or Backspace removes a removable chip, Escape clears the
 * selection. After a removal it moves focus to the neighbouring chip and announces it.
 */
export const ChipGroup = forwardRef<HTMLDivElement, ChipGroupProps>(function ChipGroup(
  {
    children,
    label,
    selectionMode = "none",
    value,
    defaultValue,
    onChange,
    disallowEmptySelection = false,
    onRemove,
    disabled = false,
    name,
    empty,
    announce = true,
    actionRef,
    className,
    onKeyDown,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Only the description comes from a surrounding Field: its `<label for>` cannot name a
  // toolbar, so the group never claims the Field's control id and is named by its own `label`.
  const field = useField();
  const describedBy =
    [field?.describedBy, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined;

  const hasChips = !isEmpty(children);

  const [rawSelected, setSelected] = useControllable<string[]>(value, defaultValue ?? [], onChange);
  const selected = useMemo(
    () =>
      selectionMode === "none"
        ? []
        : selectionMode === "single"
          ? rawSelected.slice(0, 1)
          : rawSelected,
    [selectionMode, rawSelected],
  );

  /** Sorts values in the chips' order; values without a chip keep their place at the end. */
  const sorted = (values: string[]) => {
    const order = chipValues().map((c) => c.value);
    const known = order.filter((v) => values.includes(v));
    return [...known, ...values.filter((v) => !order.includes(v))];
  };

  const roving = useRovingFocus(rootRef, {
    itemSelector: ITEM,
    orientation: "both",
    selectedSelector: '[aria-pressed="true"]',
  });

  // Live region: a repeated message gets a trailing no-break space so it is read again.
  const [message, setMessage] = useState("");
  const say = (text: string) => {
    if (!announce) return;
    setMessage((prev) => (prev === text ? text + NBSP : text));
  };

  const pending = useRef<PendingRemoval | null>(null);

  const ownChips = (): HTMLElement[] => {
    const root = rootRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(".ol-chip")).filter(
      (el) => el.parentElement?.closest(".ol-chipgroup") === root,
    );
  };

  /** The grouped chips in DOM order, with their value and whether they are disabled. */
  const chipValues = () =>
    ownChips().flatMap((el) => {
      const chipValue = el.getAttribute(VALUE_ATTR);
      return chipValue === null
        ? []
        : [{ el, value: chipValue, disabled: el.classList.contains("ol-chip--disabled") }];
    });

  const toggle = (chipValue: string) => {
    if (disabled || selectionMode === "none") return;
    const on = selected.includes(chipValue);
    if (on && disallowEmptySelection && selected.length === 1) return;
    if (selectionMode === "single") {
      setSelected(on ? [] : [chipValue]);
    } else {
      setSelected(sorted(on ? selected.filter((v) => v !== chipValue) : [...selected, chipValue]));
    }
  };

  const requestRemove = (
    chipValue: string,
    chipLabel: string | undefined,
    event: ChipRemoveEvent,
  ) => {
    if (disabled || !onRemove) return;
    const chip = (event.target as Element).closest<HTMLElement>(".ol-chip");
    if (chip) {
      const all = ownChips();
      const text =
        chipLabel ?? chip.querySelector(".ol-chip__label")?.textContent.trim() ?? chipValue;
      pending.current = {
        chip,
        chips: all,
        index: all.indexOf(chip),
        hadFocus: chip.contains(document.activeElement),
        label: text === "" ? chipValue : text,
      };
    }
    onRemove(chipValue, event);
  };

  // After every render: if the chip that asked to be removed is gone, announce it and, when it
  // had focus, move focus to the next chip, else the previous, else the group.
  useLayoutEffect(() => {
    const removal = pending.current;
    if (!removal || removal.chip.isConnected) return;
    pending.current = null;
    say(t.chipRemoved(removal.label));
    if (!removal.hadFocus) return;
    const candidates = [
      ...removal.chips.slice(removal.index + 1),
      ...removal.chips.slice(0, removal.index).reverse(),
    ];
    for (const chip of candidates) {
      const item = chip.isConnected ? chip.querySelector<HTMLElement>(ITEM) : null;
      if (item && roving.focusItem(item)) return;
    }
    const root = rootRef.current;
    if (root) {
      // Programmatic only: the root is not a tab stop, so it loses tabindex again on blur.
      root.setAttribute("tabindex", "-1");
      root.focus();
    }
  });

  const focusValue = (target: string): boolean => {
    const item = chipValues()
      .find((c) => c.value === target)
      ?.el.querySelector<HTMLElement>(ITEM);
    return item ? roving.focusItem(item) : false;
  };

  useImperativeHandle(actionRef, () => ({
    focus: (target) =>
      target === "first" || target === "last" ? roving.focusItem(target) : focusValue(target),
  }));

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (roving.onKeyDown(event)) return;
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (event.nativeEvent.isComposing || disabled || disallowEmptySelection) return;
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    const disabledValues = new Set(chipValues().flatMap((c) => (c.disabled ? [c.value] : [])));
    const next = selected.filter((v) => disabledValues.has(v));
    // Nothing to clear: let an enclosing dialog or popover take Escape.
    if (next.length === selected.length) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(next);
    say(t.chipsCleared);
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    roving.onFocus(event);
    const removal = pending.current;
    if (removal && !removal.chip.contains(event.target)) pending.current = null;
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    roving.onBlur(event);
    const root = rootRef.current;
    if (event.target === root) root.removeAttribute("tabindex");
    const next = event.relatedTarget as Node | null;
    if (next && root && !root.contains(next)) {
      setMessage("");
      pending.current = null;
    }
  };

  const named = [label, rest["aria-label"], rest["aria-labelledby"]].some(
    (v) => v !== undefined && v !== "",
  );
  const inField = field !== null;
  const controlledInNone = selectionMode === "none" && value !== undefined;
  const tooManyForSingle = selectionMode === "single" && rawSelected.length > 1;
  useEffect(() => {
    if (!named) {
      devWarn(
        "ChipGroup",
        inField
          ? "a Field's label does not name a ChipGroup; pass `label`, `aria-label` or `aria-labelledby`."
          : "the group needs a name; pass `label`, `aria-label` or `aria-labelledby`.",
      );
    }
    if (controlledInNone) {
      devWarn("ChipGroup", '`value` is ignored with `selectionMode="none"`.');
    }
    if (tooManyForSingle) {
      devWarn(
        "ChipGroup",
        'with `selectionMode="single"` the value has at most one entry; only the first is used.',
      );
    }
  }, [named, inField, controlledInNone, tooManyForSingle]);

  // Duplicate values are checked in the DOM after each render, warned once per value.
  const warnedDuplicate = useRef<string | null>(null);
  useEffect(() => {
    const values = chipValues().map((c) => c.value);
    const duplicate = values.find((v, i) => values.indexOf(v) !== i) ?? null;
    if (duplicate !== null && duplicate !== warnedDuplicate.current) {
      devWarn("ChipGroup", `chip values must be unique ("${duplicate}" repeats).`);
    }
    warnedDuplicate.current = duplicate;
  });

  const context: ChipGroupContextValue = {
    mode: selectionMode,
    selectedValues: selected,
    toggle,
    canRemove: onRemove !== undefined,
    requestRemove,
    disabled,
  };

  return (
    // The chips are the focus stops; the group only delegates their keys (roving, Escape).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- role is toolbar or group
    <div
      role={hasChips ? "toolbar" : "group"}
      aria-label={label}
      aria-disabled={(hasChips && disabled) || undefined}
      {...rest}
      aria-describedby={describedBy}
      ref={setRoot}
      className={cx("ol-chipgroup", className)}
      data-state={hasChips ? undefined : "empty"}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <FieldContext.Provider value={null}>
        <ChipGroupContext.Provider value={context}>{children}</ChipGroupContext.Provider>
      </FieldContext.Provider>
      {!hasChips && empty !== undefined && empty !== null ? (
        <span className="ol-chipgroup__empty">{empty}</span>
      ) : null}
      {announce ? (
        <span className="ol-chipgroup__live ol-sr" role="status" aria-atomic="true">
          {message}
        </span>
      ) : null}
      {name !== undefined &&
        selectionMode !== "none" &&
        !disabled &&
        selected.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
    </div>
  );
});
