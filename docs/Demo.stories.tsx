import "./demo.css";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { type SyntheticEvent, useState } from "react";

import {
  Accordion,
  Alert,
  Badge,
  Breadcrumb,
  Button,
  ButtonGroup,
  Card,
  Carousel,
  Checkbox,
  CheckGroup,
  Col,
  Container,
  Divider,
  Dropdown,
  Field,
  FileInput,
  Grid,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Link,
  ListGroup,
  Modal,
  Nav,
  Navbar,
  Offcanvas,
  Pagination,
  Popover,
  Progress,
  Radio,
  Range,
  Ratio,
  Root,
  Select,
  Sheet,
  Spinner,
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
} from "../src";

type Tone = "olivo" | "maple" | "ink" | "paper";

interface Work {
  n: number;
  title: string;
  place: string;
  year: string;
  cat: string;
  kanji: string;
  tone: Tone;
  text: string;
}

const WORKS: Work[] = [
  {
    n: 1,
    title: "Cocina 04",
    place: "Meguro, Tokio",
    year: "2026",
    cat: "Cocinas",
    kanji: "台",
    tone: "olivo",
    text: "Roble macizo y acero ennegrecido para un departamento de 38 m².",
  },
  {
    n: 2,
    title: "Repisa Andén",
    place: "Roma Norte, CDMX",
    year: "2026",
    cat: "Repisas",
    kanji: "棚",
    tone: "maple",
    text: "Un solo tablón de maple sobre rieles de acero, sin tornillos a la vista.",
  },
  {
    n: 3,
    title: "Lámpara Shoji",
    place: "Kioto",
    year: "2025",
    cat: "Lámparas",
    kanji: "灯",
    tone: "ink",
    text: "Papel washi sobre bastidor de pino; luz difusa a 2700 K.",
  },
  {
    n: 4,
    title: "Cocina 03",
    place: "Coyoacán, CDMX",
    year: "2025",
    cat: "Cocinas",
    kanji: "炊",
    tone: "paper",
    text: "Isla de concreto pulido con cajones de roble y jaladeras ocultas.",
  },
  {
    n: 5,
    title: "Repisa Vía",
    place: "Shimokitazawa",
    year: "2025",
    cat: "Repisas",
    kanji: "段",
    tone: "olivo",
    text: "Módulos apilables que se arman con una sola llave.",
  },
  {
    n: 6,
    title: "Lámpara Farol",
    place: "Oaxaca",
    year: "2024",
    cat: "Lámparas",
    kanji: "光",
    tone: "maple",
    text: "Barro negro de San Bartolo y pantalla de lino crudo.",
  },
];

const CATEGORIES = ["Todo", "Cocinas", "Repisas", "Lámparas"];

const SWATCH: Record<Tone, string> = {
  olivo: "ol-demo-swatch ol-demo-swatch--olivo",
  maple: "ol-demo-swatch ol-demo-swatch--maple",
  ink: "ol-demo-swatch",
  paper: "ol-demo-swatch ol-demo-swatch--paper",
};

interface Piece {
  code: string;
  name: string;
  wood: string;
  lead: number;
  stock: string;
  tone: "success" | "warning" | "danger" | "info";
  price: number;
}

const PIECES: Piece[] = [
  {
    code: "R-01",
    name: "Repisa Andén",
    wood: "Maple",
    lead: 4,
    stock: "Disponible",
    tone: "success",
    price: 6800,
  },
  {
    code: "R-02",
    name: "Repisa Vía (3 módulos)",
    wood: "Pino",
    lead: 3,
    stock: "Disponible",
    tone: "success",
    price: 9400,
  },
  {
    code: "L-01",
    name: "Lámpara Shoji",
    wood: "Pino",
    lead: 6,
    stock: "Bajo pedido",
    tone: "warning",
    price: 4200,
  },
  {
    code: "L-02",
    name: "Lámpara Farol",
    wood: "—",
    lead: 8,
    stock: "Agotado",
    tone: "danger",
    price: 5600,
  },
  {
    code: "C-00",
    name: "Cocina a medida",
    wood: "Roble",
    lead: 10,
    stock: "Cotizar",
    tone: "info",
    price: 148000,
  },
];

const QUOTES: [string, string][] = [
  [
    "“Por fin la cocina tiene lugar para todo y aun así se ve vacía.”",
    "Ana R. — Cocina 03, Coyoacán",
  ],
  [
    "“La repisa llegó en una caja plana y quedó lista en diez minutos.”",
    "Kenji T. — Repisa Vía, Tokio",
  ],
  ["“La lámpara cambia el cuarto de noche; de día casi no se nota.”", "Lucía M. — Lámpara Shoji"],
];

const NAV_LINKS = [
  { label: "Obras", href: "#obras" },
  { label: "Proceso", href: "#proceso" },
  { label: "Piezas", href: "#piezas" },
  { label: "Contacto", href: "#contacto" },
];

function WorkGrid({ cat }: { cat: string }) {
  const list = WORKS.filter((w) => cat === "Todo" || w.cat === cat);
  return (
    <div className="ol-demo-works">
      {list.map((w) => (
        <Card
          key={w.n}
          interactive
          href="#contacto"
          index={w.n}
          meta={w.year}
          media={
            <Ratio ratio="4/3">
              <div className={SWATCH[w.tone]} lang="ja">
                {w.kanji}
              </div>
            </Ratio>
          }
          title={w.title}
          text={w.text}
          footer={
            <>
              <Badge>{w.cat}</Badge>
              <Label muted>{w.place}</Label>
            </>
          }
        />
      ))}
    </div>
  );
}

function Studio() {
  const toast = useToast();
  const [cat, setCat] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [budget, setBudget] = useState(120);
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const emailOk = /.+@.+\..+/.test(email);

  const send = (event: SyntheticEvent) => {
    event.preventDefault();
    setTried(true);
    if (emailOk) setConfirm(true);
  };
  const confirmSend = () => {
    setConfirm(false);
    toast.show({
      tone: "success",
      meta: "Consulta · ejemplo",
      title: "Consulta lista",
      description: "En un sitio real se habría enviado. Aquí no salió nada.",
    });
  };

  return (
    <div className="ol-demo-page">
      <Navbar
        sticky
        brand="Olivine"
        href="#top"
        links={NAV_LINKS.map((link) => ({ ...link, active: link.href === "#obras" }))}
        end={
          <Button size="s" variant="accent" arrow href="#contacto">
            Cotizar
          </Button>
        }
      />

      <header id="top" className="ol-demo-hero">
        <Container>
          <div className="ol-demo-hero__grid">
            <div className="ol-demo-hero__main">
              <Breadcrumb
                items={[{ label: "Estudio", href: "#top" }, { label: "Muebles y cocinas" }]}
              />
              <Text variant="display-xl" as="h1" className="ol-demo-hero__title">
                Muebles con aire.
              </Text>
              <Text variant="body-l" tone="muted" className="ol-demo-measure">
                Diseñamos y fabricamos cocinas, repisas y lámparas para departamentos chicos en la
                Ciudad de México y Tokio. Cada pieza deja espacio alrededor, porque ese espacio
                también se usa.
              </Text>
              <Stack direction="h" gap={3}>
                <Button variant="accent" brackets arrow href="#contacto">
                  Empezar un proyecto
                </Button>
                <Button href="#obras">Ver obras</Button>
              </Stack>
            </div>
            <Text
              variant="kanji"
              vertical
              aria-hidden="true"
              lang="ja"
              className="ol-demo-hero__kanji"
            >
              間を作る家具
            </Text>
          </div>
          <div className="ol-demo-stats">
            <Stat label="Años en taller" value="14" />
            <Stat label="Piezas entregadas" value="212" />
            <Stat label="Madera certificada" value="096" unit="%" accent />
            <Stat
              label="Entrega promedio · semanas"
              value="08"
              delta="2 menos que en 2025"
              trend="down"
            />
          </div>
        </Container>
      </header>

      <section id="obras" className="ol-demo-section">
        <Container>
          <Divider label="Obras seleccionadas" index={1} />
          <div className="ol-demo-bar">
            <Text variant="display-m" as="h2">
              Índice de obras
            </Text>
            <Stack direction="h" gap={2}>
              <Button
                size="s"
                icon="≡"
                onClick={() => {
                  setFilters(true);
                }}
              >
                Filtros
              </Button>
              <Dropdown
                size="s"
                label="Ordenar"
                align="end"
                items={[
                  { header: "Ordenar por" },
                  { label: "Más recientes", kbd: "R" },
                  { label: "Más antiguas", kbd: "A" },
                  { divider: true },
                  { label: "Por ciudad" },
                ]}
              />
            </Stack>
          </div>
          <Tabs indexed value={cat} onChange={setCat}>
            {CATEGORIES.map((c) => (
              <TabsTab key={c} label={c}>
                <WorkGrid cat={c} />
              </TabsTab>
            ))}
          </Tabs>
          <div className="ol-demo-center">
            <Pagination total={6} page={page} onChange={setPage} />
          </div>
        </Container>
      </section>

      <section id="proceso" className="ol-demo-section ol-demo-section--tint">
        <Container>
          <Divider label="Proceso" index={2} />
          <div className="ol-demo-split">
            <div>
              <Text variant="h1" as="h2">
                De la medida al montaje, <i>en cuatro pasos</i>.
              </Text>
              <Text tone="muted" className="ol-demo-measure ol-demo-gap-s">
                Trabajamos con planos, maquetas y una visita al sitio. Si algo cambia, lo dibujamos
                otra vez antes de cortar.
              </Text>
              <div className="ol-demo-gap-l">
                <Accordion
                  defaultOpen={[0]}
                  items={[
                    {
                      title: "Visita y medidas",
                      content:
                        "Medimos el espacio y anotamos cómo se usa: quién cocina, a qué hora entra la luz, dónde se acumulan las cosas.",
                    },
                    {
                      title: "Planos y maqueta",
                      content:
                        "Entregamos planos 1:20 y una maqueta de cartón. Aquí se aprueban materiales y herrajes.",
                    },
                    {
                      title: "Fabricación",
                      content: "Seis a diez semanas en taller. Te mandamos fotos cada viernes.",
                    },
                    {
                      title: "Montaje",
                      content:
                        "Uno o dos días en sitio. Dejamos el espacio limpio y una guía de cuidado de la madera.",
                    },
                  ]}
                />
              </div>
            </div>
            <Sheet crosshair flush title="Taller" meta="Unidad / T-02 · en línea">
              <div className="ol-scanlines ol-demo-panel">
                <Text variant="mono" as="p">
                  {">>> PEDIDO 0212 · COCINA 04"}
                </Text>
                <Text variant="mono" as="p">
                  {"ESTADO: FABRICACIÓN ////////"}
                </Text>
                <Stack gap={4} className="ol-demo-gap-m">
                  <Progress label="Corte" value={100} />
                  <Progress label="Ensamble" variant="segments" value={13} max={20} />
                  <Progress label="Acabado" />
                </Stack>
              </div>
              <div className="ol-demo-panel-foot">
                <Spinner showLabel label="Secando aceite" />
                <Popover
                  title="Tiempos"
                  placement="top"
                  content="El aceite de linaza seca 72 horas entre capas. Por eso el acabado es la etapa más larga."
                  trigger={
                    <Button size="s" arrow="?">
                      ¿Por qué tarda?
                    </Button>
                  }
                />
              </div>
            </Sheet>
          </div>
        </Container>
      </section>

      <section id="piezas" className="ol-demo-section">
        <Container>
          <Divider label="Piezas de catálogo" index={3} />
          <div className="ol-demo-bar">
            <Text variant="display-m" as="h2">
              Precios base
            </Text>
            <ButtonGroup label="Moneda">
              <Button size="s" aria-pressed="true">
                MXN
              </Button>
              <Button size="s">JPY</Button>
            </ButtonGroup>
          </div>
          <Table<Piece>
            hover
            caption="Fig. 03 — Precios base sin envío. Se ajustan a medida en la cotización."
            columns={[
              { key: "code", label: "Código" },
              { key: "name", label: "Pieza", sortable: true },
              { key: "wood", label: "Madera" },
              {
                key: "lead",
                label: "Entrega",
                sortable: true,
                numeric: true,
                render: (r) => `${String(r.lead)} sem`,
              },
              {
                key: "stock",
                label: "Estado",
                render: (r) => (
                  <Badge tone={r.tone} dot>
                    {r.stock}
                  </Badge>
                ),
              },
              {
                key: "price",
                label: "Desde",
                numeric: true,
                sortable: true,
                render: (r) => `$${r.price.toLocaleString("es-MX")}`,
              },
            ]}
            rows={PIECES}
          />
        </Container>
      </section>

      <section className="ol-demo-section ol-demo-section--tint">
        <Container>
          <Divider label="Clientes" index={4} />
          <Carousel
            label="Testimonios"
            slides={QUOTES.map(([quote, who]) => (
              <div key={who} className="ol-demo-quote">
                <Text variant="h1" as="p">
                  {quote}
                </Text>
                <Label muted>{who}</Label>
              </div>
            ))}
          />
        </Container>
      </section>

      <section id="contacto" className="ol-demo-section">
        <Container>
          <Divider label="Contacto" index={5} />
          <div className="ol-demo-split">
            <div>
              <Text variant="display-l" as="h2">
                Cuéntanos del espacio.
              </Text>
              <Text tone="muted" className="ol-demo-measure ol-demo-gap-s">
                Respondemos en dos días hábiles con una primera idea y un rango de precio.
              </Text>
              <div className="ol-demo-gap-m">
                <Alert tone="info" title="Taller cerrado del 1 al 3 de noviembre">
                  Las consultas de esos días se contestan el 4.
                </Alert>
              </div>
              <div className="ol-demo-gap-m">
                <ListGroup
                  flush
                  items={[
                    {
                      title: "Taller CDMX",
                      description: "Colonia Doctores · lunes a viernes",
                      meta: "Visitas con cita",
                    },
                    {
                      title: "Showroom Tokio",
                      description: "Shimokitazawa · fines de semana",
                      meta: "Abierto",
                    },
                    {
                      title: "Instagram",
                      description: "Proceso diario del taller",
                      meta: "↗",
                      href: "#contacto",
                    },
                  ]}
                />
              </div>
            </div>

            <form onSubmit={send} noValidate>
              <Sheet title="Consulta" meta="Formulario de ejemplo">
                <Stack gap={6}>
                  <Grid cols={2} gap={4}>
                    <Col span={1}>
                      <Field label="Nombre" required>
                        <Input id="f-name" placeholder="Tu nombre" autoComplete="name" />
                      </Field>
                    </Col>
                    <Col span={1}>
                      <Field
                        label="Correo"
                        required
                        error={
                          tried && !emailOk
                            ? "Escribe un correo completo, como tu@estudio.mx."
                            : null
                        }
                      >
                        <Input
                          id="f-mail"
                          type="email"
                          placeholder="tu@estudio.mx"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                          }}
                          autoComplete="email"
                        />
                      </Field>
                    </Col>
                  </Grid>
                  <Field label="Qué necesitas">
                    <Select
                      id="f-type"
                      defaultValue=""
                      placeholder="Elige uno"
                      options={["Cocina a medida", "Repisas", "Lámparas", "Otra cosa"]}
                    />
                  </Field>
                  <CheckGroup legend="Ciudad" inline>
                    <Radio name="city" label="Ciudad de México" defaultChecked />
                    <Radio name="city" label="Tokio" />
                    <Radio name="city" label="Otra" />
                  </CheckGroup>
                  <Field
                    label="Presupuesto aproximado"
                    aside={`$${(budget * 1000).toLocaleString("es-MX")} MXN`}
                  >
                    <Range
                      id="f-budget"
                      min={20}
                      max={300}
                      step={10}
                      value={budget}
                      onChange={(e) => {
                        setBudget(Number(e.target.value));
                      }}
                      format={(v) => `${String(v)}k`}
                    />
                  </Field>
                  <Field label="Medidas del espacio" hint="Largo × ancho en metros, si las tienes.">
                    <InputGroup>
                      <Input id="f-size" placeholder="3.2 × 2.4" />
                      <InputGroupText>m</InputGroupText>
                    </InputGroup>
                  </Field>
                  <Field label="Mensaje" aside="Opcional">
                    <Textarea
                      id="f-msg"
                      placeholder="Cómo usas el espacio, qué te estorba, qué te gustaría guardar…"
                    />
                  </Field>
                  <FileInput
                    id="f-files"
                    label="Fotos o planos"
                    hint="JPG o PDF, hasta 20 MB"
                    accept="image/jpeg,application/pdf"
                    maxSize={20 * 1024 * 1024}
                    multiple
                  />
                  <Stack gap={3}>
                    <Switch id="f-news" label="Mandarme el boletín del taller (una vez al mes)" />
                    <Checkbox
                      id="f-terms"
                      label="Acepto que me contacten sobre este proyecto"
                      defaultChecked
                    />
                  </Stack>
                  <div className="ol-demo-form__foot">
                    <Tooltip content="No se envía nada: es un ejemplo">
                      <button type="button" className="ol-label ol-label--muted">
                        Página de prueba ⓘ
                      </button>
                    </Tooltip>
                    <Button type="submit" variant="accent" brackets arrow>
                      Enviar consulta
                    </Button>
                  </div>
                </Stack>
              </Sheet>
            </form>
          </div>
        </Container>
      </section>

      <footer className="ol-demo-footer">
        <Container>
          <div className="ol-demo-footer__grid">
            <Text variant="display-l" as="p">
              Olivine
            </Text>
            <Nav variant="vertical" label="Pie" items={NAV_LINKS} />
            <Stack gap={2}>
              <Label muted>Hecho con Olivine</Label>
              <Text variant="body-s" tone="muted">
                Página de prueba del sistema de diseño. Estudio, obras y precios son ficticios.
              </Text>
              <Link href="#top" plain>
                Volver arriba ↑
              </Link>
            </Stack>
          </div>
        </Container>
      </footer>

      <Offcanvas
        open={filters}
        onClose={() => {
          setFilters(false);
        }}
        title="Filtros"
      >
        <Stack gap={6}>
          <CheckGroup legend="Material">
            <Checkbox label="Roble" defaultChecked />
            <Checkbox label="Maple" defaultChecked />
            <Checkbox label="Pino" />
            <Checkbox label="Barro" />
          </CheckGroup>
          <CheckGroup legend="Ciudad">
            <Checkbox label="Ciudad de México" defaultChecked />
            <Checkbox label="Tokio" defaultChecked />
            <Checkbox label="Otras" />
          </CheckGroup>
          <Button
            variant="solid"
            block
            arrow
            onClick={() => {
              setFilters(false);
            }}
          >
            Aplicar filtros
          </Button>
        </Stack>
      </Offcanvas>

      <Modal
        open={confirm}
        onClose={() => {
          setConfirm(false);
        }}
        index="05 — Consulta"
        title="¿Enviar la consulta?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirm(false);
              }}
            >
              Revisar
            </Button>
            <Button variant="accent" arrow onClick={confirmSend}>
              Sí, enviar
            </Button>
          </>
        }
      >
        <Text tone="muted">
          Te escribiremos a <b>{email}</b>. En esta página de prueba no se envía nada; solo verás la
          confirmación.
        </Text>
      </Modal>
    </div>
  );
}

const meta = {
  title: "Demo/Studio page",
  component: Studio,
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A full page for a fictional furniture studio, in Spanish, that uses nearly every component. Switch the theme in the toolbar.",
      },
    },
  },
} satisfies Meta<typeof Studio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Studio_: Story = {
  name: "Studio page",
  render: () => (
    <Root locale="es">
      <ToastProvider position="br">
        <Studio />
      </ToastProvider>
    </Root>
  ),
};
