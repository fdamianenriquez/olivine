import { type RefCallback, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "../hooks/useFloating";
import { devWarn } from "../utils/dev";

/** `open` while shown, `closing` while the exit motion plays, `closed` once unmounted. */
export type PresenceState = "open" | "closing" | "closed";

export interface PresenceOptions {
  /**
   * Safety net in ms: the element unmounts after this even if its exit never reports an end
   * (no animation, an interrupted one, or a browser without `getAnimations`). Defaults to twice
   * `--dur-xl` read from the element, or 1000 when the token is missing.
   */
  timeout?: number;
  /** Called once the exit has finished and the element is about to unmount. */
  onExited?: () => void;
  /**
   * Where focus goes when the element starts closing while it holds focus. `inert` would
   * otherwise drop focus to `<body>`. Pass the element to focus (usually the trigger), or a
   * function that moves focus itself. It runs before `inert` is applied. If focus is still
   * inside afterwards (the target is gone or cannot take focus), it falls back to the element
   * that had focus when the presence opened.
   */
  returnFocus?: HTMLElement | null | (() => void);
}

export interface Presence<T extends HTMLElement> {
  /** Render the element while this is true. */
  mounted: boolean;
  /** Put this on the element as `data-state`; the motion classes read it. */
  state: PresenceState;
  /** Callback ref for the element whose motion marks the exit. */
  setElement: RefCallback<T>;
}

const FALLBACK_TIMEOUT = 1000;

/** Focuses `target` if it is in the document; true when focus landed on it. */
function tryFocus(target: Element | null | undefined): boolean {
  if (!(target instanceof HTMLElement) || !target.isConnected) return false;
  target.focus();
  return document.activeElement === target;
}

/** Moves focus out of `node` before it turns inert. */
function moveFocusOut(
  node: HTMLElement,
  target: PresenceOptions["returnFocus"],
  opener: Element | null,
): void {
  if (typeof target === "function") target();
  else tryFocus(target);
  if (!node.contains(document.activeElement)) return;
  if (target) {
    devWarn("usePresence", "returnFocus could not take focus; falling back to the opener.");
  }
  if (opener && !node.contains(opener)) tryFocus(opener);
}

function defaultTimeout(node: Element): number {
  const token = Number.parseFloat(getComputedStyle(node).getPropertyValue("--dur-xl"));
  return Number.isFinite(token) && token > 0 ? token * 2 : FALLBACK_TIMEOUT;
}

/** Finite animations running on the element and its descendants (pseudo-elements included). */
function exitAnimations(node: Element): Animation[] | null {
  if (typeof node.getAnimations !== "function") return null;
  return node.getAnimations({ subtree: true }).filter((animation) => {
    const end = animation.effect?.getComputedTiming().endTime;
    return typeof end === "number" && Number.isFinite(end);
  });
}

/**
 * Keeps an element mounted through its exit motion. While closing it is `inert`, so it can't
 * be focused or clicked (focus inside it moves to `returnFocus` first), and it unmounts when every finite animation on it has finished, on
 * `animationend`/`transitionend` where `getAnimations` is missing, or after `timeout`.
 *
 * ```tsx
 * // Destructure: the React Compiler treats an object whose member is used as a ref as a ref.
 * const { mounted, state, setElement } = usePresence<HTMLUListElement>(open);
 * {mounted && <ul ref={setElement} data-state={state} className="ol-kakejiku" />}
 * ```
 */
export function usePresence<T extends HTMLElement = HTMLElement>(
  open: boolean,
  options: PresenceOptions = {},
): Presence<T> {
  const [state, setState] = useState<PresenceState>(open ? "open" : "closed");
  const [node, setNode] = useState<T | null>(null);
  const onExited = useRef(options.onExited);
  const returnFocus = useRef(options.returnFocus);
  const opener = useRef<Element | null>(null);
  const { timeout } = options;

  // Before the closing effect below, so it sees this render's options.
  useIsomorphicLayoutEffect(() => {
    onExited.current = options.onExited;
    returnFocus.current = options.returnFocus;
  });

  // Derived from `open` during render, so the first frame after a change is already right.
  if (open && state !== "open") setState("open");
  if (!open && state === "open") setState("closing");

  // Remember what had focus when the presence opened: the fallback for returnFocus.
  const isOpen = state === "open";
  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    const active = document.activeElement;
    // Focus already moved inside (autoFocus): keep the previous opener.
    if (active && node?.contains(active)) return;
    opener.current = active;
  }, [isOpen, node]);

  // A layout effect, so the element is inert from the first closing frame.
  useIsomorphicLayoutEffect(() => {
    if (state !== "closing") return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setState("closed");
      onExited.current?.();
    };
    if (!node) {
      void Promise.resolve().then(finish);
      return () => {
        done = true;
      };
    }

    if (node.contains(document.activeElement)) {
      moveFocusOut(node, returnFocus.current, opener.current);
    }
    node.setAttribute("inert", "");
    const timer = window.setTimeout(finish, timeout ?? defaultTimeout(node));
    const onEnd = (event: Event) => {
      if (event.target === node) finish();
    };
    const animations = exitAnimations(node);
    if (animations) {
      void Promise.all(animations.map((animation) => animation.finished)).then(finish, finish);
    } else {
      node.addEventListener("animationend", onEnd);
      node.addEventListener("transitionend", onEnd);
    }

    return () => {
      done = true;
      window.clearTimeout(timer);
      node.removeEventListener("animationend", onEnd);
      node.removeEventListener("transitionend", onEnd);
      node.removeAttribute("inert");
    };
  }, [state, node, timeout]);

  return { mounted: state !== "closed", state, setElement: setNode };
}
