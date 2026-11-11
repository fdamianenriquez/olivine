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

export interface OffcanvasOwnProps {
  /**
   * Whether the panel is shown. When it turns `false` the panel rolls back up, inert, and
   * unmounts once the motion has finished.
   */
  open: boolean;
  /**
   * Called on Escape, on the close button, on a scrim click and on a swipe dismiss. Without it
   * the panel cannot be dismissed by the user and the close button is hidden.
   */
  onClose?: () => void;
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
export const Offcanvas = forwardRef<HTMLDivElement, OffcanvasProps>(function Offcanvas(
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
  const zone = useRef<"head" | "body">("body");
  const lastRequested = useRef<OffcanvasSnapPoint | undefined>(undefined);
  const prevSnap = useRef(snap);
  const labels = useLabels().offcanvas;

  const overlayRef = useOverlay({ open, onClose, modal });
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
    const available = max > 0 ? max : window.innerHeight;
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
      onClose?.();
    },
    canDragBody: () => {
      if (zone.current === "head" || !atTop) return true;
      const body = bodyRef.current;
      return !body || body.scrollHeight <= body.clientHeight;
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
      onClose?.();
    },
  });
  const phase = bottom ? sheetPhase : swipe.phase;

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
      onPointerMove={chain(sideHandlers?.onPointerMove, onPointerMove)}
      onPointerUp={chain(sideHandlers?.onPointerUp, onPointerUp)}
      onPointerCancel={chain(sideHandlers?.onPointerCancel, onPointerCancel)}
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
            <span id={titleId} className="ol-offcanvas__title ol-label">
              {title}
            </span>
          )}
          {showClose && <CloseButton onClick={onClose} data-autofocus={modal ? "" : undefined} />}
        </div>
      )}
      <div
        ref={bodyRef}
        id={bodyId}
        className="ol-offcanvas__body"
        {...(draggable ? sheet.bodyProps : null)}
        onPointerDownCapture={() => {
          zone.current = "body";
        }}
      >
        {children}
      </div>
      {snapping && (
        <VisuallyHidden role="status" className="ol-offcanvas__status">
          {status}
        </VisuallyHidden>
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
            className="ol-scrim ol-scrim--edge"
            data-state={motionState}
            onPointerDown={(event) => {
              pressedScrim.current = event.target === event.currentTarget;
            }}
            onClick={(event) => {
              const started = pressedScrim.current;
              pressedScrim.current = false;
              if (!open || !closeOnScrim || !started) return;
              if (event.target === event.currentTarget) onClose?.();
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
