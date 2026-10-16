import "./shirakaba.css";

import { type ReactNode, type SyntheticEvent, useState } from "react";

import {
  Accordion,
  Alert,
  Button,
  Card,
  Checkbox,
  CheckGroup,
  Container,
  Divider,
  Field,
  FileInput,
  Input,
  Label,
  ListGroup,
  Modal,
  Nav,
  Navbar,
  Progress,
  Radio,
  Range,
  Root,
  Select,
  Sheet,
  Stack,
  Stat,
  Switch,
  Table,
  Tabs,
  TabsTab,
  Text,
  Textarea,
  ToastProvider,
  Tooltip,
  useToast,
} from "../../../src";
import {
  BOARDS,
  BODY_WOODS,
  byId,
  DEFAULT_CONFIG,
  EXTRAS,
  FINISHES,
  GUARDS,
  type GuitarConfig,
  HARDWARE,
  IMAGES,
  type ModelId,
  MODELS,
  NECK_WOODS,
  type Option,
  PICKUPS,
  PROFILES,
  quote,
  SHEENS,
  yen,
} from "./data";
import { GuitarSVG } from "./GuitarSVG";
import { Photo, Ridge, Swatch } from "./Parts";

const price = (amount: number) => (amount ? `+${yen(amount)}` : "Included");
const STEPS = ["Model", "Body", "Neck", "Sound", "Extras", "Order"] as const;

interface ChoiceProps<T extends Option> {
  name: string;
  list: readonly T[];
  value: string;
  onChange: (id: string) => void;
  swatch?: (item: T) => ReactNode;
  desc?: (item: T) => string | undefined;
}

/** One radio per option, with an optional swatch, the price and a description. */
function Choice<T extends Option>({ name, list, value, onChange, swatch, desc }: ChoiceProps<T>) {
  return list.map((item) => (
    <Radio
      key={item.id}
      name={name}
      checked={value === item.id}
      onChange={() => {
        onChange(item.id);
      }}
      label={
        <span className="sg-choice">
          {swatch?.(item)}
          <span>{item.name}</span>
          <span className="sg-choice__price">{price(item.price)}</span>
        </span>
      }
      hint={desc?.(item)}
    />
  ));
}

function StepNav({ step, setStep }: { step: number; setStep: (step: number) => void }) {
  const previous = STEPS[step - 1];
  const next = STEPS[step + 1];
  return (
    <div className="sg-stepnav">
      <Button
        variant="ghost"
        disabled={step === 0}
        onClick={() => {
          setStep(step - 1);
        }}
      >
        ← {previous ?? "Back"}
      </Button>
      {next && (
        <Button
          variant="solid"
          arrow
          onClick={() => {
            setStep(step + 1);
          }}
        >
          {next}
        </Button>
      )}
    </div>
  );
}

interface Order {
  no: string;
  model: string;
  total: number;
}

interface QuoteRow {
  item: ReactNode;
  amount: ReactNode;
}

function Shirakaba() {
  const toast = useToast();
  const [cfg, setCfg] = useState<GuitarConfig>(DEFAULT_CONFIG);
  const set =
    <K extends keyof GuitarConfig>(key: K) =>
    (value: GuitarConfig[K]) => {
      setCfg((c) => ({ ...c, [key]: value }));
    };
  const [step, setStep] = useState(0);
  const [banner, setBanner] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const q = quote(cfg);
  const model = byId(MODELS, cfg.model);
  const emailOk = /.+@.+\..+/.test(email);
  const ok = name.trim() !== "" && emailOk && terms;

  const pick = (id: ModelId) => {
    set("model")(id);
    setStep(1);
    document.getElementById("build")?.scrollIntoView();
  };
  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setTried(true);
    if (ok) setConfirm(true);
  };
  const place = () => {
    const no = `SG-2026-${String(142 + orders.length).padStart(4, "0")}`;
    setOrders((all) => [...all, { no, model: model.name, total: q.total }]);
    toast.show({
      tone: "success",
      meta: no,
      title: "Reservation recorded",
      description:
        "On a real site you’d receive the deposit invoice. Here it only lives in this tab.",
      duration: 6000,
    });
    setConfirm(false);
  };

  const quoteRows: QuoteRow[] = [
    ...q.lines.map(([item, amount]) => ({ item, amount: amount ? yen(amount) : "—" })),
    { item: "Subtotal", amount: yen(q.subtotal) },
    { item: "Consumption tax 10 %", amount: yen(q.tax) },
    { item: <b>Total</b>, amount: <b>{yen(q.total)}</b> },
  ];

  return (
    <div className="sg-page">
      {banner && (
        <div className="sg-demo">
          <Container>
            <Alert
              tone="warning"
              tag="Demo"
              title="Demonstration site"
              onClose={() => {
                setBanner(false);
              }}
            >
              Sitio de demostración. Shirakaba Gakki is a fictional brand made to show the Olivine
              component library. No guitars are sold, no data is stored and no payments are taken.
            </Alert>
          </Container>
        </div>
      )}

      <Navbar
        sticky
        brand="Shirakaba"
        kanji="白樺楽器"
        href="#top"
        links={[
          { label: "Workshop", href: "#workshop" },
          { label: "Models", href: "#models" },
          { label: "Build", href: "#build", active: true },
          { label: "Process", href: "#process" },
          { label: "FAQ", href: "#faq" },
        ]}
        end={
          <Button size="s" variant="accent" arrow href="#build">
            Order a guitar
          </Button>
        }
      />

      {/* Hero: full-bleed photo, text on a paper panel so contrast never depends on the image. The navbar is the page banner, so this is not a header element. */}
      <div id="top" className="sg-hero">
        <Photo img={IMAGES.hero} className="sg-hero__photo">
          <Container className="sg-hero__over">
            <div className="sg-hero__panel">
              <Label index="01" dot>
                Matsumoto · Nagano · since 1987
              </Label>
              <Text variant="display-xl" as="h1" className="sg-hero__title">
                Guitars made at the foot of the Alps.
              </Text>
              <Text variant="body-l" tone="muted" className="sg-measure">
                Eleven luthiers in a small workshop in the Matsumoto valley. Dry winter air lets us
                season timber slowly, so every instrument takes as long as it takes — and is built
                for one player.
              </Text>
              <div className="sg-actions">
                <Button variant="accent" brackets arrow href="#build">
                  Build yours
                </Button>
                <Button variant="outline" href="#models">
                  See the models
                </Button>
              </div>
            </div>
            <Text variant="kanji" vertical aria-hidden="true" lang="ja" className="sg-hero__kanji">
              山の木で作る
            </Text>
          </Container>
        </Photo>
        <Container>
          <div className="sg-ridge">
            <Ridge className="sg-ridge__svg" />
            <span className="sg-ridge__peak">
              <Label muted>
                <span lang="ja">常念岳</span> · Mt Jōnen 2,857 m
              </Label>
            </span>
          </div>
          <div className="sg-stats">
            <Stat label="Luthiers" value="11" />
            <Stat label="Guitars a year" value="180" />
            <Stat label="Workshop humidity" value="45" unit="%" accent />
            <Stat label="Lead time · weeks" value="12" delta="from deposit" />
          </div>
        </Container>
      </div>

      {/* Workshop */}
      <section id="workshop" className="sg-section sg-section--tint">
        <Container>
          <div className="sg-split">
            <Stack gap={6}>
              <Label index="02">The workshop</Label>
              <Text variant="h1" as="h2">
                Timber that waits <i>a whole winter</i> before it becomes a guitar.
              </Text>
              <Text tone="muted" className="sg-measure">
                Matsumoto has one of the longest guitar-making traditions in Japan. We work at
                workshop scale: every body crosses the same four benches, and the same person signs
                it at the end.
              </Text>
              <Accordion
                defaultOpen={[0]}
                items={[
                  {
                    title: "Seasoning · 6 to 18 months",
                    content:
                      "Boards rest in the north store at 40–50 % humidity. We weigh them every month; they go to the saw only once they stop losing water.",
                  },
                  {
                    title: "Cutting and carving",
                    content:
                      "Outlines are cut from templates and the contours carved by hand. The neck fits the pocket with no shims.",
                  },
                  {
                    title: "Nitro lacquer",
                    content:
                      "Thin coats, sanded between each, then three weeks of curing. Kakishibu is rubbed on by hand in four passes.",
                  },
                  {
                    title: "Setup and test",
                    content:
                      "Fret dress, action, intonation and an hour of amplified playing before it ships.",
                  },
                ]}
              />
            </Stack>
            <Stack gap={6}>
              <Photo img={IMAGES.hands} />
              <Sheet crosshair flush title="Bench 03" meta="Order SG-2026-0131 · in progress">
                <div className="sg-bench">
                  <GuitarSVG
                    config={{
                      ...DEFAULT_CONFIG,
                      model: "utsukushi",
                      finish: "kakishibu",
                      wood: "ash",
                      guard: "none",
                      pickups: "p90",
                      hardware: "aged",
                    }}
                    crop="body"
                    className="sg-bench__art"
                  />
                  <Stack gap={4}>
                    <Progress label="Seasoning" value={100} />
                    <Progress label="Cutting" value={100} />
                    <Progress label="Finish" variant="segments" value={9} max={20} />
                    <Progress label="Setup" value={0} />
                  </Stack>
                </div>
              </Sheet>
            </Stack>
          </div>
        </Container>
      </section>

      {/* Models */}
      <section id="models" className="sg-section">
        <Container>
          <div className="sg-bar">
            <Stack gap={3}>
              <Label index="03">Models</Label>
              <Text variant="display-m" as="h2">
                Three shapes, all our own.
              </Text>
            </Stack>
            <Text tone="muted" className="sg-measure">
              Each model is named after a place near the workshop. Base prices before tax, with an
              alder body, maple neck and three single coils.
            </Text>
          </div>
          <div className="sg-models">
            {MODELS.map((m, i) => (
              <Card
                key={m.id}
                index={String(i + 1).padStart(2, "0")}
                meta={<span lang="ja">{m.kanji}</span>}
                media={
                  <div className="sg-models__media">
                    <GuitarSVG config={{ ...cfg, model: m.id }} className="sg-models__art" />
                  </div>
                }
                title={m.name}
                text={m.blurb}
                footer={
                  <>
                    <Text variant="h3" as="span">
                      from {yen(m.base)}
                    </Text>
                    <Button
                      size="s"
                      variant={cfg.model === m.id ? "solid" : "outline"}
                      arrow
                      onClick={() => {
                        pick(m.id);
                      }}
                    >
                      Build
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Band */}
      <section className="sg-band" aria-label="Timber store">
        <Photo img={IMAGES.shed} className="sg-band__photo">
          <Container className="sg-band__over">
            <blockquote className="sg-band__quote">
              <Text variant="h1" as="p">
                “Every board in this store already belongs to someone. They just haven’t ordered
                yet.”
              </Text>
              <Label muted>Head of timber · north store</Label>
            </blockquote>
          </Container>
        </Photo>
      </section>

      {/* Configurator */}
      <section id="build" className="sg-section sg-section--tint">
        <Container>
          <Stack gap={3}>
            <Label index="04">Configurator</Label>
            <Text variant="display-m" as="h2">
              Your guitar, step by step.
            </Text>
          </Stack>
          <div className="sg-config">
            <aside className="sg-preview" aria-label="Preview">
              <Sheet title={model.name} meta={<span lang="ja">{model.kanji}</span>}>
                <div className="sg-preview__stage">
                  <GuitarSVG config={cfg} className="sg-preview__art" />
                  <div className="sg-preview__details">
                    <GuitarSVG
                      config={cfg}
                      crop="head"
                      className="sg-preview__crop"
                      title="Headstock detail"
                    />
                    <Label muted>3+3 head</Label>
                  </div>
                </div>
                <div className="sg-preview__sum">
                  <Stat label="Total incl. tax" value={yen(q.total)} size="m" accent />
                  <Stat label="Lead time · weeks" value={String(q.weeks)} size="m" />
                </div>
              </Sheet>
            </aside>

            <div className="sg-steps">
              <Tabs indexed value={step} onChange={setStep}>
                <TabsTab label={STEPS[0]}>
                  <Stack gap={6}>
                    <CheckGroup legend="Choose a body shape">
                      {MODELS.map((m) => (
                        <Radio
                          key={m.id}
                          name="model"
                          checked={cfg.model === m.id}
                          onChange={() => {
                            set("model")(m.id);
                          }}
                          label={
                            <span className="sg-choice">
                              <span>
                                {m.name}{" "}
                                <span className="sg-kanji" lang="ja">
                                  {m.kanji}
                                </span>
                              </span>
                              <span className="sg-choice__price">{yen(m.base)}</span>
                            </span>
                          }
                          hint={m.blurb}
                        />
                      ))}
                    </CheckGroup>
                    <StepNav step={step} setStep={setStep} />
                  </Stack>
                </TabsTab>

                <TabsTab label={STEPS[1]}>
                  <Stack gap={6}>
                    <CheckGroup legend="Body wood">
                      <Choice
                        name="wood"
                        list={BODY_WOODS}
                        value={cfg.wood}
                        onChange={set("wood")}
                        swatch={(x) => <Swatch color={x.base} />}
                        desc={(x) => x.note}
                      />
                    </CheckGroup>
                    <CheckGroup legend="Finish">
                      <Choice
                        name="finish"
                        list={FINISHES}
                        value={cfg.finish}
                        onChange={set("finish")}
                        swatch={(x) => (
                          <Swatch
                            base={byId(BODY_WOODS, cfg.wood).base}
                            color={x.color}
                            alpha={x.alpha}
                          />
                        )}
                        desc={(x) => x.kind + (x.weeks ? ` · +${String(x.weeks)} weeks` : "")}
                      />
                    </CheckGroup>
                    <CheckGroup legend="Lacquer sheen" inline>
                      {SHEENS.map((s) => (
                        <Radio
                          key={s.id}
                          name="sheen"
                          label={s.name}
                          checked={cfg.sheen === s.id}
                          onChange={() => {
                            set("sheen")(s.id);
                          }}
                        />
                      ))}
                    </CheckGroup>
                    <StepNav step={step} setStep={setStep} />
                  </Stack>
                </TabsTab>

                <TabsTab label={STEPS[2]}>
                  <Stack gap={6}>
                    <CheckGroup legend="Neck wood">
                      <Choice
                        name="neck"
                        list={NECK_WOODS}
                        value={cfg.neck}
                        onChange={set("neck")}
                        swatch={(x) => <Swatch color={x.color} />}
                        desc={(x) => (x.weeks ? `+${String(x.weeks)} week in the kiln` : undefined)}
                      />
                    </CheckGroup>
                    <CheckGroup legend="Fretboard">
                      <Choice
                        name="board"
                        list={BOARDS}
                        value={cfg.board}
                        onChange={set("board")}
                        swatch={(x) => (
                          <Swatch color={x.color ?? byId(NECK_WOODS, cfg.neck).color} />
                        )}
                      />
                    </CheckGroup>
                    <div className="sg-two">
                      <Field label="Neck profile">
                        <Select
                          value={cfg.profile}
                          onChange={(e) => {
                            set("profile")(e.target.value);
                          }}
                          options={PROFILES}
                        />
                      </Field>
                      <CheckGroup legend="Frets" inline>
                        {[21, 22].map((n) => (
                          <Radio
                            key={n}
                            name="frets"
                            label={String(n)}
                            checked={cfg.frets === n}
                            onChange={() => {
                              set("frets")(n);
                            }}
                          />
                        ))}
                      </CheckGroup>
                    </div>
                    <Field label="Fretboard radius" aside={`${String(cfg.radius)}″`}>
                      <Range
                        min={7.25}
                        max={16}
                        step={0.25}
                        value={cfg.radius}
                        onChange={(e) => {
                          set("radius")(Number(e.target.value));
                        }}
                        format={(v) => `${String(v)}″`}
                      />
                    </Field>
                    <StepNav step={step} setStep={setStep} />
                  </Stack>
                </TabsTab>

                <TabsTab label={STEPS[3]}>
                  <Stack gap={6}>
                    <CheckGroup legend="Pickups">
                      <Choice
                        name="pickups"
                        list={PICKUPS}
                        value={cfg.pickups}
                        onChange={set("pickups")}
                        desc={(x) => x.note}
                      />
                    </CheckGroup>
                    <CheckGroup legend="Pickguard">
                      {GUARDS.map((g) => (
                        <Radio
                          key={g.id}
                          name="guard"
                          checked={cfg.guard === g.id}
                          onChange={() => {
                            set("guard")(g.id);
                          }}
                          label={
                            <span className="sg-choice">
                              {g.color ? (
                                <Swatch color={g.color} />
                              ) : (
                                <span className="sg-swatch sg-swatch--none" aria-hidden="true" />
                              )}
                              <span>{g.name}</span>
                              <span className="sg-choice__price">Included</span>
                            </span>
                          }
                        />
                      ))}
                    </CheckGroup>
                    <CheckGroup legend="Hardware">
                      <Choice
                        name="hw"
                        list={HARDWARE}
                        value={cfg.hardware}
                        onChange={set("hardware")}
                        swatch={(x) => <Swatch color={x.color} />}
                      />
                    </CheckGroup>
                    <StepNav step={step} setStep={setStep} />
                  </Stack>
                </TabsTab>

                <TabsTab label={STEPS[4]}>
                  <Stack gap={6}>
                    <Switch
                      id="o-case"
                      label={`Wool-lined hard case · ${yen(EXTRAS.case)}`}
                      checked={cfg.case}
                      onChange={(e) => {
                        set("case")(e.target.checked);
                      }}
                    />
                    <Field
                      label="Heel engraving"
                      hint={`Up to 12 Latin characters or 6 kanji · ${yen(EXTRAS.engraving)}`}
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
                    <Field label="Tuning on delivery">
                      <Select
                        value={cfg.setup}
                        onChange={(e) => {
                          set("setup")(e.target.value);
                        }}
                        options={[
                          { value: "e", label: "Standard (E) · strings 10–46" },
                          { value: "eb", label: "Half step down (E♭) · 10–52" },
                          { value: "d", label: "Drop D · 10–52" },
                        ]}
                      />
                    </Field>
                    <StepNav step={step} setStep={setStep} />
                  </Stack>
                </TabsTab>

                <TabsTab label={STEPS[5]}>
                  <form onSubmit={submit} noValidate>
                    <Stack gap={6}>
                      <Table<QuoteRow>
                        dense
                        caption={`Fig. 04 — Sample quote · ${String(q.weeks)} weeks to build`}
                        columns={[
                          { key: "item", label: "Item", render: (r) => r.item },
                          {
                            key: "amount",
                            label: "Amount",
                            numeric: true,
                            render: (r) => r.amount,
                          },
                        ]}
                        rows={quoteRows}
                      />
                      <div className="sg-two">
                        <Stat
                          label="Deposit to reserve · 30 %"
                          value={yen(q.deposit)}
                          size="m"
                          accent
                        />
                        <Stat
                          label="Balance on completion"
                          value={yen(q.total - q.deposit)}
                          size="m"
                        />
                      </div>
                      <Divider label="Your details" />
                      <div className="sg-two">
                        <Field
                          label="Name"
                          required
                          error={tried && name.trim() === "" ? "Enter your name." : null}
                        >
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
                          error={
                            tried && !emailOk ? "Enter a full address, like you@mail.jp." : null
                          }
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
                      <Field label="Ship to">
                        <Select
                          defaultValue="jp"
                          options={[
                            { value: "jp", label: "Japan" },
                            { value: "mx", label: "Mexico" },
                            { value: "us", label: "United States" },
                            { value: "eu", label: "European Union" },
                            { value: "other", label: "Elsewhere" },
                          ]}
                        />
                      </Field>
                      <Field label="Notes for the luthier" aside="Optional">
                        <Textarea
                          rows={3}
                          placeholder="How you play, what music, a guitar you love…"
                        />
                      </Field>
                      <FileInput
                        id="c-files"
                        label="References"
                        hint="Photos or sketches · nothing is uploaded in this demo"
                        multiple
                        accept="image/*"
                      />
                      <Checkbox
                        id="c-terms"
                        checked={terms}
                        onChange={(e) => {
                          setTerms(e.target.checked);
                        }}
                        label="I understand this is a demo and no real order is created"
                        hint={tried && !terms ? "Tick the box to continue." : undefined}
                      />
                      <div className="sg-stepnav">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            setStep(4);
                          }}
                        >
                          ← {STEPS[4]}
                        </Button>
                        <Button type="submit" variant="accent" brackets arrow>
                          Reserve my guitar
                        </Button>
                      </div>
                    </Stack>
                  </form>
                </TabsTab>
              </Tabs>
              {orders.length > 0 && (
                <Sheet title="Orders this session" meta="In memory only">
                  <ListGroup
                    numbered
                    items={orders.map((o) => ({
                      title: `${o.no} · ${o.model}`,
                      meta: yen(o.total),
                    }))}
                  />
                </Sheet>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Process */}
      <section id="process" className="sg-section">
        <Container>
          <div className="sg-split">
            <Stack gap={6}>
              <Stack gap={4}>
                <Label index="05">After you order</Label>
                <Text variant="h1" as="h2">
                  From deposit to your door.
                </Text>
                <Text tone="muted" className="sg-measure">
                  We send photos from every bench. If something isn’t right before the finish goes
                  on, we change it at no cost.
                </Text>
              </Stack>
              <Photo img={IMAGES.frets} />
            </Stack>
            <ListGroup
              numbered
              boxed
              items={[
                {
                  title: "Reservation",
                  description: "You pay 30 % and we hold your place in the workshop queue.",
                },
                {
                  title: "Choosing the boards",
                  description: "We send photos of two or three boards so you can pick the grain.",
                },
                {
                  title: "Building",
                  description: "Cutting, carving, finish and setup, with photos after each stage.",
                },
                {
                  title: "Test and ship",
                  description:
                    "You pay the balance, we play it for an hour and it leaves Matsumoto insured.",
                },
              ]}
            />
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="sg-section sg-section--tint">
        <Container>
          <div className="sg-split">
            <Stack gap={4}>
              <Label index="06">Questions</Label>
              <Text variant="h1" as="h2">
                What people ask us most.
              </Text>
            </Stack>
            <Accordion
              items={[
                {
                  title: "Do you ship outside Japan?",
                  content:
                    "On a real site, yes — insured, in a wooden crate. Import duties are paid by the recipient.",
                },
                {
                  title: "Can I visit the workshop?",
                  content:
                    "On Saturdays by appointment. Matsumoto is about three hours from Tokyo by train.",
                },
                {
                  title: "What if I change my mind?",
                  content:
                    "You can change options until the finish starts. The deposit is refundable before cutting.",
                },
                {
                  title: "Is this shop real?",
                  content:
                    "No. Shirakaba Gakki is fictional — the page shows what the Olivine library looks like on a complete site.",
                },
              ]}
            />
          </div>
        </Container>
      </section>

      {/* Closing band */}
      <section className="sg-band" aria-label="Start a build">
        <Photo img={IMAGES.birch} className="sg-band__photo">
          <Container className="sg-band__over">
            <div className="sg-band__quote">
              <Text variant="display-m" as="p">
                Shirakaba means white birch.
              </Text>
              <Text tone="muted">
                It grows around the workshop, and it’s the first thing you see from the window each
                morning.
              </Text>
              <div className="sg-actions">
                <Button variant="accent" brackets arrow href="#build">
                  Start your build
                </Button>
              </div>
            </div>
          </Container>
        </Photo>
      </section>

      <footer className="sg-footer">
        <Container>
          <div className="sg-footer__grid">
            <Stack gap={2}>
              <Text variant="display-l" as="p">
                Shirakaba
              </Text>
              <Text variant="kanji" as="p" lang="ja" className="sg-footer__kanji">
                白樺楽器 · 松本
              </Text>
            </Stack>
            <Nav
              variant="vertical"
              label="Footer"
              items={[
                { label: "Workshop", href: "#workshop" },
                { label: "Models", href: "#models" },
                { label: "Build", href: "#build" },
                { label: "FAQ", href: "#faq" },
              ]}
            />
            <Stack gap={2}>
              <Label muted>Made with Olivine</Label>
              <Text variant="body-s" tone="muted">
                Demonstration only. Brand, models, people, prices and orders are fictional; any
                resemblance to real makers is coincidental. No personal data is collected.
              </Text>
              <Tooltip content="Guitar drawings are vector illustrations generated from each option; photographs are AI-generated.">
                <button type="button" className="ol-label ol-label--muted sg-about">
                  About the images ⓘ
                </button>
              </Tooltip>
            </Stack>
          </div>
        </Container>
      </footer>

      <Modal
        open={confirm}
        onClose={() => {
          setConfirm(false);
        }}
        index="04 — Order"
        title="Reserve this guitar?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirm(false);
              }}
            >
              Review
            </Button>
            <Button variant="accent" arrow onClick={place}>
              Yes, reserve
            </Button>
          </>
        }
      >
        <Stack gap={4}>
          <Text>
            {model.name} in {byId(FINISHES, cfg.finish).name.toLowerCase()},{" "}
            {byId(PICKUPS, cfg.pickups).name}. Deposit of <b>{yen(q.deposit)}</b>, ready in about{" "}
            {q.weeks} weeks.
          </Text>
          <Text tone="muted" variant="body-s">
            This is a demo: nothing is charged and no email is sent to {email}.
          </Text>
        </Stack>
      </Modal>
    </div>
  );
}

/** The whole Shirakaba Gakki demo site. Demo code: not exported from the library. */
export function ShirakabaPage() {
  return (
    <Root locale="en">
      <ToastProvider position="br">
        <Shirakaba />
      </ToastProvider>
    </Root>
  );
}
