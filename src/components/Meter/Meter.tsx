import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { useLabels, useLocaleTag } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { Badge, type BadgeTone } from "../Badge";
import { type MeterState, readMeter } from "./bands";

export type { MeterState } from "./bands";

/** Words for each band, shown in the state Badge and read in `aria-valuetext`. */
export interface MeterLabels {
  good?: string;
  fair?: string;
  poor?: string;
}

export interface MeterProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The reading. Clamped to `min`–`max`; a value that is not a finite number reads as `min`. */
  value: number;
  /**
   * Lower end of the range.
   * @default 0
   */
  min?: number;
  /**
   * Upper end of the range. Raised to `min` when smaller.
   * @default 100
   */
  max?: number;
  /** Upper end of the low band. Defaults to `min`. */
  low?: number;
  /** Lower end of the high band. Defaults to `max`, never below `low`. */
  high?: number;
  /**
   * The best reading; the band that holds it is "good". Defaults to the midpoint.
   * Pass at least one of `low`, `high` or `optimum` to get bands; with none, the meter is neutral.
   */
  optimum?: number;
  /**
   * Visible label above the gauge. It also names the meter unless `aria-label` or
   * `aria-labelledby` is passed.
   */
  label?: ReactNode;
  /**
   * `bar` draws a hairline bar with an ink fill and a needle; `segments` a row of ink blocks.
   * @default "bar"
   */
  variant?: "bar" | "segments";
  /**
   * Number of blocks (`segments` only), from 1 to 20.
   * @default 10
   */
  segments?: number;
  /** @default "m" */
  size?: "s" | "m" | "l";
  /**
   * Prints the reading in the figure face.
   * @default true
   */
  showValue?: boolean;
  /**
   * Shows the band word in a Badge. Defaults to `true` when any of `low`, `high` or `optimum`
   * is set; without bands there is no word to show.
   */
  showState?: boolean;
  /** Writes the visible reading from the clamped value. Wins over `formatOptions`. */
  format?: (value: number) => ReactNode;
  /**
   * `Intl.NumberFormat` options for the reading and `aria-valuetext`. With `style: "percent"`
   * the position in the range is formatted, otherwise the value itself. Digits and symbols only.
   * @default { style: "percent", maximumFractionDigits: 0 }
   */
  formatOptions?: Intl.NumberFormatOptions;
  /** BCP 47 tag for the number format. Defaults to the nearest `Root` locale. */
  locale?: string;
  /** Replaces the value part of `aria-valuetext`, for example "12 of 16 GB". */
  valueText?: string;
  /** Band words. Default from the locale (Good, Fair, Poor). */
  labels?: MeterLabels;
  /** Accessible name when there is no visible `label`. */
  "aria-label"?: string;
  /** Id of an element that names the meter. Takes precedence over `label`. */
  "aria-labelledby"?: string;
}

const PERCENT: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 0 };
const MAX_SEGMENTS = 20;
/** Newly lit blocks print one after another for at most this many steps. */
const MAX_STAGGER = 5;
const TONE: Record<MeterState, BadgeTone> = { good: "success", fair: "warning", poor: "danger" };

/** Intl options whose output holds words, which the figure face can't set. */
function wordyFormat(options: Intl.NumberFormatOptions | undefined): boolean {
  if (!options) return false;
  return (
    options.style === "unit" ||
    options.currencyDisplay === "name" ||
    options.currencyDisplay === "code"
  );
}

const isText = (node: ReactNode): node is string | number =>
  typeof node === "string" || typeof node === "number";

/**
 * One reading inside a known range, drawn as a ruled ink gauge, with the band it falls in.
 *
 * The gauge carries `role="meter"` with `aria-valuetext` such as "72%, Fair"; the label, the
 * printed value, the state Badge and the scale sit outside it. Name it with `label`,
 * `aria-label` or `aria-labelledby`. It is read-only, not focusable and silent on change; it
 * never animates on mount. When the value rises, only the newly lit blocks print.
 */
export const Meter = forwardRef<HTMLDivElement, MeterProps>(function Meter(
  {
    value,
    min,
    max,
    low,
    high,
    optimum,
    label,
    variant = "bar",
    segments = 10,
    size = "m",
    showValue = true,
    showState,
    format,
    formatOptions,
    locale,
    valueText,
    labels: words,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...rest
  },
  ref,
) {
  const labelId = useId();
  const dictionary = useLabels();
  const tag = useLocaleTag(locale);
  const reading = readMeter(value, { min, max, low, high, optimum });
  const { state, fraction } = reading;

  const options = formatOptions ?? PERCENT;
  const formatter = useMemo(() => new Intl.NumberFormat(tag, options), [tag, options]);
  const plain = formatter.format(options.style === "percent" ? fraction : reading.value);
  const shown = format ? format(reading.value) : plain;
  const spokenValue = valueText ?? (isText(shown) ? String(shown) : plain);
  const word = state ? (words?.[state] ?? dictionary.meter[state]) : undefined;
  const valueTextFull = dictionary.meterValue(spokenValue, word);

  const hasLabel = label != null && label !== false && label !== "";
  const name = ariaLabelledBy ?? (ariaLabel || !hasLabel ? undefined : labelId);
  const withState = (showState ?? state != null) && word != null;
  const segmented = variant === "segments";
  const count = Math.min(MAX_SEGMENTS, Math.max(1, Math.floor(segments) || 1));
  const lit = Math.round(fraction * count);

  // Blocks that turn on after an update print; nothing prints on mount or when blocks go out.
  const [printed, setPrinted] = useState({ lit, from: lit });
  if (printed.lit !== lit) setPrinted({ lit, from: lit > printed.lit ? printed.lit : lit });
  const from = printed.lit === lit ? printed.from : lit;

  const ticks = [reading.lowAt, reading.highAt].filter(
    (at, i, all) => at > 0 && at < 1 && all.indexOf(at) === i,
  );
  const scaled = state != null && ticks.length > 0;

  const unnamed = !ariaLabel && !ariaLabelledBy && !hasLabel;
  const invalid = !Number.isFinite(value);
  const wordy = !format && wordyFormat(formatOptions);
  const overSegments = segmented && segments > MAX_SEGMENTS;
  const nodeWithoutText = Boolean(format) && !isText(shown) && valueText == null;
  useEffect(() => {
    if (unnamed)
      devWarn("Meter", "a meter needs a name: use label, aria-label or aria-labelledby.");
  }, [unnamed]);
  useEffect(() => {
    if (invalid) devWarn("Meter", "value is not a number; the meter reads as min.");
  }, [invalid]);
  useEffect(() => {
    if (wordy)
      devWarn(
        "Meter",
        "formatOptions must write digits and symbols only; put units in the label or valueText.",
      );
  }, [wordy]);
  useEffect(() => {
    if (overSegments) devWarn("Meter", `segments is capped at ${String(MAX_SEGMENTS)}.`);
  }, [overSegments]);
  useEffect(() => {
    if (nodeWithoutText)
      devWarn("Meter", "format returned an element; pass valueText so the reading is spoken.");
  }, [nodeWithoutText]);

  const vars = {
    "--ol-meter-n": fraction,
    ...(segmented ? { "--ol-seg": count } : null),
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cx(
        "ol-meter",
        size !== "m" && `ol-meter--${size}`,
        segmented && "ol-meter--segments",
        className,
      )}
      data-state={state}
      {...rest}
    >
      {(hasLabel || showValue || withState) && (
        <div className="ol-meter__top">
          {hasLabel && (
            <span className="ol-label" id={labelId}>
              {label}
            </span>
          )}
          {(showValue || withState) && (
            <span className="ol-meter__read">
              {withState && state && (
                <Badge className="ol-meter__state" tone={TONE[state]} dot aria-hidden="true">
                  {word}
                </Badge>
              )}
              {showValue && (
                <span className="ol-meter__value" aria-hidden="true">
                  {shown}
                </span>
              )}
            </span>
          )}
        </div>
      )}
      <div
        className="ol-meter__track"
        role="meter"
        aria-label={ariaLabel}
        aria-labelledby={name}
        aria-valuemin={reading.min}
        aria-valuemax={reading.max}
        aria-valuenow={reading.value}
        aria-valuetext={valueTextFull}
        style={vars}
      >
        {segmented ? (
          Array.from({ length: count }, (_, k) => {
            const prints = k >= from && k < lit;
            return (
              <span
                key={k}
                className={cx(
                  "ol-meter__seg",
                  k < lit && "ol-meter__seg--on",
                  prints && "ol-print-block",
                )}
                style={
                  prints
                    ? ({ "--ol-i": Math.min(k - from, MAX_STAGGER) } as CSSProperties)
                    : undefined
                }
              />
            );
          })
        ) : (
          <>
            <span className="ol-meter__fill" />
            <span className="ol-meter__hand">
              <span className="ol-meter__needle" />
            </span>
          </>
        )}
      </div>
      {scaled && (
        <div className="ol-meter__scale" aria-hidden="true">
          <span
            className="ol-meter__band"
            style={
              {
                "--ol-band-from": reading.goodFrom,
                "--ol-band-to": reading.goodTo,
              } as CSSProperties
            }
          />
          {ticks.map((at) => (
            <span
              key={at}
              className="ol-meter__tick"
              style={{ "--ol-tick": at } as CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
});
