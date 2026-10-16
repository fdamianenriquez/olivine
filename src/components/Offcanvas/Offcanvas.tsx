import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useId,
  useRef,
} from "react";

import { useOverlay } from "../../hooks/useOverlay";
import { cx } from "../../utils/cx";
import { Portal } from "../../utils/Portal";
import { CloseButton } from "../CloseButton";

export type OffcanvasPlacement = "end" | "start" | "bottom";

export interface OffcanvasOwnProps {
  /** Whether the panel is shown. Nothing renders while it is `false`. */
  open: boolean;
  /** Called on Escape, on the close button and on a scrim click. Without it the close button is hidden. */
  onClose?: () => void;
  /** Heading of the panel. It also names the dialog for assistive tech. */
  title?: ReactNode;
  /**
   * Edge the panel slides in from. `start` and `end` follow the writing direction.
   * @default "end"
   */
  placement?: OffcanvasPlacement;
  /** Extra class names on the panel element. */
  className?: string;
  /** Panel body. */
  children?: ReactNode;
}

export type OffcanvasProps = OffcanvasOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof OffcanvasOwnProps>;

/**
 * A panel that slides in from an edge for navigation, filters or a cart. It renders in a portal,
 * traps focus, closes on Escape or a scrim click, makes the rest of the page inert and locks its scroll.
 */
export const Offcanvas = forwardRef<HTMLDivElement, OffcanvasProps>(function Offcanvas(
  { open, onClose, title, placement = "end", className, children, ...rest },
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

  if (!open) return null;

  const hasTitle = title != null && title !== false && title !== "";
  const userNamed = rest["aria-label"] != null || rest["aria-labelledby"] != null;
  const hasHead = hasTitle || onClose !== undefined;

  return (
    <>
      {/* Marks where the panel was rendered so the portal can keep that theme and language. */}
      <span ref={anchor} hidden />
      <Portal anchor={anchor}>
        {/* The scrim is a pointer-only convenience; Escape and the close button are the keyboard paths. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          className="ol-scrim ol-scrim--edge"
          onPointerDown={(event) => {
            pressedScrim.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            const started = pressedScrim.current;
            pressedScrim.current = false;
            if (started && event.target === event.currentTarget) onClose?.();
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
            className={cx("ol-offcanvas", `ol-offcanvas--${placement}`, className)}
          >
            {hasHead && (
              <div className="ol-offcanvas__head">
                {hasTitle && (
                  <span id={titleId} className="ol-offcanvas__title ol-label">
                    {title}
                  </span>
                )}
                {onClose && <CloseButton onClick={onClose} />}
              </div>
            )}
            <div className="ol-offcanvas__body">{children}</div>
          </div>
        </div>
      </Portal>
    </>
  );
});
