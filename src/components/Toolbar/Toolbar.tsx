import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { useRovingFocus } from "../../hooks/useRovingFocus";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Button } from "../Button";
import { Divider } from "../Divider";
import { ToolbarContext, useToolbar } from "./ToolbarContext";

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Accessible name of the bar (sets `aria-label`): what it acts on. Required, or `aria-label` / `aria-labelledby`. */
  label?: string;
  /**
   * `docked` is a full-width ruled strip on `paper`; `floating` is a `paper-3` block with a
   * hairline and the block shadow.
   * @default "docked"
   */
  variant?: "docked" | "floating";
  /**
   * `vertical` stacks the items, swaps the arrow keys to Up and Down and turns the separators
   * horizontal.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Pins the bar to a viewport edge (`position: fixed`, safe-area aware). Docked bars accept
   * `top` and `bottom` only (a side anchor on a docked bar is ignored with a dev warning). Omit
   * it to keep the bar in the page flow.
   */
  anchor?: "top" | "bottom" | "start" | "end";
  /**
   * Wraps focus from the last item to the first and back.
   * @default true
   */
  loop?: boolean;
  /**
   * What happens when the items are wider than the bar. `none`: the bar must fit. `wrap`: items
   * continue on the next row (arrows follow DOM order). `scroll`: the bar scrolls along its axis.
   * @default "none"
   */
  overflow?: "none" | "wrap" | "scroll";
}

/** Everything a roving stop can be inside a toolbar. */
const ITEMS = 'button, a[href], input:not([type="hidden"]), [role="radio"]';

/** Inputs whose caret keys are the field's own. Anything else (checkbox, file…) is a plain stop. */
const TEXT_TYPES = new Set(["text", "search", "email", "url", "tel", "password", "number"]);

/** Controls that would add a tab stop or fight the toolbar for the arrow keys. */
const FOREIGN =
  '[role="tablist"], [role="combobox"], [role="spinbutton"], [role="searchbox"], [role="toolbar"], [role="listbox"]';

/**
 * Lets an arrow key leave a text field only when the caret is already at the matching end of
 * the text (and nothing is selected); every other key belongs to the field.
 */
function textFieldYields(
  input: HTMLInputElement,
  event: KeyboardEvent<HTMLElement>,
  vertical: boolean,
): boolean {
  if (event.shiftKey) return false;
  const keys = vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
  if (!keys.includes(event.key)) return false;
  const { selectionStart: start, selectionEnd: end, value } = input;
  // Types without a caret API (number, email) report null: only an empty field is "at the edge".
  const atStart = start === null ? value === "" : start === 0 && end === 0;
  const atEnd = start === null ? value === "" : start === end && end === value.length;
  const rtl = getComputedStyle(input).direction === "rtl";
  const backward = vertical ? event.key === "ArrowUp" : (event.key === "ArrowLeft") !== rtl;
  return backward ? atStart : atEnd;
}

/**
 * A labelled bar of related controls that is one Tab stop: arrow keys move between its
 * buttons, toggles, segmented choices, menu triggers and (last) one text field. Tab enters on
 * the last focused item; Home and End jump to the ends; disabled items are skipped. It does not
 * hide, close or animate. Style the items with `ghost` buttons so the bar's frame is the only line.
 */
const ToolbarRoot = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  {
    label,
    variant = "docked",
    orientation = "horizontal",
    anchor,
    loop = true,
    overflow = "none",
    className,
    children,
    onKeyDown,
    onFocus,
    ...rest
  },
  ref,
) {
  const root = useRef<HTMLDivElement | null>(null);
  const vertical = orientation === "vertical";
  // A docked bar cannot sit on a side edge: it keeps its place in the flow.
  const sideDocked = variant === "docked" && (anchor === "start" || anchor === "end");
  const edge = sideDocked ? undefined : anchor;

  const roving = useRovingFocus(root, {
    itemSelector: ITEMS,
    orientation,
    loop,
  });

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const context = useMemo(() => ({ orientation }), [orientation]);

  const named = [label, rest["aria-label"], rest["aria-labelledby"]].some(
    (v) => v !== undefined && v !== "",
  );
  useEffect(() => {
    if (!named) {
      devWarn("Toolbar", "the bar needs a name; pass `label`, `aria-label` or `aria-labelledby`.");
    }
  }, [named]);
  useEffect(() => {
    if (sideDocked) {
      devWarn("Toolbar", '`anchor="start"` and `"end"` need `variant="floating"`; ignored.');
    }
  }, [sideDocked]);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const foreign = Array.from(el.querySelectorAll(FOREIGN)).find((node) => node !== el);
    if (foreign) {
      devWarn(
        "Toolbar",
        "tabs, comboboxes, number fields and nested toolbars add a tab stop or take the arrow keys; keep them out of a toolbar.",
      );
    }
    const stops = Array.from(el.querySelectorAll<HTMLElement>(ITEMS));
    const fields = stops.filter(
      (node): node is HTMLInputElement =>
        node instanceof HTMLInputElement && TEXT_TYPES.has(node.type),
    );
    const lastField = fields[fields.length - 1];
    if (fields.length > 1 || (lastField && lastField !== stops[stops.length - 1])) {
      devWarn("Toolbar", "use at most one text field, and make it the last item.");
    }
  }, []);

  return (
    // The items are the focus stops; the bar only delegates their arrow keys (roving).
    <div
      role="toolbar"
      aria-label={label}
      aria-orientation={vertical ? "vertical" : undefined}
      {...rest}
      ref={setRef}
      className={cx(
        "ol-toolbar",
        `ol-toolbar--${variant}`,
        vertical && "ol-toolbar--v",
        edge && `ol-toolbar--anchor-${edge}`,
        overflow !== "none" && `ol-toolbar--${overflow}`,
        className,
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        const target = event.target;
        if (
          target instanceof HTMLInputElement &&
          TEXT_TYPES.has(target.type) &&
          root.current?.contains(target) &&
          !textFieldYields(target, event, vertical)
        ) {
          return;
        }
        roving.onKeyDown(event);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        roving.onFocus(event);
      }}
    >
      <ToolbarContext.Provider value={context}>{children}</ToolbarContext.Provider>
    </div>
  );
});

export interface ToolbarSeparatorProps extends Omit<HTMLAttributes<HTMLHRElement>, "children"> {
  /** Extra class names for the root element. */
  className?: string;
}

/** A hairline across the bar's axis: vertical in a horizontal toolbar, horizontal in a vertical one. */
const ToolbarSeparator = forwardRef<HTMLElement, ToolbarSeparatorProps>(function ToolbarSeparator(
  { className, ...rest },
  ref,
) {
  const toolbar = useToolbar();
  return (
    <Divider
      {...rest}
      ref={ref}
      vertical={toolbar?.orientation !== "vertical"}
      className={cx("ol-toolbar__sep", className)}
    />
  );
});

export interface ToolbarSpacerProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Extra class names for the root element. */
  className?: string;
}

/** Takes the free space of the bar, so the items after it sit at its end. */
const ToolbarSpacer = forwardRef<HTMLSpanElement, ToolbarSpacerProps>(function ToolbarSpacer(
  { className, ...rest },
  ref,
) {
  return (
    <span {...rest} ref={ref} aria-hidden="true" className={cx("ol-toolbar__spacer", className)} />
  );
});

export interface ToolbarActionProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "onClick" | "type" | "aria-label"
> {
  /** Button text; with `iconOnly` it is the accessible name instead. */
  label: string;
  /** Called when the action is activated. */
  onAction?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Leading glyph. With `iconOnly` it is the only content. */
  icon?: ReactNode;
  /** Shows only the glyph in a square button; `label` becomes its `aria-label`. */
  iconOnly?: boolean;
  /** Whether the action is unavailable; arrow keys skip it. */
  disabled?: boolean;
  /** Marks a destructive action with the danger look. */
  danger?: boolean;
  /**
   * Visual weight of the button. `danger` overrides it.
   * @default "ghost"
   */
  variant?: "outline" | "solid" | "accent" | "ghost";
  /**
   * Control height: 32, 44 or 56px.
   * @default "m"
   */
  size?: "s" | "m" | "l";
  /** Extra class names for the root element. */
  className?: string;
}

/**
 * A toolbar command: a `ghost` Button built from a `label` and an optional `icon`, with one
 * `onAction` callback. Use it instead of a bare Button when the command is the whole story.
 */
const ToolbarAction = forwardRef<HTMLButtonElement, ToolbarActionProps>(function ToolbarAction(
  {
    label,
    onAction,
    icon,
    iconOnly = false,
    danger = false,
    variant = "ghost",
    className,
    ...rest
  },
  ref,
) {
  const glyphOnly = iconOnly && icon != null;
  useEffect(() => {
    if (iconOnly && icon == null) {
      devWarn("Toolbar.Action", "`iconOnly` needs an `icon`; the label is shown instead.");
    }
  }, [iconOnly, icon]);

  // `onClick` is not public, but a wrapper such as Tooltip injects one through cloneElement.
  const injected = (rest as { onClick?: (event: MouseEvent<HTMLButtonElement>) => void }).onClick;
  const common = {
    ...rest,
    ref,
    variant: danger ? ("danger" as const) : variant,
    className: cx("ol-toolbar__action", className),
    // A wrapper's own click handler runs first (Tooltip swallows the click that ends a touch
    // long press by preventing it); the action runs only when that click was not cancelled.
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      injected?.(event);
      if (!event.defaultPrevented) onAction?.(event);
    },
  };
  return glyphOnly ? (
    <Button {...common} square aria-label={label}>
      {icon}
    </Button>
  ) : (
    <Button {...common} icon={icon}>
      {label}
    </Button>
  );
});

/** Toolbar with its parts attached: `Toolbar.Separator`, `Toolbar.Spacer` and `Toolbar.Action`. */
export const Toolbar = Object.assign(ToolbarRoot, {
  Separator: ToolbarSeparator,
  Spacer: ToolbarSpacer,
  Action: ToolbarAction,
});
