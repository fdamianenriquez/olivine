import {
  type ChangeEvent,
  type CompositionEvent,
  type CSSProperties,
  type FocusEvent,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useDismiss } from "../../hooks/useDismiss";
import { FieldContext, useField, useFieldControl } from "../../hooks/useFieldControl";
import { useImeGuard } from "../../hooks/useImeGuard";
import { useListbox } from "../../hooks/useListbox";
import { useMenuPosition } from "../../hooks/useMenuPosition";
import { useLabels } from "../../locale";
import { usePresence } from "../../motion/usePresence";
import { tokens } from "../../tokens";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { isImeKey } from "../../utils/ime";
import { Chip } from "../Chip";
import { CHIP_ITEM_ATTR } from "../Chip/ChipGroupContext";
import { ChipGroup, type ChipGroupActions } from "../ChipGroup";
import { Listbox, ListboxOptions } from "../Listbox";
import { Portal } from "../Portal";
import {
  type ComboboxFilter,
  type ComboboxItem,
  type ComboboxOption,
  CREATE_VALUE,
  defaultFilter,
  filterItems,
  flatten,
  type NormalItem,
  normalize,
  sameText,
  textOf,
  toListboxItems,
} from "./options";

/** Why the input text changed: typing, a pick, the clear cell, or a revert or reset. */
export type ComboboxInputChangeReason = "input" | "select" | "clear" | "reset";

type InputBase = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "value"
  | "defaultValue"
  | "onChange"
  | "size"
  | "children"
  | "multiple"
  | "className"
  | "style"
  | "list"
  | "readOnly"
  | "disabled"
  | "required"
  | "name"
  | "placeholder"
>;

interface ComboboxBaseProps extends InputBase {
  /** Strings, `{ value, label, textValue?, disabled? }` options, or `{ group, options }` groups. */
  options: readonly ComboboxItem[];
  /** Text in the input (controlled). */
  inputValue?: string | undefined;
  /** Initial text when uncontrolled. Defaults to the selected option's label (single). */
  defaultInputValue?: string | undefined;
  /** Called when the text changes, with why. Ignore `"select"` and `"reset"` for server search. */
  onInputChange?: ((text: string, reason: ComboboxInputChangeReason) => void) | undefined;
  /** Whether the popup is open (controlled). */
  open?: boolean | undefined;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean | undefined;
  /** Called when the popup opens or closes. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /**
   * Decides which options match the typed query (called only with a non-empty query). The
   * built-in filter ignores case, accents, width and kana. `null` shows `options` as given.
   */
  filter?: ComboboxFilter | null | undefined;
  /** Opens the popup when the input takes focus. @default false */
  openOnFocus?: boolean | undefined;
  /** Highlights the first match while typing, so Enter picks it. @default false */
  autoHighlight?: boolean | undefined;
  /** Closes the popup after a pick. @default true single, false multiple */
  closeOnSelect?: boolean | undefined;
  /**
   * Adds a "Create …" row when no option matches the typed text exactly. Add the new option to
   * `options` and select it yourself.
   */
  onCreate?: ((text: string) => void) | undefined;
  /** Shows the loading row and marks the list busy. Fetch in your `onInputChange`. */
  loading?: boolean | undefined;
  /** The row shown when nothing matches. `null` shows no row and no popup. @default "No results" */
  emptyText?: ReactNode;
  /** Shows a clear cell while there is text. @default false */
  clearable?: boolean | undefined;
  /** Shows the cell that opens and closes the popup. @default true */
  showTrigger?: boolean | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  /** Shows the value without letting it change: no popup, no cells, chips without ×. */
  readOnly?: boolean | undefined;
  /** Sets `aria-required`. There is no native validation: show errors through `Field`. */
  required?: boolean | undefined;
  /** Renders hidden inputs for native forms: the value, or one per value with `multiple`. */
  name?: string | undefined;
  /** @default "m" */
  size?: "m" | "l" | undefined;
  /** Content inside the field box before the input (a glyph). */
  startContent?: ReactNode;
  /** Content inside the field box after the input, before the cells. */
  endContent?: ReactNode;
  /** Extra classes for the popup, for example `ol-motion-noren`. */
  popupClassName?: string | undefined;
  /** Classes for the field box. */
  className?: string | undefined;
  /** Inline styles for the field box. */
  style?: CSSProperties | undefined;
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  /** One value (the default). */
  multiple?: false | undefined;
  /** Selected value (controlled); `null` is a controlled empty value. */
  value?: string | null | undefined;
  /** Initial value when uncontrolled. */
  defaultValue?: string | null | undefined;
  /** Called with the new value. */
  onChange?: ((value: string | null) => void) | undefined;
  /** The typed text is the value when it matches no option (free text). */
  allowCustomValue?: boolean | undefined;
}

export interface ComboboxMultipleProps extends ComboboxBaseProps {
  /** Several values, shown as removable chips in the field. */
  multiple: true;
  /** Selected values (controlled), in selection order. */
  value?: string[] | undefined;
  /** Initial values when uncontrolled. */
  defaultValue?: string[] | undefined;
  /** Called with the new values, in selection order. */
  onChange?: ((value: string[]) => void) | undefined;
  /** Not available with `multiple`: use `onCreate`. */
  allowCustomValue?: never;
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

/** Wait after the last keystroke before the result count is announced (not a motion). */
const STATUS_DELAY = 500;
const NBSP = " ";
const GAP = -Number.parseFloat(tokens.stroke["stroke-hair"]);
const ITEM = `[${CHIP_ITEM_ATTR}]`;
const EMPTY: readonly string[] = [];

const toArray = (value: string | string[] | null | undefined): string[] | undefined =>
  value === undefined ? undefined : value === null ? [] : Array.isArray(value) ? value : [value];

const isPrintable = (event: KeyboardEvent) =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

type Highlight = "selected" | "first" | "last" | null;

/**
 * A text field with a popup list of suggestions that narrows as you type (APG editable combobox
 * with list autocomplete). Focus stays in the input while ArrowUp/Down move a highlight; Enter
 * picks, Escape closes and then reverts. With `multiple`, picks become removable chips inside
 * the field and the popup stays open. `ref` and the other props go to the input; `className`
 * and `style` go to the field box.
 */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(props, ref) {
  const {
    options,
    multiple = false,
    value: valueProp,
    defaultValue,
    onChange,
    inputValue: inputValueProp,
    defaultInputValue,
    onInputChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    filter,
    openOnFocus = false,
    autoHighlight = false,
    closeOnSelect = !multiple,
    allowCustomValue: allowCustomProp = false,
    onCreate,
    loading = false,
    emptyText,
    clearable = false,
    showTrigger = true,
    placeholder,
    disabled = false,
    readOnly = false,
    required,
    name,
    size = "m",
    startContent,
    endContent,
    popupClassName,
    className,
    style,
    id: idProp,
    onKeyDown,
    onFocus,
    onBlur,
    onClick,
    onCompositionStart,
    onCompositionEnd,
    type,
    enterKeyHint,
    autoComplete,
    inputMode,
    ...rest
  } = props as ComboboxBaseProps & {
    multiple?: boolean;
    value?: string | string[] | null | undefined;
    defaultValue?: string | string[] | null | undefined;
    onChange?: ((value: string | string[] | null) => void) | undefined;
    allowCustomValue?: boolean | undefined;
  };
  const allowCustomValue = !multiple && allowCustomProp;
  const t = useLabels();
  const active = !disabled && !readOnly;

  // ---- options ----
  const all = normalize(options);
  const flat = flatten(all);
  const [seen, setSeen] = useState<ReadonlyMap<string, ComboboxOption>>(() => new Map());
  const optionOf = (v: string): ComboboxOption | undefined =>
    flat.find((o) => o.value === v) ?? seen.get(v);
  const labelOf = (v: string | undefined) => {
    if (v === undefined) return "";
    const option = optionOf(v);
    return option ? textOf(option) : v;
  };

  // ---- value ----
  const [selectedRaw, setSelectedRaw] = useControllable<readonly string[]>(
    toArray(valueProp),
    toArray(defaultValue) ?? EMPTY,
  );
  const selected = multiple ? selectedRaw : selectedRaw.slice(0, 1);
  const setSelected = (next: string[]) => {
    setSelectedRaw(next);
    onChange?.(multiple ? next : (next[0] ?? null));
  };
  const committedText = multiple ? "" : labelOf(selected[0]);

  // ---- text and query ----
  const [text, setTextRaw] = useControllable<string>(
    inputValueProp,
    defaultInputValue ?? committedText,
  );
  const setText = (next: string, reason: ComboboxInputChangeReason) => {
    if (next === text) return;
    setTextRaw(next);
    onInputChange?.(next, reason);
  };
  /** The filter query, apart from the text: empty shows every option. */
  const [query, setQuery] = useState({ text: "", lang: "" });

  // ---- open ----
  const [openRaw, setOpenRaw] = useControllable<boolean>(openProp, defaultOpen);
  const setOpen = (next: boolean) => {
    if (next === openRaw) return;
    setOpenRaw(next);
    onOpenChange?.(next);
  };

  // ---- rows ----
  const keep = (option: ComboboxOption) =>
    filter ? filter(option, query.text) : defaultFilter(option, query.text, query.lang);
  const visible: NormalItem[] =
    filter === null || query.text.trim() === "" ? all : filterItems(all, keep);
  const createText = query.text.trim();
  const showCreate =
    onCreate !== undefined &&
    createText !== "" &&
    !flat.some((o) => sameText(textOf(o), createText, query.lang));
  const rows: NormalItem[] = showCreate
    ? [...visible, { value: CREATE_VALUE, label: t.comboboxCreate(createText) }]
    : visible;
  const visibleValues = new Set(flatten(rows).map((o) => o.value));
  const hasRows = visibleValues.size > 0;
  const emptyContent = emptyText === undefined ? t.comboboxNoResults : emptyText;
  const hasContent = hasRows || loading || (emptyContent !== null && emptyContent !== false);
  const shown = openRaw && active && hasContent;
  // Expanded means the listbox is there; a status row alone (empty, loading) is not a list.
  const expanded = shown && hasRows;
  const onlyCreate = showCreate && visibleValues.size === 1;

  // ---- refs ----
  const inputRef = useRef<HTMLInputElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const chipActions = useRef<ChipGroupActions>(null);
  const ime = useImeGuard();
  const pendingHighlight = useRef<Highlight>(null);
  const refocus = useRef(false);

  // ---- live region ----
  const [message, setMessage] = useState("");
  const say = (next: string) => {
    setMessage((prev) => (prev === next ? next + NBSP : next));
  };

  const remember = (option: ComboboxOption) => {
    setSeen((prev) =>
      prev.get(option.value) === option ? prev : new Map(prev).set(option.value, option),
    );
  };

  const close = () => {
    setOpen(false);
  };

  const openPopup = (highlight: Highlight) => {
    if (!active) return;
    pendingHighlight.current = highlight;
    setOpen(true);
  };

  /** Single: the typed text becomes the value (free text), or the option it names exactly. */
  const commitCustom = () => {
    const typed = text.trim();
    const match =
      typed === "" ? undefined : flat.find((o) => sameText(textOf(o), typed, query.lang));
    const next = typed === "" ? null : (match?.value ?? text);
    if (match) remember(match);
    if ((selected[0] ?? null) !== next) setSelected(next === null ? [] : [next]);
    setQuery({ text: "", lang: query.lang });
  };

  /** Puts back the committed text (single) or drops the typed query (multiple). */
  const revert = () => {
    setText(committedText, "reset");
    setQuery({ text: "", lang: query.lang });
  };

  const pick = (v: string) => {
    if (v === CREATE_VALUE) {
      onCreate?.(createText);
      setQuery({ text: "", lang: query.lang });
      if (multiple) setText("", "select");
      if (closeOnSelect) close();
      return;
    }
    const option = optionOf(v);
    if (option) remember(option);
    const label = option ? textOf(option) : v;
    if (multiple) {
      const on = selected.includes(v);
      setSelected(on ? selected.filter((s) => s !== v) : [...selected, v]);
      say(on ? t.chipRemoved(label) : t.comboboxAdded(label));
      setText("", "select");
    } else {
      if (selected[0] !== v) setSelected([v]);
      setText(label, "select");
    }
    setQuery({ text: "", lang: query.lang });
    if (closeOnSelect) close();
  };

  const lb = useListbox({
    focus: "virtual",
    multiple,
    selected,
    onAction: (v) => {
      pick(v);
    },
    disabled: !active,
    autoHighlight: (autoHighlight && createText !== "") || onlyCreate ? "first" : "none",
  });
  const { setActive, focusOption } = lb;

  // Forget the highlight when the popup closes.
  useEffect(() => {
    if (!shown) setActive(null, "pointer");
  }, [shown, setActive]);

  // After a keyboard open, highlight once the options are in the DOM.
  // The list mounts a render after the popup (Portal), so this retries until it is there.
  const [listNode, setListNode] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const target = pendingHighlight.current;
    if (!shown) return;
    if (!target || !hasRows) {
      pendingHighlight.current = null;
      return;
    }
    if (listNode && focusOption(target)) pendingHighlight.current = null;
  });

  // Single: when the value changes from outside, the text follows its label.
  const lastValue = useRef(selected[0]);
  const currentValue = selected[0];
  useEffect(() => {
    if (multiple || lastValue.current === currentValue) return;
    lastValue.current = currentValue;
    if (text !== committedText) {
      setTextRaw(committedText);
      onInputChange?.(committedText, "reset");
    }
  });

  // Remember selected options, so their labels survive a list that no longer has them.
  useEffect(() => {
    const missing = selected.filter((v) => !seen.has(v) && flat.some((o) => o.value === v));
    if (missing.length === 0) return;
    setSeen((prev) => {
      const next = new Map(prev);
      for (const v of missing) {
        const option = flat.find((o) => o.value === v);
        if (option) next.set(v, option);
      }
      return next;
    });
  }, [selected, seen, flat]);

  // Result count, once typing settles.
  const count = flatten(visible).length;
  useEffect(() => {
    if (!shown || loading || query.text.trim() === "") return;
    const timer = window.setTimeout(() => {
      // The "Create …" row is the answer when nothing matches: no "No results" then.
      if (count === 0 && showCreate) return;
      const next = count > 0 ? t.comboboxResults(count) : t.comboboxNoResults;
      setMessage((prev) => (prev === next ? next + NBSP : next));
    }, STATUS_DELAY);
    return () => {
      window.clearTimeout(timer);
    };
  }, [shown, loading, query.text, count, showCreate, t]);

  // After a chip removal: if focus fell to the page or the group root, give it to the input.
  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    const now = document.activeElement;
    if (!now || now === document.body || now === chipsRef.current) inputRef.current?.focus();
  });

  // ---- popup ----
  const presence = usePresence<HTMLDivElement>(shown);
  const position = useMenuPosition<HTMLDivElement, HTMLDivElement>({
    open: presence.mounted,
    placement: "bottom-start",
    gap: GAP,
    matchWidth: true,
  });
  const { setElement } = presence;
  const { setFloating, setAnchor } = position;
  const setPopup = useCallback(
    (node: HTMLDivElement | null) => {
      popupRef.current = node;
      setElement(node);
      setFloating(node);
    },
    [setElement, setFloating],
  );
  const setBox = useCallback(
    (node: HTMLDivElement | null) => {
      boxRef.current = node;
      setAnchor(node);
    },
    [setAnchor],
  );
  const setInput = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (node) {
        const labels = Array.from(node.labels ?? []);
        const ids = labels.map((l) => l.id).filter(Boolean);
        const text = labels.map((l) => l.textContent.trim()).join(" ");
        setLabelsName(
          labels.length === 0
            ? {}
            : ids.length === labels.length
              ? { ids: ids.join(" ") }
              : { text },
        );
      }
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const onDismiss = useCallback(() => {
    setOpenRaw(false);
    onOpenChange?.(false);
  }, [setOpenRaw, onOpenChange]);
  useDismiss(shown, onDismiss, [boxRef, popupRef]);

  // ---- field ----
  const field = useField();
  const fieldProps = useFieldControl({
    id: idProp,
    "aria-describedby": rest["aria-describedby"],
    "aria-invalid": rest["aria-invalid"],
    required,
  });
  const listId = `${useId()}-list`;
  const hintId = `${useId()}-hint`;
  const ariaLabel = rest["aria-label"];
  const ariaLabelledBy = rest["aria-labelledby"];
  // An external `<label for>` names the input; its ids (or its text) name the list too.
  const [labelsName, setLabelsName] = useState<{ ids?: string; text?: string }>({});
  const listLabelledBy =
    ariaLabelledBy ?? (ariaLabel === undefined ? (field?.labelId ?? labelsName.ids) : undefined);
  const listLabel = listLabelledBy === undefined ? (ariaLabel ?? labelsName.text) : undefined;
  const chips = multiple ? selected : EMPTY;
  const hasChips = chips.length > 0;
  const describedBy =
    [fieldProps["aria-describedby"], hasChips && !readOnly ? hintId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  // ---- dev warnings ----
  const named =
    ariaLabel !== undefined || ariaLabelledBy !== undefined || field?.labelId !== undefined;
  const customWithMultiple = multiple && allowCustomProp;
  const duplicate = flat.find((o, i) => flat.findIndex((p) => p.value === o.value) !== i)?.value;
  useEffect(() => {
    const labelled = (inputRef.current?.labels?.length ?? 0) > 0;
    if (!named && !labelled) {
      devWarn("Combobox", "the input needs a name; wrap it in a Field or pass `aria-label`.");
    }
    if (customWithMultiple) {
      devWarn("Combobox", "`allowCustomValue` is ignored with `multiple`; use `onCreate`.");
    }
    if (duplicate !== undefined) {
      devWarn("Combobox", `option values must be unique ("${duplicate}" repeats).`);
    }
  }, [named, customWithMultiple, duplicate]);

  // ---- events ----
  const applyQuery = (next: string, target: HTMLElement) => {
    const lang = target.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang;
    setQuery({ text: next, lang });
    // A highlight left by the pointer must not survive typing (Enter would pick it unseen).
    if (!autoHighlight && lb.active !== null) {
      const row = document.getElementById(lb.optionId(lb.active));
      if (!row?.hasAttribute("data-focus-visible")) setActive(null, "pointer");
    }
    if (next === "" && !multiple && selected.length > 0) setSelected([]);
    if (!openRaw) openPopup(null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setText(next, "input");
    // While an IME composes, the text follows but nothing filters, opens or clears.
    if (ime.isComposing(event.nativeEvent as unknown as globalThis.KeyboardEvent)) return;
    applyQuery(next, event.target);
  };

  const handleCompositionStart = (event: CompositionEvent<HTMLInputElement>) => {
    onCompositionStart?.(event);
    ime.onCompositionStart();
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    onCompositionEnd?.(event);
    ime.onCompositionEnd();
    applyQuery(event.currentTarget.value, event.currentTarget);
  };

  const activeVisible = lb.active !== null && visibleValues.has(lb.active) ? lb.active : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const { key } = event;
    if (key === "Tab") return;
    if (ime.isComposing(event) || !active) return;
    const plain = !event.ctrlKey && !event.metaKey && !event.shiftKey;

    if ((key === "ArrowDown" || key === "ArrowUp") && plain) {
      event.preventDefault();
      if (event.altKey) {
        if (key === "ArrowDown") {
          if (!openRaw) openPopup(null);
        } else close();
        return;
      }
      if (!shown) {
        setQuery({ text: "", lang: query.lang });
        openPopup(key === "ArrowUp" ? "last" : multiple ? "first" : "selected");
        return;
      }
      lb.move(key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (key === "Enter" && plain && !event.altKey) {
      if (!shown) {
        if (allowCustomValue) commitCustom();
        return;
      }
      if (activeVisible !== null) {
        event.preventDefault();
        lb.selectActive(event);
        return;
      }
      close();
      // Free text: the text is the value; the event goes on (a search submits).
      if (allowCustomValue) {
        commitCustom();
        return;
      }
      event.preventDefault();
      revert();
      return;
    }

    if (key === "Escape") {
      if (shown) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (allowCustomValue || text === committedText) return;
      event.preventDefault();
      event.stopPropagation();
      revert();
      return;
    }

    if (multiple && hasChips) {
      const input = event.currentTarget;
      const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
      if (
        (key === "Backspace" && input.value === "") ||
        (key === "ArrowLeft" && atStart && plain)
      ) {
        if (chipActions.current?.focus("last")) event.preventDefault();
      }
    }
  };

  const composedKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    handleKeyDown(event);
    if (!event.defaultPrevented) onKeyDown?.(event);
  };

  const inside = (node: Node | null) =>
    node !== null &&
    (boxRef.current?.contains(node) === true || popupRef.current?.contains(node) === true);

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    const next = event.relatedTarget as Node | null;
    if (inside(next)) {
      // Into the chips: the popup belongs to the input, the text stays.
      if (chipsRef.current?.contains(next)) close();
      return;
    }
    close();
    if (!active) return;
    if (allowCustomValue) commitCustom();
    else if (text !== committedText) revert();
    else setQuery({ text: "", lang: query.lang });
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    if (openOnFocus && !openRaw) openPopup(null);
  };

  const handleInputClick = (event: MouseEvent<HTMLInputElement>) => {
    onClick?.(event);
    if (!openRaw) openPopup(null);
  };

  // A press on the box (not on a chip or a cell) focuses the input and opens the popup.
  const handleBoxMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    if (target === inputRef.current || target.closest(".ol-chip, .ol-combobox__cell")) return;
    event.preventDefault();
    if (!active) return;
    inputRef.current?.focus();
    if (!openRaw) openPopup(null);
  };

  const keepFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  const handleClear = () => {
    setText("", "clear");
    setQuery({ text: "", lang: query.lang });
    if (!multiple && selected.length > 0) setSelected([]);
    inputRef.current?.focus();
  };

  const handleTrigger = () => {
    inputRef.current?.focus();
    if (shown) {
      close();
    } else {
      setQuery({ text: "", lang: query.lang });
      openPopup(null);
    }
  };

  const handleRemove = (v: string) => {
    refocus.current = chipsRef.current?.contains(document.activeElement) ?? false;
    setSelected(selected.filter((s) => s !== v));
    say(t.chipRemoved(labelOf(v)));
  };

  // From the chips back to the input: ArrowRight on the last chip, or any printable key.
  const handleChipsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isImeKey(event)) return;
    const items = Array.from(chipsRef.current?.querySelectorAll<HTMLElement>(ITEM) ?? []);
    const onLast = items.length > 0 && items[items.length - 1]?.contains(event.target as Node);
    if (event.key === "ArrowRight" && onLast) {
      event.preventDefault();
      inputRef.current?.focus();
    } else if (isPrintable(event) && event.key !== " ") {
      inputRef.current?.focus();
    }
  };

  const showClear = clearable && active && text !== "";
  const listItems = toListboxItems(rows);

  return (
    // The input inside takes every key; a press on the box only forwards focus to it.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={setBox}
      className={cx(
        "ol-combobox",
        multiple && "ol-combobox--multiple",
        hasChips && "ol-combobox--chips",
        size === "l" && "ol-combobox--l",
        shown && "ol-combobox--open",
        disabled && "ol-combobox--disabled",
        readOnly && "ol-combobox--readonly",
        className,
      )}
      style={style}
      data-state={shown ? "open" : "closed"}
      onMouseDown={handleBoxMouseDown}
    >
      <div className="ol-combobox__body">
        {startContent !== undefined && startContent !== null ? (
          <span className="ol-combobox__start">{startContent}</span>
        ) : null}
        {hasChips ? (
          <ChipGroup
            ref={chipsRef}
            className="ol-combobox__chips"
            label={t.comboboxSelected}
            selectionMode="none"
            announce={false}
            actionRef={chipActions}
            disabled={disabled}
            {...(readOnly ? null : { onRemove: handleRemove })}
            onKeyDown={handleChipsKeyDown}
          >
            {chips.map((v) => {
              const option = optionOf(v);
              return (
                <Chip key={v} value={v} textValue={labelOf(v)}>
                  {option?.label ?? v}
                </Chip>
              );
            })}
          </ChipGroup>
        ) : null}
        <input
          type={type ?? "text"}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          autoComplete={autoComplete ?? "off"}
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint={enterKeyHint ?? (multiple ? "enter" : "done")}
          inputMode={inputMode}
          {...rest}
          ref={setInput}
          id={fieldProps.id}
          className="ol-combobox__input"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          aria-required={fieldProps.required ?? undefined}
          aria-invalid={fieldProps["aria-invalid"]}
          aria-describedby={describedBy}
          aria-activedescendant={
            shown && activeVisible !== null ? lb.optionId(activeVisible) : undefined
          }
          onChange={handleChange}
          onKeyDown={composedKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleInputClick}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
        />
      </div>
      {endContent !== undefined && endContent !== null ? (
        <span className="ol-combobox__end">{endContent}</span>
      ) : null}
      {showClear ? (
        <button
          type="button"
          tabIndex={-1}
          className="ol-combobox__cell ol-combobox__clear"
          aria-label={t.clear}
          onMouseDown={keepFocus}
          onClick={handleClear}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
      {showTrigger && !readOnly ? (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          className="ol-combobox__cell ol-combobox__trigger"
          aria-label={t.comboboxShowOptions}
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          onMouseDown={keepFocus}
          onClick={handleTrigger}
        >
          <span aria-hidden="true">↓</span>
        </button>
      ) : null}
      {hasChips && !readOnly ? (
        <span id={hintId} className="ol-sr">
          {t.comboboxChipsHint}
        </span>
      ) : null}
      <span className="ol-combobox__live ol-sr" role="status" aria-atomic="true">
        {message}
      </span>
      {name !== undefined && !disabled ? (
        multiple ? (
          selected.map((v) => <input key={v} type="hidden" name={name} value={v} />)
        ) : (
          <input type="hidden" name={name} value={selected[0] ?? ""} />
        )
      ) : null}
      {presence.mounted ? (
        <Portal anchor={boxRef} keepActive>
          {/* The popup never takes focus: a press on it (rows, scrollbar) keeps the input's. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            {...position.props}
            ref={setPopup}
            className={cx("ol-floating", "ol-combobox__popup", popupClassName)}
            data-state={presence.state}
            onMouseDown={keepFocus}
          >
            <FieldContext.Provider value={null}>
              {hasRows ? (
                <Listbox
                  controller={lb}
                  id={listId}
                  label={listLabel}
                  aria-labelledby={listLabelledBy}
                  ref={setListNode}
                  size={size === "l" ? "m" : "s"}
                  rows={7.5}
                  loading={loading}
                  announce={false}
                  className="ol-combobox__list"
                >
                  <ListboxOptions items={listItems} />
                </Listbox>
              ) : (
                <div className="ol-listbox__empty ol-combobox__status">
                  {loading ? t.loading : emptyContent}
                </div>
              )}
            </FieldContext.Provider>
          </div>
        </Portal>
      ) : null}
    </div>
  );
});

export type { ComboboxFilter, ComboboxGroup, ComboboxItem, ComboboxOption } from "./options";
