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
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { pad } from "../../utils/pad";
import { CloseButton } from "../CloseButton";
import { Portal } from "../Portal";

export type ModalSize = "s" | "m" | "l" | "full";

export interface ModalOwnProps {
  /**
   * Whether the dialog is shown. When it turns `false` the dialog rolls back up, inert, and
   * unmounts once the motion has finished; nothing renders after that.
   */
  open: boolean;
  /** Called on Escape, on the close button and on a scrim click. Without it the close button is hidden. */
  onClose?: () => void;
  /**
   * Show the "×" close button in the head. With `false` there is no button even when `onClose`
   * is set; Escape (and the scrim, see `closeOnScrim`) still call `onClose`. Give the dialog
   * another way out, such as a Cancel button in the footer.
   * @default true
   */
  closeButton?: boolean;
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
  /**
   * Called once the roll-up has finished and the dialog has unmounted (at once with reduced
   * motion). Use it to open the next dialog without two scrims overlapping.
   */
  onExited?: () => void;
  /** Extra class names on the dialog element. */
  className?: string;
  /** Dialog body. */
  children?: ReactNode;
}

export type ModalProps = ModalOwnProps & Omit<ComponentPropsWithoutRef<"div">, keyof ModalOwnProps>;

/**
 * A centred dialog over the scrim. It renders in a portal, traps focus, closes on Escape, makes
 * the rest of the page inert and locks its scroll. It unrolls downwards on open (kakejiku) and
 * rolls back up on close; during the exit it is inert and focus is already back on the opener.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    open,
    onClose,
    closeButton = true,
    title,
    index,
    size = "m",
    footer,
    closeOnScrim = true,
    onExited,
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
  // Destructured: the React Compiler would treat the whole object as a ref.
  const { mounted, state, setElement } = usePresence<HTMLDivElement>(
    open,
    onExited ? { onExited } : {},
  );
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      overlayRef(node);
      setElement(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [overlayRef, setElement, ref],
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

  const hasFooter = footer != null && footer !== false;
  const escapeOnly = !closeButton && !closeOnScrim && !hasFooter;
  useEffect(() => {
    if (open && escapeOnly) {
      devWarn(
        "Modal",
        "only Escape can close this dialog. Keep `closeButton`, allow `closeOnScrim` or put an action in `footer`.",
      );
    }
  }, [open, escapeOnly]);

  if (!mounted) return null;

  const showClose = closeButton && onClose !== undefined;
  const hasHead = hasTitle || index != null || showClose;
  // `closed` never renders (the presence unmounts first); keep the exit state until then.
  const motionState = state === "open" ? "open" : "closing";

  return (
    <>
      {/* Marks where the modal was rendered so the portal can keep that theme and language. */}
      <span ref={anchor} hidden />
      <Portal anchor={anchor}>
        {/* The scrim is a pointer-only convenience; Escape and the close button are the keyboard paths. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          className="ol-scrim"
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={hasTitle && !userNamed ? titleId : undefined}
            tabIndex={-1}
            {...rest}
            // The motion classes read it, so it is not overridable.
            data-state={motionState}
            ref={setRef}
            className={cx(
              "ol-modal",
              "ol-kakejiku",
              size !== "m" && `ol-modal--${size}`,
              className,
            )}
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
                {showClose && <CloseButton onClick={onClose} />}
              </div>
            )}
            <div className="ol-modal__body">{children}</div>
            {hasFooter && <div className="ol-modal__foot">{footer}</div>}
          </div>
        </div>
      </Portal>
    </>
  );
});
