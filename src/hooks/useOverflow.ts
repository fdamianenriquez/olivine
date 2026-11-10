import { type RefObject, useEffect, useState } from "react";

/**
 * Whether `scroller` has content beyond its box, in either direction. Re-measured whenever the
 * scroller or its `content` changes size (wrapping, new code, a font that finishes loading).
 * Without `ResizeObserver` (old engines, server render, jsdom) it stays `false`.
 */
export function useOverflow(
  scroller: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
): boolean {
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const box = scroller.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      setOverflows(box.scrollWidth > box.clientWidth || box.scrollHeight > box.clientHeight);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    if (content.current) observer.observe(content.current);
    return () => {
      observer.disconnect();
    };
  }, [scroller, content]);

  return overflows;
}
