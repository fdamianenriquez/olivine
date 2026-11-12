import { useIsomorphicLayoutEffect } from "./useFloating";

/**
 * Page chrome that sticks to the top of the viewport (a sticky Navbar, a sticky Banner). Each one
 * gets `--ol-sticky-top`: the height of the sticky chrome before it in document order, so they
 * stack instead of overlapping. The document element gets `--ol-sticky-offset`: the height of the
 * whole stuck stack, which the stylesheet turns into `scroll-padding` so focus and in-page links
 * stop below it. An element counts only while its computed `position` is `sticky` (a Banner is
 * static on small screens).
 */
const registry = new Set<HTMLElement>();
let observer: ResizeObserver | null = null;

const OFFSET = "--ol-sticky-offset";
const TOP = "--ol-sticky-top";

function byDocumentOrder(a: HTMLElement, b: HTMLElement): number {
  if (a === b) return 0;
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/** Recomputes every offset. Exported for tests. */
export function updateStickyChrome(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (registry.size === 0) {
    root.style.removeProperty(OFFSET);
    return;
  }
  let top = 0;
  for (const el of [...registry].sort(byDocumentOrder)) {
    el.style.setProperty(TOP, `${String(top)}px`);
    if (getComputedStyle(el).position === "sticky") top += el.getBoundingClientRect().height;
  }
  root.style.setProperty(OFFSET, `${String(top)}px`);
}

function onResize() {
  updateStickyChrome();
}

function register(el: HTMLElement) {
  registry.add(el);
  if (registry.size === 1) {
    window.addEventListener("resize", onResize);
    if (typeof ResizeObserver === "function") observer = new ResizeObserver(onResize);
  }
  observer?.observe(el);
  updateStickyChrome();
}

function unregister(el: HTMLElement) {
  registry.delete(el);
  observer?.unobserve(el);
  el.style.removeProperty(TOP);
  if (registry.size === 0) {
    window.removeEventListener("resize", onResize);
    observer?.disconnect();
    observer = null;
  }
  updateStickyChrome();
}

/** Registers `element` as sticky page chrome while `active` is true. */
export function useStickyChrome(element: HTMLElement | null, active: boolean): void {
  useIsomorphicLayoutEffect(() => {
    if (!active || !element) return;
    register(element);
    return () => {
      unregister(element);
    };
  }, [element, active]);
}
