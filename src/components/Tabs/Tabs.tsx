import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";

import { useControllable } from "../../hooks/useControllable";
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
  /** Tabs share the full width. */
  fill?: boolean;
  /** Shows a zero-padded index numeral before each label. */
  indexed?: boolean;
  /**
   * Accessible name of the tab list; the tab list needs a name. Alias of `aria-label`.
   * `aria-label` and `aria-labelledby` are applied to the tab list, not the root element.
   */
  label?: string;
  /** One or more `Tabs.Tab` elements. */
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/**
 * Switches between panels in place. Selection follows focus (automatic activation); Left/Right
 * wrap, Home/End jump to the ends and disabled tabs are skipped. A panel is a tab stop only
 * when it holds no focusable content of its own; that check runs on each render of `Tabs`, so
 * content that becomes focusable later without a re-render is not re-checked.
 */
const TabsRoot = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value,
    defaultValue = 0,
    onChange,
    fill = false,
    indexed = false,
    label,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className,
    children,
    ...rest
  },
  ref,
) {
  const tabs = Children.toArray(children).filter((c): c is ReactElement<TabsTabProps> =>
    isValidElement(c),
  );
  const [active, setActive] = useControllable<number>(value, defaultValue, onChange);
  const base = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  // Without focusable content a panel is the only way to reach it by keyboard. The attribute is
  // synced on the DOM after render, since it depends on what the panel content rendered.
  useLayoutEffect(() => {
    panels.current.forEach((panel) => {
      if (!panel) return;
      if (panel.querySelector(FOCUSABLE)) panel.removeAttribute("tabindex");
      else panel.setAttribute("tabindex", "0");
    });
  });

  const listName = ariaLabel ?? label;
  useEffect(() => {
    if (!listName && !ariaLabelledBy) {
      devWarn(
        "Tabs",
        "the tab list has no accessible name; pass `label`, `aria-label` or `aria-labelledby`.",
      );
    }
  }, [listName, ariaLabelledBy]);

  const move = (from: number, target: number) => {
    if (target === from || tabs[target]?.props.disabled) return;
    setActive(target);
    buttons.current[target]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabled = tabs.map((t, i) => (t.props.disabled ? -1 : i)).filter((i) => i >= 0);
    if (enabled.length === 0) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const pos = Math.max(0, enabled.indexOf(index));
    let target: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const dir = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
      target = enabled[(pos + dir + enabled.length) % enabled.length];
    } else if (event.key === "Home") target = enabled[0];
    else if (event.key === "End") target = enabled[enabled.length - 1];
    if (target === undefined) return;
    event.preventDefault();
    move(index, target);
  };

  // A selection pointing at a disabled or missing tab falls back to the first enabled one.
  const selected = tabs[active] && !tabs[active].props.disabled ? active : -1;
  const firstEnabled = tabs.findIndex((t) => !t.props.disabled);
  const stop = selected >= 0 ? selected : firstEnabled;

  return (
    <div ref={ref} className={cx("ol-tabs", fill && "ol-tabs--fill", className)} {...rest}>
      <div
        role="tablist"
        aria-label={listName}
        aria-labelledby={ariaLabelledBy}
        className="ol-tabs__list"
      >
        {tabs.map((tab, i) => {
          const on = i === selected;
          return (
            <button
              key={i}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-t${String(i)}`}
              aria-controls={`${base}-p${String(i)}`}
              aria-selected={on}
              tabIndex={i === stop ? 0 : -1}
              disabled={tab.props.disabled}
              data-state={on ? "active" : "inactive"}
              className="ol-tabs__tab ol-label"
              onClick={() => {
                setActive(i);
              }}
              onKeyDown={(event) => {
                onKeyDown(event, i);
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
          {tab.props.children}
        </div>
      ))}
    </div>
  );
});

/** Tabs with the `Tabs.Tab` subcomponent attached. */
export const Tabs = Object.assign(TabsRoot, { Tab: TabsTab });
