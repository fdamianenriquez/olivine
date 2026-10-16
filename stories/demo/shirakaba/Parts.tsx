import type { CSSProperties, ReactNode } from "react";

import type { ImageSlot } from "./data";

/** Northern Alps silhouette as seen from the Matsumoto basin: hairline only. */
export function Ridge({ className }: { className?: string }) {
  const peaks =
    "0,92 40,84 70,70 96,74 128,52 150,58 176,40 196,46 222,22 236,30 252,26 270,44 300,38 334,60 360,54 392,72 420,66 452,82 480,76 520,90 560,84 600,96";
  return (
    <svg viewBox="0 0 600 110" preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline
        points={peaks}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points="0,104 60,96 120,100 200,88 280,96 360,90 440,100 520,94 600,102"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 4"
        vectorEffect="non-scaling-stroke"
        opacity=".7"
      />
      <line
        x1="222"
        y1="22"
        x2="222"
        y2="6"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export interface PhotoProps {
  img: ImageSlot;
  className?: string;
  children?: ReactNode;
}

/** Photo slot: the image when `src` is set, otherwise a labelled placeholder with the file name. */
export function Photo({ img, className, children }: PhotoProps) {
  const style = { "--sg-ratio": img.ratio } as CSSProperties;
  return (
    <div className={["sg-photo", className].filter(Boolean).join(" ")} style={style}>
      {img.src ? (
        <img
          className="sg-photo__img"
          src={img.src}
          alt={img.alt}
          style={img.pos ? { objectPosition: img.pos } : undefined}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="sg-photo__ph" role="img" aria-label={img.alt}>
          <span className="sg-photo__tag">
            Image · {img.file} · {img.ratio.replace("/", ":")}
          </span>
          <span className="sg-photo__alt">{img.alt}</span>
        </div>
      )}
      {children}
    </div>
  );
}

export interface SwatchProps {
  color: string;
  /** Wood colour shown under a transparent finish. */
  base?: string;
  alpha?: number;
}

/** Small finish or wood swatch for radio labels. The colours are content, not UI. */
export function Swatch({ color, base, alpha = 1 }: SwatchProps) {
  return (
    <span className="sg-swatch" aria-hidden="true">
      {base && <span style={{ background: base }} />}
      <span style={{ background: color, opacity: alpha }} />
    </span>
  );
}
