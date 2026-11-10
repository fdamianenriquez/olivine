import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Button } from "../Button";
import { Modal } from "../Modal";

export type AlertDialogTone = "neutral" | "danger";

/** Why the dialog asks to close: the confirm action finished, Cancel was pressed, or Escape. */
export type AlertDialogCloseReason = "confirm" | "cancel" | "escape";

export interface AlertDialogOwnProps {
  /** Whether the dialog is shown. The dialog never closes itself: set it to `false` in `onClose`. */
  open: boolean;
  /** The question the dialog asks ("Delete 3 files?"). It names the dialog. */
  title: ReactNode;
  /** The message: a sentence or two of plain text. It describes the dialog. */
  children?: ReactNode;
  /**
   * `danger` adds the localised "Caution" word and uses the danger confirm button. Use it for
   * actions that destroy or cannot be undone.
   * @default "neutral"
   */
  tone?: AlertDialogTone;
  /** Label of the confirm action; name the action ("Delete", "Send"). Defaults to the locale's "Confirm". */
  confirmLabel?: ReactNode;
  /** Label of the cancel action. Defaults to the locale's "Cancel". */
  cancelLabel?: ReactNode;
  /**
   * Runs on confirm. When it returns a promise the dialog is pending until it settles: confirm
   * shows its loading state, Cancel and Escape do nothing. Once it resolves, `onClose("confirm")`
   * is called. If it rejects, the dialog stays open, focus returns to confirm and the error is
   * reported as an uncaught error; catch it here to show a message instead.
   */
  onConfirm?: () => unknown;
  /** Called with the reason the dialog should close. Set `open` to `false` here. */
  onClose: (reason: AlertDialogCloseReason) => void;
  /**
   * Which action has focus when the dialog opens. Keep the safe `cancel` unless the
   * confirmation is harmless.
   * @default "cancel"
   */
  initialFocus?: "cancel" | "confirm";
  /**
   * Pending state for work run outside `onConfirm`. When set, it overrides the state driven by
   * the promise `onConfirm` returns.
   */
  pending?: boolean;
  /**
   * Width of the dialog.
   * @default "s"
   */
  size?: "s" | "m";
  /** Extra class names on the dialog element. */
  className?: string;
}

export type AlertDialogProps = AlertDialogOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof AlertDialogOwnProps | "role">;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** Surfaces an error without throwing from a promise callback (no unhandled rejection). */
function report(error: unknown): void {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(error);
  } else {
    setTimeout(() => {
      throw error;
    });
  }
}

/**
 * A modal confirmation that needs an answer. It is a `Modal` announced as `alertdialog`, with
 * no close button and no scrim dismissal: Cancel and Escape are the ways out, the safe action
 * has focus, and the confirm action may be asynchronous.
 */
export const AlertDialog = forwardRef<HTMLDivElement, AlertDialogProps>(function AlertDialog(
  {
    open,
    title,
    children,
    tone = "neutral",
    confirmLabel,
    cancelLabel,
    onConfirm,
    onClose,
    initialFocus = "cancel",
    pending,
    size = "s",
    className,
    ...rest
  },
  ref,
) {
  const labels = useLabels();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Synchronous guard: a second click before the re-render must not run onConfirm again.
  const running = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const busy = pending ?? waiting;
  const wasBusy = useRef(busy);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      dialogRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const dangerUnnamed = tone === "danger" && confirmLabel === undefined;
  useEffect(() => {
    if (open && dangerUnnamed) {
      devWarn(
        "AlertDialog",
        "a danger dialog needs a `confirmLabel` that names the action (Delete, Remove…).",
      );
    }
  }, [open, dangerUnnamed]);

  // A disabled button drops focus to the page; keep it on the dialog while pending, and hand it
  // back to the confirm action when the dialog stays open afterwards (e.g. a rejected confirm).
  useEffect(() => {
    const dialog = dialogRef.current;
    const before = wasBusy.current;
    wasBusy.current = busy;
    if (!open || !dialog) return;
    const active = document.activeElement;
    if (busy && !before) {
      if (
        active === null ||
        active === document.body ||
        (dialog.contains(active) && active.matches(":disabled"))
      ) {
        dialog.focus({ preventScroll: true });
      }
    } else if (!busy && before && active === dialog) {
      confirmRef.current?.focus({ preventScroll: true });
    }
  }, [busy, open]);

  const confirm = () => {
    if (running.current || busy) return;
    const result = onConfirm?.();
    if (!isThenable(result)) {
      onClose("confirm");
      return;
    }
    running.current = true;
    setWaiting(true);
    result.then(
      () => {
        running.current = false;
        setWaiting(false);
        closeRef.current("confirm");
      },
      (error: unknown) => {
        running.current = false;
        setWaiting(false);
        report(error);
      },
    );
  };

  const describedBy = rest["aria-describedby"] ?? descId;

  return (
    <Modal
      {...rest}
      ref={setRef}
      role="alertdialog"
      aria-describedby={describedBy}
      open={open}
      title={title}
      size={size}
      closeButton={false}
      closeOnScrim={false}
      onClose={() => {
        if (running.current || busy) return;
        onClose("escape");
      }}
      className={cx("ol-alertdialog", tone === "danger" && "ol-alertdialog--danger", className)}
      footer={
        <>
          <Button
            disabled={busy}
            data-autofocus={initialFocus === "cancel" ? "" : undefined}
            onClick={() => {
              if (running.current || busy) return;
              onClose("cancel");
            }}
          >
            {cancelLabel ?? labels.alertDialog.cancel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === "danger" ? "danger" : "accent"}
            loading={busy}
            data-autofocus={initialFocus === "confirm" ? "" : undefined}
            onClick={confirm}
          >
            {confirmLabel ?? labels.alertDialog.confirm}
          </Button>
        </>
      }
    >
      <div id={descId} className="ol-alertdialog__desc">
        {tone === "danger" && (
          <span className="ol-alertdialog__tag">
            <span>{labels.alertDialog.caution}</span>
          </span>
        )}
        <div className="ol-alertdialog__text">{children}</div>
      </div>
      {/* Present before it fills, so the change is announced. The dialog itself is never
          aria-busy: that could hold this announcement back until the work is done. */}
      <span className="ol-sr" role="status">
        {busy ? labels.loading : null}
      </span>
    </Modal>
  );
});
