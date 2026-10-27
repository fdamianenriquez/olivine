import { type RefObject, useCallback, useEffect, useRef } from "react";

import { prefersReducedMotion } from "./reducedMotion";

export interface OrigamiOptions {
  /**
   * Panels of the fan fold.
   * @default 5
   */
  panels?: number;
}

export interface OrigamiHandle {
  /** Opens the fold, left to right. */
  open: () => void;
  /** Folds it back. */
  fold: () => void;
  /** Folds it at once and opens it again. */
  replay: () => void;
  /** Removes the folded copy and leaves the plain title. */
  destroy: () => void;
}

const SHEET = "ol-motion-origami__sheet";
const IN_VIEW = 0.9;

/** Longest `transition-duration + transition-delay` on the element, in ms. */
function transitionTime(element: Element): number {
  const style = getComputedStyle(element);
  const times = (value: string) =>
    value.split(",").map((part) => {
      const time = Number.parseFloat(part);
      if (!Number.isFinite(time)) return 0;
      return part.trim().endsWith("ms") ? time : time * 1000;
    });
  const durations = times(style.transitionDuration);
  const delays = times(style.transitionDelay);
  return Math.max(0, ...durations.map((duration, i) => duration + (delays[i] ?? delays[0] ?? 0)));
}

/** `--dur-s` in ms: the safety margin after the last panel's transition. */
function durS(element: Element): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue("--dur-s"));
  return Number.isFinite(value) ? value : 0;
}

function inView(entry: IntersectionObserverEntry): boolean {
  const height = entry.boundingClientRect.height;
  return height === 0 || entry.intersectionRect.height >= height * IN_VIEW;
}

/** Fold angle of panel `i`: the first lies flat, the rest alternate valley and mountain folds. */
function relativeTurn(index: number): string {
  if (index === 0) return "0deg";
  return index % 2 ? "180deg" : "-180deg";
}

function buildSheet(text: string, panels: number): HTMLElement {
  const sheet = document.createElement("span");
  sheet.className = SHEET;
  sheet.setAttribute("aria-hidden", "true");
  let parent: HTMLElement = sheet;
  for (let i = 0; i < panels; i += 1) {
    const panel = document.createElement("span");
    panel.className = "ol-motion-origami__panel";
    panel.style.setProperty("--ol-i", String(i));
    panel.style.setProperty("--ol-rel", relativeTurn(i));
    const front = document.createElement("span");
    front.className = "ol-motion-origami__front";
    const copy = document.createElement("span");
    copy.className = "ol-motion-origami__text";
    copy.textContent = text;
    front.append(copy);
    const back = document.createElement("span");
    back.className = "ol-motion-origami__back";
    panel.append(front, back);
    parent.append(panel);
    parent = panel;
  }
  return sheet;
}

/**
 * Origami (jabara-ori) for a one-line title with `.ol-motion-origami`: the line is printed on a
 * strip folded like a fan and opens left to right, panel by panel, when it enters the viewport.
 * The real text stays in place for assistive technology, search and selection: it keeps its
 * colour with only its fill hidden, and the sheet inks with `currentcolor`, so a theme switch
 * recolours it live. Once the fold has opened (`data-origami="done"`) the real text shows again.
 */
export function foldOrigami(
  element: HTMLElement,
  { panels = 5 }: OrigamiOptions = {},
): OrigamiHandle {
  let sheet: HTMLElement | null = null;
  let observer: IntersectionObserver | null = null;
  let mutations: MutationObserver | null = null;
  let settle = 0;

  const measure = () => {
    if (!sheet) return;
    const box = element.getBoundingClientRect();
    sheet.hidden = true;
    const range = document.createRange();
    range.selectNodeContents(element);
    const text =
      typeof range.getBoundingClientRect === "function" ? range.getBoundingClientRect() : box;
    sheet.hidden = false;
    element.style.setProperty("--ol-origami-x", `${String(text.left - box.left)}px`);
    element.style.setProperty("--ol-origami-y", `${String(text.top - box.top)}px`);
    element.style.setProperty("--ol-origami-h", `${String(text.height)}px`);
    element.style.setProperty(
      "--ol-origami-panel",
      `${String(Math.ceil(text.width / panels) + 2)}px`,
    );
  };

  const build = () => {
    sheet?.remove();
    sheet = buildSheet(element.textContent, panels);
    element.append(sheet);
    measure();
    // Forget the records of our own changes; anything observed later came from outside.
    mutations?.takeRecords();
  };

  /** The fold has opened: hand the line back to the real text. */
  const settled = () => {
    if (element.dataset.state === "open" && element.dataset.origami === "ready") {
      element.dataset.origami = "done";
    }
  };
  const onTransitionEnd = (event: TransitionEvent) => {
    const panels = element.querySelectorAll(".ol-motion-origami__panel");
    if (event.propertyName === "transform" && event.target === panels[panels.length - 1]) {
      settled();
    }
  };

  const open = () => {
    element.dataset.state = "open";
    window.clearTimeout(settle);
    const panels = element.querySelectorAll(".ol-motion-origami__panel");
    const last = panels[panels.length - 1];
    const time = last ? transitionTime(last) : 0;
    if (time <= 0) settled();
    // A safety net in case transitionend never comes (an interrupted or skipped transition).
    else settle = window.setTimeout(settled, time + durS(element));
  };
  const fold = () => {
    window.clearTimeout(settle);
    if (element.dataset.origami === "done") element.dataset.origami = "ready";
    element.dataset.state = "folded";
  };

  element.style.setProperty("--ol-origami-last", String(panels - 1));
  element.dataset.origami = "ready";
  fold();
  element.addEventListener("transitionend", onTransitionEnd);
  // When the title's text changes (React may also drop the copy), print it again.
  if (typeof MutationObserver === "function") {
    mutations = new MutationObserver(build);
    mutations.observe(element, { childList: true, characterData: true, subtree: true });
  }
  build();
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
  resize?.observe(element);
  if ("fonts" in document) void document.fonts.ready.then(measure);

  if (prefersReducedMotion(element) || typeof IntersectionObserver !== "function") {
    open();
  } else {
    observer = new IntersectionObserver(
      (entries) => {
        // A one-line title opens once 90% of its height is in view; a line wider than the
        // viewport must not keep it folded.
        if (entries.some((entry) => entry.isIntersecting && inView(entry))) {
          open();
          observer?.disconnect();
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] },
    );
    observer.observe(element);
  }

  return {
    open,
    fold,
    replay: () => {
      element.dataset.origami = "reset";
      fold();
      element.getBoundingClientRect(); // Commit the reset before the next state.
      element.dataset.origami = "ready";
      requestAnimationFrame(open);
    },
    destroy: () => {
      window.clearTimeout(settle);
      element.removeEventListener("transitionend", onTransitionEnd);
      observer?.disconnect();
      mutations?.disconnect();
      resize?.disconnect();
      sheet?.remove();
      sheet = null;
      delete element.dataset.origami;
      delete element.dataset.state;
      for (const name of ["last", "x", "y", "h", "panel"]) {
        element.style.removeProperty(`--ol-origami-${name}`);
      }
    },
  };
}

/** React flavour of `foldOrigami`. Returns `replay`. */
export function useOrigami(
  ref: RefObject<HTMLElement | null>,
  { panels = 5 }: OrigamiOptions = {},
): () => void {
  const handle = useRef<OrigamiHandle | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const origami = foldOrigami(ref.current, { panels });
    handle.current = origami;
    return () => {
      origami.destroy();
      handle.current = null;
    };
  }, [ref, panels]);
  return useCallback(() => {
    handle.current?.replay();
  }, []);
}
