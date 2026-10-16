import { useEffect, useRef } from "react";

/** Open overlays, oldest first. Only the last one answers to Escape and traps focus. */
const stack: symbol[] = [];

/**
 * Registers the calling overlay in the stack of open layers while `active` is true.
 * Returns a function that tells whether it is the topmost layer right now.
 */
export function useLayer(active: boolean): () => boolean {
  const id = useRef<symbol>(Symbol("ol-layer"));
  useEffect(() => {
    if (!active) return;
    const layer = id.current;
    stack.push(layer);
    return () => {
      const at = stack.indexOf(layer);
      if (at !== -1) stack.splice(at, 1);
    };
  }, [active]);
  return () => stack[stack.length - 1] === id.current;
}
