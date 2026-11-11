import {
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { type SwipeDirection, useSwipeDismiss } from "../../hooks/useSwipeDismiss";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { isImeKey } from "../../utils/ime";
import { CloseButton } from "../CloseButton";
import { Seal } from "../Seal";
import { ToastItemContext } from "./ToastItemContext";
import { ToastPauseContext } from "./ToastPauseContext";
import { ToastStackContext } from "./ToastStackContext";

export type ToastTone = "accent" | "info" | "success" | "warning" | "danger" | "neutral";

/** Why a toast closed. */
export type ToastCloseReason = "timeout" | "dismiss" | "action" | "escape" | "swipe" | "api";

/** How a toast is announced: `polite` by the stack, `assertive` as an alert. */
export type ToastPriority = "polite" | "assertive";

/** Controls a toast can hold. */
const FOCUSABLE = "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";

/** Shortest countdown that leaves time to reach an action. */
const ACTION_MIN_DURATION = 10000;

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Heading of the notice. */
  title?: ReactNode;
  /** Meta line shown beside the tone dot. Defaults to the localised "Now". */
  meta?: ReactNode;
  /** Colour of the dot before the meta line. The meta text always accompanies it. */
  tone?: ToastTone;
  /**
   * Milliseconds before the toast dismisses itself by calling `onClose("timeout")`. Needs
   * `onClose`. The countdown pauses while the pointer (mouse or pen) is over the toast, focus is
   * inside it, it is being swiped, or (inside a stack) anything in the stack is hovered, focused
   * or pressed, or the page is hidden. Resuming keeps the remaining time.
   */
  duration?: number;
  /**
   * Called with the reason when the toast closes: the Dismiss button (`"dismiss"`), the timer
   * (`"timeout"`), Escape inside the toast (`"escape"`) or a swipe (`"swipe"`). Adds the Dismiss
   * button. `ToastProvider` also reports `"action"` and `"api"`.
   */
  onClose?: (reason: ToastCloseReason) => void;
  /**
   * One follow-up, usually a `Button size="s" variant="outline"` ("Undo"). Rendered after the
   * head so Tab reaches Dismiss first. Give a timed toast with an action at least 10 s.
   */
  action?: ReactNode;
  /**
   * A hanko seal beside the message: one to four kanji (drawn as a decorative olive `Seal`), or
   * your own node. Plays the seal drop after the toast settles. Success confirmations only.
   */
  seal?: ReactNode;
  /**
   * `assertive` makes the toast an alert, announced at once; keep it for failures the user must
   * hear now. Defaults to `assertive` for `tone="danger"`, `polite` otherwise.
   */
  priority?: ToastPriority;
  /**
   * Direction a touch or pen swipe dismisses toward (needs `onClose`). Defaults to the stack's
   * edge inside a `ToastStack`, and off outside one. `false` turns it off.
   */
  swipe?: SwipeDirection | false;
  /** Body text under the title. */
  children?: ReactNode;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function isEmpty(node: ReactNode) {
  return node === undefined || node === null || node === "" || node === false;
}

/**
 * A brief raised notice with a meta line, an optional action and seal, and an optional draining
 * timer bar. It carries no live region of its own (an assertive toast is an alert); place it
 * inside a ToastStack, which announces it.
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  {
    title,
    meta,
    tone = "accent",
    duration,
    onClose,
    action,
    seal,
    priority,
    swipe,
    className,
    children,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onFocus,
    onBlur,
    onKeyDown,
    style,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const stack = useContext(ToastStackContext);
  const item = useContext(ToastItemContext);
  const stackPaused = useContext(ToastPauseContext);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const closing = item?.state === "closing";
  const version = item?.version ?? 0;
  const paused = stackPaused || hovered || focused || swiping || closing;

  // Always call the latest onClose without restarting the countdown.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const timed = Boolean(duration && duration > 0 && onClose);
  const remaining = useRef(duration ?? 0);

  // A new duration, or the toast shown again, restarts the countdown from the full time.
  useEffect(() => {
    remaining.current = duration ?? 0;
  }, [duration, version]);

  useEffect(() => {
    if (!timed || paused) return undefined;
    const startedAt = Date.now();
    const id = setTimeout(() => onCloseRef.current?.("timeout"), remaining.current);
    return () => {
      clearTimeout(id);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [timed, paused, duration, version]);

  const hasAction = !isEmpty(action);
  const short = hasAction && timed && (duration ?? 0) < ACTION_MIN_DURATION;
  useEffect(() => {
    if (short) {
      devWarn("Toast", "a toast with an action needs a duration of at least 10000 ms, or none.");
    }
  }, [short]);

  const direction = onClose ? (swipe ?? stack.swipe) : false;
  const { phase, handlers } = useSwipeDismiss<HTMLDivElement>({
    direction,
    onDismiss: () => onCloseRef.current?.("swipe"),
    onSwipingChange: setSwiping,
  });

  const sealOffTone = !isEmpty(seal) && tone !== "success";
  useEffect(() => {
    if (sealOffTone) devWarn("Toast", 'a seal is for success confirmations: use `tone="success"`.');
  }, [sealOffTone]);

  const [root, setRootNode] = useState<HTMLDivElement | null>(null);
  const setElement = item?.setElement;
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      assignRef(ref, node);
      setElement?.(node);
      setRootNode(node);
    },
    [ref, setElement],
  );

  // A focused control removed while the toast stays open (an action taken away by an update)
  // fires no blur: stop pausing, and give focus a place to go instead of <body>.
  const { returnFocus } = stack;
  useEffect(() => {
    if (!root || !focused || typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(() => {
      if (root.contains(document.activeElement)) return;
      setFocused(false);
      const active = document.activeElement;
      if (active && active !== document.body) return;
      const own = root.querySelector<HTMLElement>(FOCUSABLE);
      if (own) own.focus();
      else returnFocus(root);
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [root, focused, returnFocus]);

  // Hover pauses only for a real hover: a tap emulates enter and never leaves.
  const hoverable = (e: PointerEvent) => e.pointerType === "mouse" || e.pointerType === "pen";

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.key !== "Escape" || e.defaultPrevented || isImeKey(e) || !onClose) return;
    // Defaulted, so an open Modal does not close as well.
    e.preventDefault();
    onClose("escape");
  };

  const resolvedPriority = priority ?? (tone === "danger" ? "assertive" : "polite");
  const hint = hasAction && stack.hotkey ? t.toastActionHint(stack.hotkey) : null;
  const sealNode =
    typeof seal === "string" ? (
      <Seal variant="hakubun" ink="olivo" decorative press>
        {seal}
      </Seal>
    ) : (
      seal
    );
  const hasSeal = !isEmpty(seal);
  const axis = direction === "left" || direction === "right" ? "x" : direction ? "y" : null;

  return (
    // Pointer, focus and key handlers pause, swipe and close; the toast is not itself a control.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={setRoot}
      role={resolvedPriority === "assertive" ? "alert" : undefined}
      className={cx("ol-toast", `ol-toast--${tone}`, axis && `ol-toast--swipe-${axis}`, className)}
      data-state={closing ? "closing" : paused && timed ? "paused" : "active"}
      data-swipe={phase === "idle" ? undefined : phase}
      style={
        timed ? { ...style, ["--ol-toast-duration" as string]: `${String(duration)}ms` } : style
      }
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (hoverable(e)) setHovered(true);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        setHovered(false);
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        handlers.onPointerDown(e);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        handlers.onPointerMove(e);
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        handlers.onPointerUp(e);
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        handlers.onPointerCancel(e);
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        setFocused(true);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {/* Body first in the DOM so a live region reads the message before the chrome. */}
      {(!isEmpty(title) || !isEmpty(children) || hasSeal || hint) && (
        <div className={cx("ol-toast__body", hasSeal && "ol-toast__body--seal")}>
          {!isEmpty(title) && <p className="ol-toast__title">{title}</p>}
          {!isEmpty(children) && <p className="ol-toast__text">{children}</p>}
          {hint && <span className="ol-sr">{hint}</span>}
          {hasSeal && <span className="ol-toast__seal">{sealNode}</span>}
        </div>
      )}
      <div className="ol-toast__head">
        <span className="ol-toast__meta">{isEmpty(meta) ? t.now : meta}</span>
        {onClose && (
          <CloseButton
            onClick={() => {
              onClose("dismiss");
            }}
            label={t.dismiss}
          />
        )}
      </div>
      {/* After the head in the DOM, so Tab reaches Dismiss before the action, as drawn. */}
      {hasAction && <div className="ol-toast__action">{action}</div>}
      {timed && <div key={version} className="ol-toast__timer" aria-hidden="true" />}
    </div>
  );
});
