import {
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
  useEffect,
  useRef,
  useState,
} from "react";

/** The edge an element is swiped toward to dismiss it. */
export type SwipeDirection = "left" | "right" | "up" | "down";

/**
 * `idle` at rest; `drag` while it follows the pointer; `return` while it slides back after a
 * short swipe; `out` once a swipe dismissed it (it keeps its offset so an exit can continue it).
 */
export type SwipePhase = "idle" | "drag" | "return" | "out";

export interface SwipeDismissOptions {
  /** Direction that dismisses. `false` turns swiping off. */
  direction: SwipeDirection | false;
  /** Called once when a swipe passes the threshold or is flicked, on release. */
  onDismiss: () => void;
  /** Called with `true` when a drag starts and `false` when it ends, for pausing timers. */
  onSwipingChange?: ((swiping: boolean) => void) | undefined;
  /**
   * Share of the element's size along the swipe axis that dismisses on release.
   * @default 0.4
   */
  threshold?: number;
  /**
   * Release speed in px/ms toward the edge that dismisses, however short the swipe.
   * @default 0.5
   */
  velocity?: number;
  /**
   * Pointer types that can swipe. A mouse drag is left out by default so it never fights text
   * selection; mouse users have the dismiss button and Escape.
   * @default ["touch", "pen"]
   */
  pointerTypes?: readonly string[];
}

export interface SwipeDismiss<T extends HTMLElement> {
  /** Current phase; put it on the element as `data-swipe` (omit it while `idle`). */
  phase: SwipePhase;
  /** Spread on the element. */
  handlers: {
    onPointerDown: PointerEventHandler<T>;
    onPointerMove: PointerEventHandler<T>;
    onPointerUp: PointerEventHandler<T>;
    onPointerCancel: PointerEventHandler<T>;
  };
}

/** Movement in px before a press becomes a swipe (or is given up to scrolling). */
const SLOP = 8;
/** A release later than this after the last move counts as a stop, not a flick. */
const FLICK_WINDOW = 100;

/** Presses on controls never start a swipe. */
const CONTROLS =
  "button, a[href], input, select, textarea, label, summary, [contenteditable]:not([contenteditable='false']), [role='button'], [role='link'], [data-swipe-ignore]";

interface Drag {
  id: number;
  x: number;
  y: number;
  /** Signed travel along the axis toward the dismiss edge, clamped at 0. */
  travel: number;
  lastTravel: number;
  lastTime: number;
  speed: number;
  started: boolean;
}

function axisOf(direction: SwipeDirection) {
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "right" || direction === "down" ? 1 : -1;
  return { horizontal, sign };
}

function writeOffset(node: HTMLElement, direction: SwipeDirection, travel: number) {
  const { horizontal, sign } = axisOf(direction);
  const px = `${String(travel * sign)}px`;
  node.style.setProperty("--ol-swipe-x", horizontal ? px : "0px");
  node.style.setProperty("--ol-swipe-y", horizontal ? "0px" : px);
}

/**
 * Swipe-to-dismiss with Pointer Events, for touch and pen by default. The element follows the
 * pointer along one axis toward `direction` (movement the other way is clamped at 0, no rubber
 * band); on release it dismisses past `threshold` of its size or above `velocity`, otherwise it
 * returns. The offset is written to the element as `--ol-swipe-x` / `--ol-swipe-y` (px) and the
 * end of the run-out as `--ol-swipe-end-x` / `--ol-swipe-end-y`, so CSS draws every phase; the
 * hook re-renders only when the phase changes. Presses that start on a control are ignored, and a
 * press that moves across the axis first is left to scrolling. Set `touch-action` on the element
 * for the other axis (`pan-y` for a horizontal swipe). Never the only way to dismiss: keep a
 * button.
 */
export function useSwipeDismiss<T extends HTMLElement = HTMLElement>({
  direction,
  onDismiss,
  onSwipingChange,
  threshold = 0.4,
  velocity = 0.5,
  pointerTypes = ["touch", "pen"],
}: SwipeDismissOptions): SwipeDismiss<T> {
  const [phase, setPhase] = useState<SwipePhase>("idle");
  const drag = useRef<Drag | null>(null);
  const latest = useRef({ onDismiss, onSwipingChange });
  useEffect(() => {
    latest.current = { onDismiss, onSwipingChange };
  });

  // Turning swipe off mid-drag drops the drag.
  useEffect(() => {
    if (direction === false) drag.current = null;
  }, [direction]);

  const end = (node: T, cancelled: boolean) => {
    const current = drag.current;
    drag.current = null;
    if (!current?.started || direction === false) return;
    latest.current.onSwipingChange?.(false);
    const { horizontal, sign } = axisOf(direction);
    const size = horizontal ? node.offsetWidth : node.offsetHeight;
    const recent = Date.now() - current.lastTime <= FLICK_WINDOW;
    const passed = current.travel >= size * threshold && size > 0;
    const flicked = recent && current.speed >= velocity;
    if (!cancelled && (passed || flicked)) {
      const run = `${String((current.travel + size) * sign)}px`;
      node.style.setProperty("--ol-swipe-end-x", horizontal ? run : "0px");
      node.style.setProperty("--ol-swipe-end-y", horizontal ? "0px" : run);
      setPhase("out");
      latest.current.onDismiss();
      return;
    }
    writeOffset(node, direction, 0);
    setPhase("return");
  };

  const onPointerDown = (event: ReactPointerEvent<T>) => {
    if (direction === false || drag.current) return;
    if (!pointerTypes.includes(event.pointerType)) return;
    if (event.button !== 0 || phase === "out") return;
    if (event.target instanceof Element && event.target.closest(CONTROLS)) return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      travel: 0,
      lastTravel: 0,
      lastTime: Date.now(),
      speed: 0,
      started: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<T>) => {
    const current = drag.current;
    if (!current || direction === false || event.pointerId !== current.id) return;
    const { horizontal, sign } = axisOf(direction);
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    const along = (horizontal ? dx : dy) * sign;
    const across = horizontal ? dy : dx;
    const node = event.currentTarget;
    if (!current.started) {
      if (Math.abs(along) < SLOP && Math.abs(across) < SLOP) return;
      // Across the axis first, or backwards: leave it to scrolling.
      if (Math.abs(across) > Math.abs(along) || along < 0) {
        drag.current = null;
        return;
      }
      current.started = true;
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // Capture is a nicety; the drag still works without it.
      }
      latest.current.onSwipingChange?.(true);
      setPhase("drag");
    }
    const now = Date.now();
    const travel = Math.max(0, along);
    const elapsed = now - current.lastTime;
    if (elapsed > 0) current.speed = (travel - current.lastTravel) / elapsed;
    current.lastTravel = travel;
    current.lastTime = now;
    current.travel = travel;
    writeOffset(node, direction, travel);
  };

  const onPointerUp = (event: ReactPointerEvent<T>) => {
    if (drag.current?.id !== event.pointerId) return;
    end(event.currentTarget, false);
  };

  const onPointerCancel = (event: ReactPointerEvent<T>) => {
    if (drag.current?.id !== event.pointerId) return;
    end(event.currentTarget, true);
  };

  return {
    phase: direction === false && phase !== "out" ? "idle" : phase,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
