import {
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type CompositionEvent,
  type CSSProperties,
  type FocusEvent,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { FieldContext, useField, useFieldControl } from "../../hooks/useFieldControl";
import { useImeGuard } from "../../hooks/useImeGuard";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useOverlay } from "../../hooks/useOverlay";
import { useLabels } from "../../locale";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { isImeKey } from "../../utils/ime";
import { Button } from "../Button";
import { Combobox, type ComboboxFilter, type ComboboxItem, type ComboboxOption } from "../Combobox";
import { flatten, normalize, textOf } from "../Combobox/options";
import {
  isBareShortcut,
  Kbd,
  matchShortcut,
  type Shortcut,
  toAriaKeyShortcuts,
  useKbdPlatform,
} from "../Kbd";
import { Portal } from "../Portal";
import { Spinner } from "../Spinner";

/**
 * Below `bp-md` (720px) a `fullscreen="compact"` field opens the full-screen view. Media queries
 * cannot read custom properties, so the token value is written here; a test keeps it in step.
 */
export const COMPACT_QUERY = "(width < 720px)";

/** Wait before a changed `resultCount` is announced, so a count still loading is not read. */
const RESULT_DELAY = 500;
const NBSP = " ";

/** Why the query text changed: typing, a picked suggestion, or clearing. */
export type SearchFieldChangeReason = "input" | "select" | "clear";

/** How a query was submitted. */
export type SearchFieldSubmitSource = "enter" | "button" | "suggestion";

export interface SearchFieldSubmitDetails {
  source: SearchFieldSubmitSource;
  /** The picked option, when `source` is `"suggestion"`. */
  option?: ComboboxOption | undefined;
}

/** Imperative actions for `actionRef`. */
export interface SearchFieldActions {
  /** Focuses the input (or the bar that opens the full-screen view). */
  focus: () => void;
  /** Empties the query, as the clear cell does, without an announcement. */
  clear: () => void;
  /** Opens the full-screen view; does nothing while the field is docked. */
  open: () => void;
  /** Closes the full-screen view. */
  close: () => void;
}

type InputBase = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "value"
  | "defaultValue"
  | "onChange"
  | "onSubmit"
  | "size"
  | "children"
  | "className"
  | "style"
  | "type"
  | "list"
  | "disabled"
  | "readOnly"
  | "placeholder"
  | "name"
  | "multiple"
>;

export interface SearchFieldProps extends InputBase {
  /** Accessible name of the input. Defaults to the locale's "Search"; a `Field` label wins. */
  label?: string | undefined;
  /** The query text (controlled). */
  value?: string | undefined;
  /** Initial query when uncontrolled. @default "" */
  defaultValue?: string | undefined;
  /** Called on every change of the text, with why. */
  onChange?: ((value: string, details: { reason: SearchFieldChangeReason }) => void) | undefined;
  /**
   * Called when the query is submitted: Enter, the Search button or a picked suggestion. The
   * query is trimmed; an empty one is not submitted unless `submitEmpty`.
   */
  onSubmit?: ((query: string, details: SearchFieldSubmitDetails) => void) | undefined;
  /** Submits an empty query too. @default false */
  submitEmpty?: boolean | undefined;
  /** Called after the query is cleared (clear cell, Escape or `actionRef.clear()`). */
  onClear?: (() => void) | undefined;
  /**
   * Called with the trimmed query once typing pauses for `debounce` ms, after an IME
   * composition ends, and at once on clear. Fetch suggestions or results here.
   */
  onQueryChange?: ((query: string) => void) | undefined;
  /** Pause in ms before `onQueryChange`. @default 250 */
  debounce?: number | undefined;
  /** Suggestions, in the Combobox shape. They open in a popup under the field (or in the view). */
  options?: readonly ComboboxItem[] | undefined;
  /** Filters `options` on the client. `null` shows them as given. @default null */
  filter?: ComboboxFilter | null | undefined;
  /** Opens the suggestions when the empty field is focused (recent or popular searches). */
  openOnFocus?: boolean | undefined;
  /** Shows a spinner and marks the input busy. */
  loading?: boolean | undefined;
  /** Number of results the app shows; announced politely once it settles. */
  resultCount?: number | undefined;
  /**
   * `compact`: below 720px (`bp-md`) the field is a bar that opens a full-screen view.
   * `always`: always a bar and a view. @default "never"
   */
  fullscreen?: "never" | "compact" | "always" | undefined;
  /** Content of the full-screen view under the suggestions: results, recent searches, filters. */
  children?: ReactNode;
  /** Whether the full-screen view is open (controlled). */
  open?: boolean | undefined;
  /** Initial open state of the view when uncontrolled. @default false */
  defaultOpen?: boolean | undefined;
  /** Called when the full-screen view opens or closes. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Closes the full-screen view after a submit. @default true */
  closeOnSubmit?: boolean | undefined;
  /**
   * A page-wide shortcut, such as `"mod+k"`, that focuses the field or opens the view. A hint
   * shows while the field is empty. Prefer a chord: a bare key needs a way to turn it off.
   */
  shortcut?: Shortcut | undefined;
  /** Adds a joined Search button. @default false */
  submitButton?: boolean | undefined;
  /** Bottom rule only. @default false */
  line?: boolean | undefined;
  /** @default "m" */
  size?: "m" | "l" | undefined;
  placeholder?: string | undefined;
  /** Name of the query in a native form. */
  name?: string | undefined;
  /** URL of the landmark form. With it the browser submits the form after `onSubmit`. */
  action?: string | undefined;
  /** Method of the landmark form. */
  method?: "get" | "post" | "dialog" | undefined;
  disabled?: boolean | undefined;
  /** Shows the query without letting it change; Enter still submits. */
  readOnly?: boolean | undefined;
  /** Renders `form role="search"`. `false` renders a `div`, inside another landmark or form. @default true */
  landmark?: boolean | undefined;
  /** Names the landmark when a page has several ("Catalogue" reads "Catalogue search"). */
  landmarkLabel?: string | undefined;
  /** Extra classes for the suggestions popup, for example `ol-motion-noren`. */
  popupClassName?: string | undefined;
  /** Imperative focus, clear, open and close. */
  actionRef?: Ref<SearchFieldActions> | undefined;
  /** Classes for the root. */
  className?: string | undefined;
  /** Inline styles for the root. */
  style?: CSSProperties | undefined;
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/** The magnifier: a ring and a handle on `currentColor`. */
function SearchGlyph() {
  return (
    <svg className="ol-searchfield__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M10.25 10.25 15 15" />
    </svg>
  );
}

const isEditable = (node: EventTarget | null) =>
  node instanceof HTMLElement &&
  (node.isContentEditable ||
    node.closest(
      "input, textarea, select, [contenteditable], [role=textbox], [role=searchbox], [role=combobox], [role=application]",
    ) !== null);

/**
 * A field for a query that is submitted. Enter (or the optional Search button) submits; a ×
 * clears while there is text; Escape closes the suggestions, then clears. With `options` a
 * suggestion popup opens under the field; with `fullscreen` the field becomes a bar that opens a
 * full-screen view on small screens. Renders the `search` landmark. `ref` and the other props go
 * to the input (to the bar button while the field is full-screen); `className` and `style` go to
 * the root.
 */
export const SearchField = forwardRef<HTMLElement, SearchFieldProps>(
  function SearchField(props, ref) {
    const {
      label,
      value: valueProp,
      defaultValue = "",
      onChange,
      onSubmit,
      submitEmpty = false,
      onClear,
      onQueryChange,
      debounce = 250,
      options,
      filter = null,
      openOnFocus = false,
      loading = false,
      resultCount,
      fullscreen = "never",
      children,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      closeOnSubmit = true,
      shortcut,
      submitButton = false,
      line = false,
      size = "m",
      placeholder,
      name,
      action,
      method,
      disabled = false,
      readOnly = false,
      landmark = true,
      landmarkLabel,
      popupClassName,
      actionRef,
      className,
      style,
      id: idProp,
      onKeyDown,
      onFocus,
      onBlur,
      onCompositionStart,
      onCompositionEnd,
      enterKeyHint,
      autoComplete,
      ...rest
    } = props;
    const t = useLabels();
    const platform = useKbdPlatform();
    const ime = useImeGuard();
    const field = useField();
    const suggestions = options !== undefined;

    // ---- text ----
    const [text, setTextRaw] = useControllable<string>(valueProp, defaultValue);
    const setText = (next: string, reason: SearchFieldChangeReason) => {
      if (next === text) return;
      setTextRaw(next);
      onChange?.(next, { reason });
    };

    // ---- full-screen view ----
    const compact = useMediaQuery(COMPACT_QUERY);
    const full = fullscreen === "always" || (fullscreen === "compact" && compact);
    const [openRaw, setOpenRaw] = useControllable<boolean>(openProp, defaultOpen);
    const viewOpen = full && openRaw && !disabled;
    const setViewOpen = (next: boolean) => {
      if (next === openRaw) return;
      setOpenRaw(next);
      onOpenChange?.(next);
    };

    // ---- refs ----
    const rootRef = useRef<HTMLElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const dockedRef = useRef<HTMLInputElement | null>(null);
    const viewRef = useRef<HTMLInputElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const submitRef = useRef<HTMLButtonElement | null>(null);
    const composing = useRef(false);
    const caretToEnd = useRef(false);
    const nativeSubmit = useRef(false);
    // Combobox reports a free-text commit and a pick through the same `onChange`; these tell them apart.
    const enterWithoutPick = useRef(false);
    const blurring = useRef(false);

    // ---- debounced query ----
    const timer = useRef<number | undefined>(undefined);
    const lastQuery = useRef(defaultValue.trim());
    const queryHandler = useRef(onQueryChange);
    useEffect(() => {
      queryHandler.current = onQueryChange;
    });
    useEffect(
      () => () => {
        window.clearTimeout(timer.current);
      },
      [],
    );
    const emitQuery = (next: string) => {
      window.clearTimeout(timer.current);
      const query = next.trim();
      if (query === lastQuery.current) return;
      lastQuery.current = query;
      queryHandler.current?.(query);
    };
    const scheduleQuery = (next: string) => {
      window.clearTimeout(timer.current);
      if (debounce <= 0) {
        emitQuery(next);
        return;
      }
      timer.current = window.setTimeout(() => {
        emitQuery(next);
      }, debounce);
    };

    // ---- live region ----
    // Tagged with the place it was spoken (bar or view), so moving the region never re-reads it.
    const [message, setMessage] = useState({ text: "", inView: false });
    const inViewNow = useRef(false);
    useEffect(() => {
      inViewNow.current = viewOpen;
    });
    const say = (next: string) => {
      setMessage((prev) => ({
        text: prev.text === next ? next + NBSP : next,
        inView: inViewNow.current,
      }));
    };
    // Decided once from the props: an app that passes `resultCount` (even `undefined` for a
    // moment while loading) owns the count, so Combobox never reads its own.
    const countsResults = "resultCount" in props;
    const firstCount = useRef(resultCount);
    useEffect(() => {
      if (resultCount === undefined) return;
      if (firstCount.current === resultCount) return;
      firstCount.current = undefined;
      const handle = window.setTimeout(() => {
        say(resultCount === 0 ? t.searchNoResults : t.searchResultCount(resultCount));
      }, RESULT_DELAY);
      return () => {
        window.clearTimeout(handle);
      };
    }, [resultCount, t]);

    // ---- options ----
    const flat = suggestions ? flatten(normalize(options)) : [];

    // ---- actions ----
    const focusInput = () => {
      inputRef.current?.focus();
    };

    const openView = () => {
      if (!full || disabled) return;
      caretToEnd.current = true;
      // Safari does not focus a pressed button; the view gives focus back to the bar on close.
      triggerRef.current?.focus();
      setViewOpen(true);
    };

    const closeView = () => {
      setViewOpen(false);
    };

    const clearText = (announce: boolean) => {
      setText("", "clear");
      emitQuery("");
      onClear?.();
      if (announce) say(t.searchCleared);
    };

    /** Runs `onSubmit`; false when the query is empty and empty queries are not submitted. */
    const runSubmit = (raw: string, source: SearchFieldSubmitSource, option?: ComboboxOption) => {
      const query = raw.trim();
      if (query === "" && !submitEmpty) return false;
      window.clearTimeout(timer.current);
      onSubmit?.(query, option ? { source, option } : { source });
      if (viewOpen && closeOnSubmit) closeView();
      return true;
    };

    /** A form with an `action` is then submitted by the browser (progressive enhancement). */
    const submitNative = () => {
      const form = landmark
        ? (rootRef.current as HTMLFormElement | null)
        : (rootRef.current?.closest("form") ?? null);
      if (!form?.getAttribute("action")) return;
      nativeSubmit.current = true;
      form.requestSubmit();
    };

    const handleFormSubmit = (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
      if (action === undefined) event.preventDefault();
      if (nativeSubmit.current) {
        nativeSubmit.current = false;
        return;
      }
      const { submitter } = event.nativeEvent;
      const source = submitter && submitter === submitRef.current ? "button" : "enter";
      if (!runSubmit(text, source)) event.preventDefault();
    };

    const handleButtonClick = () => {
      if (runSubmit(text, "button")) submitNative();
    };

    // ---- keys ----
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, inView: boolean) => {
      const { key } = event;
      const plain = !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
      if (key === "Enter" && ime.isComposing(event)) {
        // An Enter that ends a composition never submits, with or without modifiers.
        event.preventDefault();
        return;
      }
      if (key === "Enter" && plain) {
        // Never lets the browser submit on its own.
        event.preventDefault();
        if (!disabled && runSubmit(text, "enter")) submitNative();
        return;
      }
      if (key === "Escape") {
        if (ime.isComposing(event)) {
          // The view, or a Modal around the field, closes on Escape; one that ends a
          // composition must not reach it.
          event.stopPropagation();
          return;
        }
        if (inView || text === "" || readOnly || disabled) {
          onKeyDown?.(event);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        clearText(true);
        return;
      }
      onKeyDown?.(event);
    };

    const handleCompositionStart = (event: CompositionEvent<HTMLInputElement>) => {
      onCompositionStart?.(event);
      composing.current = true;
      ime.onCompositionStart();
    };

    const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
      onCompositionEnd?.(event);
      composing.current = false;
      ime.onCompositionEnd();
      scheduleQuery(event.currentTarget.value);
    };

    const typed = (next: string, isComposing: boolean) => {
      setText(next, "input");
      if (next === "") emitQuery("");
      else if (!isComposing) scheduleQuery(next);
    };

    const handlePlainChange = (event: ChangeEvent<HTMLInputElement>) => {
      typed(event.target.value, composing.current || (event.nativeEvent as InputEvent).isComposing);
    };

    const handleComboInput = (next: string, reason: string) => {
      if (reason === "clear") {
        clearText(true);
        return;
      }
      if (reason === "select") {
        setText(next, "select");
        return;
      }
      if (reason === "input") typed(next, composing.current);
    };

    // Single pick: the Combobox reports its value; its free-text commits (Enter, blur) are ignored.
    const handleComboChange = (picked: string | null) => {
      if (picked === null || enterWithoutPick.current || blurring.current) return;
      const option = flat.find((o) => o.value === picked);
      if (!option) return;
      runSubmit(textOf(option), "suggestion", option);
    };

    const markEnter = (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
      enterWithoutPick.current = !event.target.hasAttribute("aria-activedescendant");
      queueMicrotask(() => {
        enterWithoutPick.current = false;
      });
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      onBlur?.(event);
      blurring.current = true;
      queueMicrotask(() => {
        blurring.current = false;
      });
    };

    const handleFocus = (event: FocusEvent<HTMLInputElement>, inView: boolean) => {
      onFocus?.(event);
      if (inView && caretToEnd.current) {
        caretToEnd.current = false;
        const end = event.currentTarget.value.length;
        event.currentTarget.setSelectionRange(end, end);
      }
    };

    const keepFocus = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleClearCell = () => {
      clearText(true);
      focusInput();
    };

    // A press on the box (glyph, padding) focuses the input.
    const handleBoxMouseDown = (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === inputRef.current) return;
      if ((event.target as Element).closest("button")) return;
      event.preventDefault();
      if (!disabled) focusInput();
    };

    // ---- imperative ----
    useImperativeHandle(
      actionRef,
      () => ({
        focus: () => {
          if (full && !viewOpen) triggerRef.current?.focus();
          else inputRef.current?.focus();
        },
        clear: () => {
          clearText(false);
        },
        open: openView,
        close: closeView,
      }),
      // The handlers read the latest props through the render they come from.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [full, viewOpen, text, disabled],
    );

    // ---- shortcut ----
    const shortcutKey = shortcut === undefined ? undefined : JSON.stringify(shortcut);
    const shortcutAction = useRef<() => void>(() => undefined);
    useEffect(() => {
      shortcutAction.current = () => {
        if (full) openView();
        else focusInput();
      };
    });
    useEffect(() => {
      if (shortcut === undefined || disabled) return;
      const bare = isBareShortcut(shortcut);
      const onKey = (event: globalThis.KeyboardEvent) => {
        if (event.defaultPrevented || isImeKey(event)) return;
        if (!matchShortcut(event, shortcut, platform)) return;
        const target = full ? triggerRef.current : inputRef.current;
        if (!target?.isConnected || target.closest("[inert], [hidden]")) return;
        if (bare && isEditable(event.target)) return;
        if (document.activeElement === target) return;
        event.preventDefault();
        shortcutAction.current();
      };
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("keydown", onKey);
      };
      // `shortcutKey` stands for `shortcut`, so a new array with the same keys keeps the listener.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shortcutKey, disabled, platform, full]);

    // ---- view lifecycle ----
    // Crossing the breakpoint while the view is open closes it.
    const wasFull = useRef(full);
    useEffect(() => {
      const crossed = wasFull.current && !full;
      wasFull.current = full;
      if (crossed && openRaw) {
        // The bar is gone: focus goes to the docked input that replaced it, not to the page.
        dockedRef.current?.focus();
        setOpenRaw(false);
        onOpenChange?.(false);
      }
    }, [full, openRaw, setOpenRaw, onOpenChange]);

    const overlayRef = useOverlay({ open: viewOpen, onClose: closeView });
    const {
      mounted: viewMounted,
      state: viewState,
      setElement,
    } = usePresence<HTMLDivElement>(viewOpen);
    const setView = useCallback(
      (node: HTMLDivElement | null) => {
        overlayRef(node);
        setElement(node);
      },
      [overlayRef, setElement],
    );

    // ---- field and names ----
    const fieldProps = useFieldControl({
      id: idProp,
      "aria-describedby": rest["aria-describedby"],
      "aria-invalid": rest["aria-invalid"],
    });
    const ariaLabelledBy = rest["aria-labelledby"];
    const inFieldLabel = ariaLabelledBy === undefined ? field?.labelId : undefined;
    const ariaLabel =
      rest["aria-label"] ?? label ?? (ariaLabelledBy || inFieldLabel ? undefined : t.search);
    const keyShortcuts =
      shortcut !== undefined && !disabled ? toAriaKeyShortcuts(shortcut, platform) : undefined;
    const viewInputId = `${useId()}-view`;
    // Only attributes and handlers that belong on a button reach the bar.
    const buttonProps = Object.fromEntries(
      Object.entries(rest).filter(
        ([key]) =>
          key.startsWith("aria-") ||
          key.startsWith("data-") ||
          /^on[A-Z]/.test(key) ||
          key === "title" ||
          key === "tabIndex" ||
          key === "autoFocus",
      ),
    ) as ButtonHTMLAttributes<HTMLButtonElement>;
    const valueId = `${useId()}-value`;

    // ---- dev warnings ----
    const bareShortcut = shortcut !== undefined && isBareShortcut(shortcut);
    useEffect(() => {
      if (bareShortcut) {
        devWarn(
          "SearchField",
          "a shortcut with no modifier fails WCAG 2.1.4 unless people can turn it off; prefer `mod+k`.",
        );
      }
    }, [bareShortcut]);

    // ---- render parts ----
    const hasText = text !== "";
    const active = !disabled && !readOnly;
    const hint =
      shortcut !== undefined && !hasText && !disabled ? (
        <Kbd keys={shortcut} className="ol-searchfield__hint" aria-hidden="true" />
      ) : null;
    const busy = loading ? (
      <span className="ol-searchfield__busy" aria-hidden="true">
        <Spinner />
      </span>
    ) : null;

    const setDockedInput = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      dockedRef.current = node;
      assignRef(ref, node);
    };
    const setViewInput = (node: HTMLInputElement | null) => {
      if (node) {
        viewRef.current = node;
        inputRef.current = node;
        return;
      }
      // A view that closes after the docked field came back must not take its ref with it.
      if (inputRef.current === viewRef.current) inputRef.current = dockedRef.current;
      viewRef.current = null;
    };
    const setTrigger = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      assignRef(ref, node);
    };

    const keyDownDocked = (event: KeyboardEvent<HTMLInputElement>) => {
      handleKeyDown(event, false);
    };
    const keyDownInView = (event: KeyboardEvent<HTMLInputElement>) => {
      handleKeyDown(event, true);
    };
    const focusDocked = (event: FocusEvent<HTMLInputElement>) => {
      handleFocus(event, false);
    };
    const focusInView = (event: FocusEvent<HTMLInputElement>) => {
      handleFocus(event, true);
    };

    const renderField = (inView: boolean) => {
      const own = inView
        ? {
            id: viewInputId,
            "aria-label": ariaLabel,
            "aria-labelledby": ariaLabelledBy ?? inFieldLabel,
            "data-autofocus": "",
          }
        : {
            id: fieldProps.id,
            "aria-label": ariaLabel,
            "aria-labelledby": ariaLabelledBy,
            "aria-keyshortcuts": keyShortcuts,
          };
      const common = {
        ...rest,
        ...own,
        autoComplete: autoComplete ?? "off",
        enterKeyHint: enterKeyHint ?? "search",
        "aria-busy": loading || undefined,
        placeholder,
        disabled,
        readOnly,
      };

      if (suggestions) {
        return (
          <Combobox
            {...common}
            announceResults={!countsResults}
            ref={inView ? setViewInput : setDockedInput}
            aria-describedby={inView ? fieldProps["aria-describedby"] : rest["aria-describedby"]}
            aria-invalid={inView ? fieldProps["aria-invalid"] : rest["aria-invalid"]}
            onKeyDown={inView ? keyDownInView : keyDownDocked}
            onFocus={inView ? focusInView : focusDocked}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            type="search"
            className={cx("ol-searchfield__box", line && "ol-searchfield__box--line")}
            options={options}
            value={null}
            onChange={handleComboChange}
            inputValue={text}
            onInputChange={handleComboInput}
            allowCustomValue
            showTrigger={false}
            clearable
            emptyText={null}
            filter={filter}
            openOnFocus={openOnFocus}
            loading={loading}
            size={size}
            popupClassName={popupClassName}
            startContent={<SearchGlyph />}
            endContent={
              busy || hint ? (
                <>
                  {busy}
                  {hint}
                </>
              ) : null
            }
            onBlur={handleBlur}
          />
        );
      }

      return (
        // The input inside takes every key; a press on the box only forwards focus to it.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          className={cx(
            "ol-searchfield__box",
            line && "ol-searchfield__box--line",
            disabled && "ol-searchfield__box--disabled",
          )}
          onMouseDown={handleBoxMouseDown}
        >
          <span className="ol-searchfield__body">
            <span className="ol-searchfield__icon">
              <SearchGlyph />
            </span>
            <input
              {...common}
              ref={inView ? setViewInput : setDockedInput}
              onKeyDown={inView ? keyDownInView : keyDownDocked}
              onFocus={inView ? focusInView : focusDocked}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              type="search"
              name={inView || name === undefined ? undefined : name}
              className="ol-searchfield__input"
              autoCapitalize="off"
              spellCheck={false}
              value={text}
              aria-describedby={fieldProps["aria-describedby"]}
              aria-invalid={fieldProps["aria-invalid"]}
              onChange={handlePlainChange}
              onBlur={onBlur}
            />
          </span>
          {busy || hint ? (
            <span className="ol-searchfield__end">
              {busy}
              {hint}
            </span>
          ) : null}
          {hasText && active ? (
            <button
              type="button"
              tabIndex={-1}
              className="ol-searchfield__clear"
              aria-label={t.clear}
              onMouseDown={keepFocus}
              onClick={handleClearCell}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      );
    };

    const status = (
      <span className="ol-searchfield__status ol-sr" role="status" aria-atomic="true">
        {message.inView === viewOpen ? message.text : ""}
      </span>
    );

    // The bar is named by its content (label, then the query or placeholder), so the visible
    // text is part of its name (WCAG 2.5.3).
    const ownLabelId = `${valueId}-label`;
    const barLabelId = ariaLabelledBy ?? inFieldLabel ?? ownLabelId;
    const shown = hasText ? text : placeholder;
    const showValue = shown !== undefined && shown !== "" && (hasText || shown !== ariaLabel);
    // The hint sits beside the button, not in it: its caps are not part of the bar's name.
    const trigger = (
      // A press anywhere on the box opens the view, as the button inside does from the keyboard.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        className={cx(
          "ol-searchfield__box",
          "ol-searchfield__bar",
          line && "ol-searchfield__box--line",
          disabled && "ol-searchfield__box--disabled",
        )}
        onClick={openView}
      >
        <button
          {...buttonProps}
          ref={setTrigger}
          type="button"
          id={fieldProps.id}
          className="ol-searchfield__trigger"
          aria-label={undefined}
          aria-labelledby={showValue ? `${barLabelId} ${valueId}` : barLabelId}
          aria-describedby={fieldProps["aria-describedby"]}
          aria-haspopup="dialog"
          aria-expanded={viewOpen}
          aria-keyshortcuts={keyShortcuts}
          disabled={disabled}
          onKeyDown={onKeyDown as unknown as (event: KeyboardEvent<HTMLButtonElement>) => void}
          onFocus={onFocus as unknown as (event: FocusEvent<HTMLButtonElement>) => void}
          onBlur={onBlur as unknown as (event: FocusEvent<HTMLButtonElement>) => void}
        >
          {barLabelId === ownLabelId ? (
            <span id={ownLabelId} className="ol-sr">
              {ariaLabel}
            </span>
          ) : null}
          <span className="ol-searchfield__body">
            <span className="ol-searchfield__icon">
              <SearchGlyph />
            </span>
            <span
              id={valueId}
              className={cx(
                "ol-searchfield__value",
                !hasText && "ol-searchfield__value--placeholder",
              )}
            >
              {shown}
            </span>
          </span>
        </button>
        {hint ? <span className="ol-searchfield__end">{hint}</span> : null}
      </div>
    );

    const view = viewMounted ? (
      <Portal anchor={rootRef}>
        <div
          ref={setView}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabelledBy || inFieldLabel ? undefined : ariaLabel}
          aria-labelledby={ariaLabelledBy ?? inFieldLabel}
          tabIndex={-1}
          className={cx("ol-searchfield__view", "ol-kakejiku", size === "l" && "ol-searchfield--l")}
          data-state={viewState}
        >
          <FieldContext.Provider value={null}>
            <div className="ol-searchfield__head">
              <button
                type="button"
                className="ol-searchfield__back"
                aria-label={t.searchBack}
                onClick={closeView}
              >
                <span aria-hidden="true">←</span>
              </button>
              {renderField(true)}
            </div>
            <div className="ol-searchfield__results">{children}</div>
            {viewOpen ? status : null}
          </FieldContext.Provider>
        </div>
      </Portal>
    ) : null;

    const content = (
      <>
        {full ? trigger : renderField(false)}
        {submitButton && !full ? (
          <Button
            ref={submitRef}
            type={landmark ? "submit" : "button"}
            variant="solid"
            size={size}
            className="ol-searchfield__submit"
            disabled={disabled}
            onClick={landmark ? undefined : handleButtonClick}
          >
            {t.search}
          </Button>
        ) : null}
        {name !== undefined && !disabled && (suggestions || full) ? (
          <input type="hidden" name={name} value={text} />
        ) : null}
        {viewOpen ? null : status}
        {view}
      </>
    );

    const rootClass = cx(
      "ol-searchfield",
      size === "l" && "ol-searchfield--l",
      disabled && "ol-searchfield--disabled",
      submitButton && !full && "ol-searchfield--has-submit",
      className,
    );

    if (!landmark) {
      return (
        <div
          ref={(node) => {
            rootRef.current = node;
          }}
          className={rootClass}
          style={style}
          data-state={viewOpen ? "open" : "closed"}
          // Keys are read before the Combobox handles them, to tell a pick from free text.
          onKeyDownCapture={markEnter}
        >
          {content}
        </div>
      );
    }

    return (
      <form
        ref={(node) => {
          rootRef.current = node;
        }}
        role="search"
        aria-label={landmarkLabel}
        action={action}
        method={method}
        noValidate
        className={rootClass}
        style={style}
        data-state={viewOpen ? "open" : "closed"}
        onSubmit={handleFormSubmit}
        onKeyDownCapture={markEnter}
      >
        {content}
      </form>
    );
  },
);
