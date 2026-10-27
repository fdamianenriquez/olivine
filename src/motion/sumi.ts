import { type RefCallback, useEffect, useState } from "react";

/** How long a keyboard press keeps the ink before lifting, as a multiple of `--dur-m`. */
const KEY_HOLD = 0.9;

function durM(element: Element): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue("--dur-m"));
  return Number.isFinite(value) ? value : 0;
}

function press(element: HTMLElement, x: string, y: string): void {
  element.style.setProperty("--ol-sumi-x", x);
  element.style.setProperty("--ol-sumi-y", y);
  // Restart the bloom even when the previous press has not lifted yet.
  element.dataset.press = "reset";
  element.getBoundingClientRect(); // Commit the reset before the next state.
  element.dataset.press = "down";
}

/**
 * Sumi press feedback for any `.ol-motion-sumi` element: the ink blooms from the pointer (from
 * the centre for Enter and Space) and lifts on release. Returns a function that unbinds it.
 */
export function bindSumi(element: HTMLElement): () => void {
  let timer = 0;
  const lift = () => {
    if (element.dataset.press === "down") element.dataset.press = "up";
  };
  const onPointerDown = (event: PointerEvent) => {
    const box = element.getBoundingClientRect();
    press(element, `${String(event.clientX - box.left)}px`, `${String(event.clientY - box.top)}px`);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    press(element, "50%", "50%");
    window.clearTimeout(timer);
    timer = window.setTimeout(lift, durM(element) * KEY_HOLD);
  };
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointerup", lift);
  element.addEventListener("pointerleave", lift);
  element.addEventListener("pointercancel", lift);
  element.addEventListener("keydown", onKeyDown);
  return () => {
    window.clearTimeout(timer);
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointerup", lift);
    element.removeEventListener("pointerleave", lift);
    element.removeEventListener("pointercancel", lift);
    element.removeEventListener("keydown", onKeyDown);
  };
}

/** React flavour of `bindSumi`: attach the returned ref to a `.ol-motion-sumi` element. */
export function useSumi<T extends HTMLElement = HTMLElement>(): RefCallback<T> {
  const [node, setNode] = useState<T | null>(null);
  useEffect(() => (node ? bindSumi(node) : undefined), [node]);
  return setNode;
}
