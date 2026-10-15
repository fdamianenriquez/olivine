import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { forwardRef, useId, useRef } from "react";

import { useControllable } from "../../hooks/useControllable";
import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";

export interface AccordionItem {
  /** Row heading; the text of the toggle button. */
  title: ReactNode;
  /** Panel content, shown while the row is open. */
  content: ReactNode;
}

export interface AccordionProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "children" | "defaultValue"
> {
  /** The disclosure rows, in order. */
  items: AccordionItem[];
  /** Let several rows stay open at once. Defaults to one open row at a time. */
  multiple?: boolean;
  /** Indexes of the rows open on first render (uncontrolled). */
  defaultOpen?: number[];
  /** Indexes of the open rows (controlled). */
  value?: number[];
  /** Called with the next list of open indexes. */
  onChange?: (open: number[]) => void;
  /** Heading level (2–6) wrapping each toggle button, to fit the page outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

const NO_ROWS: number[] = [];

/**
 * Accordion is a ruled list of disclosure rows: index, title and a +/− sign. The open row's index turns olive.
 *
 * Each panel is a labelled `region`; with many rows open at once that adds landmark noise, so keep
 * the list short or use fewer `multiple` rows.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    items,
    multiple = false,
    defaultOpen = NO_ROWS,
    value,
    onChange,
    headingLevel = 3,
    className,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useControllable<number[]>(value, defaultOpen, onChange);
  const base = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const Heading = `h${String(headingLevel)}` as "h2" | "h3" | "h4" | "h5" | "h6";

  const toggle = (i: number) => {
    const isOpen = open.includes(i);
    if (multiple) {
      setOpen(isOpen ? open.filter((n) => n !== i) : [...open, i].sort((a, b) => a - b));
    } else {
      setOpen(isOpen ? [] : [i]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const buttons = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>("button.ol-accordion__btn") ?? [],
    );
    const at = buttons.indexOf(e.currentTarget);
    if (at < 0) return;
    let next = -1;
    if (e.key === "ArrowDown") next = (at + 1) % buttons.length;
    else if (e.key === "ArrowUp") next = (at - 1 + buttons.length) % buttons.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = buttons.length - 1;
    if (next < 0) return;
    e.preventDefault();
    buttons[next]?.focus();
  };

  return (
    <div
      {...rest}
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) ref.current = node;
      }}
      className={cx("ol-accordion", className)}
    >
      {items.map((item, i) => {
        const on = open.includes(i);
        return (
          <div key={i} className="ol-accordion__item" data-state={on ? "open" : "closed"}>
            <Heading className="ol-accordion__head">
              <button
                type="button"
                className="ol-accordion__btn"
                id={`${base}-h${String(i)}`}
                aria-expanded={on}
                aria-controls={`${base}-p${String(i)}`}
                onClick={() => {
                  toggle(i);
                }}
                onKeyDown={handleKeyDown}
              >
                <span className="ol-accordion__idx" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <span className="ol-accordion__title">{item.title}</span>
                <span className="ol-accordion__sign" aria-hidden="true">
                  {on ? "−" : "+"}
                </span>
              </button>
            </Heading>
            <div
              id={`${base}-p${String(i)}`}
              role="region"
              aria-labelledby={`${base}-h${String(i)}`}
              hidden={!on}
              className="ol-accordion__panel"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
});
