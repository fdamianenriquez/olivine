import {
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { cx } from "../../utils/cx";
import { ToastPauseContext } from "../Toast/ToastPauseContext";

export type ToastStackPosition = "br" | "tr" | "bl" | "tc" | "static";

export interface ToastStackProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Where the stack is pinned, with a `space-6` margin: top-right, bottom-right, bottom-left,
   * top-centre, or `static` to sit in the page flow (useful in documentation). Top-right by
   * default: Fab owns the bottom-end corner.
   * @default "tr"
   */
  position?: ToastStackPosition;
  /** The toasts. Every countdown pauses while the pointer or focus is in the stack, or the page is hidden. */
  children?: ReactNode;
}

/**
 * Pins toasts to a screen corner and stacks them. It owns the single polite live region, and
 * renders it even when empty so that screen readers announce the toasts inserted later.
 * While the pointer is over the stack, focus is inside it or the page is hidden, every toast
 * holds its auto-dismiss timer.
 */
export const ToastStack = forwardRef<HTMLDivElement, ToastStackProps>(function ToastStack(
  { position = "tr", className, children, onMouseEnter, onMouseLeave, onFocus, onBlur, ...rest },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => {
      setHidden(document.hidden);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const paused = hovered || focused || hidden;

  return (
    // Pointer and focus handlers only pause the countdowns; the stack is not itself interactive.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={ref}
      className={cx("ol-toaststack", `ol-toaststack--${position}`, className)}
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions text"
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
        onMouseEnter?.(e);
        setHovered(true);
      }}
      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
        onMouseLeave?.(e);
        setHovered(false);
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        setFocused(true);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      {...rest}
    >
      <ToastPauseContext.Provider value={paused}>{children}</ToastPauseContext.Provider>
    </div>
  );
});
