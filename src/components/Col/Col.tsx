import type { CSSProperties } from "react";

import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { forwardRefAs } from "../../utils/polymorphic";

/** Column spans per breakpoint. Missing breakpoints inherit from the next smaller one. */
export interface ColSpans {
  /** Span below `sm` (under 480px). Without it the cell is full width there. */
  base?: number;
  /** Span from `sm` (480px) up. */
  sm?: number;
  /** Span from `md` (720px) up. */
  md?: number;
  /** Span from `lg` (1024px) up. */
  lg?: number;
  /** Span from `xl` (1280px) up. */
  xl?: number;
}

/** A single number is the span from `md` up; an object sets spans per breakpoint. */
export type ColSpan = number | ColSpans;

export interface ColOwnProps {
  /**
   * Number of grid columns the cell spans (1–12). A plain number applies from the medium
   * breakpoint (720px) up; below it the cell spans the full row. Pass an object to set
   * spans per breakpoint (`{ base: 12, md: 6, lg: 4 }`). @default 1
   */
  span?: ColSpan;
  /** Grid column the cell starts at, applied from the medium breakpoint up. Use it to leave white space. */
  start?: number;
}

const BREAKPOINTS = ["base", "sm", "md", "lg", "xl"] as const;

function checkRange(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    devWarn("Col", `\`${name}\` should be an integer from 1 to 12, received ${String(value)}.`);
  }
}

/**
 * A cell of `Grid`. Layout values travel as CSS custom properties; the media queries
 * that read them live in the stylesheet.
 */
export const Col = forwardRefAs<"div", ColOwnProps>(function Col(
  { as: As = "div", span, start, className, style, ...rest },
  ref,
) {
  const extraClass = className as string | undefined;
  const extraStyle = style as CSSProperties | undefined;
  const vars: Record<string, string | number> = {};

  if (typeof span === "number") {
    checkRange("span", span);
    vars["--ol-span-md"] = span;
  } else if (span) {
    for (const bp of BREAKPOINTS) {
      const value = span[bp];
      if (value !== undefined) {
        checkRange(`span.${bp}`, value);
        vars[`--ol-span-${bp}`] = value;
      }
    }
    // Without a lower breakpoint the cell stays full width until the first one given.
    if (span.base === undefined && span.sm === undefined && span.md === undefined) {
      vars["--ol-span-base"] = "var(--ol-cols, 12)";
    }
  }
  if (start !== undefined) vars["--ol-start"] = start;

  return (
    <As
      ref={ref}
      className={cx("ol-col", extraClass)}
      style={{ ...(vars as CSSProperties), ...extraStyle }}
      {...rest}
    />
  );
});
