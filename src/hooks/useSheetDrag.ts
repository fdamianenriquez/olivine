import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { CONTROLS, DISMISS_THRESHOLD, FLICK_VELOCITY, FLICK_WINDOW, SLOP } from "./gesture";

/**
 * `idle` at rest; `drag` while the sheet follows the pointer; `return` while it settles on a
 * snap point; `out` once a drag dismissed it (it keeps its offset so the exit continues it).
 */
export type SheetDragPhase = "idle" | "drag" | "return" | "out";

export interface SheetDragOptions {
  /** The panel; the hook writes `--ol-swipe-y` and `--ol-swipe-end-y` on it. */
  panelRef: RefObject<HTMLElement | null>;
  /** Visible heights of the snap points in px, ascending. A single point is plain swipe-to-dismiss. */
  points: readonly number[];
  /** Index of the current point in `points`. */
  index: number;
  /** A drag below the lowest point may dismiss. */
  dismissible: boolean;
  /** Called on release with the point the sheet should settle on. */
  onSnap: (index: number) => void;
  /** Called once when a release dismisses. */
  onDismiss: () => void;
  /** Called before a body drag starts; return `false` to leave the press to scrolling. */
  canDragBody?: (() => boolean) | undefined;
  /** Turns dragging off. */
  disabled?: boolean | undefined;
}

interface Handlers<T extends HTMLElement> {
  onPointerDown: (event: ReactPointerEvent<T>) => void;
  onPointerMove: (event: ReactPointerEvent<T>) => void;
  onPointerUp: (event: ReactPointerEvent<T>) => void;
  onPointerCancel: (event: ReactPointerEvent<T>) => void;
}

export interface SheetDrag {
  /** Current phase; put it on the panel as `data-swipe` (omit it while `idle`). */
  phase: SheetDragPhase;
  /** Spread on the handle button: any pointer type; a drag swallows the click that follows. */
  handleProps: Handlers<HTMLElement> & { onClickCapture: (event: ReactMouseEvent) => void };
  /** Spread on the head and body: touch and pen only, never from a control. */
  bodyProps: Handlers<HTMLElement>;
}

interface Drag {
  id: number;
  x: number;
  y: number;
  /** Signed travel, positive down. */
  travel: number;
  lastTravel: number;
  lastTime: number;
  /** px/ms, positive down. */
  speed: number;
  started: boolean;
  zone: "handle" | "body";
}

/** Where a release at `visible` px, moving at `speed` (px/ms, down positive), should settle. */
export function settleTarget(
  points: readonly number[],
  index: number,
  visible: number,
  speed: number,
  recent: boolean,
  dismissible: boolean,
): number | "dismiss" {
  const lowest = points[0] ?? 0;
  if (recent && Math.abs(speed) >= FLICK_VELOCITY) {
    if (speed > 0) {
      // Flick down: the next lower point below where the sheet is, or out.
      for (let i = index - 1; i >= 0; i -= 1) {
        if ((points[i] ?? 0) < visible + SLOP) return i;
      }
      return dismissible ? "dismiss" : 0;
    }
    const above = points.findIndex((p, i) => i > index && p > visible - SLOP);
    return above >= 0 ? above : points.length - 1;
  }
  if (dismissible && visible < lowest * (1 - DISMISS_THRESHOLD)) return "dismiss";
  let best = 0;
  points.forEach((p, i) => {
    if (Math.abs(p - visible) < Math.abs((points[best] ?? 0) - visible)) best = i;
  });
  return best;
}

/**
 * Drag between the snap points of a bottom sheet with Pointer Events. The sheet follows the
 * pointer in both directions between the lowest and the tallest point (clamped above the tallest,
 * no rubber band), and below the lowest when it can be dismissed. A release goes to the nearest
 * point, one point further in the direction of a flick, or out past `DISMISS_THRESHOLD` of the
 * lowest point. The offset is written to the panel as `--ol-swipe-y` (px) and the run-out as
 * `--ol-swipe-end-y`; the hook re-renders only when the phase changes. Never the only way to
 * move the sheet: the handle is also a button.
 */
export function useSheetDrag({
  panelRef,
  points,
  index,
  dismissible,
  onSnap,
  onDismiss,
  canDragBody,
  disabled = false,
}: SheetDragOptions): SheetDrag {
  const [phase, setPhase] = useState<SheetDragPhase>("idle");
  const drag = useRef<Drag | null>(null);
  const swallowClick = useRef(false);
  const latest = useRef({ points, index, dismissible, onSnap, onDismiss, canDragBody });
  useEffect(() => {
    latest.current = { points, index, dismissible, onSnap, onDismiss, canDragBody };
  });

  useEffect(() => {
    if (disabled) drag.current = null;
  }, [disabled]);

  const write = (name: string, px: number) => {
    panelRef.current?.style.setProperty(name, `${String(px)}px`);
  };

  const clamp = (travel: number) => {
    const { points: p, index: i, dismissible: canDismiss } = latest.current;
    const current = p[i] ?? 0;
    const tallest = p[p.length - 1] ?? current;
    const lowest = p[0] ?? current;
    const up = -(tallest - current);
    const down = canDismiss ? current : current - lowest;
    return Math.min(Math.max(travel, up), down);
  };

  const end = (cancelled: boolean) => {
    const current = drag.current;
    drag.current = null;
    if (!current?.started) return;
    const { points: p, index: i, dismissible: canDismiss } = latest.current;
    const visible = (p[i] ?? 0) - current.travel;
    const recent = Date.now() - current.lastTime <= FLICK_WINDOW;
    const target = cancelled ? i : settleTarget(p, i, visible, current.speed, recent, canDismiss);
    if (target === "dismiss") {
      write("--ol-swipe-end-y", p[i] ?? 0);
      setPhase("out");
      latest.current.onDismiss();
      return;
    }
    write("--ol-swipe-y", 0);
    setPhase("return");
    if (target !== i) latest.current.onSnap(target);
  };

  const onDown = (zone: Drag["zone"], event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || drag.current || event.button !== 0 || phase === "out") return;
    if (zone === "body") {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (event.target instanceof Element && event.target.closest(CONTROLS)) return;
      if (latest.current.canDragBody?.() === false) return;
    }
    swallowClick.current = false;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      travel: 0,
      lastTravel: 0,
      lastTime: Date.now(),
      speed: 0,
      started: false,
      zone,
    };
  };

  const onMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (current?.id !== event.pointerId) return;
    const dy = event.clientY - current.y;
    const dx = event.clientX - current.x;
    if (!current.started) {
      if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return;
      // Across the axis first: leave it to scrolling or selection.
      if (Math.abs(dx) > Math.abs(dy)) {
        drag.current = null;
        return;
      }
      current.started = true;
      swallowClick.current = current.zone === "handle";
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is a nicety; the drag still works without it.
      }
      setPhase("drag");
    }
    const now = Date.now();
    const travel = clamp(dy);
    const elapsed = now - current.lastTime;
    if (elapsed > 0) current.speed = (travel - current.lastTravel) / elapsed;
    current.lastTravel = travel;
    current.lastTime = now;
    current.travel = travel;
    write("--ol-swipe-y", travel);
  };

  const onEnd = (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    if (drag.current?.id !== event.pointerId) return;
    end(cancelled);
  };

  const shared = {
    onPointerMove: onMove,
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      onEnd(event, false);
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      onEnd(event, true);
    },
  };

  const handleProps = {
    ...shared,
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      onDown("handle", event);
    },
    onClickCapture: (event: ReactMouseEvent) => {
      // The click that ends a drag on the handle is not a press of the button. A keyboard click
      // (detail 0) is always a press, even if a drag ended without a click of its own.
      if (!swallowClick.current) return;
      swallowClick.current = false;
      if (event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  return {
    phase: disabled && phase !== "out" ? "idle" : phase,
    handleProps,
    bodyProps: {
      ...shared,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        onDown("body", event);
      },
    },
  };
}
