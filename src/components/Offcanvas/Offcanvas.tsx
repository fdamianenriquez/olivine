import {
  type ComponentPropsWithoutRef,
  type FocusEvent as ReactFocusEvent,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { CONTROLS, SLOP } from "../../hooks/gesture";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useOverlay } from "../../hooks/useOverlay";
import { useSheetDrag } from "../../hooks/useSheetDrag";
import { useSwipeDismiss } from "../../hooks/useSwipeDismiss";
import { useLabels } from "../../locale";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { CloseButton } from "../CloseButton";
import { Portal } from "../Portal";
import { VisuallyHidden } from "../VisuallyHidden";
import { OffcanvasSwipeArea } from "./OffcanvasSwipeArea";
import {
  distinct,
  indexOfPoint,
  type OffcanvasSnapPoint,
  type ResolvedPoint,
  resolvePoints,
  type SnapContext,
} from "./snapPoints";

export type { OffcanvasSnapPoint } from "./snapPoints";

export type OffcanvasPlacement = "end" | "start" | "bottom";

/**
 * What moved the sheet to a new point: a drag release, a press of the handle (click, Enter or
 * Space), an arrow, Home or End key on the handle, or focus moving to something a lower point hid.
 */
export type OffcanvasSnapReason = "drag" | "handle" | "keyboard" | "focus";

/**
 * Why the user dismissed the panel: Escape, the close button, a click on the scrim, or a touch
 * or pen swipe toward the edge.
 */
export type OffcanvasCloseReason = "escape" | "close" | "scrim" | "swipe";

export interface OffcanvasOwnProps {
  /**
   * Whether the panel is shown. When it turns `false` the panel rolls back up, inert, and
   * unmounts once the motion has finished.
   */
  open: boolean;
  /**
   * Called with the reason when the user dismisses the panel: Escape (`"escape"`), the close
   * button (`"close"`), a scrim click (`"scrim"`) or a swipe toward the edge (`"swipe"`). Without
   * it the panel cannot be dismissed by the user and the close button is hidden.
   */
  onClose?: (reason: OffcanvasCloseReason) => void;
  /** Heading of the panel. It also names the dialog; give `aria-label` without one. */
  title?: ReactNode;
  /**
   * Edge the panel slides in from. `start` and `end` follow the writing direction; `bottom` is
   * a bottom sheet, capped at the large modal width and centred on wide screens.
   * @default "end"
   */
  placement?: OffcanvasPlacement;
  /**
   * `false` for a standard sheet that sits beside the page: no scrim, the page stays
   * interactive and scrollable, no focus trap and no `aria-modal`. Focus is not moved on open:
   * move it in from the trigger (a ref on the panel and `focus()`) so a keyboard user lands
   * inside. Escape closes while focus is inside the panel.
   * @default true
   */
  modal?: boolean;
  /**
   * Show the "×" close button in the head. With `false`, give the panel another way out.
   * @default true
   */
  closeButton?: boolean;
  /**
   * Modal only: close on a scrim click. A press that starts inside the panel and ends on the
   * scrim does not close it.
   * @default true
   */
  closeOnScrim?: boolean;
  /**
   * A touch or pen swipe toward the panel's edge dismisses it (down for `bottom`). Needs
   * `onClose`; never the only way to dismiss.
   * @default true
   */
  closeOnSwipe?: boolean;
  /**
   * `bottom` only: stops of the sheet's visible height. A number from 0 to 1 is a share of the
   * available height, a larger number or a `px` string a length, a `rem` string a length in rem,
   * and `"content"` fits the content. Duplicates are dropped and the list is sorted ascending;
   * the tallest point sets the panel's size. Without it the sheet is as tall as its content.
   */
  snapPoints?: readonly OffcanvasSnapPoint[];
  /** Controlled current point; one of `snapPoints`. */
  snap?: OffcanvasSnapPoint;
  /**
   * Uncontrolled starting point, applied again each time the sheet opens. Defaults to the
   * lowest point.
   */
  defaultSnap?: OffcanvasSnapPoint;
  /** Called when the user or focus moves the sheet to another point. */
  onSnapChange?: (snap: OffcanvasSnapPoint, reason: OffcanvasSnapReason) => void;
  /**
   * `bottom` only: the grab bar. Shown by default when the sheet can be dragged. With two or
   * more snap points it is a button that cycles them; otherwise it is decorative.
   */
  handle?: boolean;
  /** Extra class names on the panel element. */
  className?: string;
  /** Panel body. */
  children?: ReactNode;
}

export type OffcanvasProps = OffcanvasOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof OffcanvasOwnProps>;

interface Geometry {
  points: ResolvedPoint[];
  context: SnapContext;
  /** The body has more content than it shows. */
  overflow: boolean;
}

/** Focusable controls, for moving the first focus past the handle. */
const TABBABLE =
  "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function px(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function sameGeometry(a: Geometry | null, b: Geometry): boolean {
  if (a === null) return false;
  if (a.overflow !== b.overflow || a.points.length !== b.points.length) return false;
  if (a.context.available !== b.context.available) return false;
  return JSON.stringify(a.points) === JSON.stringify(b.points);
}

/**
 * A panel that slides in from an edge for navigation, filters or a cart. It renders in a portal,
 * closes on Escape and unrolls on open and rolls back up on close (kakejiku). Modal by default:
 * a scrim, an inert page, a focus trap and a scroll lock. On `bottom` it is a bottom sheet with
 * an optional drag handle, snap points and swipe-to-dismiss.
 */
const OffcanvasRoot = forwardRef<HTMLDivElement, OffcanvasProps>(function Offcanvas(
  {
    open,
    onClose,
    title,
    placement = "end",
    modal = true,
    closeButton = true,
    closeOnScrim = true,
    closeOnSwipe = true,
    snapPoints,
    snap,
    defaultSnap,
    onSnapChange,
    handle,
    className,
    children,
    style,
    onFocus,
    onPointerDown,
    onPointerDownCapture,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    ...rest
  },
  ref,
) {
  const titleId = useId();
  const bodyId = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const pressedScrim = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const zone = useRef<"head" | "body">("body");
  // The body was scrolled to the top of its content when the press began.
  const bodyAtStart = useRef(true);
  // Height of the layout viewport the software keyboard covers, in px.
  const keyboardInset = useRef(0);
  const lastRequested = useRef<OffcanvasSnapPoint | undefined>(undefined);
  const prevSnap = useRef(snap);
  const labels = useLabels().offcanvas;

  const overlayRef = useOverlay({
    open,
    onClose: onClose
      ? () => {
          onClose("escape");
        }
      : undefined,
    modal,
  });
  // Destructured: the React Compiler would treat the whole object as a ref.
  const { mounted, state, setElement } = usePresence<HTMLDivElement>(open);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      setPanel(node);
      overlayRef(node);
      setElement(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [overlayRef, setElement, ref],
  );

  const bottom = placement === "bottom";
  const values = bottom ? distinct(snapPoints) : [];
  const valuesKey = JSON.stringify(values);
  const snapping = values.length >= 2;
  const dismissible = closeOnSwipe && onClose !== undefined;
  const draggable = bottom && (snapping || dismissible);
  const showHandle = bottom && (handle ?? draggable);

  // Uncontrolled point; the default is applied again each time the sheet opens.
  const [inner, setInner] = useState(defaultSnap);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  // How the next travel between points moves: "release" after a drag, "move" otherwise.
  const [travel, setTravel] = useState<"release" | "move" | null>(null);
  const [status, setStatus] = useState("");
  const [rtl, setRtl] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setInner(defaultSnap);
      setTravel(null);
      setStatus("");
      setGeometry(null);
    }
  }

  const points = geometry?.points ?? [];
  const current = snap ?? inner;
  const found = indexOfPoint(points, current, geometry?.context ?? null);
  const index = found < 0 ? 0 : found;
  const last = points.length - 1;
  const atTop = geometry !== null && index >= last;
  const tallest = points[last]?.px ?? 0;
  const restOffset = tallest - (points[index]?.px ?? tallest);

  const measure = useCallback(() => {
    const node = panelRef.current;
    const body = bodyRef.current;
    if (!node || !body) return;
    const computed = getComputedStyle(node);
    const max = px(computed.maxHeight);
    const available = max > 0 ? max : window.innerHeight - keyboardInset.current;
    const rem = px(getComputedStyle(document.documentElement).fontSize) || 16;
    // The natural height: everything above the body, the body's full content, and below it.
    const content =
      px(computed.borderTopWidth) +
      body.offsetTop +
      body.scrollHeight +
      px(computed.paddingBottom) +
      px(computed.borderBottomWidth);
    const context = { available, rem, content: Math.min(content, available) };
    const list = JSON.parse(valuesKey) as OffcanvasSnapPoint[];
    const next: Geometry = {
      points: resolvePoints(list.length >= 2 ? list : ["content"], context),
      context,
      overflow: body.scrollHeight > body.clientHeight + 1,
    };
    setGeometry((prev) => (sameGeometry(prev, next) ? prev : next));
  }, [valuesKey]);

  // Resolve the points on mount, whenever the panel or its content resizes, and on resize.
  useIsomorphicLayoutEffect(() => {
    if (!panel) return;
    // Without a computed direction (no layout engine), the nearest dir attribute stands in.
    const direction =
      getComputedStyle(panel).direction || panel.closest("[dir]")?.getAttribute("dir");
    setRtl(direction === "rtl");
    if (!bottom) return;
    measure();
    window.addEventListener("resize", measure);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        measure();
      });
      observer.observe(panel);
      const body = bodyRef.current;
      if (body) {
        observer.observe(body);
        for (const child of Array.from(body.children)) observer.observe(child);
      }
    }
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [panel, bottom, measure]);

  // A bottom sheet sits above the software keyboard: the part of the layout viewport the visual
  // viewport no longer shows is written as --ol-keyboard-inset, which lifts the sheet and lowers
  // its height cap. Kept through the roll-down so the sheet does not drop while it leaves.
  // A non-modal sheet only rises while focus is inside it, so it never covers a page field.
  // A pinch zoom also shrinks the visual viewport; it is not a keyboard, so it changes nothing.
  useIsomorphicLayoutEffect(() => {
    if (!panel || !bottom || typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    let keyboard = 0;
    const update = () => {
      if (Math.abs(viewport.scale - 1) < 0.01) {
        keyboard = Math.max(
          0,
          Math.round(window.innerHeight - (viewport.height + viewport.offsetTop)),
        );
      }
      const active = document.activeElement;
      const inset = modal || (active !== null && panel.contains(active)) ? keyboard : 0;
      if (inset === keyboardInset.current) return;
      keyboardInset.current = inset;
      panel.style.setProperty("--ol-keyboard-inset", `${String(inset)}px`);
      measure();
      if (inset === 0) return;
      // Once the smaller sheet has rendered, the field being typed in stays in view.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!active || active === panel || !panel.contains(active)) return;
        revealRef.current(active);
        active.scrollIntoView({ block: "nearest" });
      });
    };
    // Focus moving between the page and a non-modal sheet; focusout settles after the event.
    const refocus = () => {
      queueMicrotask(update);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    if (!modal) {
      document.addEventListener("focusin", refocus);
      document.addEventListener("focusout", refocus);
    }
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", refocus);
      document.removeEventListener("focusout", refocus);
      cancelAnimationFrame(frame);
      keyboardInset.current = 0;
      panel.style.removeProperty("--ol-keyboard-inset");
    };
  }, [panel, bottom, modal, measure]);

  const request = (target: number, reason: "drag" | "handle" | "keyboard" | "focus") => {
    const point = points[target];
    if (!point || target === index) return;
    lastRequested.current = point.value;
    if (snap === undefined) setInner(point.value);
    setTravel(reason === "drag" ? "release" : "move");
    setStatus(labels.size(target + 1, points.length));
    onSnapChange?.(point.value, reason);
  };

  // A controlled change the user did not make travels like a handle press.
  useEffect(() => {
    if (prevSnap.current === snap) return;
    prevSnap.current = snap;
    if (snap !== undefined && snap !== lastRequested.current) setTravel("move");
  }, [snap]);

  const sheet = useSheetDrag({
    panelRef,
    points: points.map((p) => p.px),
    index,
    dismissible,
    onSnap: (target) => {
      request(target, "drag");
    },
    onDismiss: () => {
      onClose?.("swipe");
    },
    // Called once the pointer has moved, with the direction. An overflowing body at the tallest
    // point scrolls, except for a pull down that starts at the top of its content.
    canDragBody: (direction: "up" | "down") => {
      if (zone.current === "head" || !atTop) return true;
      const body = bodyRef.current;
      if (!body || body.scrollHeight <= body.clientHeight) return true;
      return direction === "down" && bodyAtStart.current && body.scrollTop <= 0;
    },
    disabled: !draggable || state !== "open" || geometry === null,
  });
  const sheetPhase = sheet.phase;
  useEffect(() => {
    if (sheetPhase === "drag") setTravel("release");
  }, [sheetPhase]);

  const swipesSide = !bottom && dismissible;
  const swipe = useSwipeDismiss<HTMLDivElement>({
    direction:
      swipesSide && state === "open" ? ((placement === "end") !== rtl ? "right" : "left") : false,
    onDismiss: () => {
      onClose?.("swipe");
    },
  });
  const phase = bottom ? sheetPhase : swipe.phase;

  // The body marks when it is scrolled to the top (CSS lets the browser pan only upward then), and
  // a touch that pulls down from there is kept from scrolling so the sheet can follow it. Browsers
  // without directional touch-action rely on the touchmove being cancelled. Never while the drag
  // itself would be refused.
  const canPull = useRef(false);
  useEffect(() => {
    canPull.current = draggable && state === "open" && geometry !== null;
  });
  useEffect(() => {
    const body = bodyRef.current;
    if (!panel || !body || !bottom) return;
    const mark = () => {
      body.toggleAttribute("data-scroll-start", body.scrollTop <= 0);
    };
    mark();
    let touch: { x: number; y: number; lock: "sheet" | "scroll" | null } | null = null;
    const onStart = (event: TouchEvent) => {
      const point = event.touches[0];
      const pulls =
        event.touches.length === 1 &&
        canPull.current &&
        body.scrollTop <= 0 &&
        panel.classList.contains("ol-offcanvas--draggable") &&
        panel.hasAttribute("data-snap-top") &&
        panel.hasAttribute("data-overflow") &&
        !(event.target instanceof Element && event.target.closest(CONTROLS));
      touch = pulls && point ? { x: point.clientX, y: point.clientY, lock: null } : null;
    };
    const onMove = (event: TouchEvent) => {
      const point = event.touches[0];
      if (!touch || !point || event.touches.length > 1) return;
      if (touch.lock === null) {
        const dy = point.clientY - touch.y;
        const dx = point.clientX - touch.x;
        if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return;
        touch.lock = dy > 0 && dy >= Math.abs(dx) ? "sheet" : "scroll";
      }
      if (touch.lock === "sheet" && event.cancelable) event.preventDefault();
    };
    const onEnd = () => {
      touch = null;
    };
    body.addEventListener("scroll", mark, { passive: true });
    body.addEventListener("touchstart", onStart, { passive: true });
    body.addEventListener("touchmove", onMove, { passive: false });
    body.addEventListener("touchend", onEnd);
    body.addEventListener("touchcancel", onEnd);
    return () => {
      body.removeEventListener("scroll", mark);
      body.removeEventListener("touchstart", onStart);
      body.removeEventListener("touchmove", onMove);
      body.removeEventListener("touchend", onEnd);
      body.removeEventListener("touchcancel", onEnd);
    };
  }, [panel, bottom]);

  // The scrim fades with a drag below the lowest point: 1 there, 0 with the sheet off-screen.
  // Written on the scrim straight from the drag offset, after the drag handlers ran.
  const fadeScrim = () => {
    const scrim = scrimRef.current;
    const node = panelRef.current;
    if (!scrim || !node || !bottom) return;
    const lowest = points[0]?.px ?? 0;
    const travel = px(node.style.getPropertyValue("--ol-swipe-y"));
    const visible = (points[index]?.px ?? 0) - travel;
    const fade = travel > 0 && lowest > 0 && visible < lowest ? Math.max(0, visible / lowest) : 1;
    scrim.style.setProperty("--ol-scrim-fade", String(Math.round(fade * 1000) / 1000));
  };

  // Focus on something a lower point hides raises the sheet to the lowest point showing it.
  const revealFocus = (target: Element) => {
    const node = panelRef.current;
    if (!snapping || atTop || !node || target === node || handleRef.current?.contains(target)) {
      return;
    }
    const offset = target.getBoundingClientRect().bottom - node.getBoundingClientRect().top;
    if (offset <= (points[index]?.px ?? 0)) return;
    const shows = points.findIndex((p, i) => i > index && p.px >= offset);
    request(shows >= 0 ? shows : last, "focus");
  };
  const revealRef = useRef(revealFocus);
  useEffect(() => {
    revealRef.current = revealFocus;
  });

  // A move to a lower point (drag, handle, keys or a controlled change) must not hide the
  // control that has focus in the body.
  const prevIndex = useRef(index);
  useEffect(() => {
    const was = prevIndex.current;
    prevIndex.current = index;
    if (index >= was) return;
    const active = document.activeElement;
    if (active && bodyRef.current?.contains(active)) revealRef.current(active);
  }, [index]);

  // Modal: when the handle would take the first focus (no close button), skip past it.
  useEffect(() => {
    if (!open || !modal || !panel || document.activeElement !== handleRef.current) return;
    const next = Array.from(panel.querySelectorAll<HTMLElement>(TABBABLE)).find(
      (el) => el !== handleRef.current,
    );
    (next ?? panel).focus({ preventScroll: true });
  }, [open, modal, panel]);

  const hasTitle = title != null && title !== false && title !== "";
  const userNamed = rest["aria-label"] != null || rest["aria-labelledby"] != null;
  const unnamed = !hasTitle && !userNamed;
  useEffect(() => {
    if (open && unnamed) {
      devWarn(
        "Offcanvas",
        "the dialog has no accessible name. Pass `title`, `aria-label` or `aria-labelledby`.",
      );
    }
  }, [open, unnamed]);

  if (!mounted) return null;

  const showClose = closeButton && onClose !== undefined;
  const hasHead = hasTitle || showClose;
  // `closed` never renders (the presence unmounts first); keep the exit state until then.
  const motionState = state === "open" ? "open" : "closing";

  // Focus moving to something a lower point hides raises the sheet to the lowest point showing it.
  const reveal = (event: ReactFocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    revealFocus(event.target);
  };

  const onHandleKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const targets: Record<string, number> = {
      ArrowUp: Math.min(index + 1, last),
      ArrowDown: Math.max(index - 1, 0),
      Home: 0,
      End: last,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    request(target, "keyboard");
  };

  const sheetStyle: Record<string, string> = {};
  if (bottom && geometry) {
    if (snapping) sheetStyle["--ol-sheet-height"] = `${String(tallest)}px`;
    sheetStyle["--ol-sheet-rest"] = `${String(restOffset)}px`;
  }

  const {
    onPointerDown: barDown,
    onPointerMove: barMove,
    onPointerUp: barUp,
    onPointerCancel: barCancel,
  } = sheet.handleProps;
  const barProps = draggable
    ? {
        onPointerDown: barDown,
        onPointerMove: barMove,
        onPointerUp: barUp,
        onPointerCancel: barCancel,
      }
    : null;
  const handleEl = snapping ? (
    <button
      ref={handleRef}
      type="button"
      className="ol-offcanvas__handle"
      aria-label={atTop ? labels.collapse : labels.expand}
      aria-controls={bodyId}
      {...sheet.handleProps}
      onClick={() => {
        request(index >= last ? 0 : index + 1, "handle");
      }}
      onKeyDown={onHandleKey}
    />
  ) : (
    <span className="ol-offcanvas__handle" aria-hidden="true" {...barProps} />
  );

  const sideHandlers = swipesSide ? swipe.handlers : null;
  const chain =
    <E,>(own: ((event: E) => void) | undefined, theirs: ((event: E) => void) | undefined) =>
    (event: E) => {
      theirs?.(event);
      own?.(event);
    };

  const panelEl = (
    // Pointer swipes have the close button and Escape as their keyboard path; focus only reveals.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="dialog"
      aria-modal={modal ? "true" : undefined}
      aria-labelledby={hasTitle && !userNamed ? titleId : undefined}
      tabIndex={-1}
      {...rest}
      style={{ ...style, ...sheetStyle }}
      onFocus={reveal}
      onPointerDownCapture={(event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerDownCapture?.(event);
        // The content may have changed since the last measure.
        if (draggable) measure();
      }}
      onPointerDown={chain(sideHandlers?.onPointerDown, onPointerDown)}
      onPointerMove={chain(chain(sideHandlers?.onPointerMove, fadeScrim), onPointerMove)}
      onPointerUp={chain(chain(sideHandlers?.onPointerUp, fadeScrim), onPointerUp)}
      onPointerCancel={chain(chain(sideHandlers?.onPointerCancel, fadeScrim), onPointerCancel)}
      // The motion classes read these, so they are not overridable.
      data-state={motionState}
      data-swipe={phase === "idle" ? undefined : phase}
      data-travel={bottom && travel ? travel : undefined}
      data-snap-index={snapping && geometry ? index : undefined}
      data-snap-top={bottom && atTop ? "" : undefined}
      data-overflow={bottom && geometry?.overflow ? "" : undefined}
      ref={setRef}
      className={cx(
        "ol-offcanvas",
        `ol-offcanvas--${placement}`,
        "ol-kakejiku",
        !bottom && `ol-kakejiku--from-${placement}`,
        draggable && "ol-offcanvas--draggable",
        swipesSide && "ol-offcanvas--swipe",
        className,
      )}
    >
      {showHandle && handleEl}
      {hasHead && (
        <div
          className="ol-offcanvas__head"
          {...(draggable ? sheet.bodyProps : null)}
          onPointerDownCapture={() => {
            zone.current = "head";
          }}
        >
          {hasTitle && (
            <h2 id={titleId} className="ol-offcanvas__title ol-label">
              {title}
            </h2>
          )}
          {showClose && (
            <CloseButton
              onClick={() => {
                onClose("close");
              }}
              data-autofocus={modal ? "" : undefined}
            />
          )}
        </div>
      )}
      <div
        ref={bodyRef}
        id={bodyId}
        className="ol-offcanvas__body"
        {...(draggable ? sheet.bodyProps : null)}
        onPointerDownCapture={() => {
          zone.current = "body";
          bodyAtStart.current = (bodyRef.current?.scrollTop ?? 0) <= 0;
        }}
      >
        {children}
      </div>
      {snapping && (
        <VisuallyHidden role="status" className="ol-offcanvas__status">
          {status}
        </VisuallyHidden>
      )}
      {/* The rail: a hairline at the height of each point, shown while the sheet is dragged. */}
      {snapping && geometry && (
        <span className="ol-offcanvas__rail" aria-hidden="true">
          {points.map((point) => (
            <span
              key={point.px}
              className="ol-offcanvas__mark"
              style={{ insetBlockStart: `${String(tallest - point.px)}px` }}
            />
          ))}
        </span>
      )}
    </div>
  );

  return (
    <>
      {/* Marks where the panel was rendered so the portal can keep that theme and language. */}
      <span ref={anchor} hidden />
      <Portal anchor={anchor}>
        {modal ? (
          // The scrim is a pointer-only convenience; Escape and the close button are the keyboard paths.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            ref={scrimRef}
            className="ol-scrim ol-scrim--edge"
            data-state={motionState}
            data-swipe={bottom && phase !== "idle" ? phase : undefined}
            onPointerDown={(event) => {
              pressedScrim.current = event.target === event.currentTarget;
            }}
            onClick={(event) => {
              const started = pressedScrim.current;
              pressedScrim.current = false;
              if (!open || !closeOnScrim || !started) return;
              if (event.target === event.currentTarget) onClose?.("scrim");
            }}
          >
            {panelEl}
          </div>
        ) : (
          panelEl
        )}
      </Portal>
    </>
  );
});

/**
 * Offcanvas with its part attached: `Offcanvas.SwipeArea`, an edge strip that opens the panel
 * with a touch or pen swipe inward.
 */
export const Offcanvas = Object.assign(OffcanvasRoot, { SwipeArea: OffcanvasSwipeArea });
