import type { HTMLAttributes, MouseEvent, ReactElement, ReactNode } from "react";
import {
  Children,
  forwardRef,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import { useIndicator } from "../../motion";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { pad } from "../../utils/pad";

export interface TabsTabProps {
  /** Text of the tab button. */
  label: ReactNode;
  /** Makes the tab unavailable. Keyboard navigation skips it. */
  disabled?: boolean;
  /** The panel content shown while this tab is selected. */
  children?: ReactNode;
}

/** Declares one tab and its panel. Rendered by `Tabs`; it draws nothing on its own. */
export function TabsTab(props: TabsTabProps): null {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  props;
  return null;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "children"> {
  /** Index of the selected tab (controlled). */
  value?: number;
  /** Index of the initially selected tab when uncontrolled. */
  defaultValue?: number;
  /** Called with the index of the newly selected tab. */
  onChange?: (index: number) => void;
  /** Tabs share the full width. Ignored when `orientation` is `vertical`. */
  fill?: boolean;
  /** Shows a zero-padded index numeral before each label. */
  indexed?: boolean;
  /**
   * Accessible name of the tab list; the tab list needs a name. Alias of `aria-label`.
   * `aria-label` and `aria-labelledby` are applied to the tab list, not the root element.
   */
  label?: string;
  /**
   * `automatic`: moving focus with the arrow keys, Home or End selects the tab.
   * `manual`: those keys only move focus; Space or Enter selects. Use `manual` when a panel
   * loads data or is expensive to render.
   * @default "automatic"
   */
  activation?: "automatic" | "manual";
  /**
   * `horizontal`: a row of tabs above the panel, Left/Right move.
   * `vertical`: a column of tabs beside the panel, Up/Down move.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Keeps the content of inactive panels mounted (hidden), so their state survives a switch.
   * When `false`, inactive panels stay in the DOM as empty shells.
   * @default true
   */
  keepMounted?: boolean;
  /** One or more `Tabs.Tab` elements (fragments are flattened). */
  children: ReactNode;
}

type TabElement = ReactElement<TabsTabProps>;

/** Valid element children, with fragments flattened. */
function collectTabs(children: ReactNode, out: TabElement[] = []): TabElement[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectTabs((child.props as { children?: ReactNode }).children, out);
      return;
    }
    out.push(child as TabElement);
  });
  return out;
}

const FOCUSABLE =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, audio[controls], video[controls], [tabindex], [contenteditable]:not([contenteditable="false"])';

/** Whether a panel holds content that a Tab key press can reach. */
function hasFocusable(panel: HTMLElement): boolean {
  for (const el of panel.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (el.matches(":disabled")) continue;
    const tabindex = el.getAttribute("tabindex");
    if (tabindex !== null && Number(tabindex) < 0) continue;
    const blocked = el.closest("[inert], [hidden], details:not([open]) > :not(summary)");
    if (blocked && panel.contains(blocked)) continue;
    return true;
  }
  return false;
}

/** Attributes that can change whether panel content is focusable. */
const PANEL_ATTRIBUTES = [
  "disabled",
  "tabindex",
  "hidden",
  "href",
  "inert",
  "open",
  "contenteditable",
  "type",
  "controls",
];

interface Overflow {
  /** The list can scroll toward its start. */
  start: boolean;
  /** The list can scroll toward its end. */
  end: boolean;
  /** Horizontal list in right-to-left text. */
  rtl: boolean;
}

const sameOverflow = (a: Overflow | null, b: Overflow | null) =>
  a === b || (!!a && !!b && a.start === b.start && a.end === b.end && a.rtl === b.rtl);

/**
 * Switches between panels in place. By default selection follows focus (automatic activation);
 * arrows wrap, Home/End jump to the ends and disabled tabs are skipped. A list wider than its
 * container scrolls; buttons at its ends appear for pointer users, and the selected tab is
 * scrolled into view. A visible panel is a tab stop only when it holds no focusable content.
 */
const TabsRoot = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value,
    defaultValue = 0,
    onChange,
    fill = false,
    indexed = false,
    label,
    activation = "automatic",
    orientation = "horizontal",
    keepMounted = true,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className,
    children,
    ...rest
  },
  ref,
) {
  const tabs = collectTabs(children);
  const vertical = orientation === "vertical";
  const [active, setActive] = useControllable<number>(value, defaultValue, onChange);
  const base = useId();
  const list = useRef<HTMLDivElement | null>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const [overflow, setOverflow] = useState<Overflow | null>(null);

  // The effective selection: the given index when it is an enabled tab, else the first enabled
  // tab, so one panel is always shown. It never calls onChange; with every tab disabled, none.
  const usable = (i: number) => !!tabs[i] && !tabs[i].props.disabled;
  const selected = usable(active) ? active : tabs.findIndex((t) => !t.props.disabled);

  // The olive edge slides between tabs (horizontal only; a vertical list keeps a static edge).
  // `layout` changes when a tab resizes (web fonts, label changes), so the edge is re-measured;
  // the list's own resize is already observed by useIndicator.
  const [layout, setLayout] = useState(0);
  const indicator = useIndicator<HTMLDivElement>(`${String(selected)}:${String(layout)}`);
  const setList = useCallback(
    (el: HTMLDivElement | null) => {
      list.current = el;
      indicator(vertical ? null : el);
    },
    [indicator, vertical],
  );

  const listName = ariaLabel ?? label;
  useEffect(() => {
    if (!listName && !ariaLabelledBy) {
      devWarn(
        "Tabs",
        "the tab list has no accessible name; pass `label`, `aria-label` or `aria-labelledby`.",
      );
    }
  }, [listName, ariaLabelledBy]);

  const foreign = tabs.some((t) => t.type !== TabsTab);
  useEffect(() => {
    if (foreign) {
      devWarn("Tabs", "every child should be a `Tabs.Tab`; other elements render as empty tabs.");
    }
  }, [foreign]);

  const roving = useRovingFocus(list, {
    itemSelector: '[role="tab"]',
    orientation,
    loop: true,
    selectedSelector: '[aria-selected="true"]',
    restore: "selected",
    // Automatic activation: an arrow, Home or End key selects the tab it lands on.
    onActiveChange:
      activation === "automatic"
        ? (tab) => {
            setActive(Number(tab.dataset.index));
          }
        : undefined,
  });

  // Overflow: whether the list scrolls and how far it can go each way. Showing the buttons only
  // narrows the list, so the state cannot flicker between shown and hidden.
  const measure = useCallback(() => {
    const el = list.current;
    if (!el) return;
    const size = vertical ? el.clientHeight : el.clientWidth;
    const total = vertical ? el.scrollHeight : el.scrollWidth;
    const pos = Math.abs(vertical ? el.scrollTop : el.scrollLeft);
    const next: Overflow | null =
      total - size > 1
        ? {
            start: pos > 1,
            end: pos + size < total - 1,
            rtl: !vertical && getComputedStyle(el).direction === "rtl",
          }
        : null;
    setOverflow((prev) => (sameOverflow(prev, next) ? prev : next));
  }, [vertical]);

  useIsomorphicLayoutEffect(measure);

  // The list and every tab are observed: a resize re-measures the overflow, the edge and the
  // scroll position of the selected tab.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            measure();
            setLayout((n) => n + 1);
          })
        : null;
    if (observer) {
      observer.observe(el);
      for (const tab of el.querySelectorAll('[role="tab"]')) observer.observe(tab);
    }
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [measure, tabs.length]);

  // The mark is as wide as the list and scaled down to the selected tab (transform only): its
  // scale is the unitless ratio of the two widths. A change that is not a new selection (a
  // resize, a font load) moves the edge without a slide.
  const slidFrom = useRef(selected);
  useIsomorphicLayoutEffect(() => {
    const el = list.current;
    if (!el || vertical) return;
    const tab = el.querySelector<HTMLElement>(`[role="tab"][data-index="${String(selected)}"]`);
    const track = el.clientWidth;
    const width = tab ? tab.getBoundingClientRect().width : 0;
    el.style.setProperty("--ol-tabs-w", String(track > 0 ? width / track : 0));
    if (slidFrom.current === selected) {
      el.setAttribute("data-tabs-still", "");
      const frame = requestAnimationFrame(() => {
        el.removeAttribute("data-tabs-still");
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
    slidFrom.current = selected;
    el.removeAttribute("data-tabs-still");
    return undefined;
  }, [selected, layout, vertical]);

  // Scrolls the list (never the page) so the selected tab is whole, with its scroll padding.
  // Physical rect deltas work the same in both text directions. Instant on purpose.
  useIsomorphicLayoutEffect(() => {
    const el = list.current;
    const tab = el?.querySelector<HTMLElement>(`[role="tab"][data-index="${String(selected)}"]`);
    if (!el || !tab || typeof el.scrollBy !== "function") return;
    const box = el.getBoundingClientRect();
    const item = tab.getBoundingClientRect();
    const style = getComputedStyle(el);
    const [lo, hi, padLo, padHi] = vertical
      ? [
          item.top - box.top,
          item.bottom - box.bottom,
          style.scrollPaddingTop,
          style.scrollPaddingBottom,
        ]
      : [
          item.left - box.left,
          item.right - box.right,
          style.scrollPaddingLeft,
          style.scrollPaddingRight,
        ];
    const before = parseFloat(padLo) || 0;
    const after = parseFloat(padHi) || 0;
    const delta = lo < before ? lo - before : hi > -after ? hi + after : 0;
    if (delta !== 0) el.scrollBy(vertical ? { top: delta } : { left: delta });
  }, [selected, vertical, tabs.length, overflow !== null, layout]);

  const scrollToward = (end: boolean) => {
    const el = list.current;
    if (!el || typeof el.scrollBy !== "function") return;
    const size = vertical ? el.clientHeight : el.clientWidth;
    const flip = overflow?.rtl ? -1 : 1;
    const delta = (end ? 1 : -1) * flip * size * 0.75;
    el.scrollBy(vertical ? { top: delta } : { left: delta });
  };

  // The visible panel is a tab stop only while it holds no focusable content; a mutation
  // observer re-checks it when its content changes. Hidden panels carry no tabindex.
  useIsomorphicLayoutEffect(() => {
    panels.current.forEach((panel, i) => {
      if (panel && i !== selected) panel.removeAttribute("tabindex");
    });
    const panel = panels.current[selected];
    if (!panel) return;
    const sync = () => {
      const stop = !hasFocusable(panel);
      if (stop && panel.getAttribute("tabindex") !== "0") panel.setAttribute("tabindex", "0");
      if (!stop && panel.hasAttribute("tabindex")) panel.removeAttribute("tabindex");
    };
    sync();
    if (typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(sync);
    observer.observe(panel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: PANEL_ATTRIBUTES,
    });
    return () => {
      observer.disconnect();
    };
  }, [selected, tabs.length, keepMounted]);

  // A click on a scroll button must not move focus to it (it can turn disabled under the pointer).
  const keepFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  const glyphs = overflow?.rtl ? ["›", "‹"] : ["‹", "›"];

  return (
    <div
      ref={ref}
      className={cx(
        "ol-tabs",
        fill && !vertical && "ol-tabs--fill",
        vertical && "ol-tabs--vertical",
        className,
      )}
      {...rest}
    >
      <div className="ol-tabs__bar" data-overflow={overflow ? "" : undefined}>
        {overflow && (
          // Pointer aid only: the arrow keys already reach every tab, so it is not a tab stop.
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            disabled={!overflow.start}
            className="ol-tabs__scroll ol-tabs__scroll--start"
            onMouseDown={keepFocus}
            onClick={() => {
              scrollToward(false);
            }}
          >
            <span className="ol-tabs__glyph">{glyphs[0]}</span>
          </button>
        )}
        {/* The tabs are the focus stops; the list only delegates their arrow keys (roving). */}
        {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
        <div
          role="tablist"
          aria-label={listName}
          aria-labelledby={ariaLabelledBy}
          aria-orientation={vertical ? "vertical" : undefined}
          className="ol-tabs__list"
          ref={setList}
          onKeyDown={roving.onKeyDown}
          onFocus={roving.onFocus}
          onBlur={roving.onBlur}
        >
          {tabs.map((tab, i) => {
            const on = i === selected;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                id={`${base}-t${String(i)}`}
                aria-controls={`${base}-p${String(i)}`}
                aria-selected={on}
                // Server render and first paint; useRovingFocus owns tabindex after mount.
                tabIndex={on ? 0 : -1}
                disabled={tab.props.disabled}
                data-state={on ? "active" : "inactive"}
                data-index={i}
                className="ol-tabs__tab ol-label"
                onClick={() => {
                  setActive(i);
                }}
              >
                {indexed && (
                  <span className="ol-tabs__idx" aria-hidden="true">
                    {pad(i + 1)}
                  </span>
                )}
                {tab.props.label}
              </button>
            );
          })}
          {!vertical && <span className="ol-tabs__mark" aria-hidden="true" />}
        </div>
        {overflow && (
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            disabled={!overflow.end}
            className="ol-tabs__scroll ol-tabs__scroll--end"
            onMouseDown={keepFocus}
            onClick={() => {
              scrollToward(true);
            }}
          >
            <span className="ol-tabs__glyph">{glyphs[1]}</span>
          </button>
        )}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={i}
          ref={(el) => {
            panels.current[i] = el;
          }}
          role="tabpanel"
          id={`${base}-p${String(i)}`}
          aria-labelledby={`${base}-t${String(i)}`}
          hidden={i !== selected}
          data-state={i === selected ? "active" : "inactive"}
          className="ol-tabs__panel"
        >
          {keepMounted || i === selected ? tab.props.children : null}
        </div>
      ))}
    </div>
  );
});

/** Tabs with the `Tabs.Tab` subcomponent attached. */
export const Tabs = Object.assign(TabsRoot, { Tab: TabsTab });
