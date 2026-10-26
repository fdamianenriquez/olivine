import "./motion.stories.css";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";

import { Label } from "../components/Label";
import { Root } from "../components/Root";
import { Text } from "../components/Text";
import { tokens } from "../tokens";
import {
  ENSO,
  startViewTransition,
  useEntrance,
  useIndicator,
  useInkWipe,
  useOrigami,
  usePresence,
  useSumi,
  useViewTransition,
} from ".";

const THEMES = [
  { theme: "washi", name: "Washi" },
  { theme: "sumi", name: "Sumi" },
] as const;

/** Every concept is shown in both themes, side by side. */
function BothThemes({ children }: { children: () => ReactNode }) {
  return (
    <div className="ol-sb-motion">
      {THEMES.map(({ theme, name }) => (
        <Root key={theme} theme={theme} className="ol-sb-motion__theme">
          <Label dot muted>
            {name}
          </Label>
          {children()}
        </Root>
      ))}
    </div>
  );
}

/** Remounts its children, so an entrance plays again. */
function Replayable({ label = "Replay", children }: { label?: string; children: ReactNode }) {
  const [round, setRound] = useState(0);
  return (
    <div className="ol-sb-motion__stack">
      <button
        type="button"
        className="ol-sb-motion__btn"
        onClick={() => {
          setRound((n) => n + 1);
        }}
      >
        ↻ {label}
      </button>
      <div key={round} className="ol-sb-motion__screen">
        {children}
      </div>
    </div>
  );
}

const meta = {
  title: "Motion",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `Olivine moves like paper and ink: things slide, wipe, draw, print and stamp. The default
curve is **jo-ha-kyū** (\`--ease-move\`): it begins slow, accelerates and stops dead. Nothing bounces,
blurs or scales past 1.02.

- Six core motions are built into the components: jo-ha-kyū entrance, shodō, mokuhanga, kintsugi,
  hanko and kakejiku. Built-in effects: ink wipe, hairline draw, sliding bar, container transform.
- Seven opt-in classes work on plain markup: \`ol-motion-byobu\`, \`-noren\`, \`-kumiko\`, \`-shishi\`,
  \`-sumi\`, \`-shoji\` and \`-origami\`. Shoji ships with the core styles; the other six need the
  opt-in stylesheet \`olivine/motion-extras.css\`.
- Every duration, curve and stagger is a token. Under \`prefers-reduced-motion: reduce\` every
  duration is 1ms, loops stop on their end state and View Transitions are skipped.`,
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/* ---------- Tokens ---------- */

const CURVES = [
  ["ease-move", "Jo-ha-kyū, the default: anything that travels."],
  ["ease-standard", "Small UI moves (M3 standard, clamped)."],
  ["ease-effect", "Opacity and colour."],
  ["ease-print", "Mokuhanga passes and segmented progress only."],
] as const;

export const Tokens: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The curves race over the same `--dur-xl × 2`. Durations: `dur-s` 150 (effect), `dur-m` 300 (control), `dur-l` 500 (panel), `dur-xl` 650 ms (page); `stagger` 50 ms.",
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <dl className="ol-sb-motion__tokens">
          {CURVES.map(([name, use]) => (
            <div key={name} style={{ display: "contents" }}>
              <dt>{`--${name}`}</dt>
              <dd className="ol-sb-motion__track" aria-hidden="true">
                <span
                  className="ol-sb-motion__runner"
                  style={{ "--ol-sb-ease": `var(--${name})` } as CSSProperties}
                />
              </dd>
              <dd className="ol-sb-motion__note">
                {use} <code>{tokens.motion[name]}</code>
              </dd>
            </div>
          ))}
          {(["dur-s", "dur-m", "dur-l", "dur-xl", "stagger"] as const).map((name) => (
            <div key={name} style={{ display: "contents" }}>
              <dt>{`--${name}`}</dt>
              <dd>
                <code>{tokens.motion[name]}</code>
              </dd>
              <dd className="ol-sb-motion__note">
                Reduced motion: {name === "stagger" ? "0ms" : "1ms"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </BothThemes>
  ),
};

/* ---------- Core: jo-ha-kyū ---------- */

function JoHaKyuDemo() {
  const { setElement } = useEntrance();
  return (
    <section
      ref={setElement}
      className="ol-johakyu ol-sb-motion__johakyu"
      aria-label="Jo-ha-kyū entrance"
    >
      <div className="ol-johakyu__ha">
        <Label muted>
          Jo · ha · kyū <span lang="ja">序破急</span>
        </Label>
        <Text variant="h2" as="p">
          Made by hand in Matsumoto.
        </Text>
        <Text tone="muted" as="p">
          First the frame, then the content, the action last.
        </Text>
      </div>
      <button type="button" className="ol-sb-motion__btn ol-sb-motion__btn--accent ol-johakyu__kyu">
        Order a guitar →
      </button>
    </section>
  );
}

export const JoHaKyu: Story = {
  name: "Jo-ha-kyū",
  parameters: {
    docs: {
      description: {
        story:
          "`.ol-johakyu` draws its hairline frame (jo), `.ol-johakyu__ha` rises after `dur-m` (ha) and `.ol-johakyu__kyu` lands last and stops dead (kyū). `useEntrance()` holds it until the section is in view.",
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <Replayable>
          <JoHaKyuDemo />
        </Replayable>
      )}
    </BothThemes>
  ),
};

/* ---------- Core: shodō ---------- */

function ShodoDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <div className="ol-sb-motion__row">
      <div role="status" aria-label="Loading" className="ol-sb-motion__stack">
        <svg className="ol-sb-motion__enso" viewBox={ENSO.viewBox} aria-hidden="true">
          <path className="ol-enso__stroke" d={ENSO.stroke} pathLength={1} />
          <path className="ol-enso__echo" d={ENSO.echo} pathLength={1} />
        </svg>
      </div>
      <svg
        className="ol-sb-motion__kanji"
        viewBox="0 0 100 100"
        role="img"
        aria-label="山, three strokes"
      >
        <path className="ol-shodo" d="M50 10 V84" pathLength={1} />
        <path className="ol-shodo" d="M20 34 V84 H80" pathLength={1} />
        <path className="ol-shodo" d="M80 30 V84" pathLength={1} />
      </svg>
      <div className="ol-sb-motion__stack">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          className="ol-sb-motion__check"
          onClick={() => {
            setChecked((c) => !c);
          }}
        >
          <span className="ol-sb-motion__box">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path className="ol-shodo-mark" d="M1.8 6.6 4.8 9.6 10.6 2.4" pathLength={1} />
            </svg>
          </span>
          I agree
        </button>
        <a className="ol-shodo-underline ol-sb-motion__link" href="#motion">
          A brush underline
        </a>
      </div>
    </div>
  );
}

export const Shodo: Story = {
  name: "Shodō",
  parameters: {
    docs: {
      description: {
        story:
          'Ensō spinner (`.ol-enso__stroke` / `__echo`, paths in `ENSO`; for waits only: it loops inside `role="status"` or `aria-busy="true"`, otherwise draws once, and `.ol-motion-paused` stops it), kanji drawn in stroke order (`.ol-shodo` on `pathLength=1` paths), the check mark (`.ol-shodo-mark`) and the brush underline (`.ol-shodo-underline`).',
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <Replayable>
          <ShodoDemo />
        </Replayable>
      )}
    </BothThemes>
  ),
};

/* ---------- Core: mokuhanga ---------- */

function Segments() {
  const [value, setValue] = useState(3);
  return (
    <div className="ol-sb-motion__row">
      <div
        className="ol-sb-motion__segs"
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value * 10}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={i < value ? "ol-print-block" : undefined} />
        ))}
      </div>
      <button
        type="button"
        className="ol-sb-motion__btn"
        onClick={() => {
          setValue((v) => (v >= 10 ? 0 : v + 1));
        }}
      >
        Print a block
      </button>
    </div>
  );
}

export const Mokuhanga: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`.ol-mokuhanga` prints its children as passes, lightest first; each lands offset (kentō) and snaps into register. `.ol-print-block` prints one segment of a progress with `--ease-print`.",
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <>
          <Replayable>
            <svg
              className="ol-sb-motion__svg ol-sb-motion__print"
              viewBox="-14 -10 348 176"
              role="img"
              aria-label="Mountains printed in five passes"
            >
              <rect className="ol-sb-motion__paper" x="-14" y="-10" width="348" height="176" />
              <g className="ol-mokuhanga">
                <rect className="ol-sb-motion__sky" width="320" height="150" />
                <rect className="ol-sb-motion__sun" x="226" y="30" width="34" height="34" />
                <path
                  className="ol-sb-motion__far"
                  d="M0 112 L52 70 L92 92 L150 48 L210 96 L262 66 L320 100 V150 H0Z"
                />
                <path
                  className="ol-sb-motion__mid"
                  d="M0 132 L70 100 L120 118 L190 90 L250 122 L320 108 V150 H0Z"
                />
                <path
                  className="ol-sb-motion__ink"
                  d="M0 150 L0 138 L90 128 L180 140 L320 130 V150Z"
                />
              </g>
            </svg>
          </Replayable>
          <Segments />
        </>
      )}
    </BothThemes>
  ),
};

/* ---------- Core: kintsugi ---------- */

const CRACK = "M0 6 L9 3 L17 8 L29 2.6 L41 7 L52 1.6 L63 6.4 L76 3 L88 7.4 L100 4.6";

function KintsugiDemo({ id }: { id: string }) {
  const [value, setValue] = useState("hana.olivine.dev");
  const [wasBroken, setWasBroken] = useState(false);
  const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  const state = ok ? (wasBroken ? "mended" : "idle") : "broken";
  // Once broken, a fixed value shows as repaired (derived during render).
  if (!ok && !wasBroken) setWasBroken(true);
  return (
    <div className="ol-sb-motion__stack">
      <label className="ol-sb-motion__field" data-kintsugi={state}>
        <span>Email</span>
        <span className="ol-kintsugi">
          <input
            className="ol-sb-motion__input"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
            aria-invalid={state === "broken"}
            aria-describedby={`${id}-msg`}
          />
          <svg
            className="ol-kintsugi__gold"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={CRACK} />
          </svg>
          <svg
            className="ol-kintsugi__crack"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={CRACK} />
          </svg>
        </span>
        <span id={`${id}-msg`} className="ol-sb-motion__note" aria-live="polite">
          {state === "broken" && "Error: the @ is missing."}
          {state === "mended" && (
            <>
              <span className="ol-sb-motion__tag">Repaired</span>Valid email.
            </>
          )}
          {state === "idle" && "We only write about your order."}
        </span>
      </label>
      <div className="ol-sb-motion__row">
        <button
          type="button"
          className="ol-sb-motion__btn"
          onClick={() => {
            setValue("hana.olivine.dev");
          }}
        >
          Break
        </button>
        <button
          type="button"
          className="ol-sb-motion__btn"
          onClick={() => {
            setValue("hana@olivine.dev");
          }}
        >
          Repair
        </button>
      </div>
    </div>
  );
}

export const Kintsugi: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`data-kintsugi="broken"` draws a crack in `beni` along the bottom edge; `"mended"` refills it in `maple` and the field says "Repaired" (a word, never colour alone).',
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => <KintsugiDemo id={`kintsugi-${String(Math.random()).slice(2, 8)}`} />}
    </BothThemes>
  ),
};

/* ---------- Core: hanko ---------- */

function Seal() {
  return (
    <svg
      className="ol-hanko ol-sb-motion__seal"
      width="52"
      height="52"
      viewBox="0 0 52 52"
      aria-hidden="true"
    >
      <rect className="ol-sb-motion__seal-ring" x="1.5" y="1.5" width="49" height="49" />
      <rect className="ol-sb-motion__seal-fill" x="5" y="5" width="42" height="42" />
      {/* Font size in viewBox units: geometry of this 52 × 52 seal. */}
      <text x="26" y="35.5" textAnchor="middle" fontSize="27">
        済
      </text>
    </svg>
  );
}

function HankoDemo() {
  const [round, setRound] = useState(0);
  return (
    <div className="ol-sb-motion__stack">
      <button
        type="button"
        className="ol-sb-motion__btn ol-sb-motion__btn--accent"
        onClick={() => {
          setRound((n) => n + 1);
        }}
      >
        Reserve this guitar
      </button>
      <div className="ol-sb-motion__stage">
        {round > 0 ? (
          <div key={round} className="ol-sb-motion__toast" role="status">
            <div>
              <Text variant="h3" as="p">
                Reservation recorded
              </Text>
              <Text tone="muted" as="p">
                We will write within 48 h about the deposit.
              </Text>
            </div>
            <Seal />
          </div>
        ) : (
          <span className="ol-sb-motion__note">The notice appears here</span>
        )}
      </div>
    </div>
  );
}

export const Hanko: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The notice settles in (`ol-settle`, `dur-s`), then the seal drops in one pass and stops dead (`.ol-hanko`, delay via `--ol-hanko-delay`). Stamped titles get the same motion with `.ol-stamp--press`.",
      },
    },
  },
  render: () => <BothThemes>{() => <HankoDemo />}</BothThemes>,
};

/* ---------- Core: kakejiku ---------- */

function KakejikuDemo() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const {
    mounted: scrollShown,
    state: scrollState,
    setElement: setScroll,
  } = usePresence<HTMLDivElement>(modal);
  const { mounted: emakiShown, state: emakiState, setElement: setEmaki } = usePresence(drawer);
  const [menu, setMenu] = useState(false);
  const {
    mounted: menuShown,
    state: menuState,
    setElement: setMenuEl,
  } = usePresence<HTMLDivElement>(menu);
  return (
    <div className="ol-sb-motion__stack">
      <div className="ol-sb-motion__row">
        <button
          type="button"
          className="ol-sb-motion__btn"
          aria-expanded={modal}
          onClick={() => {
            setModal(true);
          }}
        >
          Open modal
        </button>
        <button
          type="button"
          className="ol-sb-motion__btn"
          aria-expanded={drawer}
          onClick={() => {
            setDrawer((d) => !d);
          }}
        >
          Toggle panel
        </button>
        <button
          type="button"
          className="ol-sb-motion__btn"
          aria-expanded={menu}
          onClick={() => {
            setMenu((m) => !m);
          }}
        >
          Toggle small menu
        </button>
      </div>
      <div className="ol-sb-motion__stage">
        {scrollShown && (
          <div
            ref={setScroll}
            role="dialog"
            aria-label="Confirm reservation"
            className="ol-kakejiku ol-sb-motion__panel"
            data-state={scrollState}
          >
            <Text variant="h2" as="p">
              Reserve this guitar?
            </Text>
            <Text tone="muted" as="p">
              We will hold it for you until the end of the week.
            </Text>
            <div className="ol-sb-motion__row">
              <button
                type="button"
                className="ol-sb-motion__btn"
                onClick={() => {
                  setModal(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
        {emakiShown && (
          <aside
            ref={setEmaki}
            aria-label="Filters"
            className="ol-kakejiku ol-kakejiku--from-right ol-sb-motion__drawer"
            data-state={emakiState}
          >
            <Label>Filters</Label>
            <Text as="p">Wood · Finish · Pickups</Text>
          </aside>
        )}
        {menuShown && (
          <div
            ref={setMenuEl}
            role="group"
            aria-label="Quick actions"
            className="ol-kakejiku ol-kakejiku--rodless ol-sb-motion__panel"
            data-state={menuState}
          >
            <Text as="p">Share · Save · Compare</Text>
          </div>
        )}
      </div>
    </div>
  );
}

export const Kakejiku: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`.ol-kakejiku` unrolls with a clip-path and a 3px rod just outside the moving edge; `data-state="closing"` rolls it back. `--from-right` / `--from-left` unroll from a screen edge (emakimono). The rod stays after unrolling on Modal and Offcanvas; `.ol-kakejiku--rodless` omits it on small menus (Fab), as in "Toggle small menu". Components keep it mounted and `inert` while it rolls up with an internal presence hook (`usePresence`, not exported from the package root; used here only to drive the demo).',
      },
    },
  },
  render: () => <BothThemes>{() => <KakejikuDemo />}</BothThemes>,
};

/* ---------- Effects: ink wipe, hairline draw, sliding bar, container transform ---------- */

const SIZES = ["Small", "Medium", "Large", "Extra large"];

function InkWipeDemo({ copy }: { copy: boolean }) {
  const [active, setActive] = useState(1);
  const ink = useInkWipe(active);
  return (
    <div
      className="ol-sb-motion__segmented"
      role="radiogroup"
      aria-label={copy ? "Body size" : "Body size (fallback)"}
    >
      {SIZES.map((size, index) => (
        <button
          key={size}
          type="button"
          role="radio"
          aria-checked={index === active}
          className="ol-ink-wipe"
          onClick={() => {
            setActive(index);
          }}
          {...ink(index)}
        >
          {size}
          {copy && (
            <span className="ol-ink-wipe__ink" aria-hidden="true">
              {size}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export const InkWipe: Story = {
  name: "Ink wipe",
  parameters: {
    docs: {
      description: {
        story:
          "`.ol-ink-wipe` inks the selected item; the ink arrives from the side the selection came from and leaves towards the new one (mirrored in RTL), driven by an internal hook (`useInkWipe`, not exported from the package root). First row: with `.ol-ink-wipe__ink`, an `aria-hidden` inked copy of the label clipped exactly like the fill, so the label never loses contrast mid-wipe (SegmentedControl uses it). Second row: without the copy the label colour cross-fades, a fallback only.",
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <div className="ol-sb-motion__stack">
          <InkWipeDemo copy />
          <InkWipeDemo copy={false} />
        </div>
      )}
    </BothThemes>
  ),
};

export const HairlineDraw: Story = {
  name: "Hairline draw",
  parameters: {
    docs: {
      description: {
        story:
          "`.ol-draw` traces its frame clockwise on hover or keyboard focus (or with `data-drawn`).",
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <div className="ol-sb-motion__cards">
          {["Kitchen 04", "Andén shelf"].map((title) => (
            <a key={title} href="#motion" className="ol-draw ol-sb-motion__card">
              <Label muted>Meguro</Label>
              <Text variant="h2" as="span">
                {title}
              </Text>
            </a>
          ))}
        </div>
      )}
    </BothThemes>
  ),
};

const TABS = ["Buttons", "Fields", "Tables", "Notices"];

function SlidingBarDemo() {
  const [active, setActive] = useState(0);
  const ref = useIndicator<HTMLDivElement>(active);
  return (
    <div ref={ref} className="ol-sb-motion__tabs" role="tablist" aria-label="Sections">
      {TABS.map((tab, index) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={index === active}
          className="ol-sb-motion__tab"
          onClick={() => {
            setActive(index);
          }}
        >
          {tab}
        </button>
      ))}
      <span className="ol-indicator" aria-hidden="true" />
    </div>
  );
}

export const SlidingBar: Story = {
  name: "Sliding bar",
  parameters: {
    docs: {
      description: {
        story:
          "A 3px olivo `.ol-indicator` slides between tabs with a clip-path; an internal hook (`useIndicator`, not exported from the package root) measures the selected tab.",
      },
    },
  },
  render: () => <BothThemes>{() => <SlidingBarDemo />}</BothThemes>,
};

const WORKS = [
  { id: "a", title: "Kitchen 04", place: "Meguro, Tokyo" },
  { id: "b", title: "Andén shelf", place: "Roma Norte, CDMX" },
];

function ContainerTransformDemo({ prefix }: { prefix: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const transition = useViewTransition();
  const work = WORKS.find((w) => w.id === open);
  const name = (id: string) => ({ viewTransitionName: `${prefix}-${id}` }) as CSSProperties;
  return work ? (
    <article className="ol-vt-morph ol-sb-motion__detail" style={name(work.id)}>
      <Label>{work.place}</Label>
      <Text variant="display-m" as="h3">
        {work.title}
      </Text>
      <button
        type="button"
        className="ol-sb-motion__btn"
        onClick={() => {
          void transition(() => {
            setOpen(null);
          });
        }}
      >
        Back
      </button>
    </article>
  ) : (
    <div className="ol-sb-motion__cards">
      {WORKS.map((w) => (
        <button
          key={w.id}
          type="button"
          className="ol-vt-morph ol-sb-motion__card"
          style={name(w.id)}
          onClick={() => {
            void transition(() => {
              setOpen(w.id);
            });
          }}
        >
          <Label muted>{w.place}</Label>
          <Text variant="h2" as="span">
            {w.title}
          </Text>
        </button>
      ))}
    </div>
  );
}

export const ContainerTransform: Story = {
  name: "Container transform",
  parameters: {
    docs: {
      description: {
        story:
          "The card grows into its page: both share a `view-transition-name`, `.ol-vt-morph` sets the timing and `useViewTransition()` runs the swap. Without View Transitions, or with reduced motion, the change is direct.",
      },
    },
  },
  render: () => (
    <div className="ol-sb-motion">
      {THEMES.map(({ theme, name }) => (
        <Root key={theme} theme={theme} className="ol-sb-motion__theme">
          <Label dot muted>
            {name}
          </Label>
          <ContainerTransformDemo prefix={`ol-sb-ct-${theme}`} />
        </Root>
      ))}
    </div>
  ),
};

/* ---------- Opt-in: byōbu ---------- */

function Landscape() {
  return (
    <svg viewBox="0 0 320 150" preserveAspectRatio="none" aria-hidden="true">
      <rect className="ol-sb-motion__sky" width="320" height="150" />
      <rect className="ol-sb-motion__sun" x="226" y="30" width="34" height="34" />
      <path
        className="ol-sb-motion__far"
        d="M0 112 L52 70 L92 92 L150 48 L210 96 L262 66 L320 100 V150 H0Z"
      />
      <path
        className="ol-sb-motion__mid"
        d="M0 132 L70 100 L120 118 L190 90 L250 122 L320 108 V150 H0Z"
      />
      <path className="ol-sb-motion__ink" d="M0 150 L0 138 L90 128 L180 140 L320 130 V150Z" />
    </svg>
  );
}

function ByobuDemo() {
  const [folded, setFolded] = useState(false);
  let panels: ReactNode = null;
  for (let i = 3; i >= 0; i -= 1) {
    panels = (
      <div className="ol-motion-byobu__panel">
        <div className="ol-motion-byobu__face">
          <Landscape />
        </div>
        {panels}
      </div>
    );
  }
  return (
    <div className="ol-sb-motion__stack">
      <div className="ol-motion-byobu ol-sb-motion__screen" data-state={folded ? "folded" : "open"}>
        {panels}
      </div>
      <button
        type="button"
        className="ol-sb-motion__btn"
        aria-pressed={folded}
        onClick={() => {
          setFolded((f) => !f);
        }}
      >
        {folded ? "Unfold" : "Fold"}
      </button>
    </div>
  );
}

export const Byobu: Story = {
  name: "Byōbu (opt-in)",
  parameters: {
    docs: {
      description: {
        story:
          '`class="ol-motion-byobu"` with nested `__panel` / `__face`: the panels turn on their hinges and the picture runs across them. `data-state="folded"` folds it. Without 3D transforms it stays open. Needs the opt-in stylesheet `olivine/motion-extras.css`, imported after `olivine/styles.css`.',
      },
    },
  },
  render: () => <BothThemes>{() => <ByobuDemo />}</BothThemes>,
};

/* ---------- Opt-in: noren ---------- */

function NorenDemo({ side }: { side: "top" | "bottom" }) {
  const [open, setOpen] = useState(false);
  const { mounted, state, setElement } = usePresence<HTMLUListElement>(open);
  return (
    <div className="ol-sb-motion__menu-stage">
      <div className="ol-sb-motion__anchor">
        <button
          type="button"
          className="ol-sb-motion__btn"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o);
          }}
        >
          Models {side === "top" ? "▴" : "▾"}
        </button>
        {mounted && (
          <ul
            ref={setElement}
            // A menu is a list with the menu role (ARIA menu pattern); the lint rule has no exception for it.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
            role="menu"
            aria-label="Models"
            className="ol-motion-noren ol-sb-motion__menu"
            data-state={state}
            data-side={side}
          >
            {["Norikura", "Utsukushi", "Kaichi", "Compare models"].map((model) => (
              <li key={model} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="ol-sb-motion__item"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  {model}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const Noren: Story = {
  name: "Noren (opt-in)",
  parameters: {
    docs: {
      description: {
        story:
          '`class="ol-motion-noren"` on the menu itself (no extra markup: a `ul[role=menu]` holds only `li`). Four strips are cut with a polygon; the centre ones drop first, and their hairline edges are drawn while they move (on the `::before` of the menu, so the menu must not use it). `data-side="top"` hangs it from the bottom edge; `data-state="closing"` lifts it. Needs the opt-in stylesheet `olivine/motion-extras.css`, imported after `olivine/styles.css`.',
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <div className="ol-sb-motion__row">
          <NorenDemo side="bottom" />
          <NorenDemo side="top" />
        </div>
      )}
    </BothThemes>
  ),
};

/* ---------- Opt-in: kumiko, shishi-odoshi ---------- */

/** A pause control for the wait loops (WCAG 2.2.2): `.ol-motion-paused` on their ancestor. */
function Pausable({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="ol-sb-motion__stack">
      <button
        type="button"
        className="ol-sb-motion__btn"
        aria-pressed={paused}
        onClick={() => {
          setPaused((p) => !p);
        }}
      >
        Pause animation
      </button>
      <div className={paused ? "ol-motion-paused" : undefined}>{children}</div>
    </div>
  );
}

export const Kumiko: Story = {
  name: "Kumiko (opt-in)",
  parameters: {
    docs: {
      description: {
        story:
          '`class="ol-motion-kumiko"` on any block: hairlines assemble into a lattice while something loads. For waits only: it plays once, and repeats only inside `role="status"` or `aria-busy="true"`. `.ol-motion-paused` (or `data-motion="paused"`) on any ancestor stops it (WCAG 2.2.2). Under reduced motion the lattice stays still. Needs the opt-in stylesheet `olivine/motion-extras.css`, imported after `olivine/styles.css`.',
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <Pausable>
          <div className="ol-motion-kumiko" role="status" aria-label="Loading image" />
        </Pausable>
      )}
    </BothThemes>
  ),
};

function Shishi() {
  return (
    <div role="status" aria-label="Waiting for a reply" className="ol-sb-motion__stack">
      <svg
        className="ol-motion-shishi ol-sb-motion__shishi"
        viewBox="0 0 220 120"
        aria-hidden="true"
      >
        <line className="ol-motion-shishi__spout" x1="20" y1="18" x2="58" y2="18" />
        <line className="ol-motion-shishi__drip" x1="58" y1="20" x2="58" y2="40" />
        <rect className="ol-motion-shishi__stone" x="164" y="96" width="34" height="14" />
        <line className="ol-motion-shishi__post" x1="110" y1="62" x2="110" y2="110" />
        <line className="ol-motion-shishi__ground" x1="0" y1="110" x2="220" y2="110" />
        <g className="ol-motion-shishi__tube">
          <rect className="ol-motion-shishi__fill" x="44" y="54" width="70" height="14" />
          <rect className="ol-motion-shishi__body" x="44" y="54" width="140" height="14" />
          <circle className="ol-motion-shishi__pin" cx="110" cy="61" r="2.5" />
        </g>
        <g className="ol-motion-shishi__knock">
          <line x1="176" y1="86" x2="172" y2="80" />
          <line x1="186" y1="86" x2="190" y2="80" />
        </g>
      </svg>
      <span className="ol-sb-motion__note">Waiting for a reply…</span>
    </div>
  );
}

export const ShishiOdoshi: Story = {
  name: "Shishi-odoshi (opt-in)",
  parameters: {
    docs: {
      description: {
        story:
          '`class="ol-motion-shishi"` on this SVG: the bamboo fills slowly, tips, empties and knocks the stone. An indeterminate wait with rhythm, for waits only (inside `role="status"`), like the ensō. `.ol-motion-paused` (or `data-motion="paused"`) on any ancestor stops it (WCAG 2.2.2). Needs the opt-in stylesheet `olivine/motion-extras.css`, imported after `olivine/styles.css`.',
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <Pausable>
          <Shishi />
        </Pausable>
      )}
    </BothThemes>
  ),
};

/* ---------- Opt-in: sumi ---------- */

function SumiButton({ children, accent = false }: { children: string; accent?: boolean }) {
  const ref = useSumi<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      type="button"
      className={`ol-motion-sumi ol-sb-motion__btn${accent ? " ol-sb-motion__btn--accent" : ""}`}
    >
      {children}
      <span className="ol-motion-sumi__ink" aria-hidden="true">
        {children}
      </span>
    </button>
  );
}

export const Sumi: Story = {
  name: "Sumi (opt-in)",
  parameters: {
    docs: {
      description: {
        story:
          '`class="ol-motion-sumi"`: on press, ink blooms from the exact point with a hard edge and the label inverts inside it (an `aria-hidden` copy in `__ink`). `useSumi()` / `bindSumi()` add the pointer position; with the keyboard it blooms from the centre. Needs the opt-in stylesheet `olivine/motion-extras.css`, imported after `olivine/styles.css`.',
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <div className="ol-sb-motion__row">
          <SumiButton>Add to order</SumiButton>
          <SumiButton accent>Pay deposit</SumiButton>
        </div>
      )}
    </BothThemes>
  ),
};

/* ---------- Opt-in: shoji ---------- */

const STEPS = [
  ["01", "Measure", "Before cutting, we measure your hand and how you play."],
  ["02", "Build", "Twelve weeks of cutting, drying and finishing."],
  ["03", "Deliver", "A final set-up and delivery in person or by courier."],
] as const;

function ShojiDemo() {
  const [page, setPage] = useState(0);
  const go = (step: number) => {
    void startViewTransition(
      () => {
        setPage((p) => (p + step + STEPS.length) % STEPS.length);
      },
      { direction: step > 0 ? "forward" : "back" },
    );
  };
  const [num, title, text] = STEPS[page] ?? STEPS[0];
  return (
    <div className="ol-sb-motion__stack">
      <div className="ol-motion-shoji ol-sb-motion__page">
        <span className="ol-sb-motion__num">{num}</span>
        <div>
          <Text variant="h1" as="p">
            {title}
          </Text>
          <Text tone="muted" as="p">
            {text}
          </Text>
        </div>
      </div>
      <div className="ol-sb-motion__row">
        <button
          type="button"
          className="ol-sb-motion__btn"
          aria-label="Previous"
          onClick={() => {
            go(-1);
          }}
        >
          ←
        </button>
        <button
          type="button"
          className="ol-sb-motion__btn"
          aria-label="Next"
          onClick={() => {
            go(1);
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

export const Shoji: Story = {
  name: "Shoji (opt-in)",
  parameters: {
    docs: {
      description: {
        story:
          '`class="ol-motion-shoji"` with `startViewTransition(update, { direction })`: the new page slides over the old with a hairline on its edge. Without View Transitions, or with reduced motion, the change is direct.',
      },
    },
  },
  render: () => <BothThemes>{() => <ShojiDemo />}</BothThemes>,
};

/* ---------- Opt-in: origami ---------- */

function OrigamiDemo() {
  const ref = useRef<HTMLHeadingElement>(null);
  const replay = useOrigami(ref);
  return (
    <div className="ol-sb-motion__stack">
      <h3 ref={ref} className="ol-motion-origami ol-sb-motion__origami">
        Fold, not decorate.
      </h3>
      <button type="button" className="ol-sb-motion__btn" onClick={replay}>
        ↻ Replay
      </button>
    </div>
  );
}

export const Origami: Story = {
  name: "Origami (opt-in)",
  parameters: {
    docs: {
      description: {
        story:
          "Last resort, kept sober. `useOrigami()` / `foldOrigami()` print a one-line title on a fan-folded strip that opens left to right when it enters the viewport. The real text stays for assistive technology; without the script it is a plain title. Needs the opt-in stylesheet `olivine/motion-extras.css`, imported after `olivine/styles.css`.",
      },
    },
  },
  render: () => <BothThemes>{() => <OrigamiDemo />}</BothThemes>,
};

/* ---------- Reduced motion ---------- */

export const ReducedMotion: Story = {
  name: "Reduced motion",
  parameters: {
    docs: {
      description: {
        story:
          "`prefers-reduced-motion: reduce` (or `.ol-reduce-motion` on a subtree, as here): every duration is 1ms, loops stop on their end state, View Transitions are skipped and nothing is scroll-linked.",
      },
    },
  },
  render: () => (
    <BothThemes>
      {() => (
        <div className="ol-reduce-motion ol-sb-motion__stack">
          <Replayable>
            <JoHaKyuDemo />
          </Replayable>
          <ShodoDemo />
          <Shishi />
          <div className="ol-motion-kumiko" role="status" aria-label="Loading image" />
          <KakejikuDemo />
        </div>
      )}
    </BothThemes>
  ),
};
