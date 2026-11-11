import { useEffect } from "react";

const FOCUSABLE =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]';

/** Gives every focusable descendant of `root` `tabindex="-1"`: still clickable, never tabbable. */
export function sweepTabbable(root: Element): void {
  root.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((el) => {
    if (el.getAttribute("tabindex") !== "-1") el.setAttribute("tabindex", "-1");
  });
}

/**
 * Keeps the focusable elements inside `node` out of the tab order while it is mounted, including
 * ones added or changed later. Used by content that focus must never enter.
 */
export function useUntabbable(node: Element | null): void {
  useEffect(() => {
    if (!node) return;
    sweepTabbable(node);
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      sweepTabbable(node);
    });
    observer.observe(node, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["tabindex", "href", "contenteditable", "controls"],
    });
    return () => {
      observer.disconnect();
    };
  }, [node]);
}
