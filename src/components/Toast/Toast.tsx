import {
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { CloseButton } from "../CloseButton";

export type ToastTone = "accent" | "info" | "success" | "warning" | "danger" | "neutral";

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Heading of the notice, set in the serif display face. */
  title?: ReactNode;
  /** Mono meta line shown beside the tone dot. Defaults to the localised "Now". */
  meta?: ReactNode;
  /** Colour of the dot before the meta line. The meta text always accompanies it. */
  tone?: ToastTone;
  /**
   * Milliseconds before the toast dismisses itself by calling `onClose`. Needs `onClose`.
   * The countdown pauses while the pointer is over the toast or focus is inside it.
   */
  duration?: number;
  /** Called by the dismiss button and when `duration` elapses. Adds the dismiss button. */
  onClose?: () => void;
  /** Body text under the title. */
  children?: ReactNode;
}

/**
 * A brief raised notice with a mono meta line and an optional draining timer bar.
 * It carries no live region; place it inside a ToastStack, which announces it.
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  {
    title,
    meta,
    tone = "accent",
    duration,
    onClose,
    className,
    children,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    style,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  // Always call the latest onClose without restarting the countdown.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const timed = Boolean(duration && duration > 0 && onClose);
  const remaining = useRef(duration ?? 0);

  // A new duration restarts the countdown from the full time.
  useEffect(() => {
    remaining.current = duration ?? 0;
  }, [duration]);

  useEffect(() => {
    if (!timed || paused) return undefined;
    const startedAt = Date.now();
    const id = setTimeout(() => onCloseRef.current?.(), remaining.current);
    return () => {
      clearTimeout(id);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [timed, paused, duration]);

  const handleMouseEnter = (e: MouseEvent<HTMLDivElement>) => {
    onMouseEnter?.(e);
    setHovered(true);
  };
  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e);
    setHovered(false);
  };
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    onFocus?.(e);
    setFocused(true);
  };
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    onBlur?.(e);
    if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
  };

  return (
    // Pointer and focus handlers only pause the countdown; the toast is not itself interactive.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={ref}
      className={cx("ol-toast", `ol-toast--${tone}`, className)}
      data-state={paused && timed ? "paused" : "active"}
      style={
        timed ? { ...style, ["--ol-toast-duration" as string]: `${String(duration)}ms` } : style
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...rest}
    >
      <div className="ol-toast__head">
        <span className="ol-toast__meta">
          {meta === undefined || meta === null || meta === "" || meta === false ? t.now : meta}
        </span>
        {onClose && <CloseButton onClick={onClose} label={t.dismiss} />}
      </div>
      {(Boolean(title) || Boolean(children)) && (
        <div className="ol-toast__body">
          {Boolean(title) && <p className="ol-toast__title">{title}</p>}
          {Boolean(children) && <p className="ol-toast__text">{children}</p>}
        </div>
      )}
      {timed && <div className="ol-toast__timer" aria-hidden="true" />}
    </div>
  );
});
