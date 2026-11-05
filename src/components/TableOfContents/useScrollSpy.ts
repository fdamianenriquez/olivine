import { type RefObject, useCallback, useEffect, useRef } from "react";

export type ScrollRoot = RefObject<HTMLElement | null> | HTMLElement | null | undefined;

export interface ScrollSpyOptions {
  /** The ids of the headings to follow, in document order. */
  ids: readonly string[];
  /** Follow scrolling. */
  enabled: boolean;
  /** The scrolling element that holds the headings; the viewport when empty. */
  root?: ScrollRoot | undefined;
  /** Distance in px from the top of the scroll area to the reading line. Default: the first heading's scroll margin. */
  offset?: number | undefined;
  /** The entry that is current now, so the spy reports only real changes. */
  active: string | null;
  /** Called with the id that is being read, or null above the first heading. */
  onChange: (id: string | null) => void;
  /**
   * The entry a click or a hash change made current. While set, the spy does not move the mark;
   * the next scroll the reader makes (wheel, touch, keys, scrollbar) clears it.
   */
  pin: RefObject<string | null>;
}

/** Runs the check again now, forgetting what was reported. A no-op while the spy is off. */
export type ScrollSpyRefresh = () => void;

/** Keys that scroll the page by themselves. */
const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "End", "Home", "ArrowUp", "ArrowDown"]);

/** How long a scroll must be quiet to count as settled where `scrollend` does not exist. */
const IDLE_MS = 120;

function resolveRoot(root: ScrollRoot): HTMLElement | null {
  if (!root) return null;
  return "current" in root ? root.current : root;
}

/** The top of the reading line: the explicit offset, else the first heading's scroll margin. */
function readOffset(offset: number | undefined, first: Element | undefined): number {
  if (offset !== undefined) return offset;
  if (!first) return 0;
  const style = getComputedStyle(first);
  const margin =
    style.getPropertyValue("scroll-margin-block-start") ||
    style.getPropertyValue("scroll-margin-top");
  const px = Number.parseFloat(margin);
  return Number.isFinite(px) ? px : 0;
}

/**
 * Follows the headings of a document and reports the one that is being read: the last heading
 * whose top edge is at or above the reading line. An IntersectionObserver wakes the check when a
 * heading crosses the line or the edges of the view, and the check itself reads the headings'
 * positions; no scroll handler runs per frame. At the end of the scroller the last heading that
 * is at least partly in view wins, so a short last section stays reachable.
 */
export function useScrollSpy({
  ids,
  enabled,
  root,
  offset,
  active,
  onChange,
  pin,
}: ScrollSpyOptions): ScrollSpyRefresh {
  const change = useRef(onChange);
  const current = useRef(active);
  // The last id reported, until the entry in use changes by other means.
  const reported = useRef<string | null | undefined>(undefined);
  const check = useRef<(() => void) | null>(null);
  const idsKey = ids.join("\u0000");

  useEffect(() => {
    change.current = onChange;
    current.current = active;
    reported.current = undefined;
  });

  useEffect(() => {
    if (!enabled || idsKey === "") return;
    const scroller = resolveRoot(root);
    const doc = scroller?.ownerDocument ?? document;
    const win = doc.defaultView;
    if (!win) return;
    const watched = idsKey.split("\u0000");
    const inputTarget: EventTarget = scroller ?? doc;

    let observer: IntersectionObserver | null = null;
    let height = -1;
    let engaged = false;

    const targets = (): { id: string; el: HTMLElement }[] =>
      watched.flatMap((id) => {
        const el = doc.getElementById(id);
        // A heading with no box (display: none, hidden) has no place on the page to read.
        return el && el.getClientRects().length > 0 ? [{ id, el }] : [];
      });

    const compute = (): void => {
      if (pin.current !== null) return;
      const found = targets();
      const box = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: win.innerHeight };
      const line = box.top + readOffset(offset, found[0]?.el);
      let next: string | null = null;
      for (const { id, el } of found) {
        // A pixel of slack: scroll positions and rects are fractional.
        if (el.getBoundingClientRect().top <= line + 1) next = id;
        else break;
      }
      const area = scroller ?? doc.scrollingElement ?? doc.documentElement;
      const scrollable = area.scrollHeight > area.clientHeight + 1;
      if (scrollable && area.scrollTop + area.clientHeight >= area.scrollHeight - 1) {
        for (const { id, el } of found) {
          if (el.getBoundingClientRect().top < box.bottom) next = id;
        }
      }
      // Above the first heading nothing is read yet: keep the initial entry (defaultActive)
      // until the reader has reached a heading once.
      if (next !== null) engaged = true;
      if (!engaged || next === current.current || next === reported.current) return;
      reported.current = next;
      change.current(next);
    };

    const build = (): void => {
      observer?.disconnect();
      observer = null;
      height = scroller ? scroller.clientHeight : win.innerHeight;
      if (typeof IntersectionObserver === "function") {
        // The band runs from the reading line to the bottom of the view; the top edge of a
        // heading leaves "fully visible" exactly when it crosses the line.
        const top = readOffset(offset, targets()[0]?.el);
        observer = new IntersectionObserver(compute, {
          root: scroller,
          rootMargin: `${String(-top)}px 0px 0px 0px`,
          threshold: [0, 1],
        });
        for (const { el } of targets()) observer.observe(el);
      }
      compute();
    };

    build();
    check.current = () => {
      reported.current = undefined;
      compute();
    };

    // A scroll that has come to rest: catches the end of the scroller, which no heading crosses.
    let idle: number | undefined;
    const rest = (): void => {
      win.clearTimeout(idle);
      idle = win.setTimeout(compute, IDLE_MS);
    };
    const hasScrollEnd = "onscrollend" in win;
    const settleTarget: EventTarget = scroller ?? doc;
    settleTarget.addEventListener(
      hasScrollEnd ? "scrollend" : "scroll",
      hasScrollEnd ? compute : rest,
      {
        passive: true,
      },
    );

    // The reader scrolls by hand: the pin is over, and the next crossing or rest decides.
    const release = (): void => {
      if (pin.current === null) return;
      pin.current = null;
      reported.current = undefined;
    };
    const onKey = (event: Event): void => {
      if (event instanceof KeyboardEvent && SCROLL_KEYS.has(event.key)) release();
    };
    inputTarget.addEventListener("wheel", release, { passive: true });
    inputTarget.addEventListener("touchmove", release, { passive: true });
    inputTarget.addEventListener("pointerdown", release, { passive: true });
    inputTarget.addEventListener("keydown", onKey, { passive: true });

    // The observer's band depends on the height of the view: rebuild when it changes.
    const resize =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            const now = scroller ? scroller.clientHeight : win.innerHeight;
            if (now === height) compute();
            else build();
          })
        : null;
    resize?.observe(scroller ?? doc.documentElement);

    return () => {
      check.current = null;
      observer?.disconnect();
      resize?.disconnect();
      win.clearTimeout(idle);
      settleTarget.removeEventListener(
        hasScrollEnd ? "scrollend" : "scroll",
        hasScrollEnd ? compute : rest,
      );
      inputTarget.removeEventListener("wheel", release);
      inputTarget.removeEventListener("touchmove", release);
      inputTarget.removeEventListener("pointerdown", release);
      inputTarget.removeEventListener("keydown", onKey);
    };
  }, [enabled, idsKey, root, offset, pin]);

  return useCallback(() => {
    check.current?.();
  }, []);
}
