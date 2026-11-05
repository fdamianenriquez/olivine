import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";

/**
 * Milliseconds a finger or pen must stay down before the menu opens. Android and iOS open their
 * own long-press menus after about 400 to 500 ms; 500 ms is the common middle.
 */
export const LONG_PRESS_MS = 500;
/** Pixels a finger may drift during a long-press (a finger always jitters a little). */
export const LONG_PRESS_TOLERANCE = 10;
/** Milliseconds a handled menu key keeps the late `contextmenu` event of the same press in check. */
const KEY_INTENT_MS = 100;
/** Milliseconds after a release in which the click of that press can still arrive. */
const CLICK_GRACE_MS = 50;
/** Milliseconds after which a swallowing listener goes away whatever happened. */
const CLICK_CAP_MS = 1000;

/** Descendants that keep the browser's own menu by default: editable fields. */
export const DEFAULT_NATIVE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** Where and how the menu was asked for. */
export type ContextMenuRequest =
  { kind: "pointer"; x: number; y: number } | { kind: "keyboard"; element: Element };

/** Whether `target` is inside a descendant of `area` that matches the `native` selector. */
export function isNativeTarget(target: Node, area: Element, native: string): boolean {
  const element = target instanceof Element ? target : target.parentElement;
  if (!element || native.trim() === "") return false;
  try {
    const hit = element.closest(native);
    return hit !== null && area.contains(hit);
  } catch {
    // An invalid selector keeps nothing native.
    return false;
  }
}

/** A secondary-button press (or Ctrl+click on an Apple platform): the one that fires `contextmenu`. */
export function isSecondaryPress(event: globalThis.PointerEvent): boolean {
  if (event.button === 2) return true;
  return event.button === 0 && event.ctrlKey && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * Swallows the click that belongs to the press in progress, so a press that only closes a menu
 * does not also activate what is under it. The listener goes away after that click or shortly
 * after the press is released without one (a scroll gesture, a right-click).
 */
export function swallowNextClick(): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = setTimeout(() => {
    stop();
  }, CLICK_CAP_MS);
  const stop = () => {
    clearTimeout(timer);
    clearTimeout(cap);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("pointerup", onRelease, true);
    document.removeEventListener("pointercancel", onRelease, true);
  };
  function onClick(event: globalThis.MouseEvent) {
    // A click with no detail comes from a key or assistive technology, not from the press.
    if (event.detail === 0) return;
    event.stopPropagation();
    event.preventDefault();
    stop();
  }
  function onRelease() {
    clearTimeout(timer);
    timer = setTimeout(stop, CLICK_GRACE_MS);
  }
  document.addEventListener("click", onClick, true);
  document.addEventListener("pointerup", onRelease, true);
  document.addEventListener("pointercancel", onRelease, true);
}

/** Native events already armed by an inner area, so an outer area does not arm the same press. */
const claimed = new WeakSet<Event>();

const isMenuKey = (event: KeyboardEvent) =>
  (event.key === "ContextMenu" && !event.shiftKey) ||
  (event.key === "F10" && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey);

/**
 * A `contextmenu` event from the keyboard or an assistive technology has no real point: it is at
 * (0, 0), or, when no pointer press came before it, outside its target's box. After a press the
 * box says nothing (a list marker, a pseudo-element or a thick stroke is hit outside it).
 */
function fromKeyboard(event: MouseEvent<HTMLElement>, afterPress: boolean): boolean {
  const { clientX: x, clientY: y } = event;
  if (x === 0 && y === 0) return true;
  if (afterPress) return false;
  const box = (event.target as Element).getBoundingClientRect();
  // An element with no box (not rendered) says nothing about where the point should be.
  if (box.width === 0 && box.height === 0) return false;
  return x < box.left - 1 || x > box.right + 1 || y < box.top - 1 || y > box.bottom + 1;
}

/** Handlers of the area element that the hook composes with its own. */
export interface TriggerUserHandlers {
  onContextMenu?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  onKeyDown?: ((event: KeyboardEvent<HTMLElement>) => void) | undefined;
  onPointerDown?: ((event: PointerEvent<HTMLElement>) => void) | undefined;
}

export interface ContextMenuTriggerOptions {
  /** False when the area is disabled or has nothing to show: the browser's menu stays. */
  enabled: boolean;
  /** Long-press delay in ms; 0 turns it off. */
  longPress: number;
  /** Selector of descendants that keep the browser's menu. */
  native: string;
  /** Called when the user asks for the menu. */
  onRequest: (request: ContextMenuRequest) => void;
  /** Called when an event inside the area was already handled by something else. */
  onForeign?: (() => void) | undefined;
  user: TriggerUserHandlers;
}

export interface ContextMenuTrigger {
  /** Spread on the area element. */
  props: {
    onContextMenu: (event: MouseEvent<HTMLElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    "data-pressing": "" | undefined;
  };
}

interface Press {
  id: number;
  x: number;
  y: number;
  fired: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  stop: () => void;
}

/**
 * Turns the events of an area into menu requests: a right-click, the ContextMenu key and
 * Shift+F10, a long-press with a finger or pen, and the `contextmenu` events that come from
 * assistive technology. It leaves the browser's menu alone wherever the rules say so, and
 * prevents the default only when it asks for the menu.
 */
export function useContextMenuTrigger(options: ContextMenuTriggerOptions): ContextMenuTrigger {
  const latest = useRef(options);
  useIsomorphicLayoutEffect(() => {
    latest.current = options;
  });
  const [pressing, setPressing] = useState(false);
  const press = useRef<Press | null>(null);
  const lastType = useRef("");
  const keyIntent = useRef(false);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keyStop = useRef<(() => void) | undefined>(undefined);
  /** A pointer press on the area came since the last key or `contextmenu`. */
  const pressed = useRef(false);

  /** Forgets the handled key: its listeners, its timer and the flag. */
  const clearIntent = useCallback(() => {
    keyStop.current?.();
    keyStop.current = undefined;
    clearTimeout(keyTimer.current);
    keyIntent.current = false;
  }, []);

  const endPress = useCallback(() => {
    const current = press.current;
    if (!current) return;
    press.current = null;
    clearTimeout(current.timer);
    current.stop();
    setPressing(false);
  }, []);
  useEffect(
    () => () => {
      endPress();
      clearIntent();
    },
    [endPress, clearIntent],
  );

  /** Stops waiting for the long-press; a fired one lasts until the finger lifts. */
  const cancelPress = useCallback(() => {
    if (press.current && !press.current.fired) endPress();
  }, [endPress]);

  const armPress = (event: PointerEvent<HTMLElement>) => {
    const area = event.currentTarget;
    const { longPress, native, enabled } = latest.current;
    const target = event.target as Node;
    if (!enabled || longPress <= 0 || !event.isPrimary) return;
    if (!area.contains(target) || isNativeTarget(target, area, native)) return;
    if (claimed.has(event.nativeEvent)) return;
    claimed.add(event.nativeEvent);

    const id = event.pointerId;
    const x = event.clientX;
    const y = event.clientY;
    const onMove = (move: globalThis.PointerEvent) => {
      if (move.pointerId !== id) return;
      if (Math.hypot(move.clientX - x, move.clientY - y) > LONG_PRESS_TOLERANCE) cancelPress();
    };
    const onRelease = (up: globalThis.PointerEvent) => {
      if (up.pointerId === id) endPress();
    };
    // A second finger turns the gesture into something else (a zoom, a two-finger scroll).
    const onOther = (down: globalThis.PointerEvent) => {
      if (down.pointerId !== id) cancelPress();
    };
    const onScroll = () => {
      cancelPress();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onRelease, true);
    document.addEventListener("pointercancel", onRelease, true);
    document.addEventListener("pointerdown", onOther, true);
    document.addEventListener("scroll", onScroll, true);
    const stop = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onRelease, true);
      document.removeEventListener("pointercancel", onRelease, true);
      document.removeEventListener("pointerdown", onOther, true);
      document.removeEventListener("scroll", onScroll, true);
    };

    const started: Press = { id, x, y, fired: false, timer: undefined, stop };
    started.timer = setTimeout(() => {
      if (press.current !== started) return;
      started.fired = true;
      // The lift of this finger must not click what is under it.
      swallowNextClick();
      latest.current.onRequest({ kind: "pointer", x, y });
    }, longPress);
    press.current = started;
    setPressing(true);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    latest.current.user.onPointerDown?.(event);
    lastType.current = event.pointerType;
    pressed.current = true;
    if (event.defaultPrevented) return;
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    // A new press replaces the previous one, waiting or fired.
    endPress();
    armPress(event);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const { user, enabled, native, onRequest } = latest.current;
    user.onKeyDown?.(event);
    pressed.current = false;
    if (event.defaultPrevented || !enabled || !isMenuKey(event) || event.nativeEvent.isComposing) {
      return;
    }
    const area = event.currentTarget;
    const target = event.target as Node;
    // A key pressed in something rendered into a portal from inside the area is not ours.
    if (!area.contains(target) || isNativeTarget(target, area, native)) return;
    event.preventDefault();
    if (event.repeat) return;

    // Windows fires `contextmenu` for these keys on release: let that event pass unnoticed.
    clearIntent();
    keyIntent.current = true;
    const release = () => {
      keyStop.current?.();
      keyStop.current = undefined;
      keyTimer.current = setTimeout(() => {
        keyIntent.current = false;
      }, KEY_INTENT_MS);
    };
    // A key release that never arrives (focus moved to another window) must not leave every
    // right-click cancelled.
    document.addEventListener("keyup", release, true);
    window.addEventListener("blur", clearIntent);
    keyStop.current = () => {
      document.removeEventListener("keyup", release, true);
      window.removeEventListener("blur", clearIntent);
    };
    onRequest({ kind: "keyboard", element: target instanceof Element ? target : area });
  };

  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    const { user, enabled, native, longPress, onRequest, onForeign } = latest.current;
    user.onContextMenu?.(event);
    const area = event.currentTarget;
    const target = event.target as Node;
    // Events from a portal rendered by something inside the area bubble here too.
    if (!area.contains(target)) return;
    const afterPress = pressed.current;
    pressed.current = false;
    if (event.defaultPrevented) {
      onForeign?.();
      return;
    }
    if (!enabled) return;
    if (isNativeTarget(target, area, native)) {
      onForeign?.();
      return;
    }
    if (keyIntent.current) {
      event.preventDefault();
      return;
    }
    if (fromKeyboard(event, afterPress)) {
      event.preventDefault();
      onRequest({ kind: "keyboard", element: target instanceof Element ? target : area });
      return;
    }
    const reported = (event.nativeEvent as { pointerType?: string }).pointerType;
    const type = reported ?? (lastType.current === "" ? "mouse" : lastType.current);
    const touch = type === "touch" || type === "pen";
    // Where users select text by touch, the browser keeps its long-press menu.
    if (touch && longPress <= 0) return;
    // Shift with the mouse is the way to the browser's menu.
    if (!touch && event.shiftKey) {
      onForeign?.();
      return;
    }
    // The browser opened its own menu for this long-press (Android): use it, once.
    cancelPress();
    event.preventDefault();
    onRequest({ kind: "pointer", x: event.clientX, y: event.clientY });
  };

  return {
    props: { onContextMenu, onKeyDown, onPointerDown, "data-pressing": pressing ? "" : undefined },
  };
}
