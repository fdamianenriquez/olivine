import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { CloseButton } from "../CloseButton";

export type AlertTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * Status of the message. Colours the frame and the word tag; the text stays
   * ink. `danger` and `warning` are announced assertively (`role="alert"`),
   * the rest politely (`role="status"`).
   * @default "neutral"
   */
  tone?: AlertTone;
  /** Heading line, set in the serif display voice. */
  title?: ReactNode;
  /** Replaces the localised word tag (Info, Done, Note, Error, Memo). */
  tag?: ReactNode;
  /** Shows a dismiss button and calls this when it is pressed. */
  onClose?: () => void;
  /** Extra content under the text, usually a small button or link. */
  action?: ReactNode;
}

/** An inline message: frame and word tag carry the status colour, text stays ink. */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { tone = "neutral", title, tag, onClose, action, className, children, ...rest },
  ref,
) {
  const t = useLabels();
  const assertive = tone === "danger" || tone === "warning";
  return (
    <div
      ref={ref}
      role={assertive ? "alert" : "status"}
      className={cx("ol-alert", `ol-alert--${tone}`, className)}
      data-tone={tone}
      {...rest}
    >
      <span className="ol-alert__tag">
        <span>{tag ?? t.tags[tone]}</span>
      </span>
      <div className="ol-alert__body">
        {title ? <p className="ol-alert__title">{title}</p> : null}
        {children ? <div className="ol-alert__text">{children}</div> : null}
        {action ? <div className="ol-alert__action">{action}</div> : null}
      </div>
      {onClose ? <CloseButton onClick={onClose} label={t.dismiss} /> : <span />}
    </div>
  );
});
