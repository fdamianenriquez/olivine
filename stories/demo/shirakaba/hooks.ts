import { type RefObject, useEffect, useState } from "react";

/** Runs `update` on the next animation frame after a scroll or resize, at most once per frame. */
function useFrameOnScroll(update: () => void): void {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      frame = 0;
      update();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    run();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
    // `update` is a fresh closure on every render; the listeners only need to be set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** The id of the last section whose top has passed 40 % of the viewport height. */
export function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");
  useFrameOnScroll(() => {
    const line = window.innerHeight * 0.4;
    let current = ids[0] ?? "";
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= line) current = id;
    }
    setActive(current);
  });
  return active;
}

/**
 * How far the page has scrolled through a tall section that pins its content (0 to 1). Read once
 * per animation frame.
 */
export function usePinnedProgress(
  ref: RefObject<HTMLElement | null>,
  measure: (top: number, height: number, viewport: number) => number,
): number {
  const [progress, setProgress] = useState(0);
  useFrameOnScroll(() => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    setProgress(measure(box.top, box.height, window.innerHeight));
  });
  return progress;
}

/** Turns `true` the first time the element reaches the lower part of the viewport, and stays. */
export function useSeen(ref: RefObject<Element | null>, rootMargin = "0px 0px -15% 0px"): boolean {
  // Without IntersectionObserver there is nothing to wait for: show it at once.
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [ref, rootMargin]);
  return seen;
}

/**
 * The index of the list item that crosses the middle of the viewport. `refs` holds one element
 * per item, in order.
 */
export function useCrossing(refs: RefObject<(HTMLElement | null)[] | null>, count: number): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setIndex(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of (refs.current ?? []).slice(0, count)) if (el) observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [refs, count]);
  return index;
}
