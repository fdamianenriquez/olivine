import { forwardRef, useEffect, useId, useRef, useState } from "react";

import { useField, useFieldControl } from "../../hooks/useFieldControl";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";

export interface FileInputProps extends Omit<
  React.ComponentPropsWithoutRef<"input">,
  "type" | "children" | "value" | "defaultValue"
> {
  /** Visual prompt shown in the zone. Defaults to the Root locale text. It names the input unless a `Field` or an `aria-label` / `aria-labelledby` does; then it is hidden from assistive technology so the accessible name is not contradicted. */
  label?: React.ReactNode;
  /** Shown in place of the "no file selected" text while nothing is chosen. */
  hint?: React.ReactNode;
  /** Text of the decorative browse chip. Defaults to the Root locale text. */
  browseLabel?: React.ReactNode;
  /** Allows choosing more than one file. */
  multiple?: boolean;
  /** Comma-separated types the picker offers, as on a native file input. Only a hint to the picker: check `file.type` and `file.size` yourself in `onChange`. */
  accept?: string;
  /** Called with the native change event; read the files from `event.target.files`. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Extra class names on the drop zone. */
  className?: string;
}

/**
 * A dashed drop zone around a native file input; it lists the chosen file names in mono.
 * The input itself covers the zone, so it stays the focusable, clickable control.
 * The component does not validate files: `accept` only steers the picker, so check type and
 * size in `onChange` when it matters.
 */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  { label, hint, browseLabel, multiple, accept, onChange, className, ...props },
  ref,
) {
  const t = useLabels();
  const field = useField();
  const labelId = useId();
  const namesId = useId();
  const [names, setNames] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  // dragenter/dragleave also fire for every child crossed; count them so only the last
  // leave clears the highlight.
  const depth = useRef(0);
  const { "aria-describedby": described, ...rest } = useFieldControl(props);

  const disabled = rest.disabled;
  useEffect(() => {
    if (disabled) {
      depth.current = 0;
      setOver(false);
    }
  }, [disabled]);

  const hasName = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;
  const named = hasName || field !== null;
  const reset = () => {
    depth.current = 0;
    setOver(false);
  };
  const dragProps = disabled
    ? {}
    : {
        onDragEnter: () => {
          depth.current += 1;
          setOver(true);
        },
        onDragLeave: () => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setOver(false);
        },
        onDrop: reset,
        onDragEnd: reset,
      };

  return (
    <div
      className={cx("ol-file", className)}
      data-state={over ? "over" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...dragProps}
    >
      <span className="ol-file__text">
        <span id={labelId} className="ol-file__label" aria-hidden={named || undefined}>
          {label ?? t.fileLabel}
        </span>
        <span id={namesId} className="ol-file__names" role="status">
          {names.length ? names.join(", ") : (hint ?? t.fileEmpty)}
        </span>
      </span>
      <span className="ol-btn ol-btn--s" aria-hidden="true">
        {browseLabel ?? t.fileBrowse}
      </span>
      <input
        ref={ref}
        type="file"
        className="ol-file__input"
        multiple={multiple}
        accept={accept}
        aria-labelledby={named ? undefined : labelId}
        aria-describedby={
          [names.length ? namesId : undefined, described].filter(Boolean).join(" ") || undefined
        }
        {...rest}
        onChange={(e) => {
          setNames(Array.from(e.target.files ?? [], (f) => f.name));
          onChange?.(e);
        }}
      />
    </div>
  );
});
