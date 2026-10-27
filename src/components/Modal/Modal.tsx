import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";

import { useOverlay } from "../../hooks/useOverlay";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { pad } from "../../utils/pad";
import { Portal } from "../../utils/Portal";
import { CloseButton } from "../CloseButton";

export type ModalSize = "s" | "m" | "l" | "full";

export interface ModalOwnProps {
  /** Whether the dialog is shown. Nothing renders while it is `false`. */
  open: boolean;
  /** Called on Escape, on the close button and on a scrim click. Without it the close button is hidden. */
  onClose?: () => void;
  /** Heading of the dialog. It also names the dialog for assistive tech. */
  title?: ReactNode;
  /** Eyebrow above the title. A number is zero-padded ("3" → "03"); a string is shown as is. */
  index?: number | string;
  /**
   * Width of the dialog; `full` fills the viewport.
   * @default "m"
   */
  size?: ModalSize;
  /** Footer content. Actions go on the right; the primary one is the rightmost. */
  footer?: ReactNode;
  /**
   * Close when the scrim is clicked. A drag that starts inside the dialog and ends on the scrim
   * does not close it.
   * @default true
   */
  closeOnScrim?: boolean;
  /** Extra class names on the dialog element. */
  className?: string;
  /** Dialog body. */
  children?: ReactNode;
}

export type ModalProps = ModalOwnProps & Omit<ComponentPropsWithoutRef<"div">, keyof ModalOwnProps>;

/**
 * A centred dialog over the scrim. It renders in a portal, traps focus, closes on Escape, makes
 * the rest of the page inert and locks its scroll.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    open,
    onClose,
    title,
    index,
    size = "m",
    footer,
    closeOnScrim = true,
    className,
    children,
    ...rest
  },
  ref,
) {
  const titleId = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const pressedScrim = useRef(false);
  const overlayRef = useOverlay({ open, onClose });
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      overlayRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [overlayRef, ref],
  );

  const hasTitle = title != null && title !== false && title !== "";
  const userNamed = rest["aria-label"] != null || rest["aria-labelledby"] != null;
  const unnamed = !hasTitle && !userNamed;
  useEffect(() => {
    if (open && unnamed) {
      devWarn(
        "Modal",
        "the dialog has no accessible name. Pass `title`, `aria-label` or `aria-labelledby`.",
      );
    }
  }, [open, unnamed]);

  if (!open) return null;

  const hasHead = hasTitle || index != null || onClose !== undefined;

  return (
    <>
      {/* Marks where the modal was rendered so the portal can keep that theme and language. */}
      <span ref={anchor} hidden />
      <Portal anchor={anchor}>
        {/* The scrim is a pointer-only convenience; Escape and the close button are the keyboard paths. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          className="ol-scrim"
          onPointerDown={(event) => {
            pressedScrim.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            const started = pressedScrim.current;
            pressedScrim.current = false;
            if (closeOnScrim && started && event.target === event.currentTarget) onClose?.();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={hasTitle && !userNamed ? titleId : undefined}
            tabIndex={-1}
            data-state="open"
            {...rest}
            ref={setRef}
            className={cx("ol-modal", size !== "m" && `ol-modal--${size}`, className)}
          >
            {hasHead && (
              <div className="ol-modal__head">
                <div>
                  {index != null && (
                    <span className="ol-modal__index ol-label">
                      {typeof index === "number" ? pad(index) : index}
                    </span>
                  )}
                  {hasTitle && (
                    <h2 id={titleId} className="ol-modal__title">
                      {title}
                    </h2>
                  )}
                </div>
                {onClose && <CloseButton onClick={onClose} />}
              </div>
            )}
            <div className="ol-modal__body">{children}</div>
            {footer != null && footer !== false && <div className="ol-modal__foot">{footer}</div>}
          </div>
        </div>
      </Portal>
    </>
  );
});
