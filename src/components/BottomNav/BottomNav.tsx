import {
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useScrollDirection } from "../../hooks/useScrollDirection";
import { useLabels } from "../../locale";
import { useReducedMotion } from "../../motion/reducedMotion";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import type { NavDestination } from "../../utils/navDestination";
import { Badge } from "../Badge";

/** The fewest destinations a bottom navigation makes sense with. */
export const BOTTOM_NAV_MIN_ITEMS = 3;

/** The most destinations it shows; extra ones are not rendered. */
export const BOTTOM_NAV_MAX_ITEMS = 5;

/** A destination of the bar; the same shape as NavigationRail's. */
export type BottomNavItem = NavDestination;

export interface BottomNavProps extends Omit<HTMLAttributes<HTMLElement>, "onSelect" | "children"> {
  /** The 3 to 5 top-level destinations, in order. Extra items are not rendered. */
  items: readonly BottomNavItem[];
  /** The `key` of the current destination: it gets `aria-current="page"`. */
  active?: string;
  /**
   * Called with the item `key` and the click event when a destination is activated. For an item
   * with an `href`, call `event.preventDefault()` to route on the client.
   */
  onSelect?: (key: string, event: MouseEvent<HTMLElement>) => void;
  /** Accessible name of the navigation landmark. Defaults to the locale's. */
  label?: string;
  /**
   * Slides the bar away while the page scrolls down past its own height, and back on scroll up,
   * at the top, or when focus enters it. Never hides under reduced motion.
   * @default false
   */
  hideOnScroll?: boolean;
  /** The scrolling element watched by `hideOnScroll`. Defaults to the window. */
  scrollTarget?: RefObject<HTMLElement | null>;
  /**
   * Positions the bar at the bottom of the nearest positioned ancestor instead of the viewport.
   * @default false
   */
  contained?: boolean;
  /**
   * Shows a small "↓" tab on the top edge of the bar, centred, while the page (or the
   * `scrollTarget`) has more content below. It disappears at the end or when everything fits.
   * It is decorative and non-interactive: nothing is announced.
   * @default false
   */
  scrollHint?: boolean;
}

/** Pixels of content left below that still count as the end of the page. */
const SCROLL_END_TOLERANCE = 1;

const CJK = /[぀-ヿ㐀-鿿]/;

/** Custom property that carries the bar's rendered height to anything that docks above it. */
const DOCK_PROPERTY = "--ol-dock";

/**
 * The bars publishing on each element, oldest first. The newest one's height is the value; when
 * a bar unmounts the previous one's value comes back instead of the property being cleared.
 */
interface DockEntry {
  value: string;
}
const docks = new WeakMap<HTMLElement, DockEntry[]>();

function publishDock(node: HTMLElement, entry: DockEntry, value: string): void {
  entry.value = value;
  const stack = docks.get(node) ?? [];
  if (!stack.includes(entry)) stack.push(entry);
  docks.set(node, stack);
  node.style.setProperty(DOCK_PROPERTY, stack[stack.length - 1]?.value ?? value);
}

function releaseDock(node: HTMLElement, entry: DockEntry): void {
  const stack = (docks.get(node) ?? []).filter((other) => other !== entry);
  docks.set(node, stack);
  const top = stack[stack.length - 1];
  if (top) node.style.setProperty(DOCK_PROPERTY, top.value);
  else node.style.removeProperty(DOCK_PROPERTY);
}

/**
 * The primary navigation of a tool on compact screens: a bar fixed to the bottom edge with 3 to
 * 5 destinations, each a mark with its word under it. On wider screens use NavigationRail; this
 * component does not switch itself. The current destination carries `aria-current="page"` and
 * an olivo edge along the top of its cell; counts are maple badges read after the label.
 *
 * The bar publishes its rendered height (bar plus safe area, `0px` while hidden) as `--ol-dock`
 * on the nearest `.ol` element, and on the document root unless `contained`, so a Fab can ride
 * above it. Give the scroll container `ol-has-bottomnav` so content is never covered; its
 * reserve is a minimum (one-line labels), so a bar grown by two-line labels or large text
 * covers a little more. With `scrollHint` a small "↓" tab sits on the bar's top edge while
 * there is more content below, so a scrollable page reads as one. Don't render it inside an ancestor with a `transform` or `filter`: use
 * `contained` there.
 */
export const BottomNav = forwardRef<HTMLElement, BottomNavProps>(function BottomNav(
  {
    items,
    active,
    onSelect,
    label,
    hideOnScroll = false,
    scrollTarget,
    contained = false,
    scrollHint = false,
    className,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const dictionary = useLabels();
  const navRef = useRef<HTMLElement | null>(null);
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      navRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const shown = items.slice(0, BOTTOM_NAV_MAX_ITEMS);
  const count = items.length;
  useEffect(() => {
    if (count < BOTTOM_NAV_MIN_ITEMS) {
      devWarn(
        "BottomNav",
        `needs at least ${String(BOTTOM_NAV_MIN_ITEMS)} destinations; use Tabs or a Toolbar for fewer.`,
      );
    } else if (count > BOTTOM_NAV_MAX_ITEMS) {
      devWarn(
        "BottomNav",
        `only the first ${String(BOTTOM_NAV_MAX_ITEMS)} destinations are shown; use the Sidebar in an Offcanvas for more.`,
      );
    }
  }, [count]);

  // Hide on scroll: down past the bar's own height hides it; up, the top and focus show it.
  const reduced = useReducedMotion();
  const scrolledDown = useScrollDirection({
    enabled: hideOnScroll,
    target: scrollTarget,
    motionAnchor: navRef,
  });
  const [pastBar, setPastBar] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  useEffect(() => {
    if (!hideOnScroll) return;
    const element = scrollTarget?.current ?? null;
    const source: HTMLElement | Window = element ?? window;
    const onScroll = () => {
      const offset = element ? element.scrollTop : window.scrollY;
      setPastBar(offset > (navRef.current?.offsetHeight ?? 0));
    };
    source.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      source.removeEventListener("scroll", onScroll);
    };
  }, [hideOnScroll, scrollTarget]);
  const hidden = hideOnScroll && scrolledDown && pastBar && !reduced && !focusWithin;

  // Scroll hint: is there more content below the viewport (or the scroll element)?
  const [moreBelow, setMoreBelow] = useState(false);
  useEffect(() => {
    if (!scrollHint) return;
    const element = scrollTarget?.current ?? null;
    const doc = (navRef.current ?? document.documentElement).ownerDocument;
    const measure = () => {
      const remaining = element
        ? element.scrollHeight - element.clientHeight - element.scrollTop
        : doc.documentElement.scrollHeight - doc.documentElement.clientHeight - window.scrollY;
      setMoreBelow(remaining > SCROLL_END_TOLERANCE);
    };
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    const sized = element ? [element] : [doc.documentElement, doc.body];
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    // Content that grows or shrinks changes the scroll height without resizing the scroller.
    const watch = () => {
      resizeObserver?.disconnect();
      for (const node of sized) {
        resizeObserver?.observe(node);
        for (const child of node.children) resizeObserver?.observe(child);
      }
      schedule();
    };
    const mutationObserver =
      typeof MutationObserver === "undefined" ? null : new MutationObserver(watch);
    for (const node of sized) mutationObserver?.observe(node, { childList: true });
    const source: HTMLElement | Window = element ?? window;
    source.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    watch();
    return () => {
      cancelAnimationFrame(frame);
      source.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [scrollHint, scrollTarget]);

  // Publish the rendered height so a Fab (or anything docked above the bar) can ride above it.
  const hiddenRef = useRef(hidden);
  const republish = useRef<() => void>(() => undefined);
  useEffect(() => {
    hiddenRef.current = hidden;
    republish.current();
  }, [hidden]);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const targets = [
      nav.closest<HTMLElement>(".ol"),
      contained ? null : nav.ownerDocument.documentElement,
    ].filter((node): node is HTMLElement => node !== null);
    const entry: DockEntry = { value: "0px" };
    const publish = () => {
      const height = hiddenRef.current ? 0 : nav.offsetHeight;
      for (const node of targets) publishDock(node, entry, `${String(height)}px`);
    };
    republish.current = publish;
    publish();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
    observer?.observe(nav);
    return () => {
      observer?.disconnect();
      republish.current = () => undefined;
      for (const node of targets) releaseDock(node, entry);
    };
  }, [contained]);

  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    setFocusWithin(true);
    onFocus?.(event);
  };
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
    onBlur?.(event);
  };

  return (
    // Focus tracking only (focus inside shows a hidden bar); the landmark itself is not interactive.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <nav
      ref={setRef}
      aria-label={label ?? dictionary.bottomNavLabel}
      className={cx(
        "ol-bottomnav",
        contained && "ol-bottomnav--contained",
        hidden && "ol-bottomnav--hidden",
        className,
      )}
      data-state={hidden ? "hidden" : "visible"}
      data-more={scrollHint ? String(moreBelow) : undefined}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...rest}
    >
      {scrollHint && (
        <span className="ol-bottomnav__hint" aria-hidden="true">
          ↓
        </span>
      )}
      <ul className="ol-bottomnav__list">
        {shown.map((item) => {
          const current = item.key === active;
          const handleClick = (event: MouseEvent<HTMLElement>) => {
            onSelect?.(item.key, event);
          };
          const content = (
            <>
              <span
                className="ol-bottomnav__mark"
                aria-hidden="true"
                lang={CJK.test(item.mark) ? "ja" : undefined}
              >
                {item.mark}
              </span>
              <span className="ol-bottomnav__label">
                {item.label}
                {item.badge != null && <span className="ol-sr">,</span>}
              </span>
              {item.badge != null && (
                <>
                  {/* Keeps a space between the label and the count in the accessible name. */}{" "}
                  <Badge tone="accent" count className="ol-bottomnav__badge">
                    {item.badge}
                  </Badge>
                </>
              )}
            </>
          );
          return (
            <li key={item.key} className="ol-bottomnav__cell">
              {item.href !== undefined ? (
                <a
                  className="ol-bottomnav__item"
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  onClick={handleClick}
                >
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  className="ol-bottomnav__item"
                  aria-current={current ? "page" : undefined}
                  onClick={handleClick}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
