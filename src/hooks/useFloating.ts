import { autoUpdate, computePosition, flip, offset, type Placement, shift } from "@floating-ui/dom";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { tokens } from "../tokens";

/** useLayoutEffect in the browser, useEffect on the server (no warning during SSR). */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const px = (value: string) => Number.parseFloat(value);

/** Gap between the trigger and the floating element: `space-1`. */
const GAP = px(tokens.space["space-1"]);
/** Distance kept from the viewport edge when shifting: `space-2`. */
const EDGE = px(tokens.space["space-2"]);

export interface FloatingOptions {
  open: boolean;
  placement?: Placement;
  /** Gap in px between reference and floating element. Defaults to the `space-1` token. */
  gap?: number;
}

export interface FloatingResult<R extends HTMLElement, F extends HTMLElement> {
  reference: React.RefObject<R | null>;
  floating: React.RefObject<F | null>;
  /**
   * Callback refs that do the same as `reference` and `floating` and also re-run the
   * positioning when the node mounts later, as it does inside a `Portal`. Prefer these for
   * content that is not in the DOM on the render where `open` flips.
   */
  setReference: (node: R | null) => void;
  setFloating: (node: F | null) => void;
  /** Custom properties consumed by the `.ol-floating` class (position: fixed). */
  style: CSSProperties;
  /** The placement after flipping, e.g. "top-start". */
  placement: Placement;
  /** False until the first position is known; hide the element until then. */
  positioned: boolean;
}

/**
 * Positions a floating element next to its reference with flip and shift, and keeps it there
 * on scroll and resize. Give the floating element the `ol-floating` class and `style`.
 */
export function useFloating<R extends HTMLElement, F extends HTMLElement>({
  open,
  placement = "bottom-start",
  gap = GAP,
}: FloatingOptions): FloatingResult<R, F> {
  const reference = useRef<R>(null);
  const floating = useRef<F>(null);
  const [referenceNode, setReferenceNode] = useState<R | null>(null);
  const [floatingNode, setFloatingNode] = useState<F | null>(null);
  const [state, setState] = useState<{ x: number; y: number; placement: Placement } | null>(null);

  const setReference = useCallback((node: R | null) => {
    reference.current = node;
    setReferenceNode(node);
  }, []);
  const setFloating = useCallback((node: F | null) => {
    floating.current = node;
    setFloatingNode(node);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const ref = referenceNode ?? reference.current;
    const el = floatingNode ?? floating.current;
    if (!open || !ref || !el) {
      setState(null);
      return;
    }
    return autoUpdate(ref, el, () => {
      void computePosition(ref, el, {
        placement,
        strategy: "fixed",
        middleware: [offset(gap), flip({ padding: EDGE }), shift({ padding: EDGE })],
      }).then((result) => {
        setState({ x: result.x, y: result.y, placement: result.placement });
      });
    });
  }, [open, placement, gap, referenceNode, floatingNode]);

  return {
    reference,
    floating,
    setReference,
    setFloating,
    style: {
      "--ol-float-x": `${String(state?.x ?? 0)}px`,
      "--ol-float-y": `${String(state?.y ?? 0)}px`,
    } as CSSProperties,
    placement: state?.placement ?? placement,
    positioned: state !== null,
  };
}
