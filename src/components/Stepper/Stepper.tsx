import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";

export type StepperOrientation = "horizontal" | "vertical";

export interface StepperStep {
  /** Name of the step. */
  label: ReactNode;
  /** One line under the label. Hidden on phones. */
  description?: ReactNode;
  /**
   * Marks the step as needing attention. Text is shown under the label and read with the step;
   * `true` marks the step without a reason.
   */
  error?: ReactNode;
}

/** The words a stepper writes and announces. Defaults come from the locale. */
export interface StepperLabels {
  /** "Step" in "Step 03 of 06" and in each step's name. */
  step: string;
  /** "of" in "Step 03 of 06". */
  of: string;
  /** Read after the name of a completed step. */
  completed: string;
  /** Read before the reason of a step that needs attention. */
  error: string;
}

export interface StepperProps extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  /** The steps of the flow, in order. */
  steps: readonly StepperStep[];
  /** Index of the current step, 0-based. @default 0 */
  current?: number;
  /** Indexes of the completed steps. Defaults to every step before `current`. */
  completed?: readonly number[];
  /** Called with the index of the step the user picks. Omit it for a read-only stepper. */
  onStepChange?: (index: number) => void;
  /**
   * Only completed steps, the current one and the step after a completed one can be picked.
   * Set `false` to let the user jump to any step.
   * @default true
   */
  linear?: boolean;
  /**
   * `horizontal` is a ruled timeline; `vertical` hangs the steps on a hairline spine and opens
   * the current step's panel under it.
   * @default "horizontal"
   */
  orientation?: StepperOrientation;
  /** Vertical only: the content of a step, shown under it while it is the current one. */
  renderPanel?: (index: number) => ReactNode;
  /** Accessible name of the navigation landmark, e.g. "Build your guitar". */
  label?: string;
  /** Overrides for the built-in words. */
  labels?: Partial<StepperLabels>;
}

type StepState = "error" | "current" | "done" | "todo";

/**
 * The steps of a flow whose order is real: a configurator, a reservation. A `nav` with an
 * ordered list; the current step carries `aria-current="step"` and a live "Step 03 of 06" line.
 * Steps the user can pick are buttons; the others are plain text.
 */
export const Stepper = forwardRef<HTMLElement, StepperProps>(function Stepper(
  {
    steps,
    current = 0,
    completed,
    onStepChange,
    linear = true,
    orientation = "horizontal",
    renderPanel,
    label,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const words = useLabels().stepper;
  const t: StepperLabels = { ...words, ...labels };
  const total = steps.length;
  const position = Math.min(Math.max(0, Math.floor(current)), Math.max(0, total - 1));
  const done = new Set(completed ?? steps.map((_, i) => i).filter((i) => i < position));
  const canPick = (i: number) =>
    onStepChange !== undefined && (!linear || done.has(i) || i === position || done.has(i - 1));

  return (
    <nav
      aria-label={label}
      {...rest}
      ref={ref}
      className={cx("ol-stepper", `ol-stepper--${orientation}`, className)}
    >
      <p className="ol-stepper__count" aria-live="polite">
        {t.step} <b>{pad(position + 1)}</b> {t.of} {pad(total)}
      </p>
      <ol className="ol-stepper__list">
        {steps.map((step, i) => {
          const state: StepState = step.error
            ? "error"
            : i === position
              ? "current"
              : done.has(i)
                ? "done"
                : "todo";
          const reason = step.error === true ? null : step.error;
          const content = (
            <>
              <span className="ol-stepper__num">
                <span className="ol-sr">{t.step}</span> {pad(i + 1)}
                <span className="ol-sr">:</span>{" "}
              </span>
              <span className="ol-stepper__text">
                <span className="ol-stepper__label">
                  {step.label}
                  {state === "done" && (
                    <>
                      <span className="ol-sr">,</span> <span className="ol-sr">{t.completed}</span>
                    </>
                  )}
                </span>{" "}
                {step.description ? (
                  <>
                    <span className="ol-stepper__desc">{step.description}</span>{" "}
                  </>
                ) : null}
                {state === "error" && (
                  <span className="ol-stepper__err">
                    <b aria-hidden="true">× </b>
                    <span className="ol-sr">{t.error}:</span> {reason}
                  </span>
                )}
              </span>
              <span className="ol-stepper__mark" aria-hidden="true">
                <svg viewBox="0 0 12 12" focusable="false">
                  <path
                    className="ol-stepper__check"
                    d="M1.8 6.6 4.8 9.6 10.6 2.4"
                    pathLength="1"
                  />
                </svg>
              </span>
            </>
          );
          return (
            <li
              key={i}
              className="ol-stepper__step"
              data-state={state}
              aria-current={i === position ? "step" : undefined}
            >
              {canPick(i) ? (
                <button
                  type="button"
                  className="ol-stepper__hit"
                  onClick={() => {
                    onStepChange?.(i);
                  }}
                >
                  {content}
                </button>
              ) : (
                <span className="ol-stepper__hit" data-locked={onStepChange ? "" : undefined}>
                  {content}
                </span>
              )}
              {orientation === "vertical" && i === position && renderPanel ? (
                <div className="ol-stepper__panel">{renderPanel(i)}</div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
