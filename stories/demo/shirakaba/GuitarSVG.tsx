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

const BODY: Record<ModelId, string> = {
  norikura:
    "M150,598 C95,598 52,575 46,530 C41,492 62,470 58,445 C54,418 36,398 40,368 C44,338 70,316 88,318 C104,320 108,342 120,352 C130,360 170,360 182,350 C192,340 196,300 214,296 C232,292 252,318 252,352 C252,385 236,402 238,428 C240,455 262,478 256,520 C250,572 205,598 150,598 Z",
  utsukushi:
    "M150,600 C92,600 48,574 46,524 C44,484 64,466 62,440 C60,414 46,398 48,370 C50,338 78,318 110,318 C126,318 132,330 132,356 L172,356 C180,350 190,340 204,342 C222,344 238,368 240,392 C242,418 236,420 238,440 C240,470 258,488 256,526 C252,576 208,600 150,600 Z",
  kaichi:
    "M150,600 C80,600 50,590 50,540 L50,400 C50,360 64,336 96,336 C116,336 120,354 132,356 L168,356 C180,354 184,336 204,336 C236,336 250,360 250,400 L250,540 C250,590 220,600 150,600 Z",
};

const GUARD: Record<ModelId, string> = {
  norikura:
    "M104,378 C114,364 128,360 137,360 L166,360 C186,360 204,372 212,396 C220,420 216,444 204,460 L190,476 C176,488 152,490 134,484 L112,474 C98,466 92,448 94,428 C96,410 94,392 104,378 Z",
  utsukushi:
    "M108,382 C116,368 128,364 137,364 L166,364 C184,364 200,376 206,398 C212,420 210,444 198,460 L186,474 C172,486 152,488 134,482 L114,472 C102,464 96,448 98,430 C100,412 100,394 108,382 Z",
  kaichi:
    "M104,380 L196,380 C204,380 208,384 208,392 L208,466 C208,474 204,478 196,478 L104,478 C96,478 92,474 92,466 L92,392 C92,384 96,380 104,380 Z",
};

const HEAD = "M132,110 L128,40 C128,26 136,18 150,18 L172,18 C180,18 182,26 178,34 L168,110 Z";
const NUT = 110;
const SCALE = 360;
const fretY = (n: number) => NUT + SCALE * (1 - Math.pow(2, -n / 12));
const neckX = (y: number): [number, number] => {
  const t = (y - NUT) / (372 - NUT);
  return [139 - 3 * t, 161 + 3 * t];
};
const PU_Y = [396, 422, 450];
const STRING_INDEXES = [0, 1, 2, 3, 4, 5];

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
          fill="#efeadc"
          stroke="#1c1912"
          strokeWidth=".6"
        />
        {STRING_INDEXES.map((i) => (
          <circle
            key={i}
            cx={136.5 + i * 5.4}
            cy={y}
            r="1.5"
            fill={metal}
            stroke="#1c1912"
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
          fill="#efeadc"
          stroke="#1c1912"
          strokeWidth=".6"
        />
        {STRING_INDEXES.map((i) => (
          <circle
            key={i}
            cx={136.5 + i * 5.4}
            cy={y}
            r="1.6"
            fill={metal}
            stroke="#1c1912"
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
        stroke="#1c1912"
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
      {[-5, 5].map((d) =>
        STRING_INDEXES.map((i) => (
          <circle
            key={`${String(d)}-${String(i)}`}
            cx={136.5 + i * 5.4}
            cy={y + d}
            r="1.3"
            fill={metal}
          />
        )),
      )}
    </g>
  );
}

export interface GuitarSVGProps {
  config: GuitarConfig;
  /** `head` and `body` zoom on a detail; `full` shows the whole guitar. */
  crop?: "full" | "head" | "body";
  /** Accessible name. Defaults to a sentence built from the configuration. */
  title?: string;
  className?: string;
}

/** The guitar for a configuration. Pure SVG, so it redraws on every option. */
export function GuitarSVG({ config, crop = "full", title, className }: GuitarSVGProps) {
  // useId may contain characters that break url(#…) references.
  const id = `g${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const model = byId(MODELS, config.model);
  const wood = byId(BODY_WOODS, config.wood);
  const finish = byId(FINISHES, config.finish);
  const neck = byId(NECK_WOODS, config.neck);
  const board = byId(BOARDS, config.board);
  const pickups = byId(PICKUPS, config.pickups);
  const guard = byId(GUARDS, config.guard);
  const metal = byId(HARDWARE, config.hardware).color;
  const satin = config.sheen === "satin";
  const boardColor = board.color ?? shade(neck.color, -0.08);
  const lightBoard = board.color === null;
  const frets = config.frets;
  const lastY = fretY(frets) + 4;
  const [bx0, bx1] = neckX(NUT);
  const [ex0, ex1] = neckX(lastY);
  const body = BODY[model.id];
  const viewBox =
    crop === "head" ? "112 8 86 120" : crop === "body" ? "36 286 228 324" : "0 0 300 620";
  const strings = STRING_INDEXES.map((i) => ({
    x0: 141.5 + i * 3.4,
    x1: 136.5 + i * 5.4,
    w: 0.9 - i * 0.1,
  }));
  const inlays = [3, 5, 7, 9, 15, 17, 19, 21].filter((n) => n <= frets);
  const mid = (n: number) => (fretY(n - 1) + fretY(n)) / 2;
  const inlayColor = lightBoard ? "#1c1912" : "#efe6d0";
  const label =
    title ??
    `${model.name} in ${finish.name.toLowerCase()} over ${wood.name.toLowerCase()}, ${pickups.name} pickups`;

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={label}>
      <defs>
        <filter id={`${id}grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.11 0.006"
            numOctaves="3"
            seed={model.id.length + wood.id.length}
          />
          <feColorMatrix values="0 0 0 0 .22  0 0 0 0 .12  0 0 0 0 .05  0 0 0 -2.2 1.35" />
        </filter>
        <filter id={`${id}ngrain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.25 0.01" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 .3  0 0 0 0 .18  0 0 0 0 .08  0 0 0 -2.6 1.5" />
        </filter>
        <filter id={`${id}tort`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="3" />
          <feColorMatrix values="0 0 0 0 .1  0 0 0 0 .04  0 0 0 0 .01  0 0 0 -3 1.6" />
        </filter>
        <linearGradient id={`${id}gloss`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".22" stopColor="#fff" stopOpacity={satin ? 0.06 : 0.22} />
          <stop offset=".3" stopColor="#fff" stopOpacity="0" />
          <stop offset=".78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
        <clipPath id={`${id}body`}>
          <path d={body} />
        </clipPath>
        <clipPath id={`${id}head`}>
          <path d={HEAD} />
        </clipPath>
        <clipPath id={`${id}guard`}>
          <path d={GUARD[model.id]} />
        </clipPath>
      </defs>

      {/* body */}
      <g clipPath={`url(#${id}body)`}>
        <rect x="30" y="280" width="240" height="330" fill={wood.base} />
        <rect
          x="30"
          y="280"
          width="240"
          height="330"
          filter={`url(#${id}grain)`}
          opacity={wood.grain}
        />
        <rect x="30" y="280" width="240" height="330" fill={finish.color} opacity={finish.alpha} />
        {finish.alpha < 0.7 && (
          <rect
            x="30"
            y="280"
            width="240"
            height="330"
            filter={`url(#${id}grain)`}
            opacity={wood.grain * 0.5}
          />
        )}
        <rect x="30" y="280" width="240" height="330" fill={`url(#${id}gloss)`} />
        <path d={body} fill="none" stroke="#000" strokeOpacity=".22" strokeWidth="10" />
        <path
          d={body}
          fill="none"
          stroke="#fff"
          strokeOpacity={satin ? 0.06 : 0.16}
          strokeWidth="3"
          transform="translate(-1.2,-1.2)"
        />
      </g>
      <path d={body} fill="none" stroke="#1c1912" strokeWidth=".9" />
      {model.id === "kaichi" && (
        <path
          d="M68,392 C68,384 78,384 78,392 L78,470 C78,478 68,478 68,470 Z"
          fill="#14120d"
          stroke="#1c1912"
          strokeWidth=".6"
        />
      )}

      {/* pickguard */}
      {guard.color && (
        <g>
          <path d={GUARD[model.id]} fill={guard.color} stroke="#1c1912" strokeWidth=".6" />
          {guard.pattern && (
            <g clipPath={`url(#${id}guard)`}>
              <rect
                x="80"
                y="350"
                width="140"
                height="150"
                filter={`url(#${id}tort)`}
                opacity=".9"
              />
            </g>
          )}
          {[
            [104, 382],
            [206, 400],
            [198, 462],
            [116, 470],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={(x ?? 0) + (model.id === "kaichi" ? -4 : 0)}
              cy={y}
              r="1.2"
              fill={metal}
              stroke="#1c1912"
              strokeWidth=".3"
            />
          ))}
        </g>
      )}

      {/* neck and fretboard */}
      <path
        d={`M${String(bx0)},${String(NUT)} L${String(ex0)},${String(lastY + 8)} L${String(ex1)},${String(lastY + 8)} L${String(bx1)},${String(NUT)} Z`}
        fill={neck.color}
        stroke="#1c1912"
        strokeWidth=".7"
      />
      <path
        d={`M${String(bx0)},${String(NUT)} L${String(ex0)},${String(lastY + 8)} L${String(ex1)},${String(lastY + 8)} L${String(bx1)},${String(NUT)} Z`}
        filter={`url(#${id}ngrain)`}
        opacity=".35"
      />
      <path
        d={`M${String(bx0 + 0.6)},${String(NUT)} L${String(ex0 + 0.6)},${String(lastY)} L${String(ex1 - 0.6)},${String(lastY)} L${String(bx1 - 0.6)},${String(NUT)} Z`}
        fill={boardColor}
      />
      {Array.from({ length: frets }, (_, i) => i + 1).map((n) => {
        const y = fretY(n);
        const [a, b] = neckX(y);
        return (
          <line key={n} x1={a + 0.6} x2={b - 0.6} y1={y} y2={y} stroke="#cfccc4" strokeWidth=".9" />
        );
      })}
      {inlays.map((n) => (
        <circle key={n} cx="150" cy={mid(n)} r="1.9" fill={inlayColor} />
      ))}
      {frets >= 12 &&
        [-6, 6].map((d) => <circle key={d} cx={150 + d} cy={mid(12)} r="1.9" fill={inlayColor} />)}
      <rect
        x={bx0}
        y={NUT - 2.5}
        width={bx1 - bx0}
        height="2.5"
        fill="#efeadc"
        stroke="#1c1912"
        strokeWidth=".4"
      />

      {/* headstock */}
      <g clipPath={`url(#${id}head)`}>
        <rect x="120" y="10" width="70" height="104" fill={neck.color} />
        <rect x="120" y="10" width="70" height="104" filter={`url(#${id}ngrain)`} opacity=".35" />
        <rect x="120" y="10" width="70" height="104" fill={`url(#${id}gloss)`} />
      </g>
      <path d={HEAD} fill="none" stroke="#1c1912" strokeWidth=".8" />
      <text
        x="153"
        y="100"
        fontFamily="Yuji Syuku, serif"
        fontSize="7"
        fill="#1c1912"
        textAnchor="middle"
        writingMode="tb"
        letterSpacing="1.5"
        opacity=".85"
      >
        白樺
      </text>
      {[44, 64, 84].map((y, i) => (
        <g key={`l${String(i)}`}>
          <rect
            x={118}
            y={y - 2.6}
            width="12"
            height="5.2"
            rx="1"
            fill={metal}
            stroke="#1c1912"
            strokeWidth=".4"
          />
          <circle cx={137} cy={y} r="3" fill={metal} stroke="#1c1912" strokeWidth=".5" />
          <circle cx={137} cy={y} r="1" fill="#1c1912" />
        </g>
      ))}
      {[38, 58, 78].map((y, i) => (
        <g key={`r${String(i)}`}>
          <rect
            x={176 - i * 1.4}
            y={y - 2.6}
            width="12"
            height="5.2"
            rx="1"
            fill={metal}
            stroke="#1c1912"
            strokeWidth=".4"
          />
          <circle cx={168 - i * 1.2} cy={y} r="3" fill={metal} stroke="#1c1912" strokeWidth=".5" />
          <circle cx={168 - i * 1.2} cy={y} r="1" fill="#1c1912" />
        </g>
      ))}

      {/* pickups */}
      {pickups.layout.map(
        (kind, i) =>
          kind && (
            <Pickup
              key={i}
              kind={kind}
              y={(PU_Y[i] ?? 0) + (kind === "h" && i === 2 ? 2 : 0)}
              metal={metal}
            />
          ),
      )}

      {/* bridge */}
      <rect x="124" y="462" width="52" height="22" fill={metal} stroke="#1c1912" strokeWidth=".6" />
      {strings.map((s, i) => (
        <rect
          key={i}
          x={s.x1 - 2}
          y="465"
          width="4"
          height="7"
          fill={shade(metal, -0.18)}
          stroke="#1c1912"
          strokeWidth=".3"
        />
      ))}

      {/* controls */}
      {[
        [196, 500],
        [212, 522],
        [186, 530],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill={metal} stroke="#1c1912" strokeWidth=".6" />
          <circle
            cx={x}
            cy={y}
            r="4.5"
            fill="none"
            stroke="#1c1912"
            strokeWidth=".3"
            opacity=".6"
          />
        </g>
      ))}
      <circle cx="96" cy="512" r="2.5" fill="#1c1912" />
      <line
        x1="96"
        y1="512"
        x2="90"
        y2="502"
        stroke={metal}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="228" cy="560" r="5" fill={metal} stroke="#1c1912" strokeWidth=".6" />

      {/* strings */}
      {strings.map((s, i) => (
        <line
          key={i}
          x1={s.x0}
          y1={NUT - 2}
          x2={s.x1}
          y2="468"
          stroke="#d9d6cf"
          strokeWidth={s.w + 0.15}
        />
      ))}
      {strings.map((s, i) => (
        <line
          key={`t${String(i)}`}
          x1={s.x0}
          y1={NUT - 2}
          x2={i < 3 ? 137 : 168 - (i - 3) * 1.2}
          y2={i < 3 ? 84 - i * 20 : 78 - (i - 3) * 20}
          stroke="#d9d6cf"
          strokeWidth={s.w}
        />
      ))}
    </svg>
  );
}
