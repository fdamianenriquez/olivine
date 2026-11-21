import { type ReactNode, useRef } from "react";

import { Label, Text } from "../../../src";
import { useSeen } from "./hooks";

/**
 * The sumitsubo rule above a section title: a hairline is pulled across, then the ink snaps on.
 * It plays once, when the rule first scrolls into view.
 */
export function Snap() {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useSeen(ref);
  return (
    <span ref={ref} className="sg-snap" data-in={seen ? "" : undefined} aria-hidden="true">
      <span className="sg-snap__line" />
      <span className="sg-snap__ink" />
    </span>
  );
}

export interface SectionHeadProps {
  kicker: string;
  title: string;
  /** Id of the heading, for `aria-labelledby` on the section. */
  id: string;
  children?: ReactNode;
}

/** Kicker, display heading and an optional lead, under the ink rule. */
export function SectionHead({ kicker, title, id, children }: SectionHeadProps) {
  return (
    <div className="sg-head">
      <Snap />
      <Label>{kicker}</Label>
      <Text variant="display-m" as="h2" id={id}>
        {title}
      </Text>
      {children && (
        <Text variant="body" className="sg-measure sg-head__body">
          {children}
        </Text>
      )}
    </div>
  );
}

export interface ShojiProps {
  /** URL of the photograph. */
  src: string | undefined;
  alt: string;
  /** CSS object-position of the crop. */
  pos?: string;
  className?: string;
  /** Names the frame for assistive technology when it holds text over the photograph. */
  label?: string;
  children?: ReactNode;
}

/**
 * A photograph behind a 12 × 6 grid of panes. Text sits on solid `paper` panes (`sg-void`) laid on
 * the grid, so its contrast never depends on the image.
 */
export function Shoji({ src, alt, pos, className, label, children }: ShojiProps) {
  return (
    <div
      className={["sg-shoji", className].filter(Boolean).join(" ")}
      role={label ? "group" : undefined}
      aria-label={label}
    >
      <div className="sg-shoji__photo">
        {src && (
          <img
            className="sg-shoji__img"
            src={src}
            alt={alt}
            style={pos ? { objectPosition: pos } : undefined}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      <div className="sg-shoji__grid">{children}</div>
    </div>
  );
}
