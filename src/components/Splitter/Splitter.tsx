import type {
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  PointerEvent,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import {
  Children,
  createContext,
  forwardRef,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useLabels, useLocaleTag } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import {
  collapsePanel,
  defaultSizesFor,
  deltaToPercent,
  effectiveLimits,
  expandPanel,
  fitSizes,
  handleFor,
  isCollapsed,
  keyToDelta,
  normaliseSizes,
  type PanelLimits,
  resizePair,
  resolveLimits,
  round,
  sameSizes,
  type SplitterLength,
  type SplitterOrientation,
} from "./layout";

export type { SplitterLength, SplitterOrientation } from "./layout";

/** Imperative controls for toolbar buttons and shortcuts. `index` is a panel's position. */
export interface SplitterActions {
  /** Collapses a collapsible panel; its neighbour takes the space. */
  collapse: (index: number) => void;
  /** Restores a collapsed panel to its last expanded size (or its default). */
  expand: (index: number) => void;
  /** Collapses or restores a collapsible panel. */
  toggle: (index: number) => void;
  /** Applies a whole layout (percent per panel); it is normalised and fitted to the limits. */
  setSizes: (sizes: number[]) => void;
  /** Returns to the default sizes and forgets remembered expanded sizes. */
  reset: () => void;
}

export interface SplitterPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** The panel's name. The handle after it is announced "Resize <label>". Strongly recommended. */
  label?: string | undefined;
  /** Replaces the whole spoken name of the handle after this panel. */
  handleLabel?: string | undefined;
  /** Initial size in percent when the Splitter has no `defaultSizes`. */
  defaultSize?: number | undefined;
  /**
   * Smallest size: a number is a percent, a `"240px"` string a pixel size.
   * @default 0
   */
  min?: SplitterLength | undefined;
  /**
   * Largest size: a number is a percent, a `"480px"` string a pixel size.
   * @default 100
   */
  max?: SplitterLength | undefined;
  /**
   * The panel may collapse to `collapsedSize` (Enter, double-click, dragging past halfway
   * between `collapsedSize` and `min`, or `actionRef`). Content stays mounted but inert.
   * The handle after a collapsed panel reads "Collapsed"; the handle before a collapsed last
   * panel reads the size of the panel before it (its maximum), as the window splitter pattern
   * measures the panel before the handle.
   * @default false
   */
  collapsible?: boolean | undefined;
  /**
   * Size of the collapsed panel, percent or `"…px"`.
   * @default 0
   */
  collapsedSize?: SplitterLength | undefined;
  /** Panel content. It scrolls on its own. */
  children?: ReactNode;
}

export interface SplitterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The direction panels are arranged: `horizontal` puts them side by side (handles are
   * vertical lines), `vertical` stacks them.
   * @default "horizontal"
   */
  orientation?: SplitterOrientation | undefined;
  /** Controlled sizes, one percent per panel, summing to 100. Wrong input is normalised. */
  sizes?: number[] | undefined;
  /**
   * Initial sizes when uncontrolled. Without it, each panel's `defaultSize` is used and the
   * rest share what remains equally.
   */
  defaultSizes?: number[] | undefined;
  /** Called on every change: drag, key, double-click, `actionRef`. Use it for live readouts. */
  onSizesChange?: ((sizes: number[]) => void) | undefined;
  /**
   * Called when a gesture ends: pointer release, each key press, double-click, each
   * `actionRef` call. Use it to save the layout.
   */
  onSizesCommit?: ((sizes: number[]) => void) | undefined;
  /**
   * Arrow-key size, percent of the panel space.
   * @default 1
   */
  step?: number | undefined;
  /**
   * Shift+arrow and Page Up / Page Down size, percent of the panel space.
   * @default 10
   */
  largeStep?: number | undefined;
  /**
   * Handles become static separators. Panels stay fully usable.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A hairline frame around the whole splitter. Set `false` inside a framed area or when nested.
   * @default true
   */
  bordered?: boolean | undefined;
  /**
   * Draws the ink grip block on each handle. The hit area and the focus ring remain without it.
   * @default true
   */
  grip?: boolean | undefined;
  /** Receives `{ collapse, expand, toggle, setSizes, reset }`. */
  actionRef?: Ref<SplitterActions> | undefined;
  /** Two or more `Splitter.Panel` elements (fragments are flattened). */
  children?: ReactNode;
}

interface PanelContextValue {
  id: string;
  size: number;
  collapsed: boolean;
  register: (el: HTMLDivElement | null) => void;
}

const PanelContext = createContext<PanelContextValue | null>(null);

function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** Props the Splitter reads from each panel; they never reach the DOM. */
const PANEL_ONLY = [
  "handleLabel",
  "defaultSize",
  "min",
  "max",
  "collapsible",
  "collapsedSize",
  "id",
] as const;

/** A copy of `source` without `keys`. */
function omit<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Omit<T, K> {
  const drop = new Set<PropertyKey>(keys);
  return Object.fromEntries(Object.entries(source).filter(([key]) => !drop.has(key))) as Omit<T, K>;
}

/** One region of a `Splitter`. Rendered in place; the Splitter draws the handles around it. */
export const SplitterPanel = forwardRef<HTMLDivElement, SplitterPanelProps>(function SplitterPanel(
  { label, className, style, children, ...props },
  ref,
) {
  // Limits and sizes are read by the Splitter; the id is resolved there too.
  const rest = omit(props, PANEL_ONLY);
  const context = useContext(PanelContext);
  const register = context?.register;
  const setElement = useCallback(
    (el: HTMLDivElement | null) => {
      register?.(el);
      setRef(ref, el);
    },
    [register, ref],
  );
  if (!context) {
    devWarn("Splitter", "Splitter.Panel must be a direct child of Splitter.");
    return null;
  }
  return (
    <div
      {...rest}
      ref={setElement}
      id={context.id}
      role={label ? "group" : undefined}
      aria-label={label}
      className={cx(
        "ol-splitter__panel",
        context.collapsed && "ol-splitter__panel--collapsed",
        className,
      )}
      data-state={context.collapsed ? "collapsed" : "expanded"}
      style={{ ...style, "--ol-splitter-size": String(context.size) } as CSSProperties}
    >
      {children}
    </div>
  );
});

type PanelElement = ReactElement<SplitterPanelProps>;

/** Valid element children, with fragments flattened. */
function collectPanels(children: ReactNode, out: PanelElement[] = []): PanelElement[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectPanels((child.props as { children?: ReactNode }).children, out);
      return;
    }
    out.push(child as PanelElement);
  });
  return out;
}

/** Right-to-left when the computed direction or the nearest `dir` says so. */
function isRtl(element: Element): boolean {
  if (getComputedStyle(element).direction === "rtl") return true;
  return element.closest("[dir]")?.getAttribute("dir") === "rtl";
}

interface Drag {
  pointer: number;
  handle: number;
  origin: number;
  groupPx: number;
  rtl: boolean;
  start: number[];
  last: number[];
}

const SplitterRoot = forwardRef<HTMLDivElement, SplitterProps>(function Splitter(
  {
    orientation = "horizontal",
    sizes,
    defaultSizes,
    onSizesChange,
    onSizesCommit,
    step = 1,
    largeStep = 10,
    disabled = false,
    bordered = true,
    grip = true,
    actionRef,
    className,
    children,
    ...rest
  },
  ref,
) {
  const labels = useLabels();
  const tag = useLocaleTag();
  const baseId = useId();
  const panels = collectPanels(children);
  const count = panels.length;
  const specs = panels.map((panel) => panel.props);

  // The defaults the layout starts from and returns to on reset.
  const defaultsKey = JSON.stringify([defaultSizes, specs.map((spec) => spec.defaultSize)]);
  const defaults = useMemo(
    () => {
      const fromPanels = defaultSizesFor(specs.map((spec) => spec.defaultSize));
      return normaliseSizes(defaultSizes, count, fromPanels).sizes;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value, not identity
    [defaultsKey, count],
  );

  const [groupPx, setGroupPx] = useState(0);
  const limitsKey = JSON.stringify(
    specs.map((spec) => [spec.min, spec.max, spec.collapsible, spec.collapsedSize]),
  );
  const limits = useMemo<PanelLimits[]>(
    () => resolveLimits(specs, groupPx),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value, not identity
    [limitsKey, groupPx],
  );

  const [stored, setStored] = useControllable<number[]>(sizes, defaults, onSizesChange);
  const normal = normaliseSizes(stored, count, defaults);
  const current = normal.sizes;

  const currentRef = useRef(current);
  const limitsRef = useRef(limits);
  const commitRef = useRef(onSizesCommit);
  useIsomorphicLayoutEffect(() => {
    currentRef.current = current;
    limitsRef.current = limits;
    commitRef.current = onSizesCommit;
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelEls = useRef<(HTMLDivElement | null)[]>([]);
  const handleEls = useRef<(HTMLDivElement | null)[]>([]);
  /** Each panel's size before it last collapsed, for restoring it. */
  const memory = useRef<(number | undefined)[]>([]);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const ids = panels.map((panel, i) => panel.props.id ?? `${baseId}-panel-${String(i)}`);

  // Dev warnings for input the component had to correct.
  const sizesKey = sizes ? sizes.join(",") : "";
  const wrongSizes = sizes !== undefined && normal.changed;
  useEffect(() => {
    if (wrongSizes)
      devWarn(
        "Splitter",
        `sizes [${sizesKey}] must have one percent per panel (${String(count)}) summing to 100; it was normalised.`,
      );
  }, [wrongSizes, sizesKey, count]);
  const wrongDefaults = defaultSizes !== undefined && defaultSizes.length !== count;
  useEffect(() => {
    if (wrongDefaults)
      devWarn("Splitter", "defaultSizes needs one percent per panel; panel defaults were used.");
  }, [wrongDefaults]);
  const firstCount = useRef(count);
  useEffect(() => {
    if (count !== firstCount.current) {
      firstCount.current = count;
      devWarn(
        "Splitter",
        "the number of panels changed, so the layout was reset; sizes are matched by position.",
      );
    }
  }, [count]);
  const unnamed = specs.slice(0, -1).some((spec) => !spec.label && !spec.handleLabel);
  useEffect(() => {
    if (unnamed)
      devWarn("Splitter", "give each panel a label so every handle has a distinct name.");
  }, [unnamed]);
  useEffect(() => {
    if (count < 2) devWarn("Splitter", "a Splitter needs at least two Splitter.Panel children.");
  }, [count]);

  /** Applies a layout: remembers sizes of panels that collapse, then updates and maybe commits. */
  const apply = useCallback(
    (next: number[], commit: boolean, from: number[] = currentRef.current) => {
      const lim = limitsRef.current;
      next.forEach((size, i) => {
        const panel = lim[i];
        const before = from[i];
        if (
          panel &&
          before !== undefined &&
          isCollapsed(size, panel) &&
          !isCollapsed(before, panel)
        )
          memory.current[i] = before;
      });
      const changed = !sameSizes(next, currentRef.current);
      if (changed) {
        currentRef.current = next;
        setStored(next);
      }
      if (commit && (changed || !sameSizes(next, from))) commitRef.current?.(next);
      return changed;
    },
    [setStored],
  );

  // Measure the panel space (the root minus handles and frame) to convert pixel lengths.
  const measure = useCallback(() => {
    const vertical = orientation === "vertical";
    let total = 0;
    for (const el of panelEls.current) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      total += vertical ? rect.height : rect.width;
    }
    setGroupPx((prev) => (Math.abs(prev - total) < 0.5 ? prev : total));
    return total;
  }, [orientation]);

  useIsomorphicLayoutEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, [measure]);

  // Keep the layout within the limits when they change (pixel limits follow the group's size).
  useEffect(() => {
    const fitted = fitSizes(currentRef.current, limits);
    if (!sameSizes(fitted, currentRef.current)) apply(fitted, false);
  }, [limits, apply]);

  // Collapsed panels stay mounted but leave the tab order and the accessibility tree. `inert`
  // is set through the DOM because React 18 has no boolean `inert` prop.
  const collapsedFlags = current.map((size, i) => {
    const panel = limits[i];
    return panel ? isCollapsed(size, panel) : false;
  });
  const collapsedKey = collapsedFlags.join(",");
  // Whatever collapsed the panel (a key, a drag, actionRef, controlled sizes, fitting to the
  // limits), focus inside it moves to the handle that moves it before it turns inert.
  useIsomorphicLayoutEffect(() => {
    const active = document.activeElement;
    panelEls.current.forEach((el, i) => {
      const collapsed = collapsedFlags[i] === true;
      if (collapsed && active && el?.contains(active)) {
        handleEls.current[handleFor(i, panelEls.current.length)]?.focus({ preventScroll: true });
      }
      el?.toggleAttribute("inert", collapsed);
    });
  }, [collapsedKey]);

  const expandTarget = (index: number): number => {
    const remembered = memory.current[index];
    const panel = limitsRef.current[index];
    const fallback = defaults[index] ?? 0;
    if (remembered !== undefined && panel && !isCollapsed(remembered, panel)) return remembered;
    return fallback;
  };

  const toggleAt = (index: number, commit = true) => {
    const from = currentRef.current;
    const lim = limitsRef.current;
    const panel = lim[index];
    if (!panel?.collapsible) return;
    if (isCollapsed(from[index] ?? 0, panel)) {
      apply(expandPanel(from, index, expandTarget(index), lim), commit, from);
    } else {
      apply(collapsePanel(from, index, lim), commit, from);
    }
  };

  useImperativeHandle(actionRef, (): SplitterActions => ({
    collapse: (index) => {
      const from = currentRef.current;
      apply(collapsePanel(from, index, limitsRef.current), true, from);
    },
    expand: (index) => {
      const from = currentRef.current;
      const panel = limitsRef.current[index];
      if (!panel || !isCollapsed(from[index] ?? 0, panel)) return;
      apply(expandPanel(from, index, expandTarget(index), limitsRef.current), true, from);
    },
    toggle: (index) => {
      toggleAt(index);
    },
    setSizes: (next) => {
      const normalised = normaliseSizes(next, currentRef.current.length, defaults);
      if (normalised.changed)
        devWarn("Splitter", "setSizes needs one percent per panel summing to 100.");
      apply(fitSizes(normalised.sizes, limitsRef.current), true);
    },
    reset: () => {
      memory.current = [];
      apply(fitSizes(defaults, limitsRef.current), true);
    },
  }));

  const onKeyDown = (handle: number, event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && drag.current) {
      event.preventDefault();
      cancelDrag(event.currentTarget);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const intent = keyToDelta(
      event.key,
      event.shiftKey,
      isRtl(event.currentTarget),
      orientation,
      step,
      largeStep,
    );
    if (intent === null) return;
    event.preventDefault();
    const from = currentRef.current;
    const lim = limitsRef.current;
    if (intent === "toggle") {
      if (lim[handle]?.collapsible) toggleAt(handle);
      else if (lim[handle + 1]?.collapsible) toggleAt(handle + 1);
      return;
    }
    const range = effectiveLimits(handle, from, lim);
    const size = from[handle] ?? 0;
    const next =
      intent === "min"
        ? resizePair(from, handle, range.min, lim, "exact")
        : intent === "max"
          ? resizePair(from, handle, range.max, lim, "exact")
          : resizePair(from, handle, size + intent, lim, "key");
    apply(next, true, from);
  };

  const onDoubleClick = (handle: number) => {
    const from = currentRef.current;
    const lim = limitsRef.current;
    if (lim[handle]?.collapsible) {
      toggleAt(handle);
      return;
    }
    // Reset the two neighbours to their default share of the space they hold together.
    const a = defaults[handle] ?? 0;
    const b = defaults[handle + 1] ?? 0;
    const total = (from[handle] ?? 0) + (from[handle + 1] ?? 0);
    const target = a + b > 0 ? (total * a) / (a + b) : total / 2;
    apply(resizePair(from, handle, target, lim, "exact"), true, from);
  };

  const onPointerDown = (handle: number, event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || drag.current) return;
    const el = event.currentTarget;
    event.preventDefault();
    el.focus({ preventScroll: true });
    el.setPointerCapture(event.pointerId);
    const vertical = orientation === "vertical";
    drag.current = {
      pointer: event.pointerId,
      handle,
      origin: vertical ? event.clientY : event.clientX,
      groupPx: measure(),
      rtl: !vertical && isRtl(el),
      start: currentRef.current,
      last: currentRef.current,
    };
    setDragging(handle);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (state?.pointer !== event.pointerId) return;
    const position = orientation === "vertical" ? event.clientY : event.clientX;
    const delta = (position - state.origin) * (state.rtl ? -1 : 1);
    const start = state.start[state.handle] ?? 0;
    const next = resizePair(
      state.start,
      state.handle,
      start + deltaToPercent(delta, state.groupPx),
      limitsRef.current,
      "drag",
    );
    state.last = next;
    apply(next, false, state.start);
  };

  const endDrag = (el: HTMLElement, pointer: number) => {
    drag.current = null;
    setDragging(null);
    if (el.hasPointerCapture(pointer)) el.releasePointerCapture(pointer);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (state?.pointer !== event.pointerId) return;
    endDrag(event.currentTarget, state.pointer);
    if (!sameSizes(state.last, state.start)) commitRef.current?.(state.last);
  };

  const cancelDrag = (el: HTMLElement) => {
    const state = drag.current;
    if (!state) return;
    endDrag(el, state.pointer);
    apply(state.start, false, state.start);
  };

  const percent = useMemo(
    () => new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 }),
    [tag],
  );
  const lineOrientation = orientation === "horizontal" ? "vertical" : "horizontal";

  /**
   * An outer panel collapsed to nothing puts its handle on the frame: `start` for the first
   * handle, `end` for the last one, so the CSS can lay the line on the border.
   */
  const edgeOf = (handle: number): "start" | "end" | undefined => {
    if (handle === 0 && collapsedFlags[0] === true && (current[0] ?? 0) <= 0) return "start";
    const last = count - 1;
    if (handle === last - 1 && collapsedFlags[last] === true && (current[last] ?? 0) <= 0)
      return "end";
    return undefined;
  };

  const renderHandle = (handle: number) => {
    const spec = specs[handle];
    const isDragging = dragging === handle;
    if (disabled) {
      return (
        <div
          key={`handle-${String(handle)}`}
          role="separator"
          aria-orientation={lineOrientation}
          className="ol-splitter__handle"
          data-edge={edgeOf(handle)}
        >
          <span className="ol-splitter__grip" aria-hidden="true" />
        </div>
      );
    }
    const range = effectiveLimits(handle, current, limits);
    const size = current[handle] ?? 0;
    const collapsed = collapsedFlags[handle] === true;
    return (
      // A focusable separator is a widget (window splitter pattern): it takes keys and a value.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <div
        key={`handle-${String(handle)}`}
        ref={(el) => {
          handleEls.current[handle] = el;
        }}
        role="separator"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
        tabIndex={0}
        aria-orientation={lineOrientation}
        aria-controls={ids[handle]}
        aria-label={spec?.handleLabel ?? labels.splitterResize(spec?.label)}
        aria-valuenow={round(size)}
        aria-valuemin={range.min}
        aria-valuemax={range.max}
        // The value is the size of the panel before the handle (APG). A collapsed panel after it
        // reads as that panel at its maximum, not as "Collapsed".
        aria-valuetext={collapsed ? labels.splitterCollapsed : percent.format(size / 100)}
        className="ol-splitter__handle"
        data-dragging={isDragging ? "" : undefined}
        data-edge={edgeOf(handle)}
        onKeyDown={(event) => {
          onKeyDown(handle, event);
        }}
        onDoubleClick={() => {
          onDoubleClick(handle);
        }}
        onPointerDown={(event) => {
          onPointerDown(handle, event);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(event) => {
          if (drag.current?.pointer === event.pointerId) cancelDrag(event.currentTarget);
        }}
      >
        <span className="ol-splitter__grip" aria-hidden="true" />
      </div>
    );
  };

  /** A stable callback per panel slot, so panel refs don't detach on every render. */
  const registerFns = useRef<((el: HTMLDivElement | null) => void)[]>([]);
  const registerAt = (index: number) => {
    let fn = registerFns.current[index];
    if (!fn) {
      fn = (el) => {
        panelEls.current[index] = el;
      };
      registerFns.current[index] = fn;
    }
    return fn;
  };

  const setRoot = useCallback(
    (el: HTMLDivElement | null) => {
      rootRef.current = el;
      setRef(ref, el);
    },
    [ref],
  );

  return (
    <div
      {...rest}
      ref={setRoot}
      className={cx(
        "ol-splitter",
        orientation === "vertical" && "ol-splitter--vertical",
        bordered && "ol-splitter--bordered",
        !grip && "ol-splitter--gripless",
        className,
      )}
      // A named generic div is ignored by assistive tech; a group carries the name.
      role={rest.role ?? (rest["aria-label"] || rest["aria-labelledby"] ? "group" : undefined)}
      data-orientation={orientation}
      data-disabled={disabled ? "" : undefined}
      data-dragging={dragging !== null ? "" : undefined}
    >
      {panels.map((panel, i) => (
        <Fragment key={panel.key ?? i}>
          {i > 0 && renderHandle(i - 1)}
          <PanelContext.Provider
            value={{
              id: ids[i] ?? "",
              size: current[i] ?? 0,
              collapsed: collapsedFlags[i] === true,
              register: registerAt(i),
            }}
          >
            {panel}
          </PanelContext.Provider>
        </Fragment>
      ))}
    </div>
  );
});

/**
 * Divides an area into two or more panels with a keyboard-operable handle between each pair.
 * Place `Splitter.Panel` children; the handles are drawn for you.
 */
export const Splitter = Object.assign(SplitterRoot, { Panel: SplitterPanel });
