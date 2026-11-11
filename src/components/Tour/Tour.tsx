import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useFloating, useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useOverlay } from "../../hooks/useOverlay";
import { useLabels } from "../../locale";
import { prefersReducedMotion } from "../../motion/reducedMotion";
import { replayAnimations } from "../../motion/useEntrance";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { isImeKey } from "../../utils/ime";
import { pad } from "../../utils/pad";
import { Button } from "../Button";
import { CloseButton } from "../CloseButton";
import { Portal } from "../Portal";
import { useTargetRect } from "./useTargetRect";
import { resolveTarget, type TourTarget, useTourTarget } from "./useTourTarget";

export type { TourTarget } from "./useTourTarget";

/** Side of the target the card sits on; `center` puts it in the middle of the viewport. */
export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

/** Why the tour closed. */
export type TourCloseReason = "finish" | "skip" | "escape" | "scrim" | "close" | "missing";

/** Why the step changed. */
export type TourStepReason = "next" | "prev" | "key" | "skipped";

export interface TourStep {
  /**
   * What the step points at: a CSS selector, an element, a ref object or a function returning an
   * element. Resolved when the step becomes current. Omit it for a centred step (a welcome or a
   * closing note).
   */
  target?: TourTarget;
  /** Heading of the step. It names the dialog and is what a screen reader hears first. */
  title: ReactNode;
  /** Say what the target is and what to do with it; the spotlight cannot be seen by a screen reader. */
  content?: ReactNode;
  /** Overrides the tour's `placement` for this step. It flips when there is no room. */
  placement?: TourPlacement;
  /** Overrides the Next (or Done) word for this step. */
  nextLabel?: ReactNode;
  /** Overrides the Back word for this step. */
  prevLabel?: ReactNode;
}

/** The words a tour writes and announces. Defaults come from the locale. */
export interface TourLabels {
  /** The forward button. */
  next: string;
  /** The backward button. */
  back: string;
  /** The button that ends the tour early. */
  skip: string;
  /** The forward button on the last step. */
  done: string;
  /** Name of the dialog when a step has no usable title. */
  label: string;
}

export interface TourOwnProps {
  /** The steps, in order. */
  steps: readonly TourStep[];
  /** Controlled open state. */
  open?: boolean;
  /**
   * Initial open state when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean;
  /** Called when the tour opens or closes, with the reason it closed. */
  onOpenChange?: (open: boolean, reason: TourCloseReason) => void;
  /** Controlled index of the current step, 0-based. */
  step?: number;
  /**
   * Step an uncontrolled tour starts on, each time it opens.
   * @default 0
   */
  defaultStep?: number;
  /** Called with the index of the new step and the reason it changed. */
  onStepChange?: (index: number, reason: TourStepReason) => void;
  /**
   * `true`: a scrim covers the page except the target, the page is inert and focus stays in the
   * card. `false`: no scrim, the page stays usable and the target gets a drawn hairline frame.
   * @default true
   */
  modal?: boolean;
  /**
   * Side of the target the card sits on, for steps without their own `placement`.
   * @default "bottom"
   */
  placement?: TourPlacement;
  /**
   * End the tour (reason `"scrim"`) when the scrim is clicked. Modal only.
   * @default false
   */
  closeOnScrim?: boolean;
  /**
   * Show "Skip tour" on every step but the last, when there are two or more steps.
   * @default true
   */
  skippable?: boolean;
  /**
   * Add a close button in the card's head (reason `"close"`).
   * @default false
   */
  closeButton?: boolean;
  /**
   * Scroll the target to the centre of the viewport when its step starts, if it is not fully
   * in view.
   * @default true
   */
  scrollIntoView?: boolean;
  /** Overrides for the built-in words. */
  labels?: Partial<TourLabels>;
}

export type TourProps = TourOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof TourOwnProps | "title" | "content" | "children">;

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable]:not([contenteditable="false"]), [tabindex]';

function tabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.hidden && !el.closest("[inert]"),
  );
}

/** The target itself when it takes focus, else its first tabbable descendant. */
function focusableIn(target: HTMLElement): HTMLElement | null {
  if (target.matches(TABBABLE) && target.tabIndex >= 0) return target;
  return tabbables(target)[0] ?? null;
}

function isTextEntry(node: EventTarget | null): boolean {
  if (!(node instanceof HTMLElement)) return false;
  return node.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(node.tagName);
}

/** Text of a node with its whitespace collapsed. */
function textOf(node: Element | null): string {
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Index of the nearest step from `from` (exclusive) in `dir` whose target resolves, then in the
 * other direction; `null` when no step can be shown.
 */
function findStep(steps: readonly TourStep[], from: number, dir: 1 | -1): number | null {
  for (const d of [dir, -dir]) {
    for (let i = from + d; i >= 0 && i < steps.length; i += d) {
      const step = steps[i];
      if (step && (step.target === undefined || resolveTarget(step.target))) return i;
    }
  }
  return null;
}

function assign<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * Walks the reader through a screen one step at a time: a card with a counter, a title, a few
 * sentences and Back / Next controls, pointed at a real element of the page. By default it is a
 * spotlight: a scrim covers the page except a square window around the target, the page is
 * inert, focus stays in the card and Escape or Skip ends the tour. With `modal={false}` the page
 * stays usable and the target gets a drawn hairline frame. Each step change is announced
 * politely; focus stays on the button that was pressed. A step whose target is missing is
 * skipped in the direction of travel. The `ref` points to the card.
 */
export const Tour = forwardRef<HTMLDivElement, TourProps>(function Tour(
  {
    steps,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    step: stepProp,
    defaultStep = 0,
    onStepChange,
    modal = true,
    placement = "bottom",
    closeOnScrim = false,
    skippable = true,
    closeButton = false,
    scrollIntoView = true,
    labels,
    className,
    style: styleProp,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const words = useLabels().tour;
  const t: TourLabels = { ...words, ...labels };
  const stepWords = useLabels().stepper;
  const total = steps.length;

  const [open, setOpenState] = useControllable(openProp, defaultOpen);
  const [rawStep, setStepState] = useControllable(stepProp, defaultStep);
  const [dir, setDir] = useState<1 | -1>(1);
  const [announcement, setAnnouncement] = useState("");

  // An uncontrolled tour starts again from `defaultStep` each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      if (stepProp === undefined) setStepState(defaultStep);
      setDir(1);
      setAnnouncement("");
    }
  }

  const active = open && total > 0;
  const index = Math.min(Math.max(0, Math.floor(rawStep)), Math.max(0, total - 1));
  const current = steps[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const generated = useId();
  const titleId = `${generated}-title`;
  const bodyId = `${generated}-body`;
  const anchor = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState<HTMLDivElement | null>(null);
  const announceNext = useRef(false);
  const keepFocus = useRef(false);

  const untitled = steps
    .map((s, i) => (s.title == null || s.title === false || s.title === "" ? i + 1 : 0))
    .filter(Boolean)
    .join(", ");
  useEffect(() => {
    if (active && untitled) {
      devWarn("Tour", `step ${untitled} has no \`title\`; the title names the dialog.`);
    }
  }, [active, untitled]);
  useEffect(() => {
    if (open && total === 0) devWarn("Tour", "`steps` is empty; nothing is shown.");
  }, [open, total]);

  const setOpen = useCallback(
    (next: boolean, reason: TourCloseReason) => {
      setOpenState(next);
      onOpenChange?.(next, reason);
    },
    [setOpenState, onOpenChange],
  );

  const goTo = useCallback(
    (next: number, reason: TourStepReason) => {
      if (reason !== "skipped") {
        setDir(next < index ? -1 : 1);
        announceNext.current = true;
      }
      setStepState(next);
      onStepChange?.(next, reason);
    },
    [index, setStepState, onStepChange],
  );

  const { element: target, status } = useTourTarget(current?.target, active, index, layer);
  const shown = active && (status === "found" || status === "none");
  const rectAnchor = useTargetRect(target, shown, surface, edge);

  const stepPlacement = current?.placement ?? placement;
  const centred = stepPlacement === "center" || status === "none";
  const {
    setFloating,
    style: floatStyle,
    placement: actual,
    positioned,
  } = useFloating<HTMLElement, HTMLDivElement>({
    open: active && !centred && status === "found",
    placement: centred ? "bottom" : stepPlacement,
    anchor: rectAnchor,
    size: true,
  });

  // A missing target: pass over the step in the direction of travel, or end the tour.
  useIsomorphicLayoutEffect(() => {
    if (!active || status !== "missing") return;
    devWarn(
      "Tour",
      `the target of step ${String(index + 1)} is not on the page; the step is skipped.`,
    );
    const next = findStep(steps, index, dir);
    if (next === null) setOpen(false, "missing");
    else goTo(next, "skipped");
    // Runs only when the status or the step changes; the other values are read fresh.
  }, [active, status, index]);

  // Bring the target into view when its step starts.
  useIsomorphicLayoutEffect(() => {
    if (!shown || !target || !scrollIntoView || typeof target.scrollIntoView !== "function") {
      return;
    }
    const rect = target.getBoundingClientRect();
    // A sticky header is declared as the root's scroll-padding or the target's scroll-margin.
    const root = getComputedStyle(document.documentElement);
    const own = getComputedStyle(target);
    const inset = (side: "top" | "right" | "bottom" | "left") =>
      (Number.parseFloat(root.getPropertyValue(`scroll-padding-${side}`)) || 0) +
      (Number.parseFloat(own.getPropertyValue(`scroll-margin-${side}`)) || 0);
    const inView =
      rect.top >= inset("top") &&
      rect.left >= inset("left") &&
      rect.bottom <= window.innerHeight - inset("bottom") &&
      rect.right <= window.innerWidth - inset("right");
    if (inView) return;
    target.scrollIntoView({
      block: rect.height > window.innerHeight ? "start" : "center",
      inline: "nearest",
      behavior: prefersReducedMotion(card.current) ? "auto" : "smooth",
    });
  }, [shown, target, scrollIntoView]);

  // A step change: announce it, keep focus in the card, replay the settle and the frame.
  const shownIndex = shown ? index : null;
  const previousShown = useRef<number | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (shownIndex === null) {
      if (!active) previousShown.current = null;
      return;
    }
    const before = previousShown.current;
    previousShown.current = shownIndex;
    if (before === null || before === shownIndex) return;
    const node = card.current;
    if (node) {
      node.setAttribute("data-moved", "");
      replayAnimations(node);
    }
    if (!modal) replayAnimations(surface);
    if (keepFocus.current && node && !node.contains(document.activeElement)) {
      nextRef.current?.focus({ preventScroll: true });
    }
    keepFocus.current = false;
    if (announceNext.current) {
      announceNext.current = false;
      const head = `${stepWords.step} ${pad(shownIndex + 1)} ${stepWords.of} ${pad(total)}`;
      const title = textOf(titleRef.current);
      const body = textOf(bodyRef.current);
      setAnnouncement([`${head}:`, title ? `${title}.` : "", body].filter(Boolean).join(" "));
    }
    // A step change is the only trigger; the other values are read fresh.
  }, [shownIndex, active]);

  const overlayRef = useOverlay({
    open: active,
    onClose: () => {
      setOpen(false, "escape");
    },
    modal,
  });
  const { mounted, state, setElement } = usePresence<HTMLDivElement>(active);

  // Non-modal: Tab hands focus to the page, so Escape must end the tour from there too (the
  // card can cover the focused control). Inside the card `useOverlay` answers; inside another
  // layer (a menu) that layer does. Focus stays where it is.
  useEffect(() => {
    if (!active || modal) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || isImeKey(event)) return;
      const focused = document.activeElement;
      if (focused && card.current?.contains(focused)) return;
      const portal = focused?.closest(".ol-portal");
      if (portal && !portal.contains(layer.current)) return;
      event.preventDefault();
      setOpen(false, "escape");
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [active, modal, setOpen]);

  // Non-modal: nothing traps focus, so bring it to the main action on open.
  const [cardNode, setCardNode] = useState<HTMLDivElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!cardNode || modal) return;
    (cardNode.querySelector<HTMLElement>("[data-autofocus]") ?? cardNode).focus({
      preventScroll: true,
    });
  }, [cardNode, modal]);

  const setCard = useCallback(
    (node: HTMLDivElement | null) => {
      card.current = node;
      setCardNode(node);
      setFloating(node);
      overlayRef(node);
      assign(ref, node);
    },
    [setFloating, overlayRef, ref],
  );
  const setLayer = useCallback(
    (node: HTMLDivElement | null) => {
      layer.current = node;
      setElement(node);
    },
    [setElement],
  );

  if (!mounted || !current) return <span ref={anchor} hidden />;

  const next = () => {
    keepFocus.current = true;
    if (isLast) setOpen(false, "finish");
    else goTo(index + 1, "next");
  };
  const back = () => {
    if (isFirst) return;
    keepFocus.current = true;
    goTo(index - 1, "prev");
  };

  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || isImeKey(event)) return;
    const node = event.currentTarget;
    if (
      (event.key === "ArrowRight" || event.key === "ArrowLeft") &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !isTextEntry(event.target)
    ) {
      const rtl = getComputedStyle(node).direction === "rtl";
      const forward = (event.key === "ArrowRight") !== rtl;
      if (forward ? isLast : isFirst) return;
      event.preventDefault();
      keepFocus.current = true;
      goTo(index + (forward ? 1 : -1), "key");
      return;
    }
    // Non-modal: Tab past either end hands focus to the target, so the page carries on there.
    if (modal || event.key !== "Tab") return;
    const items = tabbables(node);
    const first = items[0] ?? node;
    const last = items[items.length - 1] ?? node;
    const activeEl = document.activeElement;
    const atEnd = event.shiftKey ? activeEl === first || activeEl === node : activeEl === last;
    if (!atEnd) return;
    event.preventDefault();
    const handoff = target ? focusableIn(target) : null;
    (handoff ?? (event.shiftKey ? last : first)).focus();
  };

  const hasTitle = current.title != null && current.title !== false && current.title !== "";
  const userNamed = rest["aria-label"] != null || rest["aria-labelledby"] != null;
  const hasBody = current.content != null && current.content !== false && current.content !== "";
  const showSkip = skippable && total >= 2 && !isLast;
  const ready = shown && (centred || positioned);
  const cardState = state === "open" ? (ready ? "open" : "pending") : "closing";
  const drawn = !modal && !centred && status === "found";

  return (
    <>
      {/* Marks where the tour was rendered so the portal keeps that theme and language. */}
      <span ref={anchor} hidden />
      <Portal anchor={anchor}>
        <div ref={setLayer} className="ol-tour-layer" data-state={state}>
          {modal ? (
            <>
              {/* The scrim is a pointer-only convenience; Escape and Skip are the keyboard paths. */}
              <div
                ref={setSurface}
                className="ol-tour__mask"
                aria-hidden="true"
                onClick={() => {
                  if (closeOnScrim && open) setOpen(false, "scrim");
                }}
              />
              {/* The hole's edge, shown only in forced colours where the scrim is opaque. */}
              <div
                ref={setEdge}
                className="ol-tour__edge"
                aria-hidden="true"
                hidden={centred || status !== "found"}
              />
            </>
          ) : (
            <div
              ref={setSurface}
              className="ol-tour__spot ol-draw"
              aria-hidden="true"
              data-drawn=""
              hidden={!drawn}
            />
          )}
          {/* The dialog handles arrow keys and, when non-modal, hands Tab to the target. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            role="dialog"
            aria-modal={modal ? "true" : undefined}
            aria-labelledby={!userNamed && hasTitle ? titleId : undefined}
            aria-label={!userNamed && !hasTitle ? t.label : undefined}
            aria-describedby={hasBody ? bodyId : undefined}
            tabIndex={-1}
            {...rest}
            ref={setCard}
            data-state={cardState}
            data-placement={centred ? "center" : actual.split("-")[0]}
            style={{ ...styleProp, ...(centred ? null : floatStyle) }}
            className={cx(
              "ol-floating",
              "ol-popover",
              "ol-tour",
              centred && "ol-tour--center",
              className,
            )}
            onKeyDown={onCardKeyDown}
          >
            <div
              className={cx(
                "ol-popover__head",
                "ol-tour__head",
                !closeButton && "ol-popover__head--bare",
              )}
            >
              <div className="ol-tour__heading">
                <p className="ol-tour__count">
                  <span className="ol-sr">{stepWords.step} </span>
                  <b>{pad(index + 1)}</b>
                  <span aria-hidden="true"> / </span>
                  <span className="ol-sr"> {stepWords.of} </span>
                  {pad(total)}
                </p>
                <h2 ref={titleRef} id={titleId} className="ol-popover__title ol-tour__title">
                  {current.title}
                </h2>
              </div>
              {closeButton ? (
                <CloseButton
                  onClick={() => {
                    setOpen(false, "close");
                  }}
                />
              ) : null}
            </div>
            {hasBody ? (
              <div ref={bodyRef} id={bodyId} className="ol-popover__body ol-tour__body">
                {current.content}
              </div>
            ) : null}
            <div className="ol-tour__foot">
              {showSkip ? (
                <Button
                  variant="ghost"
                  size="s"
                  className="ol-tour__skip"
                  onClick={() => {
                    setOpen(false, "skip");
                  }}
                >
                  {t.skip}
                </Button>
              ) : null}
              <div className="ol-tour__nav">
                {isFirst ? null : (
                  <Button variant="outline" size="s" className="ol-tour__back" onClick={back}>
                    {current.prevLabel ?? t.back}
                  </Button>
                )}
                <Button
                  ref={nextRef}
                  variant="accent"
                  size="s"
                  className="ol-tour__next"
                  data-autofocus=""
                  onClick={next}
                >
                  {current.nextLabel ?? (isLast ? t.done : t.next)}
                </Button>
              </div>
            </div>
            <div className="ol-sr ol-tour__live" aria-live="polite" aria-atomic="true">
              {announcement}
            </div>
          </div>
        </div>
      </Portal>
    </>
  );
});
