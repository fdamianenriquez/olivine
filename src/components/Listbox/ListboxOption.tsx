import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react";

import type { Listbox as ListboxController } from "../../hooks/useListbox";
import { cx } from "../../utils/cx";
import { ListboxContext, type ListboxContextValue, useListboxContext } from "./ListboxContext";

export interface ListboxOptionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Unique, stable value of the option in its list. */
  value: string;
  /** The label: plain text, no interactive content. */
  children?: ReactNode;
  /** A second line under the label, read as the option's description. */
  description?: ReactNode | undefined;
  /** A short trailing detail (a count, a shortcut), read as part of the description. */
  meta?: ReactNode | undefined;
  /**
   * Plain text of the option for typeahead, when the label is not plain text (an icon, an
   * amount, markup) or should be found by a reading (romaji or kana for a kanji label).
   */
  textValue?: string | undefined;
  /** The option cannot be selected and is skipped by the keyboard. */
  disabled?: boolean | undefined;
}

/**
 * One choice in a `Listbox`: a row with a label, an optional description and meta, and a ✓
 * slot at the end that shows when the option is selected.
 */
export const ListboxOption = forwardRef<HTMLDivElement, ListboxOptionProps>(function ListboxOption(
  { value, children, description, meta, textValue, disabled = false, className, ...rest },
  ref,
) {
  const context = useListboxContext("ListboxOption");
  const id = useId();
  if (!context) return null;
  const { controller, checkmark } = context;
  const labelId = `${id}-label`;
  const descId = description !== undefined && description !== null ? `${id}-desc` : undefined;
  const metaId = meta !== undefined && meta !== null ? `${id}-meta` : undefined;
  const describedBy =
    [descId, metaId, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined;

  return (
    <div
      {...controller.getOptionProps(value, { disabled, textValue }, rest)}
      ref={ref}
      className={cx("ol-listbox__option", className)}
      // An explicit aria-label names the option on its own.
      aria-labelledby={rest["aria-label"] === undefined ? labelId : undefined}
      aria-describedby={describedBy}
    >
      <span className="ol-listbox__text">
        <span id={labelId} className="ol-listbox__label">
          {children ?? value}
        </span>
        {descId ? (
          <span id={descId} className="ol-listbox__desc">
            {description}
          </span>
        ) : null}
      </span>
      {metaId ? (
        <span id={metaId} className="ol-listbox__meta">
          {meta}
        </span>
      ) : null}
      {checkmark ? (
        <span className="ol-listbox__mark" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </div>
  );
});

export interface ListboxGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Heading of the group; names it. Never an option, and typeahead skips it. */
  label: ReactNode;
  /** `ListboxOption`s. */
  children?: ReactNode;
}

/** A named run of options. Arrow keys and typeahead cross groups as if they were not there. */
export const ListboxGroup = forwardRef<HTMLDivElement, ListboxGroupProps>(function ListboxGroup(
  { label, children, className, ...rest },
  ref,
) {
  const headingId = `${useId()}-heading`;
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      {...rest}
      ref={ref}
      className={cx("ol-listbox__group", className)}
    >
      <div id={headingId} className="ol-listbox__heading">
        {label}
      </div>
      {children}
    </div>
  );
});

/** One option given as data (for `ListboxOptions`). */
export interface ListboxOptionData {
  value: string;
  label: ReactNode;
  description?: ReactNode | undefined;
  meta?: ReactNode | undefined;
  textValue?: string | undefined;
  disabled?: boolean | undefined;
}

/** A group of options given as data (for `ListboxOptions`). */
export interface ListboxGroupData {
  label: ReactNode;
  options: readonly ListboxOptionData[];
}

export type ListboxItemData = ListboxOptionData | ListboxGroupData;

export const isGroupData = (item: ListboxItemData): item is ListboxGroupData => "options" in item;

/** Whether data items hold at least one option. */
export const hasDataOptions = (items: readonly ListboxItemData[]) =>
  items.some((item) => !isGroupData(item) || item.options.length > 0);

export interface ListboxOptionsProps {
  /** Options and groups, in list order. Groups without options are left out. */
  items: readonly ListboxItemData[];
  /**
   * A `useListbox` result to render with, for a component that draws its own list root (a
   * popup's). Inside a `Listbox` leave it out: the options use the Listbox's behaviour.
   */
  controller?: ListboxController | undefined;
  /** With `controller`: reserve the ✓ slot. @default true */
  checkmark?: boolean;
}

/**
 * Renders options and groups from data with the same parts and classes as `ListboxOption` and
 * `ListboxGroup`, so a list built from data looks identical to one built from children.
 */
export function ListboxOptions({ items, controller, checkmark = true }: ListboxOptionsProps) {
  const rows = items.map((item, index) =>
    isGroupData(item) ? (
      item.options.length > 0 ? (
        // Groups have no value of their own; their place in the list is their identity.
        <ListboxGroup key={`group-${String(index)}`} label={item.label}>
          {item.options.map((option) => (
            <DataOption key={option.value} option={option} />
          ))}
        </ListboxGroup>
      ) : null
    ) : (
      <DataOption key={item.value} option={item} />
    ),
  );
  if (!controller) return <>{rows}</>;
  const context: ListboxContextValue = { controller, checkmark };
  return <ListboxContext.Provider value={context}>{rows}</ListboxContext.Provider>;
}

function DataOption({ option }: { option: ListboxOptionData }) {
  const { label, ...rest } = option;
  return <ListboxOption {...rest}>{label}</ListboxOption>;
}
