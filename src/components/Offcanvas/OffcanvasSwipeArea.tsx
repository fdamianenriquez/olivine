import { useEffect, useRef } from "react";

import { CONTROLS, FLICK_VELOCITY, FLICK_WINDOW, SLOP } from "../../hooks/gesture";
import type { OffcanvasPlacement } from "./Offcanvas";

/** Inward travel in px that opens the panel without a flick. */
export const SWIPE_OPEN_DISTANCE = SLOP * 6;

/** Presses that start in an open dialog, a panel, its scrim or an inert subtree are theirs. */
const IGNORE =
  "[role='dialog'], [role='alertdialog'], [aria-modal='true'], .ol-offcanvas, .ol-scrim, [inert]";

/** Controls that drag or take presses themselves keep them, even inside the band. */
const OWN_GESTURE = `${CONTROLS}, [role='slider'], [role='separator'], [role='scrollbar']`;

type Side = "left" | "right" | "bottom";

export interface OffcanvasSwipeAreaProps {
  /**
   * The screen edge the swipe starts from, the same as the panel it opens. `start` and `end`
   * follow the document's writing direction.
   * @default "end"
   */
  placement?: OffcanvasPlacement;
  /** Called once when a swipe inward passes the distance, or on the release of an inward flick. */
  onOpen: () => void;
  /**
   * How far from the edge a swipe may start, as a CSS length (a token such as
   * `"var(--space-8)"`). The safe-area inset of that edge is added to it.
   * @default "var(--space-6)"
   */
  depth?: string;
  /** Stops listening, so the edge belongs to the page alone (e.g. while the panel is open). */
  disabled?: boolean;
}

interface Press {
  id: number;
  type: string;
  side: Side;
  x: number;
  y: number;
  lastTravel: number;
  lastTime: number;
  /** px/ms, positive inward. */
  speed: number;
  /** Claimed: past the slop, inward and more along the axis than across it. */
  started: boolean;
  /** `onOpen` already ran; the rest of the gesture is still kept from scrolling. */
  opened: boolean;
}

/** The band's depth in px for a side: `depth` plus that edge's safe-area inset, read by a probe. */
function measureBand(depth: string, side: Side): number {
  const probe = document.createElement("div");
  const inset = `env(safe-area-inset-${side}, 0px)`;
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;";
  probe.style.setProperty(side === "bottom" ? "height" : "width", `calc(${depth} + ${inset})`);
  document.body.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  probe.remove();
  return side === "bottom" ? rect.height : rect.width;
}

/** The writing direction where the press starts (a `dir` subtree or `Root` wins over `<html>`). */
function isRtl(from: EventTarget | null): boolean {
  const node = from instanceof Element ? from : document.documentElement;
  const computed = getComputedStyle(node).direction;
  const direction = computed !== "" ? computed : node.closest("[dir]")?.getAttribute("dir");
  return direction === "rtl";
}

/**
 * Opens an `Offcanvas` with a touch or pen swipe inward from a screen edge. It renders nothing:
 * while enabled it listens on the document for presses that start within `depth` of the edge,
 * and claims the gesture (keeping the page from scrolling) only once it moves inward past the
 * slop. Taps, long presses, selection, sliders, hover and screen-reader exploration near the
 * edge stay with the page, and a mouse never swipes. It is a shortcut for touch: keep a visible
 * button that opens the same panel. System edge gestures (back, the home indicator) usually win
 * at the very edge of the screen.
 */
export function OffcanvasSwipeArea({
  placement = "end",
  onOpen,
  depth = "var(--space-6)",
  disabled = false,
}: OffcanvasSwipeAreaProps) {
  const open = useRef(onOpen);
  useEffect(() => {
    open.current = onOpen;
  });

  useEffect(() => {
    if (disabled || typeof document === "undefined") return;
    const bands = new Map<Side, number>();
    let press: Press | null = null;

    const band = (side: Side) => {
      let px = bands.get(side);
      if (px === undefined) {
        px = measureBand(depth, side);
        bands.set(side, px);
      }
      return px;
    };

    /** Signed travel toward the middle of the screen, and the travel across the axis. */
    const along = (current: Press, x: number, y: number) => {
      const dx = x - current.x;
      const dy = y - current.y;
      if (current.side === "bottom") return { inward: -dy, across: dx };
      return current.side === "right" ? { inward: -dx, across: dy } : { inward: dx, across: dy };
    };

    /** Claims or lets go of the gesture once it passes the slop; `false` once let go. */
    const decide = (current: Press, x: number, y: number) => {
      if (current.started) return true;
      const { inward, across } = along(current, x, y);
      if (Math.abs(inward) < SLOP && Math.abs(across) < SLOP) return true;
      if (inward > 0 && inward >= Math.abs(across)) {
        current.started = true;
        return true;
      }
      press = null;
      return false;
    };

    const onDown = (event: PointerEvent) => {
      if (press || event.button !== 0) return;
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (event.target instanceof Element && event.target.closest(`${IGNORE}, ${OWN_GESTURE}`)) {
        return;
      }
      const side: Side =
        placement === "bottom"
          ? "bottom"
          : (placement === "end") !== isRtl(event.target)
            ? "right"
            : "left";
      const distance =
        side === "left"
          ? event.clientX
          : side === "right"
            ? window.innerWidth - event.clientX
            : window.innerHeight - event.clientY;
      if (distance < 0 || distance > band(side)) return;
      press = {
        id: event.pointerId,
        type: event.pointerType,
        side,
        x: event.clientX,
        y: event.clientY,
        lastTravel: 0,
        lastTime: Date.now(),
        speed: 0,
        started: false,
        opened: false,
      };
    };

    const onMove = (event: PointerEvent) => {
      const current = press;
      if (current?.id !== event.pointerId || current.opened) return;
      if (!decide(current, event.clientX, event.clientY) || !current.started) return;
      const { inward } = along(current, event.clientX, event.clientY);
      const now = Date.now();
      const elapsed = now - current.lastTime;
      if (elapsed > 0) current.speed = (inward - current.lastTravel) / elapsed;
      current.lastTravel = inward;
      current.lastTime = now;
      if (inward >= SWIPE_OPEN_DISTANCE) {
        current.opened = true;
        open.current();
      }
    };

    // Touch scrolling is decided on touchmove: a claimed swipe cancels it from then on.
    const onTouchMove = (event: TouchEvent) => {
      const current = press;
      const touch = event.touches[0];
      if (current?.type !== "touch" || !touch || event.touches.length > 1) return;
      if (decide(current, touch.clientX, touch.clientY) && current.started && event.cancelable) {
        event.preventDefault();
      }
    };

    const onUp = (event: PointerEvent) => {
      const current = press;
      if (current?.id !== event.pointerId) return;
      press = null;
      if (!current.started || current.opened) return;
      const recent = Date.now() - current.lastTime <= FLICK_WINDOW;
      if (recent && current.speed >= FLICK_VELOCITY) open.current();
    };

    const onCancel = (event: PointerEvent) => {
      if (press?.id === event.pointerId) press = null;
    };

    const remeasure = () => {
      bands.clear();
    };

    const capture = { capture: true };
    // A component that claims the press itself (preventDefault on pointerdown) keeps it.
    const onClaimed = (event: PointerEvent) => {
      if (press?.id === event.pointerId && event.defaultPrevented) press = null;
    };
    document.addEventListener("pointerdown", onDown, capture);
    document.addEventListener("pointerdown", onClaimed, false);
    document.addEventListener("pointermove", onMove, capture);
    document.addEventListener("pointerup", onUp, capture);
    document.addEventListener("pointercancel", onCancel, capture);
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    window.addEventListener("resize", remeasure);
    return () => {
      document.removeEventListener("pointerdown", onDown, capture);
      document.removeEventListener("pointerdown", onClaimed, false);
      document.removeEventListener("pointermove", onMove, capture);
      document.removeEventListener("pointerup", onUp, capture);
      document.removeEventListener("pointercancel", onCancel, capture);
      document.removeEventListener("touchmove", onTouchMove, capture);
      window.removeEventListener("resize", remeasure);
    };
  }, [placement, depth, disabled]);

  return null;
}
