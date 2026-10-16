import { forwardRef, useEffect, useId, useRef, useState } from "react";

import { useField, useFieldControl } from "../../hooks/useFieldControl";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";

/** A file that was refused, with the rule it broke. */
export interface FileRejection {
  file: File;
  reason: "size" | "type";
}

function matchesAccept(file: File, accept: string): boolean {
  const entries = accept
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (entries.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return entries.some((entry) => {
    if (entry === "*" || entry === "*/*") return true;
    if (entry.startsWith(".")) return name.endsWith(entry);
    if (entry.endsWith("/*")) return type.startsWith(entry.slice(0, -1));
    return type === entry;
  });
}

function sortFiles(
  files: File[],
  accept: string | undefined,
  maxSize: number | undefined,
): { accepted: File[]; rejected: FileRejection[] } {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];
  for (const file of files) {
    if (maxSize !== undefined && file.size > maxSize) rejected.push({ file, reason: "size" });
    else if (accept !== undefined && !matchesAccept(file, accept))
      rejected.push({ file, reason: "type" });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

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
  /** Comma-separated types, as on a native file input: MIME types (`image/png`), wildcards (`image/*`) and extensions (`.pdf`), matched case-insensitively. It steers the picker and, together with `onReject`, filters the chosen files. */
  accept?: string;
  /** Largest allowed file size in bytes. Larger files are rejected with reason `"size"`. */
  maxSize?: number;
  /**
   * Called with the native change event, as before. The native `FileList` cannot be filtered, so
   * `event.target.files` still contains every chosen file, rejected ones included; read the
   * accepted files from `onFilesChange` instead.
   */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Called with only the accepted files after every change or drop (an empty array when the selection is cleared). */
  onFilesChange?: (accepted: File[]) => void;
  /**
   * Called when some chosen files break `maxSize` or `accept`, once per selection and only when
   * there are rejections. When every chosen file is rejected the native input is cleared right
   * after `onChange`, so choosing the same file again fires `change` again and a native form
   * submits no rejected file. The component renders no error text: show a message yourself, for
   * example through `Field error`.
   */
  onReject?: (rejections: FileRejection[]) => void;
  /** Extra class names on the drop zone. */
  className?: string;
}

/**
 * A dashed drop zone around a native file input; it lists the chosen file names in mono.
 * The input itself covers the zone, so it stays the focusable, clickable control.
 * Files that exceed `maxSize` or miss the `accept` list are left out of the names list and
 * reported through `onReject`; the component shows no error text, so pair it with `Field error`.
 */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  {
    label,
    hint,
    browseLabel,
    multiple,
    accept,
    maxSize,
    onChange,
    onFilesChange,
    onReject,
    className,
    ...props
  },
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
          const { accepted, rejected } = sortFiles(
            Array.from(e.target.files ?? []),
            accept,
            maxSize,
          );
          setNames(accepted.map((f) => f.name));
          onChange?.(e);
          onFilesChange?.(accepted);
          if (rejected.length > 0) onReject?.(rejected);
          // Nothing usable was chosen: clear the native selection so the same file can be
          // picked again (firing change and onReject again) and a native form submits nothing.
          if (accepted.length === 0 && rejected.length > 0) e.target.value = "";
        }}
      />
    </div>
  );
});
