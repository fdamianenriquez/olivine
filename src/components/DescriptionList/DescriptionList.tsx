import {
  Children,
  createContext,
  type ForwardedRef,
  forwardRef,
  Fragment,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
} from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { VisuallyHidden } from "../VisuallyHidden";

/** Width of the term column in the horizontal layout: 96, 128 or 192px. */
export type DescriptionListTermWidth = "s" | "m" | "l";

/** `ruled`: rules above, below and between rows. `bordered`: a full frame and a sunk term cell. `plain`: no lines. */
export type DescriptionListVariant = "ruled" | "bordered" | "plain";

export interface DescriptionListEntry {
  /**
   * Stable key of the row. Defaults to the term when it is a string; a term that is not a
   * string, or an array of terms, needs an explicit key.
   */
  key?: string;
  /** The label of the row. An array renders several `dt` elements. */
  term: ReactNode | ReactNode[];
  /**
   * The value of the row. An array renders several `dd` elements. `null`, `undefined`, `false`
   * and `""` show the empty value; `0` is a value.
   */
  description: ReactNode | ReactNode[];
  /** The value is a number or an amount: figure face, tabular, aligned to the inline end. */
  numeric?: boolean | undefined;
  /** The value is an id, serial or timestamp: mono face. Not combined with `numeric`. */
  mono?: boolean | undefined;
  /** A word or unit after a numeric value (`weeks`, `mm`). */
  unit?: ReactNode;
}

export interface DescriptionListProps extends Omit<HTMLAttributes<HTMLDListElement>, "children"> {
  /** Data shorthand for the rows. Ignored when `children` are given. */
  items?: DescriptionListEntry[];
  /** `DescriptionList.Item` rows, for values that need markup. */
  children?: ReactNode;
  /**
   * `horizontal` puts the term and the value side by side and stacks them by itself when the
   * container is narrow. `vertical` always stacks the term above its value.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * `ruled` for running content, `bordered` for a standalone sheet, `plain` inside a Card or
   * Modal that already draws the frame.
   * @default "ruled"
   */
  variant?: DescriptionListVariant;
  /**
   * Tighter rows and smaller values, as Table `dense`.
   * @default false
   */
  dense?: boolean;
  /**
   * Width of the term column in the horizontal layout (96, 128 or 192px, padding included).
   * Override the `--ol-dl-term` custom property for any other width.
   * @default "m"
   */
  termWidth?: DescriptionListTermWidth;
  /**
   * Shown, with the locale's spoken "Not provided", when a description is `null`, `undefined`,
   * `false` or an empty string. It is rendered inside `aria-hidden`, so pass a non-interactive
   * glyph or word, never a link or a button.
   * @default "—"
   */
  emptyValue?: ReactNode;
}

export interface DescriptionListItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The label of the row. An array renders several `dt` elements. */
  term?: ReactNode | ReactNode[];
  /**
   * The value. One `dd` is made around it. When the children contain
   * `DescriptionList.Description` elements they are rendered as they are, for several values
   * of one term; a custom component that wraps a `Description` is not detected.
   */
  children?: ReactNode;
  /** The value is a number or an amount: figure face, tabular, aligned to the inline end. */
  numeric?: boolean | undefined;
  /** The value is an id, serial or timestamp: mono face. Not combined with `numeric`. */
  mono?: boolean | undefined;
  /** A word or unit after a numeric value (`weeks`, `mm`), in the label face. */
  unit?: ReactNode;
  /**
   * Replaces the list's `emptyValue` for this row. Like the list's, it is rendered inside
   * `aria-hidden`: a non-interactive glyph or word only.
   */
  emptyValue?: ReactNode;
}

export interface DescriptionListTermProps extends HTMLAttributes<HTMLElement> {
  /** The label. */
  children?: ReactNode;
}

export interface DescriptionListDescriptionProps extends HTMLAttributes<HTMLElement> {
  /** The value. */
  children?: ReactNode;
  /** The value is a number or an amount: figure face, tabular, aligned to the inline end. */
  numeric?: boolean | undefined;
  /** The value is an id, serial or timestamp: mono face. Not combined with `numeric`. */
  mono?: boolean | undefined;
  /** A word or unit after a numeric value (`weeks`, `mm`), in the label face. */
  unit?: ReactNode;
}

const DEFAULT_EMPTY = "—";

/** The glyph shown for an empty value, from the list or the row. */
const EmptyValueContext = createContext<ReactNode>(DEFAULT_EMPTY);

/** `null`, `undefined`, `false` and `""` are empty; `0` and `"0"` are values. */
function isEmptyNode(node: ReactNode): boolean {
  if (node === null || node === undefined || node === false || node === "") return true;
  if (Array.isArray(node)) return node.every(isEmptyNode);
  return false;
}

const hasLetters = (s: string) => /\p{L}/u.test(s);

/** Whether the children hold an element of the given type, looking through fragments. */
function hasChildOfType(children: ReactNode, type: unknown): boolean {
  let found = false;
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) return;
    if (child.type === Fragment) {
      found = hasChildOfType((child.props as { children?: ReactNode }).children, type);
    } else if (child.type === type) {
      found = true;
    }
  });
  return found;
}

/** The bare `dt`, for several terms in one `Item`. */
export const DescriptionListTerm = forwardRef<HTMLElement, DescriptionListTermProps>(
  function DescriptionListTerm({ className, children, ...rest }, ref) {
    return (
      <dt ref={ref} className={cx("ol-dl__term", className)} {...rest}>
        {children}
      </dt>
    );
  },
);

/** The bare `dd`, for several values in one `Item`. */
export const DescriptionListDescription = forwardRef<HTMLElement, DescriptionListDescriptionProps>(
  function DescriptionListDescription(
    { numeric = false, mono = false, unit, className, children, ...rest },
    ref,
  ) {
    const t = useLabels();
    const emptyGlyph = useContext(EmptyValueContext);
    const empty = isEmptyNode(children);
    const wordsInFigure = numeric && typeof children === "string" && hasLetters(children);

    useEffect(() => {
      if (wordsInFigure) {
        devWarn(
          "DescriptionList",
          "a `numeric` value is for digits and symbols; put words in `unit`.",
        );
      }
    }, [wordsInFigure]);
    useEffect(() => {
      if (numeric && mono) {
        devWarn("DescriptionList", "`numeric` and `mono` are not combined; `numeric` wins.");
      }
    }, [numeric, mono]);

    let content: ReactNode;
    if (empty) {
      content = (
        <span className="ol-dl__empty">
          <span aria-hidden="true">{emptyGlyph}</span>
          <VisuallyHidden>{t.emptyValue}</VisuallyHidden>
        </span>
      );
    } else if (numeric) {
      content = (
        <>
          <span className="ol-dl__fig">{children}</span>
          {unit != null && unit !== false && unit !== "" ? (
            <>
              {" "}
              <span className="ol-dl__unit">{unit}</span>
            </>
          ) : null}
        </>
      );
    } else {
      content = children;
    }

    return (
      <dd
        ref={ref}
        className={cx(
          "ol-dl__desc",
          numeric && "ol-dl__desc--numeric",
          mono && !numeric && "ol-dl__desc--mono",
          className,
        )}
        {...rest}
      >
        {content}
      </dd>
    );
  },
);

/** One row: a `div` around a `dt` and its `dd` elements. */
export const DescriptionListItem = forwardRef<HTMLDivElement, DescriptionListItemProps>(
  function DescriptionListItem(
    { term, numeric = false, mono = false, unit, emptyValue, className, children, ...rest },
    ref,
  ) {
    const inherited = useContext(EmptyValueContext);
    const terms = term === undefined || term === null ? [] : Array.isArray(term) ? term : [term];
    const custom = hasChildOfType(children, DescriptionListDescription);
    const termless = terms.length === 0 && !hasChildOfType(children, DescriptionListTerm);

    useEffect(() => {
      if (custom && (numeric || mono || unit !== undefined)) {
        devWarn(
          "DescriptionList",
          "`numeric`, `mono` and `unit` on an Item do not reach `Description` children; set them on each `Description`.",
        );
      }
    }, [custom, numeric, mono, unit]);

    useEffect(() => {
      if (termless) {
        devWarn(
          "DescriptionList",
          "an Item needs a `term` or a `DescriptionList.Term` child; a value without a term is not announced as part of a pair.",
        );
      }
    }, [termless]);

    return (
      <EmptyValueContext.Provider value={emptyValue ?? inherited}>
        <div ref={ref} className={cx("ol-dl__item", className)} {...rest}>
          {terms.map((node, i) => (
            <DescriptionListTerm key={i}>{node}</DescriptionListTerm>
          ))}
          {custom ? (
            children
          ) : (
            <DescriptionListDescription numeric={numeric} mono={mono} unit={unit}>
              {children}
            </DescriptionListDescription>
          )}
        </div>
      </EmptyValueContext.Provider>
    );
  },
);

/** Keys of the data rows, with a development warning for missing and duplicate ones. */
function entryKeys(items: DescriptionListEntry[]): string[] {
  const seen = new Set<string>();
  return items.map((entry, i) => {
    const key = entry.key ?? (typeof entry.term === "string" ? entry.term : undefined);
    if (key === undefined) {
      devWarn("DescriptionList", `items[${String(i)}] needs a \`key\`: its term is not a string.`);
      return `#${String(i)}`;
    }
    if (seen.has(key)) {
      devWarn("DescriptionList", `duplicate item key "${key}".`);
      return `${key}#${String(i)}`;
    }
    seen.add(key);
    return key;
  });
}

function DescriptionListRoot(
  {
    items,
    orientation = "horizontal",
    variant = "ruled",
    dense = false,
    termWidth = "m",
    emptyValue = DEFAULT_EMPTY,
    className,
    children,
    ...rest
  }: DescriptionListProps,
  ref: ForwardedRef<HTMLDListElement>,
) {
  const rows = children === undefined && items ? items : undefined;
  const keys = rows ? entryKeys(rows) : [];

  return (
    <EmptyValueContext.Provider value={emptyValue}>
      <dl
        ref={ref}
        className={cx(
          "ol-dl",
          `ol-dl--term-${termWidth}`,
          orientation === "vertical" && "ol-dl--vertical",
          variant === "bordered" && "ol-dl--bordered",
          variant === "plain" && "ol-dl--plain",
          dense && "ol-dl--dense",
          className,
        )}
        {...rest}
      >
        {rows
          ? rows.map((entry, i) => {
              const { term, description, numeric, mono, unit } = entry;
              const values = Array.isArray(description)
                ? description.map((d, j) => (
                    <DescriptionListDescription key={j} numeric={numeric} mono={mono} unit={unit}>
                      {d}
                    </DescriptionListDescription>
                  ))
                : description;
              return (
                <DescriptionListItem
                  key={keys[i]}
                  term={term}
                  numeric={Array.isArray(description) ? undefined : numeric}
                  mono={Array.isArray(description) ? undefined : mono}
                  unit={Array.isArray(description) ? undefined : unit}
                >
                  {values}
                </DescriptionListItem>
              );
            })
          : children}
      </dl>
    </EmptyValueContext.Provider>
  );
}

/**
 * The spec sheet: the attributes of one thing as terms and values, on the native `dl`, `dt`
 * and `dd`. Use `DescriptionList.Item`, `.Term` and `.Description` for values that need markup.
 * No roles are added: the list takes its name from a heading before it. The list needs a parent
 * with a width: it is a size container, so shrink-to-fit parents (`inline-flex`, floats, `auto`
 * grid tracks) collapse it. Put it in a block, or give a flex child `flex: 1` or `inline-size`.
 */
export const DescriptionList = Object.assign(forwardRef(DescriptionListRoot), {
  Item: DescriptionListItem,
  Term: DescriptionListTerm,
  Description: DescriptionListDescription,
});
