// Live guitar drawing. Every shape is original to the fictional Shirakaba catalogue: the three
// body outlines and the 3+3 headstock are not copies of any real maker's design.
// Illustration colours (wood, lacquer, metal) are content, not UI tokens, so they stay literal here.
import { useId } from "react";

import {
  BOARDS,
  BODY_WOODS,
  byId,
  FINISHES,
  GUARDS,
  type GuitarConfig,
  HARDWARE,
  type ModelId,
  MODELS,
  NECK_WOODS,
  type PickupKind,
  PICKUPS,
} from "./data";
import { GEOMETRY, HEAD_PATH, HEAD_POSTS } from "./guitarGeometry";

const INK = "#1c1912";
const CREAM = "#efe6d0";
const BONE = "#efeadc";
const NUT = 110;
const SCALE = 360;
const END = 388;
const PICKUP_Y = [398, 424, 450] as const;
const STRINGS = [0, 1, 2, 3, 4, 5] as const;
const POSITION_DOTS = [3, 5, 7, 9, 15, 17, 19, 21] as const;

const fretY = (n: number) => NUT + SCALE * (1 - Math.pow(2, -n / 12));
/** Left and right edge of the neck at height `y`: it widens toward the body. */
const neckX = (y: number): [number, number] => {
  const t = (y - NUT) / (END - NUT);
  return [139 - 3.6 * t, 161 + 3.6 * t];
};

/** Lightens (k > 0) or darkens (k < 0) a #rrggbb colour. */
function shade(hex: string, k: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channels = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))),
  );
  return `#${channels.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function Pickup({ kind, y, metal }: { kind: PickupKind; y: number; metal: string }) {
  if (kind === "s") {
    return (
      <g>
        <rect
          x="128"
          y={y - 6}
          width="44"
          height="12"
          rx="6"
          fill={BONE}
          stroke={INK}
          strokeWidth=".6"
        />
        {STRINGS.map((i) => (
          <circle
            key={i}
            cx={136.5 + i * 5.4}
            cy={y}
            r="1.5"
            fill={metal}
            stroke={INK}
            strokeWidth=".3"
          />
        ))}
      </g>
    );
  }
  if (kind === "p") {
    return (
      <g>
        <rect
          x="125"
          y={y - 9}
          width="50"
          height="18"
          rx="2"
          fill={BONE}
          stroke={INK}
          strokeWidth=".6"
        />
        {STRINGS.map((i) => (
          <circle
            key={i}
            cx={136.5 + i * 5.4}
            cy={y}
            r="1.6"
            fill={metal}
            stroke={INK}
            strokeWidth=".3"
          />
        ))}
      </g>
    );
  }
  return (
    <g>
      <rect
        x="122"
        y={y - 13}
        width="56"
        height="26"
        rx="1.5"
        fill="none"
        stroke={INK}
        strokeWidth=".6"
      />
      <rect
        x="126"
        y={y - 10}
        width="48"
        height="20"
        fill="#1f1d19"
        stroke={metal}
        strokeWidth="1.2"
      />
      {[-5, 5].map((dy) =>
        STRINGS.map((i) => (
          <circle
            key={`${String(dy)}-${String(i)}`}
            cx={136.5 + i * 5.4}
            cy={y + dy}
            r="1.3"
            fill={metal}
          />
        )),
      )}
    </g>
  );
}

/** The bridge of each model, drawn in the metal of the hardware option. */
function Bridge({ model, metal }: { model: ModelId; metal: string }) {
  const saddle = shade(metal, -0.18);
  if (model === "norikura") {
    return (
      <g>
        <rect
          x="122"
          y="460"
          width="56"
          height="26"
          rx="1.5"
          fill={metal}
          stroke={INK}
          strokeWidth=".6"
        />
        {STRINGS.map((i) => (
          <rect
            key={i}
            x={136.5 + i * 5.4 - 2.2}
            y="463"
            width="4.4"
            height="9"
            fill={saddle}
            stroke={INK}
            strokeWidth=".3"
          />
        ))}
        {STRINGS.map((i) => (
          <circle key={`h${String(i)}`} cx={136.5 + i * 5.4} cy="480" r=".9" fill={INK} />
        ))}
        <path
          d="M176,478 C186,481 194,488 198,497"
          fill="none"
          stroke={metal}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>
    );
  }
  if (model === "utsukushi") {
    return (
      <g>
        <rect
          x="120"
          y="458"
          width="60"
          height="40"
          rx="2.5"
          fill={metal}
          stroke={INK}
          strokeWidth=".6"
        />
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={128 + i * 15}
            y="464"
            width="13"
            height="7"
            rx="3.5"
            fill={shade(metal, -0.12)}
            stroke={INK}
            strokeWidth=".3"
          />
        ))}
        {STRINGS.map((i) => (
          <circle key={`h${String(i)}`} cx={136.5 + i * 5.4} cy="490" r=".9" fill={INK} />
        ))}
      </g>
    );
  }
  return (
    <g>
      <rect
        x="128"
        y="462"
        width="44"
        height="7"
        rx="2"
        fill={metal}
        stroke={INK}
        strokeWidth=".6"
      />
      {STRINGS.map((i) => (
        <rect key={i} x={136.5 + i * 5.4 - 1.6} y="463.5" width="3.2" height="4" fill={saddle} />
      ))}
      <rect
        x="124"
        y="490"
        width="52"
        height="8"
        rx="3.5"
        fill={metal}
        stroke={INK}
        strokeWidth=".6"
      />
    </g>
  );
}

export interface GuitarSVGProps {
  config: GuitarConfig;
  /** `head` and `body` zoom to that part; `full` draws the whole instrument. */
  crop?: "full" | "head" | "body";
  /** Replaces the generated accessible name. */
  title?: string;
  className?: string;
  width?: number;
  height?: number;
  /** Hides the drawing from assistive technology, when its meaning is written next to it. */
  decorative?: boolean;
}

/** The guitar, drawn from a configuration: every option redraws its part. */
export function GuitarSVG({
  config,
  crop = "full",
  title,
  className,
  width,
  height,
  decorative,
}: GuitarSVGProps) {
  const uid = `g${useId().replaceAll(":", "")}`;
  const model = byId(MODELS, config.model);
  const geo = GEOMETRY[model.id];
  const wood = byId(BODY_WOODS, config.wood);
  const finish = byId(FINISHES, config.finish);
  const neck = byId(NECK_WOODS, config.neck);
  const board = byId(BOARDS, config.board);
  const pickups = byId(PICKUPS, config.pickups);
  const guard = byId(GUARDS, config.guard);
  const metal = byId(HARDWARE, config.hardware).color;
  const satin = config.sheen === "satin";
  const boardColor = board.color ?? shade(neck.color, -0.08);
  const sameBoard = !board.color;
  const frets = config.frets || 22;
  const boardEnd = fretY(frets) + 3;
  const [nutL, nutR] = neckX(NUT);
  const [endL, endR] = neckX(END);
  const [boardL, boardR] = neckX(boardEnd);
  const viewBox =
    crop === "head" ? "100 14 100 104" : crop === "body" ? "40 300 222 312" : "0 0 300 620";
  const stringAt = STRINGS.map((i) => ({
    nut: 141.6 + i * 3.36,
    bridge: 136.5 + i * 5.4,
    weight: 0.95 - i * 0.11,
  }));
  const dots = POSITION_DOTS.filter((n) => n <= frets);
  const between = (n: number) => (fretY(n - 1) + fretY(n)) / 2;
  const dotColor = sameBoard ? INK : CREAM;
  const [knob] = geo.knobs;
  const switchAngle =
    (Math.atan2(geo.switch[1] - knob[1], geo.switch[0] - knob[0]) * 180) / Math.PI - 90;
  const neckPath = `M${String(nutL)},${String(NUT)} L${String(endL)},${String(END)} L${String(endR)},${String(END)} L${String(nutR)},${String(NUT)} Z`;
  const boardPath = `M${String(nutL + 0.6)},${String(NUT)} L${String(boardL + 0.6)},${String(boardEnd)} L${String(boardR - 0.6)},${String(boardEnd)} L${String(nutR - 0.6)},${String(NUT)} Z`;
  const gloss = satin ? 0.05 : 0.18;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      width={width}
      height={height}
      {...(decorative
        ? { "aria-hidden": true }
        : {
            role: "img",
            "aria-label":
              title ??
              `${model.name} in ${finish.name.toLowerCase()} over ${wood.name.toLowerCase()}, ${pickups.name} pickups`,
          })}
    >
      <defs>
        <filter id={`${uid}grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.11 0.006"
            numOctaves="3"
            seed={model.id.length + wood.id.length}
          />
          <feColorMatrix values="0 0 0 0 .22  0 0 0 0 .12  0 0 0 0 .05  0 0 0 -2.2 1.35" />
        </filter>
        <filter id={`${uid}ngrain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.25 0.01" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 .3  0 0 0 0 .18  0 0 0 0 .08  0 0 0 -2.6 1.5" />
        </filter>
        <filter id={`${uid}tort`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="3" />
          <feColorMatrix values="0 0 0 0 .1  0 0 0 0 .04  0 0 0 0 .01  0 0 0 -3 1.6" />
        </filter>
        <linearGradient id={`${uid}gloss`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".2" stopColor="#fff" stopOpacity={gloss} />
          <stop offset=".3" stopColor="#fff" stopOpacity="0" />
          <stop offset=".78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".16" />
        </linearGradient>
        <clipPath id={`${uid}body`}>
          <path d={geo.body} />
        </clipPath>
        <clipPath id={`${uid}head`}>
          <path d={HEAD_PATH} />
        </clipPath>
        <clipPath id={`${uid}guard`}>
          <path d={geo.guard} />
        </clipPath>
      </defs>

      {/* Body: wood, grain, finish, sheen and the soft edge of the carve. */}
      <g clipPath={`url(#${uid}body)`}>
        <rect x="30" y="290" width="240" height="330" fill={wood.base} />
        <rect
          x="30"
          y="290"
          width="240"
          height="330"
          filter={`url(#${uid}grain)`}
          opacity={wood.grain}
        />
        <rect x="30" y="290" width="240" height="330" fill={finish.color} opacity={finish.alpha} />
        {finish.alpha < 0.7 && (
          <rect
            x="30"
            y="290"
            width="240"
            height="330"
            filter={`url(#${uid}grain)`}
            opacity={wood.grain * 0.5}
          />
        )}
        <rect x="30" y="290" width="240" height="330" fill={`url(#${uid}gloss)`} />
        {geo.contour && <path d={geo.contour} fill="#fff" opacity={satin ? 0.05 : 0.09} />}
        <path d={geo.body} fill="none" stroke="#000" strokeOpacity=".24" strokeWidth="9" />
        <path
          d={geo.body}
          fill="none"
          stroke="#fff"
          strokeOpacity={satin ? 0.07 : 0.18}
          strokeWidth="2.4"
          transform="translate(-1,-1.2)"
        />
      </g>
      <path d={geo.body} fill="none" stroke={INK} strokeWidth=".9" />
      {model.id === "kaichi" && (
        <path
          d={geo.body}
          fill="none"
          stroke={CREAM}
          strokeWidth="1.7"
          transform="translate(150 466) scale(.985) translate(-150 -466)"
        />
      )}
      {geo.slot && <path d={geo.slot} fill="#14120d" stroke={INK} strokeWidth=".6" />}

      {guard.color && (
        <g>
          <path d={geo.guard} fill={guard.color} stroke={INK} strokeWidth=".6" />
          {guard.pattern && (
            <g clipPath={`url(#${uid}guard)`}>
              <rect
                x="80"
                y="340"
                width="180"
                height="230"
                filter={`url(#${uid}tort)`}
                opacity=".9"
              />
            </g>
          )}
          <path
            d={geo.guard}
            fill="none"
            stroke="#fff"
            strokeOpacity=".25"
            strokeWidth=".8"
            transform="translate(-.6,-.6)"
          />
          {geo.screws.map(([x, y]) => (
            <circle
              key={`${String(x)}-${String(y)}`}
              cx={x}
              cy={y}
              r="1.15"
              fill={metal}
              stroke={INK}
              strokeWidth=".3"
            />
          ))}
        </g>
      )}

      {/* Neck, fretboard, frets, position dots and nut. */}
      <path d={neckPath} fill={neck.color} stroke={INK} strokeWidth=".7" />
      <path d={neckPath} filter={`url(#${uid}ngrain)`} opacity=".35" />
      <path d={boardPath} fill={boardColor} />
      {Array.from({ length: frets }, (_, i) => i + 1).map((n) => {
        const y = fretY(n);
        const [l, r] = neckX(y);
        return (
          <line key={n} x1={l + 0.6} x2={r - 0.6} y1={y} y2={y} stroke="#cfccc4" strokeWidth=".9" />
        );
      })}
      {dots.map((n) => (
        <circle key={n} cx="150" cy={between(n)} r="1.8" fill={dotColor} />
      ))}
      {frets >= 12 &&
        [-5.5, 5.5].map((dx) => (
          <circle key={dx} cx={150 + dx} cy={between(12)} r="1.8" fill={dotColor} />
        ))}
      <rect
        x={nutL}
        y={NUT - 2.5}
        width={nutR - nutL}
        height="2.5"
        fill={BONE}
        stroke={INK}
        strokeWidth=".4"
      />

      {/* Headstock, kanji, tuners. */}
      <g clipPath={`url(#${uid}head)`}>
        <rect x="100" y="0" width="80" height="114" fill={neck.color} />
        <rect x="100" y="0" width="80" height="114" filter={`url(#${uid}ngrain)`} opacity=".35" />
        <rect x="100" y="0" width="80" height="114" fill={`url(#${uid}gloss)`} />
      </g>
      <path d={HEAD_PATH} fill="none" stroke={INK} strokeWidth=".8" />
      <text
        x="150"
        y="33"
        style={{ fontFamily: "var(--font-jp)" }}
        fontSize="6"
        fill={INK}
        textAnchor="middle"
        writingMode="tb"
        letterSpacing="1.5"
        opacity=".85"
      >
        白樺
      </text>
      {HEAD_POSTS.map(([x, y]) => {
        const left = x < 150;
        return (
          <g key={`${String(x)}-${String(y)}`}>
            <rect
              x={left ? x - 25 : x + 14}
              y={y - 2.8}
              width="11"
              height="5.6"
              rx="1.4"
              fill={metal}
              stroke={INK}
              strokeWidth=".4"
            />
            <rect
              x={left ? x - 14 : x + 4}
              y={y - 1.5}
              width="10"
              height="3"
              fill={shade(metal, -0.15)}
              stroke={INK}
              strokeWidth=".3"
            />
            <circle cx={x} cy={y} r="3.1" fill={metal} stroke={INK} strokeWidth=".5" />
            <circle cx={x} cy={y} r="1" fill={INK} />
          </g>
        );
      })}

      {/* Pickups, bridge, controls and jack. */}
      {pickups.layout.map((kind, i) =>
        kind ? (
          <Pickup
            key={i}
            kind={kind}
            y={(PICKUP_Y[i] ?? 0) + (kind === "h" && i === 2 ? 2 : 0)}
            metal={metal}
          />
        ) : null,
      )}
      <Bridge model={model.id} metal={metal} />
      {geo.plate && (
        <rect
          x={knob[0] - 9}
          y={knob[1] - 12}
          width="18"
          height={Math.hypot(geo.switch[0] - knob[0], geo.switch[1] - knob[1]) + 24}
          rx="4"
          fill={metal}
          stroke={INK}
          strokeWidth=".5"
          transform={`rotate(${String(switchAngle)} ${String(knob[0])} ${String(knob[1])})`}
        />
      )}
      {geo.knobs.map(([x, y]) => (
        <g key={`${String(x)}-${String(y)}`}>
          <circle cx={x} cy={y} r="6.4" fill={metal} stroke={INK} strokeWidth=".6" />
          <circle cx={x} cy={y} r="4.2" fill="none" stroke={INK} strokeWidth=".3" opacity=".6" />
        </g>
      ))}
      <g>
        {model.id === "norikura" && (
          <rect
            x={geo.switch[0] - 6}
            y={geo.switch[1] - 11}
            width="12"
            height="22"
            rx="3"
            fill={metal}
            stroke={INK}
            strokeWidth=".5"
          />
        )}
        <circle
          cx={geo.switch[0]}
          cy={geo.switch[1]}
          r="2.6"
          fill={shade(metal, -0.2)}
          stroke={INK}
          strokeWidth=".4"
        />
        <line
          x1={geo.switch[0]}
          y1={geo.switch[1]}
          x2={geo.switch[0] - 3}
          y2={geo.switch[1] - 6}
          stroke={CREAM}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
      <circle
        cx={geo.jack[0]}
        cy={geo.jack[1]}
        r="3.4"
        fill={metal}
        stroke={INK}
        strokeWidth=".5"
      />

      {/* Strings, from the nut to the bridge and to each tuner. */}
      {stringAt.map((s, i) => (
        <line
          key={i}
          x1={s.nut}
          y1={NUT - 2}
          x2={s.bridge}
          y2="468"
          stroke="#d9d6cf"
          strokeWidth={s.weight + 0.15}
        />
      ))}
      {stringAt.map((s, i) => (
        <line
          key={`t${String(i)}`}
          x1={s.nut}
          y1={NUT - 2}
          x2={HEAD_POSTS[i]?.[0] ?? 150}
          y2={HEAD_POSTS[i]?.[1] ?? NUT}
          stroke="#d9d6cf"
          strokeWidth={s.weight}
        />
      ))}
    </svg>
  );
}

export interface GuitarSilhouetteProps {
  model: ModelId;
  /** Grows the outline by this many view-box units, for a cut-out a little larger than the guitar. */
  grow?: number;
  className?: string;
  width?: number;
  height?: number;
}

/** The solid outline of a model in `currentColor`: the foam cut-out the guitar lies in. */
export function GuitarSilhouette({
  model,
  grow = 0,
  className,
  width,
  height,
}: GuitarSilhouetteProps) {
  const [nutL, nutR] = neckX(NUT);
  const [endL, endR] = neckX(END);
  const neck = `M${String(nutL)},${String(NUT)} L${String(endL)},${String(END)} L${String(endR)},${String(END)} L${String(nutR)},${String(NUT)} Z`;
  return (
    <svg
      viewBox="0 0 300 620"
      className={className}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <g fill="currentColor" stroke="currentColor" strokeWidth={grow * 2} strokeLinejoin="round">
        <path d={GEOMETRY[model].body} />
        <path d={neck} />
        <path d={HEAD_PATH} />
      </g>
    </svg>
  );
}
