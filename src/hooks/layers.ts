import { useEffect, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "./useFloating";

interface Layer {
  id: symbol;
  /** The elements that belong to the layer (its popup, trigger…); read at press time. */
  nodes: () => Iterable<Element | null | undefined>;
}

/**
 * Open overlays, oldest first, in the order their effects ran. Only the last one answers to
 * Escape and traps focus. A parent and a child layer opened in the same commit register child
 * first (React runs child effects first), so `isInAbove` misses that rare case.
 */
const stack: Layer[] = [];

const none = (): Element[] => [];

export interface LayerHandle {
  /** Whether this is the topmost open layer right now. */
  isTop: () => boolean;
  /**
   * Whether `target` is inside a layer opened above this one (a menu opened from a popover).
   * A press there is not an outside press for this layer.
   */
  isInAbove: (target: Node | null) => boolean;
}

/**
 * Registers the calling overlay in the stack of open layers while `active` is true. `nodes`
 * lists the layer's elements, so the layers below it can tell that a press landed inside it.
 */
export function useLayer(
  active: boolean,
  nodes: () => Iterable<Element | null | undefined> = none,
): LayerHandle {
  const [id] = useState(() => Symbol("ol-layer"));
  const nodesRef = useRef(nodes);
  useIsomorphicLayoutEffect(() => {
    nodesRef.current = nodes;
  });
  useEffect(() => {
    if (!active) return;
    const layer: Layer = { id, nodes: () => nodesRef.current() };
    stack.push(layer);
    return () => {
      const at = stack.indexOf(layer);
      if (at !== -1) stack.splice(at, 1);
    };
  }, [active, id]);
  const [handle] = useState<LayerHandle>(() => ({
    isTop: () => stack[stack.length - 1]?.id === id,
    isInAbove: (target) => {
      if (!target) return false;
      const at = stack.findIndex((layer) => layer.id === id);
      if (at === -1) return false;
      for (const layer of stack.slice(at + 1)) {
        for (const node of layer.nodes()) if (node?.contains(target)) return true;
      }
      return false;
    },
  }));
  return handle;
}
