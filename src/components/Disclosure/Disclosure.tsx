import type { HTMLAttributes, ReactNode } from "react";
import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";

import { useControllable } from "../../hooks/useControllable";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";

export interface DisclosureProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The trigger text. Keep it the same whether the section is open or closed. */
  summary: ReactNode;
  /** The panel content. */
  children?: ReactNode;
  /** Controlled state. When defined, the component never changes it. */
  open?: boolean;
  /** Initial state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the reader toggles the section (or `findable` reveals it). */
  onOpenChange?: (open: boolean) => void;
  /** Native `disabled` on the trigger; the open or closed state is kept. */
  disabled?: boolean;
  /** `ruled`: hairlines above and below, full-width row. `bare`: inline text trigger, no rules. */
  variant?: "ruled" | "bare";
  /** Wraps the trigger in that heading level so the section joins the page outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Role of the panel. Use `region` only for a major section. */
  panelRole?: "group" | "region";
  /** Keep the closed panel in the DOM, `hidden`, to preserve its state (form fields, scroll). */
  keepMounted?: boolean;
  /**
   * Closed panel uses `hidden="until-found"` so find-in-page and `#fragment` links reveal it.
   * Implies `keepMounted`. Only where the browser supports it. The reveal is instant (no
   * unroll). The browser has already removed `hidden` when `beforematch` fires, so a controlled
   * parent must accept `onOpenChange(true)`, synchronously in the handler (a later update replays
   * the unroll); one that ignores it leaves the panel showing while `open` is false.
   */
  findable?: boolean;
}

/**
 * Disclosure is one show/hide section: a full-width button with a +/− sign over a hairline-ruled
 * panel that unrolls like a hanging scroll. It keeps the page's reading order, never floats and
 * never moves focus. Use `Accordion` for three or more related sections.
 *
 * The panel is a labelled `group`. Closed content is not rendered unless `keepMounted` or
 * `findable` is set. The panel unrolls only on a toggle, never on first render or when
 * `findable` reveals it. Only `clip-path`
 * animates, so the content below moves in one step when it opens and when the close ends.
 *
 * ```tsx
 * <Disclosure summary="Shipping and returns" headingLevel={3}>
 *   Orders ship within ten days.
 * </Disclosure>
 * ```
 */
export const Disclosure = forwardRef<HTMLDivElement, DisclosureProps>(function Disclosure(
  {
    summary,
    children,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    disabled = false,
    variant = "ruled",
    headingLevel,
    panelRole = "group",
    keepMounted = false,
    findable = false,
    className,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useControllable<boolean>(openProp, defaultOpen, onOpenChange);
  const base = useId();
  const triggerId = `${base}-trigger`;
  const panelId = `${base}-panel`;

  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const kept = keepMounted || findable;
  const { mounted, hidden, state, setElement } = usePresence<HTMLDivElement>(open, {
    keepMounted: kept,
    returnFocus: triggerEl,
  });

  // The unroll plays on insertion, so the motion class only appears once the state has changed:
  // a section that is open on first render stays still, and so does one the browser reveals
  // through find-in-page (`instant`, set together with the open request).
  const [prevOpen, setPrevOpen] = useState(open);
  const [moved, setMoved] = useState(false);
  const [instant, setInstant] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setMoved(!instant);
    setInstant(false);
  }

  // A controlled parent may ignore the reveal request, so `open` never changes and the flag above
  // is never consumed. Clear it once that render has committed, so a later open still unrolls.
  // The instant reveal therefore needs the parent to update `open` synchronously in `onOpenChange`.
  useIsomorphicLayoutEffect(() => {
    if (instant) setInstant(false);
  }, [instant]);

  // React renders `hidden` as a boolean attribute (React 18 and 19 alike), so `until-found` is
  // set on the element itself. Layout effect: it replaces the plain `hidden` React just wrote
  // before the frame is painted.
  useIsomorphicLayoutEffect(() => {
    if (hidden) panelRef.current?.setAttribute("hidden", findable ? "until-found" : "");
  }, [hidden, findable]);

  // React has no `onBeforeMatch` prop: the browser fires it on a find-in-page hit or a fragment
  // link, just before it removes `until-found` from the panel.
  useEffect(() => {
    const panel = panelRef.current;
    if (!findable || !panel) return;
    const reveal = () => {
      setInstant(true);
      setOpen(true);
    };
    panel.addEventListener("beforematch", reveal);
    return () => {
      panel.removeEventListener("beforematch", reveal);
    };
  }, [findable, setOpen]);

  const setPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      setElement(node);
    },
    [setElement],
  );

  const Heading = headingLevel
    ? (`h${String(headingLevel)}` as "h2" | "h3" | "h4" | "h5" | "h6")
    : null;

  const trigger = (
    <button
      ref={setTriggerEl}
      type="button"
      className="ol-disclosure__trigger"
      id={triggerId}
      aria-expanded={open}
      aria-controls={mounted ? panelId : undefined}
      disabled={disabled}
      onClick={() => {
        setInstant(false);
        setOpen(!open);
      }}
    >
      <span className="ol-disclosure__summary">{summary}</span>
      <span className="ol-disclosure__sign" aria-hidden="true">
        {open ? "−" : "+"}
      </span>
    </button>
  );

  return (
    <div
      {...rest}
      ref={ref}
      className={cx("ol-disclosure", variant === "bare" && "ol-disclosure--bare", className)}
      data-state={open ? "open" : "closed"}
    >
      {Heading ? <Heading className="ol-disclosure__head">{trigger}</Heading> : trigger}
      {mounted && (
        <div
          ref={setPanel}
          id={panelId}
          role={panelRole}
          aria-labelledby={triggerId}
          hidden={hidden || undefined}
          data-state={state}
          className={cx("ol-disclosure__panel", moved && "ol-kakejiku")}
        >
          <div className="ol-disclosure__body">{children}</div>
        </div>
      )}
    </div>
  );
});
