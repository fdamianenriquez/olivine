import {
  Children,
  type CSSProperties,
  forwardRef,
  Fragment,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { useField, useFieldControl } from "../../hooks/useFieldControl";
import { type Listbox as ListboxController, useListbox } from "../../hooks/useListbox";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { reveal } from "../../utils/listItems";
import { ListboxContext, type ListboxContextValue } from "./ListboxContext";
import {
  hasDataOptions,
  ListboxGroup,
  ListboxOption,
  ListboxOptions,
  type ListboxOptionsProps,
} from "./ListboxOption";

/** Where `actionRef.focus` puts focus: the selected option, the first, the last, or a value. */
export type ListboxFocusTarget = "selected" | "first" | "last" | (string & {});

/** Imperative handle for a parent (a popup that opens on the list, a TimePicker wrapper). */
export interface ListboxActions {
  /** Focuses an option (or makes it active, for a list driven by a controller). */
  focus: (target: ListboxFocusTarget) => boolean;
  /** Scrolls the list (never the page) so the option with this value is centred. */
  scrollTo: (value: string) => void;
}

interface ListboxBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children" | "autoFocus"
> {
  /** `ListboxOption`s and `ListboxGroup`s (or `ListboxOptions` from data). */
  children?: ReactNode;
  /** Accessible name (sets `aria-label`). Or `aria-label` / `aria-labelledby`, or a `Field`. */
  label?: string | undefined;
  /** Called on every deliberate pick (Enter, Space, click), even when the value is unchanged. */
  onAction?: ((value: string, event: SyntheticEvent) => void) | undefined;
  /** Disables every option; the list is no longer a tab stop. */
  disabled?: boolean | undefined;
  /** Row height: `s` (32px, 44px on touch) or `m` (44px). @default "s" */
  size?: "s" | "m" | undefined;
  /** Labels in the figure face, centred (digits and symbols only, as in a time column). */
  figures?: boolean | undefined;
  /** Draws a hairline frame around the list. @default false */
  boxed?: boolean | undefined;
  /** Draws a hairline between options. @default false */
  divided?: boolean | undefined;
  /** Reserves the ✓ slot at the end of each option. @default true */
  checkmark?: boolean | undefined;
  /** Caps the height at this many rows; the list scrolls inside itself. */
  rows?: number | undefined;
  /** Arrow keys wrap from the last option to the first and back. @default false */
  loop?: boolean | undefined;
  /** Typing jumps to an option by its first letters. @default true */
  typeahead?: boolean | undefined;
  /** Focuses the selected option (else the first) on mount and scrolls it into view. */
  autoFocus?: boolean | undefined;
  /** Shows the loading row under the options and marks the list busy. */
  loading?: boolean | undefined;
  /** Shown when there are no options. @default the locale's "No options" */
  empty?: ReactNode;
  /** Renders one hidden input per selected value for native forms. */
  name?: string | undefined;
  /**
   * Announces bulk selection changes (range, select all) in a polite status. Set `false` when a
   * parent makes its own announcements.
   * @default true
   */
  announce?: boolean | undefined;
  /** Receives `{ focus(target), scrollTo(value) }`. */
  actionRef?: Ref<ListboxActions> | undefined;
  /**
   * @internal For components built on Listbox (Combobox): a `useListbox` result that replaces the
   * list's own behaviour. Selection props are then ignored; the controller owns them.
   */
  controller?: ListboxController | undefined;
}

export interface ListboxSingleProps extends ListboxBaseProps {
  /** One selection (the default). */
  multiple?: false | undefined;
  /** Selected value (controlled); `null` is a controlled empty selection. */
  value?: string | null | undefined;
  /** Initially selected value when uncontrolled. */
  defaultValue?: string | null | undefined;
  /** Called with the new value when the selection changes. */
  onChange?: ((value: string | null) => void) | undefined;
  /** Picking the selected option again releases it. @default false */
  deselectable?: boolean | undefined;
  /** Arrow keys also select. Only when moving through the list is harmless. @default false */
  selectionFollowsFocus?: boolean | undefined;
}

export interface ListboxMultipleProps extends ListboxBaseProps {
  /** Several selections: Space toggles, Shift+Space selects a range, Ctrl+A selects all. */
  multiple: true;
  /** Selected values (controlled), in the order they were chosen. */
  value?: string[] | undefined;
  /** Initially selected values when uncontrolled. */
  defaultValue?: string[] | undefined;
  /** Called with the new values, in the order they were chosen. */
  onChange?: ((value: string[]) => void) | undefined;
  deselectable?: never;
  selectionFollowsFocus?: never;
}

export type ListboxProps = ListboxSingleProps | ListboxMultipleProps;

const NBSP = " ";

const toArray = (value: string | string[] | null | undefined): string[] | undefined =>
  value === undefined ? undefined : value === null ? [] : Array.isArray(value) ? value : [value];

/**
 * Whether `children` holds at least one option. Unknown components are assumed to render
 * options; only empty data, empty groups, fragments and nothing count as empty.
 */
function hasOptions(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return false;
    if (child.type === ListboxOption) return true;
    if (child.type === ListboxOptions) {
      return hasDataOptions((child.props as unknown as ListboxOptionsProps).items);
    }
    if (child.type === ListboxGroup || child.type === Fragment) {
      return hasOptions(child.props.children);
    }
    return true;
  });
}

/**
 * A visible, scrollable list of options with one selection or many (APG listbox). Arrow keys,
 * Home, End and Page keys move through the options, typeahead jumps by the first letters, Space
 * or Enter chooses. With `multiple`, Space toggles, Shift+Arrow moves and toggles, Shift+Space
 * selects a range and Ctrl+A selects all. Selected options are ink rows with a ✓. Escape,
 * Left and Right are left to the container.
 */
export const Listbox = forwardRef<HTMLDivElement, ListboxProps>(function Listbox(props, ref) {
  const {
    children,
    label,
    multiple = false,
    value,
    defaultValue,
    onChange,
    onAction,
    deselectable = false,
    selectionFollowsFocus = false,
    disabled = false,
    size = "s",
    figures = false,
    boxed = false,
    divided = false,
    checkmark = true,
    rows,
    loop = false,
    typeahead = true,
    autoFocus = false,
    loading = false,
    empty,
    name,
    announce = true,
    actionRef,
    controller,
    className,
    style,
    onKeyDown,
    onFocus,
    onBlur,
    ...rest
  } = props as ListboxBaseProps & {
    multiple?: boolean;
    value?: string | string[] | null | undefined;
    defaultValue?: string | string[] | null | undefined;
    onChange?: ((value: string | string[] | null) => void) | undefined;
    deselectable?: boolean | undefined;
    selectionFollowsFocus?: boolean | undefined;
  };
  const t = useLabels();

  // Live region: a repeated message gets a trailing no-break space so it is read again.
  const [message, setMessage] = useState("");
  const own = useListbox({
    focus: "dom",
    multiple,
    selected: toArray(value),
    defaultSelected: toArray(defaultValue) ?? [],
    onSelectedChange: onChange
      ? (next) => {
          onChange(multiple ? next : (next[0] ?? null));
        }
      : undefined,
    onAction,
    deselectable: !multiple && deselectable,
    selectionFollowsFocus: !multiple && selectionFollowsFocus,
    disabled,
    loop,
    typeahead,
    onBulkChange: (count) => {
      if (!announce) return;
      const text = t.optionsSelected(count);
      setMessage((prev) => (prev === text ? text + NBSP : text));
    },
  });
  const lb = controller ?? own;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = lb.listRef;
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      listRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [listRef, ref],
  );

  // A `<label for>` cannot name a div: the Field's label names the list through
  // `aria-labelledby`, and the Field still gives its description, validity and requirement.
  const field = useField();
  const fieldProps = useFieldControl({
    "aria-describedby": rest["aria-describedby"],
    "aria-invalid": rest["aria-invalid"],
    required: rest["aria-required"] === true || rest["aria-required"] === "true" || undefined,
  });
  const ownName = [label, rest["aria-label"], rest["aria-labelledby"]].some(
    (v) => v !== undefined && v !== "",
  );
  const fieldLabelId = ownName ? undefined : field?.labelId;
  const named = ownName || fieldLabelId !== undefined || controller !== undefined;
  const inField = field !== null;
  useEffect(() => {
    if (named) return;
    devWarn(
      "Listbox",
      inField
        ? "the Field has no label to name the list; pass `label`, `aria-label` or `aria-labelledby`."
        : "the list needs a name; pass `label`, `aria-label` or `aria-labelledby`.",
    );
  }, [named, inField]);

  const scrollTo = (target: string) => {
    const root = rootRef.current;
    const el = root?.querySelector<HTMLElement>(`#${CSS.escape(lb.optionId(target))}`);
    if (root && el) reveal(root, el, "center");
  };

  useImperativeHandle(actionRef, () => ({ focus: lb.focusOption, scrollTo }));

  // On mount only: `autoFocus` focuses the selected option (else the first); without it the
  // selected option is still scrolled into view, centred. Later changes never steal focus.
  const focusOnMount = useRef(autoFocus);
  const focusOption = lb.focusOption;
  useEffect(() => {
    if (focusOnMount.current) {
      focusOption("selected");
      return;
    }
    const root = rootRef.current;
    const first = root?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    if (root && first) reveal(root, first, "center");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const filled = hasOptions(children);
  const showEmpty = !filled && !loading;
  const rowsStyle =
    rows !== undefined ? ({ "--ol-listbox-rows": rows } as CSSProperties) : undefined;

  const context: ListboxContextValue = { controller: lb, checkmark };
  // The hook's ref is replaced by `setRoot`, which also fills the hook's `listRef`.
  const listRest = lb.getListboxProps({ onKeyDown, onFocus, onBlur });

  return (
    <>
      <div
        aria-label={label}
        aria-labelledby={fieldLabelId}
        {...rest}
        {...listRest}
        // An empty listbox is invalid ARIA: with no options the root is a plain group.
        role={filled ? "listbox" : "group"}
        aria-multiselectable={filled ? listRest["aria-multiselectable"] : undefined}
        aria-describedby={fieldProps["aria-describedby"]}
        aria-invalid={fieldProps["aria-invalid"]}
        aria-required={filled ? fieldProps.required : undefined}
        aria-busy={loading || undefined}
        ref={setRoot}
        className={cx(
          "ol-listbox",
          size === "m" && "ol-listbox--m",
          figures && "ol-listbox--figures",
          boxed && "ol-listbox--boxed",
          divided && "ol-listbox--divided",
          rows !== undefined && "ol-listbox--rows",
          className,
        )}
        style={rowsStyle ? { ...rowsStyle, ...style } : style}
        data-state={filled ? undefined : "empty"}
      >
        <ListboxContext.Provider value={context}>{children}</ListboxContext.Provider>
        {showEmpty ? <div className="ol-listbox__empty">{empty ?? t.noOptions}</div> : null}
        {loading ? <div className="ol-listbox__empty ol-listbox__loading">{t.loading}</div> : null}
      </div>
      {announce && !controller ? (
        <span className="ol-listbox__live ol-sr" role="status" aria-atomic="true">
          {message}
        </span>
      ) : null}
      {name !== undefined &&
        !disabled &&
        lb.selected.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
    </>
  );
});
