import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributeAnchorTarget,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useLabels } from "../../locale";
import { prefersReducedMotion } from "../../motion";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { CloseButton } from "../CloseButton";
import { CHIP_ITEM_ATTR, type ChipRemoveEvent, useChipGroup } from "./ChipGroupContext";

export interface ChipProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "className" | "style" | "onClick"
> {
  /** The label: one to three words in sentence case. Long labels truncate with an ellipsis. */
  children: ReactNode;
  /** Stable id of the chip. Required inside a `ChipGroup`, where selection and removal use it. */
  value?: string;
  /** Decorative glyph or `Avatar` before the label; hidden from assistive tech. */
  leading?: ReactNode;
  /**
   * Makes the chip a toggle (`aria-pressed`): selected chips fill with ink and stamp a `✓`.
   * Ignored inside a `ChipGroup`, which owns the selection.
   */
  selected?: boolean;
  /** Initial selection when uncontrolled; also makes the chip a toggle. */
  defaultSelected?: boolean;
  /** Called with the next selection when the toggle is pressed; also makes the chip a toggle. */
  onSelectedChange?: (selected: boolean) => void;
  /** Called when the main control is pressed: an assist or suggestion chip. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Renders the main control as a link. Cannot be combined with selection. */
  href?: string;
  /** Link target, with `href`. */
  target?: HTMLAttributeAnchorTarget;
  /** Link relationship, with `href`. */
  rel?: string;
  /**
   * Adds the trailing × cell and lets Delete or Backspace on the chip ask for removal. The chip
   * never removes itself: update your list and move focus to a neighbour. Ignored inside a
   * `ChipGroup` (use the group's `onRemove`).
   */
  onRemove?: (event: ChipRemoveEvent) => void;
  /**
   * `false` hides the × cell of this chip inside a `ChipGroup` that has `onRemove`.
   * @default true
   */
  removable?: boolean;
  /** Accessible name of the × button. Defaults to the localised "Remove {label}". */
  removeLabel?: string;
  /** The label as plain text, for the × button's name. Required when `children` is not a string. */
  textValue?: string;
  /** Disables the chip and its × cell. */
  disabled?: boolean;
  /** Extra class names for the root frame. */
  className?: string;
  /** Inline styles for the root frame. */
  style?: CSSProperties;
}

const isText = (node: ReactNode): node is string | number =>
  typeof node === "string" || typeof node === "number";

/**
 * A 32px hairline-framed token for a choice, a filter, a suggestion or a value the user entered.
 * The props decide what it is: `onClick` (action), `selected` (toggle), `href` (link), `onRemove`
 * (removable value). Other props and `ref` go to the main control (button, link or span).
 */
export const Chip = forwardRef<HTMLElement, ChipProps>(function Chip(
  {
    children,
    value,
    leading,
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    onClick,
    href,
    target,
    rel,
    onRemove,
    removable = true,
    removeLabel,
    textValue,
    disabled: disabledProp,
    className,
    style,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const group = useChipGroup();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [stamping, setStamping] = useState(false);
  // A user's press that may select: the stamp waits until `selected` really turns true.
  const pendingStamp = useRef(false);
  const [pressCount, rerender] = useReducer((n: number) => n + 1, 0);

  const isLink = href !== undefined;
  const ownToggle =
    selectedProp !== undefined || defaultSelected !== undefined || onSelectedChange !== undefined;
  const [ownSelected, setOwnSelected] = useControllable(
    selectedProp,
    defaultSelected ?? false,
    onSelectedChange,
  );

  const grouped = group !== null && value !== undefined;
  const selectable = !isLink && (group ? group.mode !== "none" && grouped : ownToggle);
  const selected =
    selectable && (group ? grouped && group.selectedValues.includes(value) : ownSelected);
  const disabled = Boolean(disabledProp) || Boolean(group?.disabled);
  const hasRemove = group ? group.canRemove && removable && grouped : onRemove !== undefined;
  const label = textValue ?? (isText(children) ? String(children) : undefined);

  const interactive = isLink || selectable || onClick !== undefined;
  const removeOnly = !interactive && hasRemove;

  useEffect(() => {
    if (isLink && (ownToggle || (group !== null && group.mode !== "none"))) {
      devWarn("Chip", "a link chip cannot be selected; `selected` is ignored with `href`.");
    }
  }, [isLink, ownToggle, group]);

  useEffect(() => {
    if (group !== null && value === undefined) {
      devWarn(
        "Chip",
        "a chip inside a ChipGroup needs a `value`; selection and removal ignore it.",
      );
    }
  }, [group, value]);

  useEffect(() => {
    if (hasRemove && label === undefined && removeLabel === undefined) {
      devWarn(
        "Chip",
        "a removable chip without a string label needs `textValue` to name its remove button.",
      );
    }
  }, [hasRemove, label, removeLabel]);

  // The stamp class lives for one pass of the hanko; a native listener so it also ends in tests.
  useEffect(() => {
    const root = rootRef.current;
    if (!stamping || !root) return undefined;
    const onEnd = (event: Event) => {
      if (event.target instanceof Element && event.target.classList.contains("ol-chip__mark")) {
        setStamping(false);
      }
    };
    root.addEventListener("animationend", onEnd);
    return () => {
      root.removeEventListener("animationend", onEnd);
    };
  }, [stamping]);

  const requestRemove = (event: ChipRemoveEvent) => {
    if (disabled || !hasRemove) return;
    if (group) {
      if (value !== undefined) group.requestRemove(value, label, event);
    } else {
      onRemove?.(event);
    }
  };

  // After every render: stamp only when this render turned the chip on after a user's press. A
  // rejected press (controlled parent said no) clears the pending flag, so a later programmatic
  // select never stamps.
  const wasSelected = useRef(selected);
  useLayoutEffect(() => {
    if (selected && !wasSelected.current && pendingStamp.current) {
      if (!prefersReducedMotion(rootRef.current)) setStamping(true);
    } else if (!selected) {
      setStamping(false);
    }
    wasSelected.current = selected;
    pendingStamp.current = false;
  }, [selected, pressCount]);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      if (isLink) event.preventDefault();
      return;
    }
    onClick?.(event);
    if (event.defaultPrevented || !selectable) return;
    pendingStamp.current = !selected;
    // Render this chip in the same batch as the owner's update, so the pending flag is consumed
    // even when the owner rejects the change.
    rerender();
    if (group) {
      if (value !== undefined) group.toggle(value);
    } else {
      setOwnSelected(!ownSelected);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.defaultPrevented || (event.key !== "Delete" && event.key !== "Backspace")) return;
    // Safari sends the key that ends a composition with isComposing false and keyCode 229.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!hasRemove || disabled) return;
    event.preventDefault();
    requestRemove(event);
  };

  const Main: ElementType = isLink ? "a" : interactive ? "button" : "span";
  const itemAttr = { [CHIP_ITEM_ATTR]: "" };
  const mainProps: Record<string, unknown> = isLink
    ? {
        href: disabled ? undefined : href,
        target,
        rel,
        // Without href an <a> has no role; keep it a (disabled) link.
        role: disabled ? "link" : undefined,
        "aria-disabled": disabled || undefined,
        "data-disabled": disabled ? "" : undefined,
        ...itemAttr,
      }
    : interactive
      ? {
          type: "button",
          disabled,
          "aria-pressed": selectable ? selected : undefined,
          ...itemAttr,
        }
      : {};

  return (
    // Delete/Backspace bubble here from the main control or the × button; both are native controls.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      ref={rootRef}
      style={style}
      className={cx(
        "ol-chip",
        selectable && "ol-chip--selectable",
        selected && "ol-chip--selected",
        selected && stamping && "ol-chip--stamp",
        hasRemove && "ol-chip--removable",
        disabled && "ol-chip--disabled",
        className,
      )}
      data-state={selectable ? (selected ? "on" : "off") : undefined}
      onKeyDown={handleKeyDown}
    >
      <Main
        ref={ref as Ref<never>}
        {...rest}
        {...mainProps}
        className="ol-chip__main"
        onClick={interactive ? handleClick : undefined}
      >
        {selectable ? (
          <span className="ol-chip__mark" aria-hidden="true">
            ✓
          </span>
        ) : null}
        {leading !== undefined && leading !== null ? (
          <span className="ol-chip__leading" aria-hidden="true">
            {leading}
          </span>
        ) : null}
        <span className="ol-chip__label">{children}</span>
      </Main>
      {hasRemove ? (
        <CloseButton
          className="ol-chip__remove"
          label={removeLabel ?? (label !== undefined ? t.removeChip(label) : t.dismiss)}
          disabled={disabled}
          tabIndex={group && !removeOnly ? -1 : undefined}
          onClick={requestRemove}
          {...(removeOnly ? itemAttr : undefined)}
        />
      ) : null}
    </span>
  );
});
