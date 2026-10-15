import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useEffect, useId } from "react";

import { useControllable } from "../../hooks/useControllable";
import { useFieldControl } from "../../hooks/useFieldControl";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";

interface SwitchBaseProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  /** Visible label. Clicking it toggles the switch. */
  label?: ReactNode;
  /** Whether the switch is on (controlled). */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called with the native change event; read `event.target.checked`. */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Shows the visual on/off word from the Root locale. It is hidden from assistive tech. */
  showState?: boolean;
}

/**
 * A switch needs an accessible name: pass a `label`, or `aria-label` / `aria-labelledby`.
 */
export type SwitchProps = SwitchBaseProps &
  (
    | { label: NonNullable<ReactNode>; "aria-label"?: string; "aria-labelledby"?: string }
    | { label?: ReactNode; "aria-label": string; "aria-labelledby"?: string }
    | { label?: ReactNode; "aria-label"?: string; "aria-labelledby": string }
  );

/** A square track whose knob turns into an olive dot when on. For settings that apply instantly. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, checked, defaultChecked = false, onChange, showState = true, className, ...props },
  ref,
) {
  const t = useLabels();
  const labelId = useId();
  const field = useFieldControl(props);
  const [on, setOn] = useControllable<boolean>(checked, defaultChecked);

  const unnamed = !props["aria-label"] && !props["aria-labelledby"];
  useEffect(() => {
    if (unnamed && label === "") {
      devWarn(
        "Switch",
        "`label` is empty and there is no `aria-label`; the switch has no accessible name.",
      );
    }
  }, [unnamed, label]);

  const hasLabel = label != null && label !== false && label !== "";
  const labelled = hasLabel && !props["aria-label"] && !props["aria-labelledby"];

  return (
    <label className={cx("ol-switch", className)}>
      <input
        {...field}
        ref={ref}
        type="checkbox"
        role="switch"
        aria-labelledby={labelled ? labelId : field["aria-labelledby"]}
        checked={on}
        data-state={on ? "on" : "off"}
        onChange={(event) => {
          setOn(event.target.checked);
          onChange?.(event);
        }}
      />
      <span className="ol-switch__track" aria-hidden="true" />
      {showState && (
        <span className="ol-switch__state" aria-hidden="true">
          {on ? t.switchOn : t.switchOff}
        </span>
      )}
      {hasLabel && <span id={labelId}>{label}</span>}
    </label>
  );
});
