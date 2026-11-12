/** Milliseconds after a release in which the click of that press can still arrive. */
const CLICK_GRACE_MS = 50;
/**
 * Milliseconds after the release (or, with no release yet, after the press) after which a
 * swallowing listener goes away whatever happened. Long enough for a slow long-press release.
 */
const CLICK_CAP_MS = 5000;

/**
 * Swallows the click that belongs to the press in progress, so a press that only closes a menu
 * does not also activate what is under it. The listener goes away after that click, shortly after
 * the press is released without one (a scroll gesture, a right-click), or after a cap.
 * Clicks with no `detail` come from a key or assistive technology and always pass. Pass
 * `released` when arming from the `pointerup` of the press.
 */
export function swallowNextClick({ released = false }: { released?: boolean } = {}): void {
  if (typeof document === "undefined") return;
  let grace: ReturnType<typeof setTimeout> | undefined;
  let cap = setTimeout(stop, CLICK_CAP_MS);
  // Armed from the release itself: its click follows at once, or never (a tap on plain text in
  // iOS Safari), so start the grace period now. A click delayed past it (a page without a
  // mobile viewport, an old WebView) is not swallowed.
  if (released) grace = setTimeout(stop, CLICK_GRACE_MS);
  function stop() {
    clearTimeout(grace);
    clearTimeout(cap);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("pointerup", onRelease, true);
    document.removeEventListener("pointercancel", onRelease, true);
    document.removeEventListener("pointerdown", stop, true);
  }
  function onClick(event: globalThis.MouseEvent) {
    if (event.detail === 0) return;
    event.stopPropagation();
    event.preventDefault();
    stop();
  }
  function onRelease() {
    clearTimeout(grace);
    clearTimeout(cap);
    grace = setTimeout(stop, CLICK_GRACE_MS);
    cap = setTimeout(stop, CLICK_CAP_MS);
  }
  document.addEventListener("click", onClick, true);
  document.addEventListener("pointerup", onRelease, true);
  document.addEventListener("pointercancel", onRelease, true);
  // A new press (or a second finger) means the click of the old one is not coming. Added while
  // the arming press is being dispatched, so it first runs for the next press.
  document.addEventListener("pointerdown", stop, true);
}

/**
 * A press on the scrim itself (not on the dialog it holds: Modal and Offcanvas render their panel
 * inside `.ol-scrim`). Its click would close the dialog, so a layer it dismisses swallows it.
 */
export function isScrimPress(target: EventTarget | null): boolean {
  return target instanceof Element && target.classList.contains("ol-scrim");
}
