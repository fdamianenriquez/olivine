// Vector samples for the case cavities. They stand in when a photograph of the sample is missing.
// Wood, lacquer and metal colours are content, not UI tokens, so they stay literal in this file.
import { type ReactNode, useId } from "react";

import type { ModelId, PickupKind } from "./data";
import { GuitarSilhouette } from "./GuitarSVG";

const FRAME = "#8a806d";

function Square({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 40 40" className="sg-piece__svg" aria-hidden="true">
      {children}
    </svg>
  );
}

/** A block of wood: a base colour with a grain texture. */
export function WoodSwatch({ color, grain = 0.4 }: { color: string; grain?: number }) {
  const id = `w${useId().replaceAll(":", "")}`;
  return (
    <Square>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.35" numOctaves="3" seed="4" />
        <feColorMatrix values="0 0 0 0 .22  0 0 0 0 .12  0 0 0 0 .05  0 0 0 -2.2 1.35" />
      </filter>
      <rect width="40" height="40" fill={color} />
      <rect width="40" height="40" filter={`url(#${id})`} opacity={grain} />
      <rect x=".5" y=".5" width="39" height="39" fill="none" stroke={FRAME} strokeWidth="1" />
    </Square>
  );
}

/** A lacquer chip: the colour over a maple ground, so transparent finishes show the wood. */
export function ColorSwatch({
  color,
  alpha = 1,
  under = "#e4d2ad",
}: {
  color: string;
  alpha?: number;
  under?: string;
}) {
  return (
    <Square>
      <rect width="40" height="40" fill={under} />
      <rect width="40" height="40" fill={color} opacity={alpha} />
      <rect x=".5" y=".5" width="39" height="39" fill="none" stroke={FRAME} strokeWidth="1" />
    </Square>
  );
}

/** The pickups of a layout on a cream pickguard. */
export function PickupSwatch({ layout }: { layout: readonly (PickupKind | null)[] }) {
  return (
    <Square>
      <rect width="40" height="40" fill="#efe6d0" />
      {layout.map((kind, i) =>
        kind === "h" ? (
          <rect key={i} x="9" y={6 + i * 11} width="22" height="8" fill="#1f1d19" />
        ) : kind ? (
          <rect
            key={i}
            x="10"
            y={7 + i * 11}
            width="20"
            height={kind === "p" ? 7 : 5}
            fill="#f7f2e7"
            stroke="#1c1912"
            strokeWidth=".8"
          />
        ) : null,
      )}
    </Square>
  );
}

/** A knob seen from above on black. */
export function KnobSwatch({ color }: { color: string }) {
  return (
    <Square>
      <rect width="40" height="40" fill="#2b2a28" />
      <circle cx="20" cy="20" r="11" fill={color} stroke="#1c1912" strokeWidth="1" />
      <circle cx="20" cy="20" r="7" fill="none" stroke="#1c1912" strokeWidth=".6" />
    </Square>
  );
}

/** The outline of a body shape, drawn in the paper colour of the cavity. */
export function ShapeSwatch({ model }: { model: ModelId }) {
  return <GuitarSilhouette model={model} className="sg-piece__svg sg-piece__svg--model" />;
}
