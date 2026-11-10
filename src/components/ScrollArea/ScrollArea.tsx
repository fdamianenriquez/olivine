import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type UIEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useScrollEdges } from "../../hooks/useScrollEdges";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

export type ScrollAreaOrientation = "vertical" | "horizontal" | "both";

export type ScrollAreaFocusable = "overflow" | "always" | "never";

export interface ScrollAreaProps extends Omit<HTMLAttributes<HTMLDivElement>, "onScroll"> {
  /** The content. It is rendered straight inside the scrolling element, with no extra wrapper. */
  children?: ReactNode;
  /**
   * The physical axes that scroll. Vertical-writing content that scrolls sideways uses
   * `horizontal`.
   * @default "vertical"
   */
  orientation?: ScrollAreaOrientation;
  /**
   * Accessible name of the scroll region, exposed while it is a tab stop. Say what scrolls
   * ("Order history"). `aria-label`, `aria-labelledby`, `aria-describedby` and
   * `aria-description` are also moved to the scroller (exposed while it is a tab stop).
   */
  label?: string;
  /**
   * When the scroller is a tab stop: `overflow` while the content overflows, `always` (also
   * before measuring is available, e.g. before hydration), or `never` for content that already
   * handles the arrow keys itself (a listbox, a tree, a menu).
   * @default "overflow"
   */
  focusable?: ScrollAreaFocusable;
  /**
   * Draws a hairline `rule` frame on all sides.
   * @default false
   */
  bordered?: boolean;
  /**
   * Draws a 2px `ink` line on the edges of the main axis that have more content beyond them.
   * With `orientation="both"` the main axis is vertical: only the top and bottom edges show it.
   * @default false
   */
  hints?: boolean;
  /**
   * Reserves the scrollbar's space (`scrollbar-gutter: stable`), so content does not shift when a
   * bar appears. Overlay scrollbars take no space either way.
   * @default false
   */
  gutter?: boolean;
  /**
   * Stops a wheel or swipe at the end from scrolling the page behind
   * (`overscroll-behavior: contain`).
   * @default false
   */
  contain?: boolean;
  /** Ref to the scrolling element, for `scrollTo`, `scrollIntoView` and measuring. */
  viewportRef?: Ref<HTMLDivElement>;
  /** Called on scroll of the scrolling element (`scroll` does not bubble to the root). */
  onScroll?: UIEventHandler<HTMLDivElement>;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/**
 * A bounded box whose content scrolls natively, with the scrollbar drawn in the Olivine skin.
 * While the content overflows, the scroller is a named, keyboard-focusable region, so the arrow,
 * Page and Home/End keys scroll it. Give the root a height or `max-height`; without a bounded
 * size nothing overflows. The ref and every other `div` attribute go to the root.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  {
    children,
    orientation = "vertical",
    label,
    focusable = "overflow",
    bordered = false,
    hints = false,
    gutter = false,
    contain = false,
    viewportRef,
    onScroll,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-description": ariaDescription,
    ...rest
  },
  ref,
) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const setScroller = useCallback(
    (node: HTMLDivElement | null) => {
      scrollerRef.current = node;
      assignRef(viewportRef, node);
    },
    [viewportRef],
  );

  const edges = useScrollEdges(scrollerRef);
  // Only the axes that scroll count: a vertical area clips sideways overflow, it does not scroll it.
  const scrollsX = orientation !== "vertical";
  const scrollsY = orientation !== "horizontal";
  const x = scrollsX && edges.x;
  const y = scrollsY && edges.y;
  const overflows = x || y;

  // Where horizontal scrolling starts, physically, for the hint lines: the right in RTL and in
  // right-to-left vertical writing (Japanese set vertical-rl), else the left. Re-read whenever the
  // edges change, so a runtime `dir` or writing-mode switch is picked up on the next scroll.
  const [startsRight, setStartsRight] = useState(false);
  const measureSide = hints && orientation === "horizontal";
  useEffect(() => {
    const box = scrollerRef.current;
    if (!measureSide || !box) return;
    const style = getComputedStyle(box);
    const mode = style.writingMode;
    const vertical = mode.startsWith("vertical") || mode.startsWith("sideways");
    setStartsRight(vertical ? mode.endsWith("rl") : style.direction === "rtl");
  }, [measureSide, edges.x, edges.xStart, edges.xEnd]);

  const name = label ?? ariaLabel;
  const named = (name !== undefined && name !== "") || ariaLabelledBy !== undefined;
  // While focus is inside the scroller it stays a tab stop, even if the content stops
  // overflowing: dropping `tabindex` from the focused element would send focus to the body.
  const [focusWithin, setFocusWithin] = useState(false);
  const tabStop =
    focusable === "always" || (focusable === "overflow" && (overflows || focusWithin));
  useEffect(() => {
    const box = scrollerRef.current;
    if (!box) return;
    const enter = () => {
      setFocusWithin(true);
    };
    const leave = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (!(next instanceof Node && box.contains(next))) setFocusWithin(false);
    };
    box.addEventListener("focusin", enter);
    box.addEventListener("focusout", leave);
    return () => {
      box.removeEventListener("focusin", enter);
      box.removeEventListener("focusout", leave);
    };
  }, []);

  useEffect(() => {
    if (overflows && focusable !== "never" && !named) {
      devWarn(
        "ScrollArea",
        "the content overflows but the area has no name. Pass `label` or `aria-labelledby` so the tab stop is announced.",
      );
    }
  }, [overflows, focusable, named]);

  const flag = (on: boolean) => (on ? "" : undefined);

  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        "ol-scrollarea",
        bordered && "ol-scrollarea--bordered",
        hints && "ol-scrollarea--hints",
        gutter && "ol-scrollarea--gutter",
        contain && "ol-scrollarea--contain",
        measureSide && startsRight && "ol-scrollarea--start-right",
        className,
      )}
      data-orientation={orientation}
      data-overflow-x={flag(x)}
      data-overflow-y={flag(y)}
      data-overflow-x-start={flag(x && edges.xStart)}
      data-overflow-x-end={flag(x && edges.xEnd)}
      data-overflow-y-start={flag(y && edges.yStart)}
      data-overflow-y-end={flag(y && edges.yEnd)}
    >
      {/* The scroller is a tab stop only while there is something to scroll to. An unnamed
          scroller is never a region: a landmark without a name helps nobody. */}
      <div
        ref={setScroller}
        className="ol-scrollarea__viewport ol-scrollbar"
        role={tabStop && named ? "region" : undefined}
        aria-label={tabStop && name ? name : undefined}
        aria-labelledby={tabStop && named ? ariaLabelledBy : undefined}
        aria-describedby={tabStop ? ariaDescribedBy : undefined}
        aria-description={tabStop ? ariaDescription : undefined}
        // A scrolling region must be keyboard reachable.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={tabStop ? 0 : undefined}
        onScroll={onScroll}
      >
        {children}
      </div>
    </div>
  );
});
