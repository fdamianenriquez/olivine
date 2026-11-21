import { type ReactNode, type SyntheticEvent, useState } from "react";

import { Alert, Button, Checkbox, Field, Input, Label, Stepper, Switch } from "../../../src";
import {
  BOARDS,
  BODY_WOODS,
  byId,
  EXTRAS,
  FINISHES,
  GUARDS,
  type GuitarConfig,
  HARDWARE,
  MODELS,
  NECK_WOODS,
  PICKUPS,
  quote,
  SWATCH_PICKUP,
  yen,
} from "./data";
import { GuitarSilhouette, GuitarSVG } from "./GuitarSVG";
import { photo } from "./images";
import { SectionHead } from "./Parts";
import { ColorSwatch, KnobSwatch, PickupSwatch, ShapeSwatch, WoodSwatch } from "./Swatches";

export const STEPS = ["Model", "Body", "Neck", "Sound", "Extras", "Order"] as const;

/** A photograph of the sample when there is one, otherwise the vector swatch. */
function sample(key: string, fallback: ReactNode): ReactNode {
  const src = photo(key);
  return src ? (
    <img className="sg-piece__img" src={src} alt="" loading="lazy" decoding="async" />
  ) : (
    fallback
  );
}

interface CavitiesProps<T extends { id: string; name: string; price?: number }> {
  title: string;
  name: string;
  list: readonly T[];
  value: string;
  onChange: (id: string) => void;
  piece: (item: T) => ReactNode;
  /** Replaces the surcharge line, e.g. for a model whose price is its base price. */
  note?: (item: T) => string;
}

/**
 * One group of options, each waiting in its own cut-out in the foam. Native radios, so the group is
 * a fieldset with a legend and arrow keys work; the well is the visible control.
 */
function Cavities<T extends { id: string; name: string; price?: number }>({
  title,
  name,
  list,
  value,
  onChange,
  piece,
  note,
}: CavitiesProps<T>) {
  return (
    <fieldset className="sg-cavities">
      <legend>
        <Label>{title}</Label>
      </legend>
      <div className="sg-cavities__row">
        {list.map((item) => {
          const text = note ? note(item) : item.price ? `+${yen(item.price)}` : "Included";
          return (
            <label key={item.id} className="sg-cav">
              <input
                type="radio"
                className="sg-cav__input"
                name={name}
                checked={value === item.id}
                onChange={() => {
                  onChange(item.id);
                }}
              />
              <span className="sg-cav__well">{piece(item)}</span>
              <span className="sg-cav__name">{item.name}</span>
              <span
                className={["sg-cav__price", !/\d/.test(text) && "sg-cav__price--word"]
                  .filter(Boolean)
                  .join(" ")}
              >
                {text}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface ConfiguratorProps {
  cfg: GuitarConfig;
  /** Returns the setter of one field of the configuration. */
  set: <K extends keyof GuitarConfig>(key: K) => (value: GuitarConfig[K]) => void;
  step: number;
  setStep: (step: number) => void;
}

const EMAIL = /.+@.+\..+/;

/**
 * The case configurator: six steps. The guitar lies in its foam cut-out and redraws for every
 * option; the options wait in cavities under it; the quote slip and the order form sit beside it.
 * Nothing is sent or stored.
 */
export function Configurator({ cfg, set, step, setStep }: ConfiguratorProps) {
  const q = quote(cfg);
  const model = byId(MODELS, cfg.model);
  const neck = byId(NECK_WOODS, cfg.neck);
  const [tried, setTried] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [order, setOrder] = useState<string | null>(null);
  const emailOk = EMAIL.test(email);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setTried(true);
    if (name.trim() && emailOk && terms) setOrder("SG-2026-0142");
  };

  const panels: ReactNode[] = [
    <Cavities
      key="model"
      title="Body shape"
      name="c-model"
      list={MODELS.map((m) => ({ ...m, price: m.base }))}
      value={cfg.model}
      onChange={(id) => {
        set("model")(byId(MODELS, id).id);
      }}
      piece={(m) => <ShapeSwatch model={m.id} />}
      note={(m) => yen(m.base)}
    />,
    <>
      <Cavities
        title="Body wood"
        name="c-wood"
        list={BODY_WOODS}
        value={cfg.wood}
        onChange={set("wood")}
        piece={(w) =>
          sample(`sw-wood-${w.id}`, <WoodSwatch color={w.base} grain={w.grain + 0.2} />)
        }
      />
      <Cavities
        title="Finish · nitro"
        name="c-fin"
        list={FINISHES}
        value={cfg.finish}
        onChange={set("finish")}
        piece={(f) => sample(`sw-finish-${f.id}`, <ColorSwatch color={f.color} alpha={f.alpha} />)}
      />
    </>,
    <>
      <Cavities
        title="Neck"
        name="c-neck"
        list={NECK_WOODS}
        value={cfg.neck}
        onChange={set("neck")}
        piece={(n) => sample(`sw-neck-${n.id}`, <WoodSwatch color={n.color} />)}
      />
      <Cavities
        title="Fretboard"
        name="c-board"
        list={BOARDS}
        value={cfg.board}
        onChange={set("board")}
        piece={(b) =>
          sample(
            b.color ? `sw-board-${b.id}` : `sw-neck-${neck.id}`,
            <WoodSwatch color={b.color ?? neck.color} grain={0.5} />,
          )
        }
      />
    </>,
    <>
      <Cavities
        title="Pickups"
        name="c-pu"
        list={PICKUPS}
        value={cfg.pickups}
        onChange={set("pickups")}
        piece={(p) =>
          sample(`sw-pu-${SWATCH_PICKUP[p.id] ?? p.id}`, <PickupSwatch layout={p.layout} />)
        }
      />
      <Cavities
        title="Pickguard"
        name="c-guard"
        list={GUARDS}
        value={cfg.guard}
        onChange={set("guard")}
        piece={(g) =>
          sample(
            `sw-guard-${g.id}`,
            g.color ? (
              <ColorSwatch color={g.color} />
            ) : (
              <ColorSwatch color="transparent" under="transparent" />
            ),
          )
        }
        note={() => "Included"}
      />
    </>,
    <>
      <Cavities
        title="Hardware"
        name="c-hw"
        list={HARDWARE}
        value={cfg.hardware}
        onChange={set("hardware")}
        piece={(h) => sample(`sw-hw-${h.id}`, <KnobSwatch color={h.color} />)}
      />
      <div className="sg-extras">
        <Switch
          id="o-case"
          label={
            <>
              Wool-lined hard case · <span className="sg-fig sg-fig--xs">{yen(EXTRAS.case)}</span>
            </>
          }
          checked={cfg.case}
          onChange={(e) => {
            set("case")(e.target.checked);
          }}
        />
        <Field
          label="Heel engraving"
          hint={
            <>
              Up to 12 Latin characters or 6 kanji ·{" "}
              <span className="sg-fig sg-fig--xs">{yen(EXTRAS.engraving)}</span>
            </>
          }
          aside="Optional"
        >
          <Input
            maxLength={12}
            value={cfg.engraving}
            onChange={(e) => {
              set("engraving")(e.target.value);
            }}
            placeholder="Your name or a date"
          />
        </Field>
      </div>
    </>,
    <form key="order" className="sg-orderform" onSubmit={submit} noValidate>
      {order ? (
        <Alert tone="success" tag="Reserved" title={`Order ${order} · demo`}>
          Nothing was sent: this is a demonstration. On a real site you would now pay the 30 %
          deposit.
        </Alert>
      ) : (
        <>
          <div className="sg-two">
            <Field label="Name" required error={tried && !name.trim() ? "Enter your name." : null}>
              <Input
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </Field>
            <Field
              label="Email"
              required
              error={tried && !emailOk ? "Enter a full address, like you@mail.jp." : null}
            >
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </Field>
          </div>
          <Checkbox
            checked={terms}
            onChange={(e) => {
              setTerms(e.target.checked);
            }}
            label="I understand this is a demo and no real order is created"
            hint={tried && !terms ? "Tick the box to continue." : undefined}
          />
          <Button type="submit" variant="accent" arrow>
            Reserve my guitar
          </Button>
        </>
      )}
    </form>,
  ];

  return (
    <section id="build" className="sg-sec sg-build" aria-labelledby="build-title">
      <SectionHead kicker="Configurator" title="Your guitar, step by step." id="build-title">
        Every option sits in its own cut-out, the way parts wait in the case before assembly. Pick
        one and it goes onto the guitar.
      </SectionHead>
      <Stepper
        steps={STEPS.map((label) => ({ label }))}
        current={step}
        onStepChange={setStep}
        linear={false}
        label="Build your guitar"
      />
      <div className="sg-build__grid">
        <div className="sg-case">
          <div className="sg-case__lid" aria-hidden="true">
            <span>Shirakaba · {model.name}</span>
            <span lang="ja">{model.kanji}</span>
          </div>
          <div className="sg-case__bed">
            <svg
              viewBox="0 0 640 310"
              className="sg-case__guitar"
              role="img"
              aria-label={`${model.name} as configured, lying in its case`}
            >
              <g transform="translate(8,305) rotate(-90)">
                <g transform="translate(-4,4)" className="sg-case__cut">
                  <GuitarSilhouette model={model.id} grow={6} width={300} height={620} />
                </g>
                <GuitarSVG config={cfg} width={300} height={620} decorative />
              </g>
            </svg>
          </div>
          <div className="sg-case__tray">{panels[step]}</div>
        </div>

        <aside className="sg-slip" aria-label="Quote">
          <p className="sg-slip__head">
            <Label>Quote · {model.name}</Label>
            <span className="sg-slip__date">2026</span>
          </p>
          <table className="sg-slip__table">
            <tbody>
              {q.lines.map(([label, amount]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{amount ? yen(amount) : "—"}</td>
                </tr>
              ))}
              <tr className="sg-slip__sub">
                <th scope="row">Consumption tax 10 %</th>
                <td>{yen(q.tax)}</td>
              </tr>
            </tbody>
          </table>
          <dl className="sg-slip__total">
            <div className="sg-slip__sum">
              <dt>
                <Label>Total incl. tax</Label>
              </dt>
              <dd className="sg-fig sg-fig--l">{yen(q.total)}</dd>
            </div>
            <div>
              <dt>
                <Label>Deposit · 30 %</Label>
              </dt>
              <dd className="sg-fig sg-fig--m">{yen(q.deposit)}</dd>
            </div>
            <div>
              <dt>
                <Label>Weeks</Label>
              </dt>
              <dd className="sg-fig sg-fig--m">{q.weeks}</dd>
            </div>
          </dl>
          <div className="sg-slip__nav">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => {
                setStep(step - 1);
              }}
            >
              ← {step > 0 ? STEPS[step - 1] : "Back"}
            </Button>
            {step < STEPS.length - 1 && (
              <Button
                variant="solid"
                arrow
                onClick={() => {
                  setStep(step + 1);
                }}
              >
                {STEPS[step + 1]}
              </Button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
